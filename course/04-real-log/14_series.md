---
title: 신호를 시계열로
type: code
minutes: 15
---

한 메시지의 모든 프레임을 디코딩해서 `(시각, 값)` 을 모으면 신호의 **시계열**이 됩니다. 그래프로 그리거나 다른 신호와 비교할 수 있는 형태입니다.

시계열에서 가장 먼저 보는 것 중 하나가 **주기**, 즉 초당 몇 번 오는가입니다. 프레임 N개 사이의 간격은 N − 1개이므로:

```
주기(Hz) = (프레임 수 − 1) ÷ (마지막 시각 − 처음 시각)
```

리스트의 마지막 원소는 `points[-1]`, 튜플의 첫 값은 `[0]` 입니다. 그래서 마지막 점의 시각은 `points[-1][0]` 입니다.

## 문제

- `series(raw, address, sg_line)`: `frames_of` 로 프레임을 꺼내 `decode` 로 디코딩한 `(시각, 값)` 리스트를 돌려주세요.
- `rate_hz(points)`: 시계열의 주기(Hz)를 돌려주세요.

```python starter
def series(raw, address, sg_line):
    out = []
    for t, data in frames_of(raw, address):
        out.append((t, ___))
    return out


def rate_hz(points):
    duration = points[-1][0] - points[0][0]
    return ___ / duration
```

## 힌트

1. 값은 `decode(data, sg_line)` 입니다.
2. 간격의 개수는 `len(points) - 1` 입니다.

## 정답

<details><summary>펼치기</summary>

```python solution
def series(raw, address, sg_line):
    out = []
    for t, data in frames_of(raw, address):
        out.append((t, decode(data, sg_line)))
    return out


def rate_hz(points):
    duration = points[-1][0] - points[0][0]
    return (len(points) - 1) / duration
```

</details>

## 확인

```python check
len(series(RAW, 0xB4, SPEED_LINE))
series(RAW, 0xB4, SPEED_LINE)[0]
max(v for t, v in series(RAW, 0xB4, SPEED_LINE))
min(v for t, v in series(RAW, 0x25, STEER_LINE))
round(rate_hz(series(RAW, 0xB4, SPEED_LINE)), 1)
round(rate_hz(series(RAW, 0x25, STEER_LINE)), 1)
```

## 통과 후

차속 메시지는 약 41 Hz, 조향각 메시지는 약 83 Hz로 옵니다. 이 주기가 「이 신호가 끊겼다」고 판단하는 기준이 됩니다. 예를 들어 83 Hz 메시지가 0.1초 동안 오지 않으면 프레임 8개를 연속으로 잃은 것입니다.

그래프로 보고 싶다면 matplotlib(설치되어 있음)을 씁니다.

```python
import matplotlib.pyplot as plt
s = series(RAW, 0xB4, SPEED_LINE)
plt.plot([t for t, v in s], [v for t, v in s])
plt.savefig("speed.png")
```
