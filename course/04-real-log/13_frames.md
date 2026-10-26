---
title: 실제 로그에서 프레임 꺼내기
type: code
minutes: 15
---

comma2k19 세그먼트(약 1분 주행)의 `processed_log/CAN/raw_can` 에는 길이가 같은 배열 4개가 있습니다. 같은 위치의 원소끼리 모으면 그 순서로 받은 CAN 프레임 하나가 됩니다.

| 배열 | 뜻 |
|---|---|
| `t` | 받은 시각(초) |
| `src` | 받은 버스 번호. 이 예제의 차량 신호는 대부분 0번 버스 |
| `address` | 메시지 ID |
| `data` | 데이터 8바이트 |

준비된 값 `RAW` 는 RAV4 예제 세그먼트를 읽은 것입니다(프레임 135,468개). `RAW.t`, `RAW.address` 처럼 점(.)을 붙여 각 배열을 꺼냅니다.

> **데이터 함정**: 원본 파일의 `data` 는 numpy `S8`(8바이트 문자열) 형식이라, 그대로 꺼내면 끝의 `0x00` 바이트가 잘려 나갑니다. `load_raw_can` 이 원래 8바이트로 바로잡아 줍니다(`src/carness/io/comma2k19.py`).

여러 배열을 나란히 한 칸씩 읽을 때는 `zip` 을 씁니다.

```python
for t, src, addr, data in zip(RAW.t, RAW.src, RAW.address, RAW.data):
    ...   # 한 바퀴에 프레임 하나
```

- 값 두 개를 괄호로 묶은 `(t, data)` 를 **튜플**이라고 합니다.
- 함수 정의의 `bus=0` 은 **기본값**입니다. 부를 때 bus를 주지 않으면 0이 됩니다.
- 두 조건을 모두 만족해야 할 때는 `and` 로 잇습니다.
- numpy 배열에서 꺼낸 값은 `float(t)`, `bytes(data)` 로 보통 파이썬 값으로 바꿔 둡니다.

## 문제

`frames_of(raw, address, bus=0)`: 주어진 ID와 버스의 프레임만 골라 `(시각, 데이터)` 튜플의 리스트로 돌려주세요.

```python starter
def frames_of(raw, address, bus=0):
    out = []
    for t, src, addr, data in zip(raw.t, raw.src, raw.address, raw.data):
        if addr == ___ and src == ___:
            out.append((float(t), bytes(data)))
    return out
```

## 힌트

1. 비교할 대상은 함수가 받은 `address` 와 `bus` 입니다.

## 정답

<details><summary>펼치기</summary>

```python solution
def frames_of(raw, address, bus=0):
    out = []
    for t, src, addr, data in zip(raw.t, raw.src, raw.address, raw.data):
        if addr == address and src == bus:
            out.append((float(t), bytes(data)))
    return out
```

</details>

## 확인

```python setup
from carness.io.comma2k19 import EXAMPLE, load_raw_can
RAW = load_raw_can(EXAMPLE)
```

```python check
len(frames_of(RAW, 0xB4))
frames_of(RAW, 0xB4)[0]
frames_of(RAW, 0xB4)[-1]
len(frames_of(RAW, 0x25))
len(frames_of(RAW, 0xB4, bus=1))
```

## 통과 후

0xB4가 약 60초 동안 2,487번 왔으니 초당 약 41번입니다. 메시지마다 보내는 주기가 정해져 있고, 주기가 깨지는 것(프레임 누락·지연)도 검증 대상입니다.

같은 일을 numpy로 쓰면 한 줄입니다: `RAW.data[(RAW.address == 0xB4) & (RAW.src == 0)]`. 반복문보다 훨씬 빠르므로 데이터가 커지면 이 방식을 씁니다.
