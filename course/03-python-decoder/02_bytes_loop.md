---
title: 바이트와 반복문
type: code
minutes: 10
---

CAN 프레임의 데이터는 최대 8바이트입니다(CAN-FD는 최대 64바이트). 파이썬에서는 `bytes` 로 다룹니다.

```python
data = bytes.fromhex("00 00 00 00 1D 0B 7A 5E")
data[0]      # 0     위치 번호는 0부터 셉니다
data[4]      # 29    0x1D. 꺼내면 0~255 정수
len(data)    # 8     바이트 수
```

`=` 는 「오른쪽 값을 왼쪽 이름에 넣는다」는 뜻입니다(대입). 같은지 비교할 때는 `==` 를 씁니다.

여러 값을 차례로 모을 때는 **리스트**를 씁니다.

```python
out = []            # 빈 리스트
out.append(3)       # [3]
out.append(5)       # [3, 5]
```

**반복문** `for` 는 값을 하나씩 꺼내 들여쓴 블록을 반복합니다.

```python
out = []
for b in data:          # data의 바이트를 하나씩 b에 넣으며
    out.append(b * 2)   # 이 줄을 반복
```

## 문제

- `byte_at(data, i)`: i번 바이트를 돌려줍니다.
- `frame_to_bins(data)`: 모든 바이트를 8자리 2진수 문자열로 바꾼 리스트를 돌려줍니다.

앞 문제에서 만든 `to_bin8` 을 그대로 쓸 수 있습니다. 앞 문제의 함수는 정답 버전이 미리 들어 있습니다(「준비된 함수·값」 참고).

```python starter
def byte_at(data, i):
    return ___


def frame_to_bins(data):
    out = []
    for b in data:
        out.append(___)
    return out
```

## 힌트

1. 위치를 지정할 때는 대괄호를 씁니다: `data[i]`
2. 바이트 `b` 를 8자리 2진수로 바꾸는 함수는 `to_bin8(b)` 입니다.

## 정답

<details><summary>펼치기</summary>

```python solution
def byte_at(data, i):
    return data[i]


def frame_to_bins(data):
    out = []
    for b in data:
        out.append(to_bin8(b))
    return out
```

</details>

## 확인

```python check
byte_at(bytes.fromhex("00 00 00 00 1D 0B 7A 5E"), 4)
byte_at(bytes.fromhex("00 00 00 00 1D 0B 7A 5E"), 7)
frame_to_bins(bytes.fromhex("B4 0B"))
frame_to_bins(bytes.fromhex("00 00 00 00 1D 0B 7A 5E"))
```

## 통과 후

`00 00 00 00 1D 0B 7A 5E` 는 실제 RAV4 주행 로그에 있는 차속 메시지(SPEED, ID 0xB4)의 프레임입니다. 11번 문제에서 이 프레임을 끝까지 디코딩합니다.
