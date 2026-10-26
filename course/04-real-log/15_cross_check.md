---
title: 값이 맞다는 근거
type: code
minutes: 15
---

「값이 나왔다」와 「값이 맞다」는 다릅니다. DBC가 틀렸거나 다른 차종의 것이어도 숫자는 나오기 때문입니다. 같은 물리량을 **다른 출처와 비교하는 것(교차 검증)** 이 근거가 됩니다.

RAV4 예제에는 차속을 알 수 있는 출처가 세 가지 있습니다.

| 출처 | 내용 |
|---|---|
| `SPEED` (0xB4) | 차량이 보내는 차속 신호 |
| `WHEEL_SPEEDS` (0xAA) | 바퀴 4개의 속도 |
| `processed_log/CAN/speed` | 데이터셋이 따로 제공하는 차속 (m/s) |

준비된 값 `LOG_SPEED_KMH` 는 세 번째 출처를 km/h로 바꾼 리스트이고, `WHEEL_LINES` 는 바퀴 4개의 신호 줄 리스트입니다.

## 문제

- `values_of(points)`: `(시각, 값)` 리스트에서 값만 모은 리스트를 돌려주세요.
- `mean(values)`: 평균(합 ÷ 개수)을 돌려주세요. 합은 `sum(values)`, 개수는 `len(values)` 입니다.

```python starter
def values_of(points):
    out = []
    for t, v in points:
        out.append(___)
    return out


def mean(values):
    return ___ / ___
```

## 힌트

1. 값만 모으므로 `out.append(v)`
2. `return sum(values) / len(values)`

## 정답

<details><summary>펼치기</summary>

```python solution
def values_of(points):
    out = []
    for t, v in points:
        out.append(v)
    return out


def mean(values):
    return sum(values) / len(values)
```

</details>

## 확인

```python setup
from carness.io.comma2k19 import load_processed
LOG_SPEED_KMH = [float(v) * 3.6 for v in load_processed(EXAMPLE, "speed")[1].ravel()]
WHEEL_LINES = [
    ' SG_ WHEEL_SPEED_FR : 7|16@0+ (0.01,-67.67) [0|250] "km/h" XXX',
    ' SG_ WHEEL_SPEED_FL : 23|16@0+ (0.01,-67.67) [0|250] "km/h" XXX',
    ' SG_ WHEEL_SPEED_RR : 39|16@0+ (0.01,-67.67) [0|250] "km/h" XXX',
    ' SG_ WHEEL_SPEED_RL : 55|16@0+ (0.01,-67.67) [0|250] "km/h" XXX',
]
```

```python check
mean([1, 2, 3, 4])
round(mean(values_of(series(RAW, 0xB4, SPEED_LINE))), 2)
round(mean(LOG_SPEED_KMH), 2)
round(mean([mean(values_of(series(RAW, 0xAA, line))) for line in WHEEL_LINES]), 2)
round(mean(values_of(series(RAW, 0xB4, SPEED_LINE))) / mean(LOG_SPEED_KMH), 3)
```

## 통과 후

결과를 읽는 법입니다.

- **바퀴 4개의 평균과 데이터셋 차속이 같습니다**(60.24 km/h). `print` 로 반올림 전 값을 찍어 보면 끝자리까지 같습니다. 데이터셋의 차속은 바퀴 속도 평균으로 만든 값이라고 추정할 수 있습니다.
- **SPEED(0xB4)는 이보다 약 2.1% 높습니다**(61.52 km/h). cantools와 결과가 같았으니 디코딩이 틀린 것이 아니라 신호의 뜻이 다른 것입니다. 계기판 속도는 실제보다 낮게 표시하면 안 된다는 기준(UN R39)이 있어 보통 조금 높게 표시하므로, SPEED는 **표시용 차속**일 가능성이 있습니다. 아직은 가설입니다. 바퀴와 무관한 출처인 GNSS 기반 속도(`global_pose/frame_velocities`)와 비교하면 확인할 수 있습니다.
- 「차속」 하나도 어느 신호를 쓰는지에 따라 2% 차이가 납니다. 차속을 기준으로 동작하는 기능(예: 일정 속도 이상에서만 켜지는 기능)을 검증할 때는 어느 신호를 기준으로 삼았는지부터 밝혀야 합니다.
