---
title: 물리값과 범위
type: code
minutes: 10
---

raw는 아직 단위가 없는 정수입니다. DBC의 `(factor,offset)` 으로 **물리값 = raw × factor + offset** 을 계산합니다.

| 신호 (RAV4) | factor, offset | raw | 물리값 |
|---|---|---|---|
| SPEED | 0.01, 0 | 2938 | 29.38 km/h |
| STEER_ANGLE | 1.5, 0 | −3 | −4.5 deg |
| WHEEL_SPEED_FR | 0.01, −67.67 | 9653 | 28.86 km/h |

offset이 있으면 raw 0이 물리값 0이 아닙니다. RAV4 바퀴 속도는 raw 6767일 때 0 km/h입니다.

DBC의 `[최소|최대]` 는 물리값이 가질 수 있는 범위입니다. 범위를 벗어난 값이 나오면 디코딩 실수, 다른 차종의 DBC, 센서 고장(무효값) 중 하나를 의심합니다. 이렇게 값이 말이 되는지 보는 것을 **타당성 검사(plausibility check)** 라고 하며, 검증의 첫 단계입니다.

```python
0 <= 29.38 <= 250    # True. 비교를 이어서 쓸 수 있습니다
```

`True`(참)와 `False`(거짓)도 값이므로 그대로 `return` 할 수 있습니다.

## 문제

- `to_physical(raw, factor, offset)`: 물리값을 돌려주세요.
- `in_range(value, minimum, maximum)`: 값이 범위 안이면 `True`, 아니면 `False` 를 돌려주세요. 최소·최대와 같은 값은 범위 안입니다.

```python starter
def to_physical(raw, factor, offset):
    return ___


def in_range(value, minimum, maximum):
    return ___
```

## 힌트

1. 물리값은 raw × factor + offset 입니다.
2. `return minimum <= value <= maximum`

## 정답

<details><summary>펼치기</summary>

```python solution
def to_physical(raw, factor, offset):
    return raw * factor + offset


def in_range(value, minimum, maximum):
    return minimum <= value <= maximum
```

</details>

## 확인

```python check
to_physical(2938, 0.01, 0)
to_physical(-3, 1.5, 0)
to_physical(9653, 0.01, -67.67)
to_physical(6767, 0.01, -67.67)
in_range(29.38, 0, 250)
in_range(-0.5, 0, 250)
in_range(250, 0, 250)
```

## 통과 후

`print(to_physical(9613, 0.01, -67.67))` 를 넣어 보면 `28.46` 이 아니라 `28.459999999999994` 가 나옵니다. 컴퓨터가 0.01을 2진수로 정확히 나타내지 못해 생기는 정상적인 오차입니다. 그래서 실수는 「아주 작은 차이까지 같다」로 비교합니다.
