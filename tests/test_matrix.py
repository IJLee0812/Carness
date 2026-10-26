import csv
import io

from carness.can import matrix
from carness.can.dbc import load, message_block
from carness.io.comma2k19 import EXAMPLE, ROOT


def test_one_row_per_signal_with_all_columns():
    db = load("rav4_2017").db
    table = matrix.rows(db, {})
    assert len(table) == sum(len(m.signals) for m in db.messages)
    assert all(list(r) == matrix.COLUMNS for r in table)
    speed = next(r for r in table if r["메시지"] == "SPEED" and r["신호"] == "SPEED")
    assert (speed["ID"], speed["시작 비트"], speed["바이트 순서"], speed["factor"], speed["단위"]) == \
        ("0xB4", 47, "Motorola", 0.01, "km/h")


def test_csv_opens_with_korean_header():
    text = matrix.csv_text(matrix.rows(load("example").db, {}))
    assert text.startswith("﻿")
    header = next(csv.reader(io.StringIO(text.lstrip("﻿"))))
    assert header == matrix.COLUMNS


def test_message_block_collects_related_lines():
    loaded = load("rav4_2017")
    block = message_block(loaded.text, loaded.db.get_message_by_frame_id(0x3BC))
    assert block[0].startswith("BO_ 956 GEAR_PACKET")
    assert any(line.startswith("VAL_ 956 GEAR ") for line in block)
    assert sum(line.lstrip().startswith("SG_") for line in block) == len(loaded.db.get_message_by_frame_id(0x3BC).signals)


def test_observed_period_from_log():
    if not (ROOT / EXAMPLE).exists():
        return
    seen = matrix.observed(EXAMPLE)
    assert set(seen[0xB4]) == {0}
    assert seen[0xB4][0].count == 2487
    assert 20 < seen[0xB4][0].period_ms < 30
