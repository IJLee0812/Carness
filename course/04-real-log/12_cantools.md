---
title: cantools로 맞춰 보기
type: code
minutes: 15
---

실제 작업에서는 직접 만든 디코더 대신 검증된 라이브러리 **cantools** 를 씁니다. 그래도 직접 만들어 본 이유는, 라이브러리 결과가 이상할 때 어느 단계가 틀렸는지 손으로 따라가 확인하기 위해서입니다.

```python
import cantools                                   # 라이브러리 가져오기
db = cantools.database.load_file("toyota.dbc")    # DBC 파일 전체를 읽은 데이터베이스
msg = db.get_message_by_frame_id(0xB4)            # ID로 메시지 찾기
msg.decode(data)    # {'ENCODER': 29, 'SPEED': 29.38, 'CHECKSUM': 94}
```

- 값 뒤에 `.이름(…)` 을 붙여 부르는 것을 **메서드**라고 합니다. 그 값이 가진 기능입니다.
- `decode` 는 메시지의 모든 신호를 `{신호 이름: 값}` 사전으로 돌려줍니다.
- 값 정의(`VAL_`, 예: 0 = OFF, 1 = ON)가 있는 신호는 이름표가 붙어 나옵니다. 숫자만 받으려면 `decode(data, decode_choices=False)` 로 부릅니다.

여기서는 opendbc의 RAV4 DBC를 미리 읽어 둔 `RAV4_DB` 를 씁니다.

## 문제

`cantools_value(db, frame_id, data, signal)`: cantools로 프레임을 디코딩해서 `signal` 이름의 값을 돌려주세요.

```python starter
def cantools_value(db, frame_id, data, signal):
    msg = db.get_message_by_frame_id(___)
    values = msg.decode(___, decode_choices=False)
    return values[___]
```

## 힌트

1. 메시지는 ID(`frame_id`)로 찾고, 디코딩할 것은 프레임(`data`)입니다.
2. 사전에서 값을 꺼낼 때는 `values[signal]`

## 정답

<details><summary>펼치기</summary>

```python solution
def cantools_value(db, frame_id, data, signal):
    msg = db.get_message_by_frame_id(frame_id)
    values = msg.decode(data, decode_choices=False)
    return values[signal]
```

</details>

## 확인

```python setup
from carness.can.dbc import load
RAV4_DB = load("rav4_2017").db
```

```python check
cantools_value(RAV4_DB, 0xB4, SPEED_FRAME, "SPEED")
cantools_value(RAV4_DB, 0x25, STEER_FRAME, "STEER_ANGLE")
cantools_value(RAV4_DB, 0xAA, WHEEL_FRAME, "WHEEL_SPEED_RL")
abs(cantools_value(RAV4_DB, 0xB4, SPEED_FRAME, "SPEED") - decode(SPEED_FRAME, SPEED_LINE)) < 1e-9
abs(cantools_value(RAV4_DB, 0x25, STEER_FRAME, "STEER_ANGLE") - decode(STEER_FRAME, STEER_LINE)) < 1e-9
```

## 통과 후

직접 만든 `decode` 와 cantools가 같은 값을 냈습니다. 이 비교를 모든 신호와 무작위 프레임 수천 개로 자동화한 것이 이 repo의 `tests/test_hand_decode.py` 입니다(`uv run pytest`). 「값이 맞다는 근거」를 코드로 남기는 방법입니다.
