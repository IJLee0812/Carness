# Windows에서 comma2k19 예제 받기와 읽기

## 예측

`uv sync` 뒤 `scripts/download_example.py`를 실행하면 Example_1이 `data/raw/comma2k19/`에 그대로 받아진다.

## 실측

- 받기에 실패했다: `OSError: [WinError 123]`. 원본 경로의 세그먼트 폴더 이름 `b0c9d2329ad1606b|2018-08-02--08-34-47`에 들어 있는 `|`는 Windows 파일 이름에 쓸 수 없다.
- 받기 문제를 고치자 `pytest` 수집 단계에서 `UnicodeDecodeError: 'cp949'`가 났다. `read_text()`에 encoding을 주지 않으면 Windows에서는 로캘 코드페이지로 읽어서 UTF-8 한글 파일이 깨진다.

## 차이와 조치

- `carness.io.comma2k19.local_path()`: Windows에서는 `|`를 `_`로 바꿔 저장한다. `EXAMPLE`과 받기 스크립트가 모두 이 함수를 쓰고, `segments()`는 `|`와 `_` 두 구분자를 모두 인식한다.
- 텍스트 파일을 읽고 쓸 때는 모두 `encoding="utf-8"`을 지정한다.
- 확인: 세그먼트가 `rav4_2017`로 인식되고 `raw_can`이 135,468프레임(t 46408.6 → 46468.6초, 약 60초)으로 읽힌다. `pytest`는 57개 통과, skip 0개(실제 데이터 테스트 포함).
