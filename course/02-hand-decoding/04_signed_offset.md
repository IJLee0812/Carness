---
title: 부호와 offset
type: read
minutes: 8
summary: 2의 보수로 음수를 읽고, factor·offset으로 물리값을 만듭니다.
---
비트를 읽어 나온 정수(raw)는 아직 「물리값」이 아닙니다. 두 단계가 더 있습니다.

## 1. 부호 (2의 보수)

DBC의 `+` 는 unsigned, `-` 는 signed입니다. signed 신호는 **2의 보수**로 저장됩니다.

> [!IMPORTANT]
> n비트 signed 신호에서 **첫 비트(MSB)가 1이면 음수**이고, 실제 값은 **raw − 2ⁿ** 입니다.

`EX_INTEL` 의 `TEMP : 16|8@1-` 에 `F6` 이 들어 있습니다.

```widget bitlab
vehicle = "example"
message = "EX_INTEL"
signal = "TEMP"
frame = "00 00 F6 85 0F 00 00 00"
mode = "view"
```

- `0xF6` = `11110110` = 246. 첫 비트가 1이므로 246 − 2⁸ = 246 − 256 = **−10** 입니다.
- 같은 프레임에서 `STEER : 24|12@1- (0.1,0)` 도 보세요. 12비트라 2¹² = 4096을 뺍니다. raw 3973 → 3973 − 4096 = −123 → × 0.1 = **−12.3도**입니다.

> [!WARNING]
> 길이가 다르면 같은 raw도 다른 값이 됩니다. 4093은 12비트 signed로는 −3이지만 16비트 signed로는 그대로 4093입니다.

## 2. factor와 offset

**물리값 = raw × factor + offset** 입니다. offset이 있으면 raw 0이 물리값 0이 아닙니다.

`EX_ODD_BOUNDARY` 의 `OFFSET_ONLY : 40|8@1+ (0.5,-40)` 는 온도처럼 음수까지 표현하는 신호입니다.

```widget bitlab
vehicle = "example"
message = "EX_ODD_BOUNDARY"
signal = "OFFSET_ONLY"
frame = "E0 01 3F C0 00 82 00 00"
mode = "view"
```

Byte 5 = `0x82` = 130 → 130 × 0.5 − 40 = **25** 입니다. Byte 5를 `00` 으로 바꾸면 −40이 됩니다.

## 범위로 값이 말이 되는지 보기

DBC의 `[최소|최대]` 는 물리값이 가질 수 있는 범위입니다. 범위를 벗어난 값이 나오면 디코딩 실수, 다른 차종의 DBC, 센서 고장(무효값) 중 하나를 의심합니다. 이렇게 값이 말이 되는지 보는 **타당성 검사**가 검증의 첫 단계입니다.
