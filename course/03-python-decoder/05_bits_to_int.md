---
title: 비트 목록을 정수로
type: code
minutes: 10
---

신호를 읽으면 비트가 MSB부터 차례로 나옵니다. 이 비트 목록을 정수로 바꾸는 방법은 이렇습니다. **0에서 시작해서, 비트를 하나 읽을 때마다 「지금 값 × 2 + 비트」로 바꿉니다.**

`[1, 0, 1, 1]` 이라면:

| 읽은 비트 | 계산 | 값 |
|---|---|---|
| 1 | 0 × 2 + 1 | 1 |
| 0 | 1 × 2 + 0 | 2 |
| 1 | 2 × 2 + 1 | 5 |
| 1 | 5 × 2 + 1 | 11 |

× 2는 2진수를 왼쪽으로 한 자리 미는 것입니다. 10진수에서 한 자리 밀면 × 10이 되는 것과 같습니다. 그래서 `value * 2` 대신 `value << 1` 로 써도 같습니다.

## 문제

`bits_to_int(bits)`: MSB부터 적힌 0/1 리스트를 정수로 바꿔 돌려주세요.

```python starter
def bits_to_int(bits):
    value = 0
    for b in bits:
        value = ___
    return value
```

## 힌트

1. 반복할 때마다 「지금 값 × 2 + 이번 비트」를 다시 `value` 에 넣습니다.
2. `value = value * 2 + b`

## 정답

<details><summary>펼치기</summary>

```python solution
def bits_to_int(bits):
    value = 0
    for b in bits:
        value = value * 2 + b
    return value
```

</details>

## 확인

```python check
bits_to_int([1, 0, 1, 1])
bits_to_int([1, 0, 1, 1, 0, 1, 0, 0])
bits_to_int([0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0])
bits_to_int([])
```

## 통과 후

파이썬에 내장된 `int("1011", 2)` 도 같은 일을 합니다. 직접 만들어 본 이유는, 신호 디코딩이 결국 「어느 비트를 어떤 순서로 읽는가」의 문제이기 때문입니다. 그 순서를 정하는 규칙이 다음 두 문제(Intel, Motorola)입니다.
