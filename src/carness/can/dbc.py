import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import cantools
from opendbc import get_generated_dbcs

from carness.can.bits import bit_positions

EXAMPLES_DBC = Path(__file__).resolve().parents[3] / "configs" / "examples.dbc"

VEHICLES = {
    "example": {"label": "학습용 예제 (Intel·Motorola 비교)", "dbc": "examples"},
    "rav4_2017": {"label": "Toyota RAV4 2017", "dbc": "toyota_new_mc_pt_generated"},
    "civic_2016": {"label": "Honda Civic 2016", "dbc": "honda_civic_touring_2016_can_generated"},
}

_COMMENT_WITHOUT_SIGNAL = re.compile(r'^CM_ SG_ (\d+) "(.*)";\s*$')


@dataclass
class LintIssue:
    line: int
    original: str
    action: str


@dataclass
class LoadedDbc:
    name: str
    db: cantools.database.Database
    text: str
    issues: list[LintIssue] = field(default_factory=list)


def _repair(text: str) -> tuple[str, list[LintIssue]]:
    issues = []
    out = []
    for no, line in enumerate(text.splitlines(), start=1):
        m = _COMMENT_WITHOUT_SIGNAL.match(line)
        if m:
            fixed = f'CM_ BO_ {m.group(1)} "{m.group(2)}";'
            issues.append(LintIssue(no, line, f"신호 이름 없는 신호 주석 → 메시지 주석으로 변환: {fixed}"))
            out.append(fixed)
        else:
            out.append(line)
    return "\n".join(out), issues


def overlapping_signals(message) -> dict[int, list[str]]:
    owners: dict[int, list[str]] = {}
    for sig in message.signals:
        if sig.multiplexer_ids:
            continue
        for k in bit_positions(sig.start, sig.length, sig.byte_order):
            owners.setdefault(k, []).append(sig.name)
    return {k: v for k, v in owners.items() if len(v) > 1}


@lru_cache
def load(vehicle: str) -> LoadedDbc:
    name = VEHICLES[vehicle]["dbc"]
    source = EXAMPLES_DBC.read_text() if vehicle == "example" else get_generated_dbcs()[name]
    text, issues = _repair(source)
    db = cantools.database.load_string(text, "dbc", strict=False)
    for msg in db.messages:
        overlap = overlapping_signals(msg)
        if overlap:
            pairs = sorted({" ↔ ".join(v) for v in overlap.values()})
            issues.append(LintIssue(0, f"{msg.name} (0x{msg.frame_id:X})", f"신호끼리 비트가 겹침: {', '.join(pairs)}"))
    return LoadedDbc(name, db, text, issues)


def message_block(text: str, message) -> list[str]:
    """DBC 원문에서 메시지 하나에 해당하는 BO_·SG_·CM_·VAL_·BA_ 줄을 모은다."""
    dbc_id = message.frame_id | (0x80000000 if message.is_extended_frame else 0)
    lines = text.splitlines()
    out = []
    for i, line in enumerate(lines):
        if line.startswith(f"BO_ {dbc_id} "):
            out.append(line)
            for following in lines[i + 1:]:
                if not following.lstrip().startswith("SG_"):
                    break
                out.append(following)
    related = re.compile(rf'^(CM_ (BO_|SG_) |VAL_ |BA_ "\w+" (BO_|SG_) ){dbc_id} ')
    return out + [line for line in lines if related.match(line)]
