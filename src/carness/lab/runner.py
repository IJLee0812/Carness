import contextlib
import io
import json
import math
import sys
import traceback

MAX_STDOUT = 4000
SHOW_ITEMS = 16

EXPLAIN = {
    "SyntaxError": "문법 오류입니다. 괄호·따옴표의 짝, 줄 끝의 콜론(:)을 확인하세요.",
    "IndentationError": "들여쓰기 오류입니다. def·for·if 아래 줄은 4칸씩 들여씁니다.",
    "TabError": "들여쓰기에 탭과 공백이 섞였습니다. 공백 4칸으로 통일하세요.",
    "NameError": "정의되지 않은 이름을 썼습니다. 철자를 확인하거나, 값을 먼저 만든 뒤에 쓰세요.",
    "TypeError": "값의 자료형이 맞지 않습니다. 예: 문자열과 숫자를 더하거나, 인자 개수가 다를 때.",
    "IndexError": "범위를 벗어난 위치를 읽었습니다. 예: 8바이트 프레임에서 data[8].",
    "ValueError": "값의 형식이 맞지 않습니다. 예: int('xyz', 16).",
    "KeyError": "사전(dict)에 없는 키를 찾았습니다. 키 이름의 철자를 확인하세요.",
    "AttributeError": "그 값에는 없는 기능(속성)을 불렀습니다. 이름을 확인하세요.",
    "ZeroDivisionError": "0으로 나눴습니다.",
    "FileNotFoundError": "데이터 파일이 없습니다. 먼저 `uv run python scripts/download_example.py`로 예제 데이터를 받으세요.",
}

KIND = {
    bool: "참/거짓(bool)", int: "정수(int)", float: "실수(float)", str: "문자열(str)", bytes: "바이트(bytes)",
    list: "리스트(list)", tuple: "튜플(tuple)", dict: "사전(dict)", type(None): "없음(None)",
}


def plain(v):
    return v.tolist() if type(v).__module__ == "numpy" else v


def show(v) -> str:
    v = plain(v)
    if isinstance(v, (bytes, bytearray)):
        return "bytes(" + " ".join(f"{b:02X}" for b in v) + ")"
    if isinstance(v, float):
        return repr(round(v, 10))
    if isinstance(v, (list, tuple)):
        body = ", ".join(show(x) for x in v[:SHOW_ITEMS])
        more = f", … 총 {len(v)}개" if len(v) > SHOW_ITEMS else ""
        return f"[{body}{more}]" if isinstance(v, list) else f"({body}{more})"
    if isinstance(v, dict):
        return "{" + ", ".join(f"{k!r}: {show(x)}" for k, x in v.items()) + "}"
    return repr(v)


def same(a, b) -> bool:
    a, b = plain(a), plain(b)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-9)
    if isinstance(a, (bytes, bytearray)) and isinstance(b, (bytes, bytearray)):
        return bytes(a) == bytes(b)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(same(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(same(a[k], b[k]) for k in a)
    return a == b


def mismatch_hint(expected, got) -> str:
    expected, got = plain(expected), plain(got)
    if got is None:
        return "함수가 값을 돌려주지 않았습니다(None). return을 빠뜨렸나요?"
    numbers = (int, float)
    if isinstance(expected, numbers) and isinstance(got, numbers):
        return ""
    if type(expected) is not type(got):
        return f"기대한 자료형은 {KIND.get(type(expected), type(expected).__name__)}인데 " \
               f"{KIND.get(type(got), type(got).__name__)}이(가) 나왔습니다."
    if isinstance(expected, (list, tuple)) and len(expected) != len(got):
        return f"개수가 다릅니다: 기대 {len(expected)}개, 결과 {len(got)}개."
    return ""


def explain(exc: BaseException, path: str | None) -> dict:
    line = None
    if isinstance(exc, SyntaxError) and exc.filename == path:
        line = exc.lineno
    for frame in traceback.extract_tb(exc.__traceback__):
        if frame.filename == path:
            line = frame.lineno
    name = type(exc).__name__
    return {"message": EXPLAIN.get(name, "실행 중 오류가 났습니다."), "detail": f"{name}: {exc}", "line": line}


def run(job: dict) -> dict:
    result = {"status": "pass", "message": "", "detail": "", "line": None, "stdout": "", "checks": []}
    base = {"__name__": "carness_exercise"}
    try:
        for code in job["prelude"]:
            exec(code, base)
    except Exception as exc:
        info = explain(exc, None)
        return {**result, "status": "error", **info, "message": "준비 단계에서 멈췄습니다. " + info["message"]}

    ref = dict(base)
    exec(job["solution"], ref)
    user = dict(base)
    out = io.StringIO()
    path = job["path"]
    with contextlib.redirect_stdout(out):
        try:
            exec(compile(job["code"], path, "exec"), user)
        except Exception as exc:
            result.update(status="error", **explain(exc, path))
        if result["status"] != "error":
            for expr in job["checks"]:
                expected = eval(expr, ref)
                row = {"expr": expr, "expected": show(expected)}
                try:
                    got = eval(expr, user)
                except Exception as exc:
                    info = explain(exc, path)
                    row.update(ok=False, got="오류", hint=f"{info['message']} ({info['detail']})", line=info["line"])
                else:
                    ok = same(expected, got)
                    row.update(ok=ok, got=show(got), hint="" if ok else mismatch_hint(expected, got), line=None)
                result["checks"].append(row)
            passed = sum(r["ok"] for r in result["checks"])
            if passed < len(result["checks"]):
                result.update(status="fail", message=f"{len(result['checks'])}개 중 {passed}개를 맞혔습니다.")
    result["stdout"] = out.getvalue()[:MAX_STDOUT]
    return result


def main() -> None:
    result = run(json.load(sys.stdin))
    sys.__stdout__.write(json.dumps(result, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
