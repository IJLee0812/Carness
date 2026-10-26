---
title: 디코더 완성
type: code
minutes: 15
---

지금까지 만든 함수를 이어 붙이면 신호 디코더가 됩니다.

1. `parse_sg(줄)` → 신호 정의 사전
2. 바이트 순서에 맞는 비트 위치: `intel_positions` 또는 `motorola_positions`
3. 위치마다 `bit_at` → 비트 목록
4. `bits_to_int` → raw
5. signed면 `to_signed`
6. `to_physical` → 물리값

라이브러리가 신호 하나를 디코딩할 때 하는 일도 본질적으로 이 여섯 단계입니다.

## 문제

`decode(data, sg_line)`: 프레임 `data` 에서 신호 줄 `sg_line` 이 정의한 신호의 물리값을 돌려주세요.

준비된 값은 `SPEED_FRAME`(RAV4 차속), `STEER_FRAME`(RAV4 조향각 `0F FD 10 00 2F F0 00 68`), `WHEEL_FRAME`(RAV4 바퀴 속도 `25 B5 25 B5 25 A0 25 8D`)과 10번 문제의 신호 줄들입니다.

```python starter
def decode(data, sg_line):
    sig = parse_sg(sg_line)
    if sig["byte_order"] == "intel":
        positions = intel_positions(sig["start"], sig["length"])
    else:
        positions = ___

    bits = []
    for k in positions:
        bits.append(___)

    raw = bits_to_int(bits)
    if sig["is_signed"]:
        raw = ___
    return ___
```

## 힌트

1. Motorola 쪽은 Intel 줄을 따라 `motorola_positions(sig["start"], sig["length"])`
2. 비트는 `bit_at(data, k)`, 부호는 `to_signed(raw, sig["length"])`
3. 마지막은 `to_physical(raw, sig["factor"], sig["offset"])`

## 정답

<details><summary>펼치기</summary>

```python solution
def decode(data, sg_line):
    sig = parse_sg(sg_line)
    if sig["byte_order"] == "intel":
        positions = intel_positions(sig["start"], sig["length"])
    else:
        positions = motorola_positions(sig["start"], sig["length"])

    bits = []
    for k in positions:
        bits.append(bit_at(data, k))

    raw = bits_to_int(bits)
    if sig["is_signed"]:
        raw = to_signed(raw, sig["length"])
    return to_physical(raw, sig["factor"], sig["offset"])
```

</details>

## 확인

```python setup
STEER_FRAME = bytes.fromhex("0F FD 10 00 2F F0 00 68")
WHEEL_FRAME = bytes.fromhex("25 B5 25 B5 25 A0 25 8D")
```

```python check
decode(SPEED_FRAME, SPEED_LINE)
decode(STEER_FRAME, STEER_LINE)
decode(WHEEL_FRAME, WHEEL_FR_LINE)
decode(bytes.fromhex("10 27 00 00 00 00 00 00"), EX_INTEL_SPEED_LINE)
decode(bytes.fromhex("27 10 00 00 00 00 00 00"), EX_MOTOROLA_SPEED_LINE)
decode(bytes.fromhex("00 00 F6 00 00 00 00 00"), EX_INTEL_TEMP_LINE)
```

## 통과 후

여기까지가 「디코딩을 코드로 쓸 수 있다」입니다. 비트 실험실 「풀이 보기」의 순서(비트 위치 → 2진수 → 2의 보수 → 물리값)와 같습니다. 같은 값 100 km/h가 Intel(`10 27`)과 Motorola(`27 10`)에서 바이트 순서만 바뀌어 저장되는 것도 확인했습니다.
