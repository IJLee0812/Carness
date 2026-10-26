---
title: DBC 신호 한 줄 읽기
type: code
minutes: 15
---

DBC 파일에서 신호 하나는 이렇게 한 줄로 적힙니다.

```
 SG_ SPEED : 47|16@0+ (0.01,0) [0|250] "km/h" XXX
```

- `SPEED`: 신호 이름
- `47`: 시작 비트
- `16`: 길이(비트 수)
- `@0` / `@1`: 0은 Motorola(빅 엔디언), 1은 Intel(리틀 엔디언)
- `+` / `-`: unsigned / signed
- `(0.01,0)`: factor, offset
- `[0|250]`: 최소, 최대
- `"km/h"`: 단위
- `XXX`: 이 신호를 받는 노드(ECU) 이름

파이썬으로 문자열을 자르는 도구는 이렇습니다.

```python
"47|16@0+".split("|")           # ['47', '16@0+']  기준 글자로 나누기
" (0.01,0) [0|250]".split()     # ['(0.01,0)', '[0|250]']  인자가 없으면 공백으로 나누기
"a b c d e".split()[:4]         # ['a', 'b', 'c', 'd']  [:4]는 앞의 4개만
"(0.01,0)".strip("()")          # '0.01,0'  양 끝의 괄호 떼기
" SG_ SPEED ".replace("SG_", "").strip()   # 'SPEED'  바꾸고 양 끝 공백 떼기
int("47"), float("0.01")        # 47, 0.01  글자를 숫자로
a, b = "47|16".split("|")       # a = '47', b = '16'  나눠서 한 번에 받기
"0+"[0], "0+"[1]                # '0', '+'  문자열도 위치로 꺼냄
"intel" if x == "1" else "motorola"   # 조건이 참이면 앞, 아니면 뒤
```

결과는 **사전(dict)** 으로 돌려줍니다. 사전은 이름표(키)가 붙은 값의 묶음입니다.

```python
sig = {"name": "SPEED", "start": 47}
sig["start"]    # 47
```

멀티플렉스 신호(`SG_ 이름 m1 :` 처럼 이름 뒤에 표시가 붙은 것)는 여기서 다루지 않습니다.

## 문제

`parse_sg(line)`: 신호 줄을 읽어 아래 키를 가진 사전을 돌려주세요. 대부분 완성되어 있고 빈칸 4곳만 채우면 됩니다. 채우기 전에 위에서부터 한 줄씩 읽으며 각 변수에 어떤 글자가 들어가는지 확인하세요. `print(layout)` 처럼 넣어 봐도 됩니다.

| 키 | SPEED 줄의 값 |
|---|---|
| `name` | `"SPEED"` |
| `start`, `length` | `47`, `16` (정수) |
| `byte_order` | `"motorola"` 또는 `"intel"` |
| `is_signed` | `False` (`-` 이면 `True`) |
| `factor`, `offset` | `0.01`, `0.0` (실수) |
| `minimum`, `maximum` | `0.0`, `250.0` (실수) |
| `unit` | `"km/h"` |

```python starter
def parse_sg(line):
    head, tail = line.split(":", 1)
    name = head.replace("SG_", "").strip()
    layout, scale, limits, unit = tail.split()[:4]

    start, rest = layout.split("|")
    length, order_sign = rest.split("@")
    factor, offset = scale.strip("()").split(",")
    minimum, maximum = limits.strip("[]").split("|")

    return {
        "name": name,
        "start": int(start),
        "length": ___,
        "byte_order": "intel" if order_sign[0] == "1" else "motorola",
        "is_signed": ___,
        "factor": float(factor),
        "offset": ___,
        "minimum": float(minimum),
        "maximum": ___,
        "unit": unit.strip('"'),
    }
```

## 힌트

1. 정수는 `int(...)`, 실수는 `float(...)` 로 바꿉니다. 이웃한 줄(start, factor, minimum)을 따라 쓰면 됩니다.
2. 부호 글자는 `order_sign[1]` 입니다. `-` 와 같으면 True이므로 `order_sign[1] == "-"`

## 정답

<details><summary>펼치기</summary>

```python solution
def parse_sg(line):
    head, tail = line.split(":", 1)
    name = head.replace("SG_", "").strip()
    layout, scale, limits, unit = tail.split()[:4]

    start, rest = layout.split("|")
    length, order_sign = rest.split("@")
    factor, offset = scale.strip("()").split(",")
    minimum, maximum = limits.strip("[]").split("|")

    return {
        "name": name,
        "start": int(start),
        "length": int(length),
        "byte_order": "intel" if order_sign[0] == "1" else "motorola",
        "is_signed": order_sign[1] == "-",
        "factor": float(factor),
        "offset": float(offset),
        "minimum": float(minimum),
        "maximum": float(maximum),
        "unit": unit.strip('"'),
    }
```

</details>

## 확인

```python setup
SPEED_LINE = ' SG_ SPEED : 47|16@0+ (0.01,0) [0|250] "km/h" XXX'
STEER_LINE = ' SG_ STEER_ANGLE : 3|12@0- (1.5,0) [-500|500] "deg" XXX'
WHEEL_FR_LINE = ' SG_ WHEEL_SPEED_FR : 7|16@0+ (0.01,-67.67) [0|250] "km/h" XXX'
EX_INTEL_SPEED_LINE = ' SG_ SPEED : 0|16@1+ (0.01,0) [0|655.35] "km/h" XXX'
EX_INTEL_TEMP_LINE = ' SG_ TEMP : 16|8@1- (1,0) [-128|127] "degC" XXX'
EX_MOTOROLA_SPEED_LINE = ' SG_ SPEED : 7|16@0+ (0.01,0) [0|655.35] "km/h" XXX'
```

```python check
parse_sg(SPEED_LINE)
parse_sg(STEER_LINE)
parse_sg(WHEEL_FR_LINE)
parse_sg(EX_INTEL_TEMP_LINE)
```

## 통과 후

DBC 파일은 이런 줄의 모음입니다. `BO_` 줄이 메시지(ID, 이름, 바이트 수)를, 그 아래 `SG_` 줄들이 신호를 정의합니다. 준비된 값의 신호 줄은 opendbc의 RAV4 DBC와 이 repo의 `configs/examples.dbc` 에서 그대로 가져왔습니다.
