---
title: 체크섬 검증
type: code
minutes: 15
---

데이터가 전송 중에 깨졌는지 확인하려고, 보내는 쪽이 데이터로 계산한 값을 함께 실어 보냅니다. 이것이 **체크섬**입니다. 받는 쪽은 같은 계산을 해서 실려 온 값과 비교하고, 다르면 그 프레임을 믿지 않습니다.

RAV4의 여러 메시지는 마지막 바이트가 `CHECKSUM` 신호(`63|8@0+`)입니다. 계산법은 opendbc의 공개 코드에 있습니다.

```
체크섬 = (데이터 바이트 수 + ID 하위 바이트 + ID 상위 바이트 + 마지막 바이트를 뺀 데이터 바이트의 합)의 하위 8비트
```

차속 프레임 `00 00 00 00 1D 0B 7A 5E` 로 해 보면: 8 + 0xB4(180) + 0x00 + (0x1D + 0x0B + 0x7A = 162) = 350이고, 350의 하위 8비트는 94 = `0x5E` 입니다. 마지막 바이트 `5E` 와 같습니다.

- `data[:-1]` 은 「마지막 하나를 뺀 나머지」, `data[-1]` 은 「마지막 하나」입니다.
- `& 0xFF` 는 아래 8비트만 남깁니다. 256으로 나눈 나머지와 같습니다.
- `x != y` 는 「다르다」입니다.

## 문제

- `toyota_checksum(address, data)`: 위 공식으로 체크섬을 계산해 돌려주세요.
- `bad_frames(frames, address)`: `(시각, 데이터)` 리스트에서 체크섬이 맞지 않는 프레임 수를 돌려주세요.

```python starter
def toyota_checksum(address, data):
    total = len(data) + (address & 0xFF) + (address >> 8)
    for b in data[:-1]:
        total = ___
    return total & ___


def bad_frames(frames, address):
    count = 0
    for t, data in frames:
        if toyota_checksum(address, data) != data[-1]:
            count = ___
    return count
```

## 힌트

1. 바이트를 하나씩 더합니다: `total = total + b`
2. 아래 8비트만 남기는 마스크는 `0xFF`, 개수를 셀 때는 `count = count + 1`

## 정답

<details><summary>펼치기</summary>

```python solution
def toyota_checksum(address, data):
    total = len(data) + (address & 0xFF) + (address >> 8)
    for b in data[:-1]:
        total = total + b
    return total & 0xFF


def bad_frames(frames, address):
    count = 0
    for t, data in frames:
        if toyota_checksum(address, data) != data[-1]:
            count = count + 1
    return count
```

</details>

## 확인

```python check
toyota_checksum(0xB4, SPEED_FRAME)
toyota_checksum(0x260, bytes.fromhex("08 FF FB 00 00 00 18 84"))
bad_frames(frames_of(RAW, 0xB4), 0xB4)
bad_frames(frames_of(RAW, 0x260), 0x260)
bad_frames([(0.0, bytes.fromhex("00 00 00 00 1D 0B 7A 5F"))], 0xB4)
bad_frames([(0.0, bytes.fromhex("00 00 00 00 1D 0B 7B 5E"))], 0xB4)
```

## 통과 후

- 이 세그먼트의 체크섬 메시지(SPEED, STEER_TORQUE_SENSOR, GAS_PEDAL, PCM_CRUISE, PCM_CRUISE_2)는 모든 프레임의 체크섬이 맞습니다. 비트 하나만 바뀌어도(`7A` → `7B`) 바로 잡힙니다.
- 단순 합 체크섬에는 한계가 있습니다. 한 바이트가 +1, 다른 바이트가 −1만큼 바뀌면 합이 같아서 못 잡습니다. 그래서 더 엄격한 통신에서는 CRC를 씁니다.
- 체크섬은 깨진 데이터를 잡지만, 같은 프레임이 계속 반복되는 「멈춘 데이터」는 못 잡습니다. 그 역할은 보낼 때마다 0, 1, 2, … 로 증가하는 **카운터**가 합니다. Civic DBC에는 COUNTER 신호가 있으니 Civic 세그먼트로 카운터 연속성 검사를 만들어 보세요. 「안전 모니터」 모듈에서 이어서 다룹니다.
- 체크섬·카운터·수신 주기 감시를 묶어 표준화한 것이 AUTOSAR **E2E 보호**입니다. 기능안전에서 통신 경로의 결함을 잡는 안전 메커니즘의 대표적인 예입니다.
