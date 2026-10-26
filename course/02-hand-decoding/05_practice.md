---
title: 실제 프레임으로 연습하기
type: tool
minutes: 15
summary: RAV4 주행 로그의 실제 프레임을 손으로 디코딩하고, 답을 채점받습니다.
---
이제 실제 주행 로그에서 꺼낸 프레임으로 연습합니다. 정답은 숨겨져 있고, ① 2진수 ② raw ③ 물리값을 직접 적어 **확인**을 누르면 채점됩니다. 막히면 「풀이 보기」를 누르세요.

```widget bitlab
vehicle = "rav4_2017"
message = "SPEED"
signal = "SPEED"
mode = "practice"
free = true
```

## 순서대로 풀어 볼 신호

| 메시지 | 신호 | 연습 포인트 |
|---|---|---|
| `SPEED` | `SPEED` | Motorola 16비트, factor 0.01 |
| `STEER_ANGLE_SENSOR` | `STEER_ANGLE` | 바이트 중간에서 시작, signed 12비트, factor 1.5 |
| `WHEEL_SPEEDS` | `WHEEL_SPEED_FR` | offset −67.67 |
| `GEAR_PACKET` | `GEAR` | 값 정의(`VAL_`)로 기어 이름 읽기 |

위젯 위쪽에서 메시지를 바꿀 수 있습니다. 같은 신호를 「다음 프레임」으로 여러 번 풀어 보세요.

> [!TIP]
> 세 개 연속으로 맞히면 다음 모듈 「코드로 디코더 만들기」로 넘어가세요. 지금 손으로 한 계산을 그대로 코드로 옮깁니다.
