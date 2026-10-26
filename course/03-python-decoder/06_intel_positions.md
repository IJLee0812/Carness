---
title: Intel 신호의 비트 위치
type: code
minutes: 10
---

DBC 신호 정의 `시작비트|길이@바이트순서` 에서 `@1` 은 **Intel(리틀 엔디언)** 입니다.

- Intel의 시작 비트는 신호의 **LSB** 위치입니다.
- 신호는 k가 커지는 쪽으로 이어집니다: start, start+1, …, start+length−1. 가장 큰 번호가 MSB입니다.
- 바이트를 넘어가도 규칙이 같습니다. k 7 다음은 k 8(다음 바이트의 bit 0)입니다.

예: 학습용 DBC의 `EX_INTEL` 메시지 `SPEED : 0|16@1+` 는 k 0~15를 씁니다. Byte 0이 아래 8비트, Byte 1이 위 8비트입니다. 프레임이 `10 27 …` 이면 값은 `0x2710` = 10000입니다. 프레임에 적힌 바이트 순서와 숫자의 자릿수 순서가 반대인 것, 이것이 리틀 엔디언입니다.

`bits_to_int` 는 MSB부터 읽으므로 위치 목록도 **MSB → LSB**(큰 번호 → 작은 번호) 순서로 만듭니다.

```python
for i in range(4):    # i = 0, 1, 2, 3 차례로
    print(i)

out = [5, 6, 7]
out.reverse()         # out이 [7, 6, 5]로 뒤집힘
```

## 문제

`intel_positions(start, length)`: Intel 신호가 차지하는 비트 번호를 MSB부터 LSB 순서의 리스트로 돌려주세요.

```python starter
def intel_positions(start, length):
    out = []
    for i in range(length):
        out.append(___)
    out.reverse()
    return out
```

## 힌트

1. i는 0, 1, 2, … 로 늘어납니다. 시작 비트에서 i만큼 떨어진 비트를 넣으면 됩니다.
2. `out.append(start + i)`

## 정답

<details><summary>펼치기</summary>

```python solution
def intel_positions(start, length):
    out = []
    for i in range(length):
        out.append(start + i)
    out.reverse()
    return out
```

</details>

## 확인

```python check
intel_positions(0, 16)
intel_positions(5, 10)
intel_positions(24, 12)
intel_positions(56, 4)
bits_to_int([bit_at(bytes.fromhex("10 27 00 00 00 00 00 00"), k) for k in intel_positions(0, 16)])
```

## 통과 후

마지막 확인 식은 앞에서 만든 함수를 이어 붙여 신호 하나를 디코딩한 것입니다. `[식 for k in 목록]` 은 for 반복문으로 리스트를 만드는 한 줄 표기입니다.
