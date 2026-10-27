import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3] / "data" / "raw" / "comma2k19"
DONGLE_VEHICLE = {"b0c9d2329ad1606b": "rav4_2017", "99c94dc769b5d96e": "civic_2016"}


def local_path(path: str) -> str:
    """원본 경로의 「dongle|날짜」 구분자 |는 Windows 파일 이름에 쓸 수 없어 _로 바꿔 저장한다."""
    return path.replace("|", "_") if os.name == "nt" else path


EXAMPLE = local_path("Example_1/b0c9d2329ad1606b|2018-08-02--08-34-47/40")


@dataclass
class RawCan:
    segment: str
    t: np.ndarray
    src: np.ndarray
    address: np.ndarray
    data: np.ndarray


def segments() -> dict[str, str]:
    """세그먼트 경로(ROOT 기준) → 차종 키."""
    out = {}
    for can_dir in sorted(ROOT.glob("**/processed_log/CAN/raw_can")):
        seg = can_dir.parents[2]
        vehicle = DONGLE_VEHICLE.get(re.split(r"[|_]", seg.parent.name)[0])
        if vehicle:
            out[str(seg.relative_to(ROOT))] = vehicle
    return out


def first_segment(vehicle: str) -> str | None:
    return next((s for s, v in segments().items() if v == vehicle), None)


@lru_cache(maxsize=8)
def load_raw_can(segment: str) -> RawCan:
    base = ROOT / segment / "processed_log" / "CAN" / "raw_can"
    raw = np.load(base / "data")
    # S8은 꺼낼 때 끝의 0x00을 잘라내므로 원본 8바이트를 그대로 본다
    data = raw.view(np.uint8).reshape(-1, raw.dtype.itemsize)
    return RawCan(segment, np.load(base / "t"), np.load(base / "src"), np.load(base / "address"), data)


def load_processed(segment: str, name: str) -> tuple[np.ndarray, np.ndarray]:
    base = ROOT / segment / "processed_log" / "CAN" / name
    return np.load(base / "t"), np.load(base / "value")
