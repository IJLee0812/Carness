from dataclasses import dataclass


def bit_positions(start: int, length: int, byte_order: str) -> list[int]:
    """신호가 차지하는 비트 번호를 MSB부터 LSB 순서로 돌려준다. 비트 번호 k는 k // 8번 바이트의 k % 8번 비트."""
    if byte_order == "little_endian":
        return list(range(start + length - 1, start - 1, -1))
    out = []
    b = start
    for _ in range(length):
        out.append(b)
        b = b + 15 if b % 8 == 0 else b - 1
    return out


def bit_value(data: bytes, k: int) -> int:
    return (data[k // 8] >> (k % 8)) & 1


@dataclass
class HandDecode:
    positions: list[int]
    bits: str
    raw_unsigned: int
    raw: int
    physical: float


def hand_decode(data: bytes, start: int, length: int, byte_order: str, is_signed: bool,
                scale: float, offset: float) -> HandDecode:
    positions = bit_positions(start, length, byte_order)
    bits = "".join(str(bit_value(data, k)) for k in positions)
    raw_unsigned = int(bits, 2)
    raw = raw_unsigned - (1 << length) if is_signed and bits[0] == "1" else raw_unsigned
    return HandDecode(positions, bits, raw_unsigned, raw, raw * scale + offset)
