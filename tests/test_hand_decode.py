import random

import pytest

from carness.can.bits import bit_positions, hand_decode
from carness.can.dbc import VEHICLES, load, overlapping_signals


def _hand(sig, data):
    return hand_decode(data, sig.start, sig.length, sig.byte_order, sig.is_signed, sig.scale, sig.offset)


def test_intel_and_motorola_give_same_speed():
    db = load("example").db
    intel = db.get_message_by_name("EX_INTEL").get_signal_by_name("SPEED")
    moto = db.get_message_by_name("EX_MOTOROLA").get_signal_by_name("SPEED")
    assert _hand(intel, bytes([0x10, 0x27, 0, 0, 0, 0, 0, 0])).physical == pytest.approx(100.0)
    assert _hand(moto, bytes([0x27, 0x10, 0, 0, 0, 0, 0, 0])).physical == pytest.approx(100.0)


def test_signed_twos_complement():
    sig = load("example").db.get_message_by_name("EX_INTEL").get_signal_by_name("TEMP")
    r = _hand(sig, bytes([0, 0, 0xF6, 0, 0, 0, 0, 0]))
    assert (r.raw_unsigned, r.raw, r.physical) == (246, -10, -10)


def test_motorola_positions_cross_byte():
    assert bit_positions(7, 16, "big_endian") == [7, 6, 5, 4, 3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8]
    assert bit_positions(5, 10, "little_endian") == list(range(14, 4, -1))


@pytest.mark.parametrize("vehicle", list(VEHICLES))
def test_hand_decode_matches_cantools(vehicle):
    rng = random.Random(0)
    db = load(vehicle).db
    for msg in db.messages:
        if msg.is_multiplexed() or overlapping_signals(msg):
            continue
        for _ in range(30):
            data = bytes(rng.randrange(256) for _ in range(msg.length))
            ref = msg.decode(data, decode_choices=False, scaling=True)
            for sig in msg.signals:
                assert _hand(sig, data).physical == pytest.approx(ref[sig.name]), (msg.name, sig.name)


def test_overlapping_signals_are_reported_as_lint():
    loaded = load("rav4_2017")
    assert any("PCS_HUD" in i.original for i in loaded.issues)
