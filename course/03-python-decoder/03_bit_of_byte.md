---
title: 비트 하나 꺼내기
type: code
minutes: 10
---

바이트 안의 비트는 **오른쪽 끝이 0번(LSB), 왼쪽 끝이 7번(MSB)** 입니다.

| 비트 번호 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|---|---|---|
| `0xB4` | 1 | 0 | 1 | 1 | 0 | 1 | 0 | 0 |

`0xB4` 의 2번 비트는 1, 3번 비트는 0입니다. 코드로는 두 연산을 씁니다.

- `x >> n` (오른쪽 시프트): 비트를 오른쪽으로 n칸 밀어서 원하는 비트를 0번 자리로 가져옵니다. 밀려난 비트는 사라집니다.
- `x & 1` (AND): 0번 비트만 남기고 나머지를 0으로 지웁니다.

| 식 | 2진수 | 값 |
|---|---|---|
| `0xB4` | `10110100` | 180 |
| `0xB4 >> 2` | `00101101` | 45 |
| `(0xB4 >> 2) & 1` | `00000001` | 1 |

`& 1` 의 1처럼 원하는 비트만 남기는 값을 **마스크**라고 합니다. `& 0b1111` 은 아래 4비트를, `& 0xFF` 는 아래 8비트를 남깁니다.

## 문제

`bit_of_byte(byte, bit)`: 바이트 값 `byte` 의 `bit` 번 비트(0 또는 1)를 돌려주세요.

```python starter
def bit_of_byte(byte, bit):
    return (byte >> ___) & ___
```

## 힌트

1. 꺼낼 비트를 0번 자리로 가져오려면 `bit` 칸만큼 밉니다.
2. `(byte >> bit) & 1`

## 정답

<details><summary>펼치기</summary>

```python solution
def bit_of_byte(byte, bit):
    return (byte >> bit) & 1
```

</details>

## 확인

```python check
bit_of_byte(0xB4, 2)
bit_of_byte(0xB4, 3)
bit_of_byte(0xB4, 7)
bit_of_byte(0xB4, 0)
bit_of_byte(0x0B, 3)
bit_of_byte(0xFF, 5)
```
