# course — 학습 콘텐츠

`uv run carness-lab` 으로 여는 학습 화면(http://127.0.0.1:8780)의 내용은 모두 이 폴더에서 나옵니다. 화면 코드는 고치지 않고 파일만 추가해서 레슨과 모듈을 늘릴 수 있습니다.

## 구조

```
course/
├── course.toml            # 모듈 순서·제목·소개 (준비 중 모듈과 예정 레슨도 여기)
├── 01-dbc/                # 모듈 하나 = 폴더 하나 (course.toml의 dir)
│   ├── 01_what_is_dbc.md  # 레슨 하나 = 마크다운 하나, 파일 이름 순서대로 나열
│   └── …
└── …
```

- **모듈 추가**: `course.toml` 에 `[[modules]]` 를 추가합니다. 아직 레슨이 없으면 `status = "soon"` 과 `planned = [...]` 로 「준비 중」 카드를 띄웁니다.
- **레슨 추가**: 모듈 폴더에 `NN_slug.md` 를 넣습니다. 진행 상황은 `모듈/파일 이름` 을 키로 `practice/progress.json`(커밋 안 됨)에 저장됩니다.

## 레슨 파일

맨 위에 머리말을 둡니다.

```
---
title: 레슨 제목
type: read          # read(읽기) · tool(실습 도구) · code(코드 채점)
minutes: 8          # 예상 시간
summary: 제목 아래 한 줄 소개
---
```

본문은 일반 마크다운이고, 아래 두 가지를 더 쓸 수 있습니다.

**강조 상자**: GitHub 알림 문법을 그대로 씁니다. `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`

**위젯**: `widget 이름` 펜스 안에 TOML로 설정을 적으면 그 자리에 실습 도구가 들어갑니다.

````
```widget bitlab
vehicle = "example"         # example · rav4_2017 · civic_2016
message = "EX_INTEL"
signal = "SPEED"
frame = "10 27 00 00 00 00 00 00"   # 생략하면 실제 로그나 무작위 프레임
mode = "view"               # view(풀이 공개) · practice(채점)
free = true                 # 메시지를 바꿀 수 있게 할지
```
````

| 위젯 | 설정 |
|---|---|
| `bitlab` (비트 실험실) | `vehicle`, `message`, `signal`, `frame`, `mode`, `free` |
| `dbc` (DBC 탐색기) | `vehicle`, `message`, `signal`, `view`(`message` · `matrix`) |

새 위젯은 `src/carness/lab/static/js/widgets/` 에 `mount(el, config)` 를 내보내는 모듈로 만들고 `widgets/index.js` 에 등록합니다.

## 코드 레슨 (`type: code`)

본문 안에 이름이 붙은 python 펜스 블록을 둡니다.

| 블록 | 쓰임 |
|---|---|
| `python starter` | 편집기에 처음 들어가는 코드. 빈칸은 `___` |
| `python solution` | 정답. 다음 코드 레슨부터는 이 함수들이 미리 들어감 |
| `python setup` | 채점 전에 실행하는 준비 코드(데이터 로드 등). 다음 레슨에도 이어짐 |
| `python check` | 한 줄에 식 하나. 내 코드와 정답으로 각각 계산해 비교 |

`## 힌트`(번호 목록), `## 정답`, `## 확인` 섹션은 화면 본문에서 빠지고, `## 통과 후` 는 통과했을 때만 보입니다. 코드 레슨은 모듈이 달라도 파일 이름 앞 번호(`00`~)가 전체에서 이어지고, 터미널에서 `uv run carness-check 03` 처럼 채점할 수 있습니다.

레슨을 고친 뒤에는 `uv run pytest` 로 모든 레슨이 렌더링되고 정답이 채점을 통과하는지 확인합니다.
