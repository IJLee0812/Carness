import argparse
import csv
import io
import sys
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import cantools
import numpy as np

from carness.can.dbc import VEHICLES, load
from carness.io import comma2k19

COLUMNS = [
    "채널(관측 버스)", "메시지", "ID", "DLC", "주기 DBC(ms)", "주기 실측(ms)", "송신 노드",
    "신호", "시작 비트", "길이", "바이트 순서", "부호", "factor", "offset", "최소", "최대", "단위",
    "수신 노드", "값 정의", "설명",
]


@dataclass
class Observed:
    count: int
    period_ms: float | None


@lru_cache(maxsize=4)
def observed(segment: str | None) -> dict[int, dict[int, Observed]]:
    """메시지 ID → {버스 번호: 관측 횟수와 실측 주기(간격의 중앙값)}."""
    if not segment:
        return {}
    raw = comma2k19.load_raw_can(segment)
    out: dict[int, dict[int, Observed]] = {}
    for bus in np.unique(raw.src):
        on_bus = raw.src == bus
        for address in np.unique(raw.address[on_bus]):
            t = raw.t[on_bus & (raw.address == address)]
            period = float(np.median(np.diff(t)) * 1000) if len(t) > 1 else None
            out.setdefault(int(address), {})[int(bus)] = Observed(len(t), period)
    return out


def main_bus(buses: dict[int, Observed]) -> tuple[int, Observed] | None:
    return max(buses.items(), key=lambda kv: kv[1].count) if buses else None


def rows(db: cantools.database.Database, seen: dict[int, dict[int, Observed]]) -> list[dict]:
    out = []
    for m in sorted(db.messages, key=lambda m: m.frame_id):
        buses = seen.get(m.frame_id, {})
        main = main_bus(buses)
        period = main[1].period_ms if main else None
        for s in m.signals:
            out.append(dict(zip(COLUMNS, [
                ", ".join(str(b) for b in sorted(buses)), m.name, f"0x{m.frame_id:X}", m.length,
                m.cycle_time or "", round(period, 1) if period else "", ", ".join(m.senders),
                s.name, s.start, s.length, "Motorola" if s.byte_order == "big_endian" else "Intel",
                "signed" if s.is_signed else "unsigned", s.scale, s.offset,
                "" if s.minimum is None else s.minimum, "" if s.maximum is None else s.maximum, s.unit or "",
                ", ".join(s.receivers), "; ".join(f"{k}={v}" for k, v in (s.choices or {}).items()), s.comment or "",
            ])))
    return out


def csv_text(table: list[dict]) -> str:
    """엑셀이 한글을 깨지 않고 열도록 BOM을 붙인 CSV 문자열."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=COLUMNS)
    writer.writeheader()
    writer.writerows(table)
    return "\ufeff" + buf.getvalue()


def write_csv(table: list[dict], path: Path) -> None:
    path.write_text(csv_text(table), encoding="utf-8", newline="")


def _summary(db: cantools.database.Database, seen: dict[int, dict[int, Observed]]) -> None:
    print(f"노드(ECU): {', '.join(n.name for n in db.nodes) or '없음'}")
    print(f"메시지 {len(db.messages)}개, 신호 {sum(len(m.signals) for m in db.messages)}개\n")
    print(f"{'ID':>6}  {'메시지':<28}{'DLC':>3}  {'버스':<6}{'주기':>8}  신호")
    for m in sorted(db.messages, key=lambda m: m.frame_id):
        main = main_bus(seen.get(m.frame_id, {}))
        bus = str(main[0]) if main else "-"
        period = f"{main[1].period_ms:.1f}ms" if main and main[1].period_ms else "-"
        names = ", ".join(s.name for s in m.signals)
        print(f"{f'0x{m.frame_id:03X}':>6}  {m.name:<28}{m.length:>3}  {bus:<6}{period:>8}  {names}")


def cli() -> None:
    parser = argparse.ArgumentParser(prog="carness-dbc", description="DBC를 메시지 요약 또는 통신 매트릭스(CSV)로 보여 준다")
    parser.add_argument("dbc", nargs="?", help=f"차종 키({', '.join(VEHICLES)}) 또는 .dbc 파일 경로")
    parser.add_argument("-o", "--out", type=Path, help="통신 매트릭스 CSV로 저장할 경로")
    args = parser.parse_args()
    if not args.dbc:
        for key, v in VEHICLES.items():
            print(f"{key:<12} {v['label']}  ({v['dbc']})")
        print("\n예: uv run carness-dbc rav4_2017            메시지 요약\n    uv run carness-dbc rav4_2017 -o rav4.csv  통신 매트릭스 CSV")
        return
    if args.dbc in VEHICLES:
        db = load(args.dbc).db
        seen = observed(comma2k19.first_segment(args.dbc))
    elif Path(args.dbc).is_file():
        db = cantools.database.load_file(args.dbc, strict=False)
        seen = {}
    else:
        sys.exit(f"차종 키도 파일도 아닙니다: {args.dbc}")
    if args.out:
        table = rows(db, seen)
        write_csv(table, args.out)
        print(f"{args.out} 저장 ({len(table)}행)")
    else:
        _summary(db, seen)
