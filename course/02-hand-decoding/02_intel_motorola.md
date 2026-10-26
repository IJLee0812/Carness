---
title: Intel과 Motorola
type: read
minutes: 10
summary: 같은 값이 바이트 순서에 따라 어떻게 다르게 저장되는지, 격자에서 어느 방향으로 읽는지 익힙니다.
---
DBC 신호 정의의 `@1` 은 **Intel(리틀 엔디언)**, `@0` 은 **Motorola(빅 엔디언)** 입니다. 같은 100.00 km/h(raw 10000 = `0x2710`)를 두 방식으로 저장하면 프레임이 이렇게 달라집니다.

| 방식 | 신호 정의 | 프레임 |
|---|---|---|
| Intel | `SPEED : 0\|16@1+` | `10 27 00 …` |
| Motorola | `SPEED : 7\|16@0+` | `27 10 00 …` |

Intel은 작은 자리 바이트(`10`)를 먼저 적고, Motorola는 사람이 숫자를 쓰는 순서(`27 10`)대로 적습니다.

## 격자에서 읽는 방향

> [!IMPORTANT]
> 두 방식 모두 **한 줄 안에서는 왼쪽 → 오른쪽**으로 읽습니다. 다른 것은 줄을 옮기는 방향입니다.
>
> - **Intel**: 아래 줄(번호가 큰 바이트)에서 **위 줄로** 올라가며 읽습니다.
> - **Motorola**: 위 줄에서 **아래 줄로** 내려가며 읽습니다.

### Intel: `10 27`

```widget bitlab
vehicle = "example"
message = "EX_INTEL"
signal = "SPEED"
frame = "10 27 00 00 00 00 00 00"
mode = "view"
```

Byte 1 줄(`0x27` = `0010 0111`)을 먼저, Byte 0 줄(`0x10` = `0001 0000`)을 다음에 읽어 `0010011100010000` = 10000입니다.

### Motorola: `27 10`

```widget bitlab
vehicle = "example"
message = "EX_MOTOROLA"
signal = "SPEED"
frame = "27 10 00 00 00 00 00 00"
mode = "view"
```

Byte 0 줄(`0x27`)을 먼저, Byte 1 줄(`0x10`)을 다음에 읽어 같은 `0010011100010000` = 10000이 됩니다.

## 시작 비트의 뜻도 다르다

- **Motorola의 시작 비트는 MSB**, 즉 처음 읽는 칸입니다. `7|16` 은 Byte 0의 bit 7에서 시작합니다.
- **Intel의 시작 비트는 LSB**, 즉 마지막에 읽는 칸입니다. `0|16` 은 Byte 0의 bit 0에서 끝납니다.

실험실에서 시작 비트 칸에는 「시작」 표시가 붙어 있습니다. 두 위젯을 비교해 보면 Motorola는 순서 1인 칸에, Intel은 순서 16인 칸에 붙어 있습니다.

> [!NOTE]
> 일부 DBC 편집 도구는 Motorola 신호의 시작 비트를 LSB 기준으로 보여 줍니다. 여기서는 DBC 파일 원문과 cantools가 쓰는 MSB 기준을 씁니다. 도구마다 숫자가 다르면 이 차이부터 확인하세요.
