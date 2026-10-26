---
title: Motorola 신호의 비트 위치
type: code
minutes: 10
---

`@0` 은 **Motorola(빅 엔디언)** 입니다. 실제 차량 DBC에서 많이 쓰고, 손 디코딩에서 가장 많이 틀리는 부분입니다.

- DBC 파일에 적힌 Motorola 시작 비트는 신호의 **MSB** 위치입니다.
- 같은 바이트 안에서는 비트 번호가 **줄어드는** 쪽(k − 1)으로 읽습니다.
- 바이트의 bit 0에 닿으면 **다음 바이트의 bit 7** 로 넘어갑니다. bit 0인 k는 `k % 8 == 0` 이고, 다음 바이트의 bit 7은 `k + 15` 입니다(다음 바이트 시작 k + 8에서 + 7).

예: RAV4 `SPEED : 47|16@0+`

```
47 46 45 44 43 42 41 40 → 55 54 53 52 51 50 49 48
(Byte 5 전체)              (Byte 6 전체)
```

프레임 `… 1D 0B 7A 5E` 에서 Byte 5 = `0B`, Byte 6 = `7A` 이므로 `0x0B7A` = 2938입니다. 바이트가 적힌 순서 그대로 숫자가 됩니다. 이것이 빅 엔디언입니다.

> 일부 DBC 편집 도구는 Motorola 신호의 시작 비트를 LSB 기준으로 보여 줍니다. 여기서는 DBC 파일 원문과 cantools가 쓰는 MSB 기준을 씁니다. 다른 도구의 숫자와 다르면 이 차이부터 확인하세요.

조건에 따라 다른 일을 할 때는 `if` / `else` 를 씁니다.

```python
if speed > 100:       # 조건이 참이면
    label = "빠름"    # 이 줄을,
else:                 # 아니면
    label = "보통"    # 이 줄을 실행
```

`for _ in range(length):` 의 `_` 는 「반복 횟수만 필요하고 값은 쓰지 않는다」는 뜻으로 붙이는 이름입니다.

## 문제

`motorola_positions(start, length)`: Motorola 신호가 차지하는 비트 번호를 MSB부터 LSB 순서의 리스트로 돌려주세요.

```python starter
def motorola_positions(start, length):
    out = []
    k = start
    for _ in range(length):
        out.append(k)
        if k % 8 == 0:
            k = ___
        else:
            k = ___
    return out
```

## 힌트

1. bit 0에 닿았을 때(`k % 8 == 0`)만 다음 바이트로 건너뛰고, 나머지는 한 칸씩 내려갑니다.
2. 건너뛸 때는 `k + 15`, 아닐 때는 `k - 1`

## 정답

<details><summary>펼치기</summary>

```python solution
def motorola_positions(start, length):
    out = []
    k = start
    for _ in range(length):
        out.append(k)
        if k % 8 == 0:
            k = k + 15
        else:
            k = k - 1
    return out
```

</details>

## 확인

```python check
motorola_positions(47, 16)
motorola_positions(7, 16)
motorola_positions(3, 12)
motorola_positions(21, 10)
bits_to_int([bit_at(SPEED_FRAME, k) for k in motorola_positions(47, 16)])
```

## 통과 후

비트 실험실 도구에서 Toyota RAV4 → SPEED 메시지를 고르면 격자에 같은 순서 번호가 붙어 있습니다. 세 번째 확인 `3|12` 는 RAV4 조향각(STEER_ANGLE)입니다. Byte 0의 아래 4비트에서 시작해 Byte 1 전체로 이어집니다.
