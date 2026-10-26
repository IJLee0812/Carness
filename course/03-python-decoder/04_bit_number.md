---
title: CAN 비트 번호
type: code
minutes: 10
---

DBC는 프레임 전체의 비트에 번호 k를 붙입니다. **k = 바이트 번호 × 8 + 바이트 안의 비트 번호** 입니다. 비트 실험실 격자에서 칸 왼쪽 위의 작은 숫자가 이 k입니다.

| | bit 7 | bit 6 | … | bit 1 | bit 0 |
|---|---|---|---|---|---|
| Byte 0 | 7 | 6 | … | 1 | 0 |
| Byte 1 | 15 | 14 | … | 9 | 8 |
| Byte 2 | 23 | 22 | … | 17 | 16 |
| … | | | | | |
| Byte 7 | 63 | 62 | … | 57 | 56 |

거꾸로 k가 주어지면 나눗셈의 **몫**과 **나머지**로 위치를 찾습니다.

- 바이트 번호 = `k // 8` (몫)
- 비트 번호 = `k % 8` (나머지)

예를 들어 k = 47이면 47 // 8 = 5, 47 % 8 = 7이므로 Byte 5의 bit 7입니다.

## 문제

`bit_at(data, k)`: 프레임 `data` 의 k번 비트를 돌려주세요. 앞 문제의 `bit_of_byte` 를 쓸 수 있습니다.

준비된 값 `SPEED_FRAME` 은 2번 문제에서 본 RAV4 차속 프레임 `00 00 00 00 1D 0B 7A 5E` 입니다.

```python starter
def bit_at(data, k):
    byte_index = ___
    bit_index = ___
    return bit_of_byte(data[byte_index], bit_index)
```

## 힌트

1. 바이트 번호는 몫 `//`, 비트 번호는 나머지 `%` 로 구합니다.
2. `byte_index = k // 8`, `bit_index = k % 8`

## 정답

<details><summary>펼치기</summary>

```python solution
def bit_at(data, k):
    byte_index = k // 8
    bit_index = k % 8
    return bit_of_byte(data[byte_index], bit_index)
```

</details>

## 확인

```python setup
SPEED_FRAME = bytes.fromhex("00 00 00 00 1D 0B 7A 5E")
```

```python check
bit_at(SPEED_FRAME, 40)
bit_at(SPEED_FRAME, 42)
bit_at(SPEED_FRAME, 47)
bit_at(SPEED_FRAME, 52)
bit_at(SPEED_FRAME, 32)
bit_at(SPEED_FRAME, 63)
```
