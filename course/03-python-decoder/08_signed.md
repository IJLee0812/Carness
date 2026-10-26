---
title: 부호 있는 값 (2의 보수)
type: code
minutes: 10
---

DBC의 `+` 는 부호 없음(unsigned), `-` 는 **부호 있음(signed)** 입니다. 조향각처럼 왼쪽·오른쪽이 있는 값은 signed입니다.

signed 신호는 **2의 보수**로 저장됩니다. n비트 값에서 MSB가 1이면 음수이고, 실제 값은 **raw − 2ⁿ** 입니다.

| 8비트 raw | 2진수 | MSB | 실제 값 |
|---|---|---|---|
| 10 | `00001010` | 0 | 10 |
| 127 | `01111111` | 0 | 127 (가장 큰 양수) |
| 128 | `10000000` | 1 | 128 − 256 = −128 |
| 246 (`0xF6`) | `11110110` | 1 | 246 − 256 = −10 |
| 255 | `11111111` | 1 | −1 |

MSB가 1이라는 것은 raw가 2ⁿ⁻¹ 이상이라는 것과 같습니다. 8비트면 128 이상, 12비트면 2048 이상입니다.

**길이가 다르면 같은 raw도 다른 값이 됩니다.** raw 4093은 12비트 signed로는 −3이지만 16비트 signed로는 그대로 4093입니다. 그래서 신호 길이를 정확히 알아야 합니다.

## 문제

`to_signed(raw, length)`: length비트 signed 신호의 raw(부호 없이 읽은 값)를 실제 정수로 바꿔 돌려주세요.

```python starter
def to_signed(raw, length):
    if raw >= 2 ** (length - 1):
        return ___
    return raw
```

## 힌트

1. MSB가 1이면 raw에서 2ⁿ을 뺍니다. n은 length입니다.
2. `return raw - 2 ** length`

## 정답

<details><summary>펼치기</summary>

```python solution
def to_signed(raw, length):
    if raw >= 2 ** (length - 1):
        return raw - 2 ** length
    return raw
```

</details>

## 확인

```python check
to_signed(246, 8)
to_signed(127, 8)
to_signed(128, 8)
to_signed(4093, 12)
to_signed(4093, 16)
to_signed(2047, 12)
```

## 통과 후

RAV4 조향각 `STEER_ANGLE : 3|12@0- (1.5,0)` 에서 raw 4093은 −3이 되고, × 1.5를 하면 −4.5도입니다. 다음 문제가 이 × 1.5 단계입니다.
