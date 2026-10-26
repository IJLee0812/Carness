import json
import re
import subprocess
import sys
from pathlib import Path

from carness.lab import course
from carness.lab.course import Lesson

ROOT = course.ROOT
PRACTICE_DIR = ROOT / "practice"
PROGRESS = PRACTICE_DIR / "progress.json"
TIMEOUT_S = 60

_DEF = re.compile(r"^def (\w+)", re.MULTILINE)
_CONST = re.compile(r"^([A-Z][A-Z0-9_]*) =", re.MULTILINE)


def code_lessons() -> list[Lesson]:
    return [lesson for lesson in course.load().lessons() if lesson.kind == "code"]


def practice_path(lesson: Lesson) -> Path:
    return PRACTICE_DIR / lesson.module / f"{lesson.slug}.py"


def _before(lesson: Lesson) -> list[Lesson]:
    out = []
    for prev in code_lessons():
        if prev.id == lesson.id:
            return out
        out.append(prev)
    return out


def prelude(lesson: Lesson) -> list[str]:
    codes = [code for prev in _before(lesson) for code in (prev.setup, prev.solution)] + [lesson.setup]
    return [c for c in codes if c]


def given(lesson: Lesson) -> dict:
    before = _before(lesson)
    return {
        "functions": [name for prev in before for name in _DEF.findall(prev.solution)],
        "values": [name for prev in [*before, lesson] for name in _CONST.findall(prev.setup)],
    }


def progress() -> dict[str, bool]:
    try:
        return json.loads(PROGRESS.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def mark(lesson_id: str, done: bool) -> None:
    state = progress()
    if done:
        state[lesson_id] = True
    else:
        state.pop(lesson_id, None)
    PRACTICE_DIR.mkdir(exist_ok=True)
    PROGRESS.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def current_code(lesson: Lesson) -> str:
    path = practice_path(lesson)
    return path.read_text() if path.exists() else lesson.starter


def save(lesson: Lesson, code: str) -> None:
    path = practice_path(lesson)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(code)


def reset(lesson: Lesson) -> str:
    practice_path(lesson).unlink(missing_ok=True)
    return lesson.starter


def run_code(lesson: Lesson, code: str) -> dict:
    blanks = [n for n, line in enumerate(code.splitlines(), start=1) if "___" in line]
    if blanks:
        return {"status": "blank", "message": f"빈칸(___)이 {len(blanks)}곳 남았습니다. 채운 뒤 실행하세요.",
                "detail": "", "lines": blanks, "line": None, "stdout": "", "checks": []}
    job = {"prelude": prelude(lesson), "solution": lesson.solution, "code": code, "checks": lesson.checks,
           "path": str(practice_path(lesson))}
    try:
        proc = subprocess.run([sys.executable, "-m", "carness.lab.runner"], input=json.dumps(job), cwd=ROOT,
                              capture_output=True, text=True, timeout=TIMEOUT_S, check=False)
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": f"{TIMEOUT_S}초 안에 끝나지 않았습니다. 끝나지 않는 반복이 없는지 확인하세요.",
                "detail": "", "line": None, "stdout": "", "checks": []}
    lines = proc.stdout.strip().splitlines()
    if not lines:
        return {"status": "error", "message": "채점기가 결과를 내지 못했습니다. exit()처럼 프로그램을 끝내는 코드가 있는지 확인하세요.",
                "detail": proc.stderr[-1500:], "line": None, "stdout": "", "checks": []}
    return json.loads(lines[-1])


def run_saved(lesson: Lesson) -> dict:
    result = run_code(lesson, current_code(lesson))
    if result["status"] == "pass":
        mark(lesson.id, True)
    return result


def _print_result(lesson: Lesson, r: dict) -> None:
    print(f"\n[{lesson.slug}] {lesson.title}")
    if r["message"]:
        print(r["message"])
    if r.get("detail"):
        print(f"  {r['detail']}" + (f"  ({r['line']}번째 줄)" if r.get("line") else ""))
    if r.get("lines"):
        print(f"  빈칸이 있는 줄: {', '.join(map(str, r['lines']))}")
    for c in r["checks"]:
        print(f"  {'✓' if c['ok'] else '✗'} {c['expr']}\n      기대 {c['expected']}   결과 {c['got']}")
        if c.get("hint"):
            print(f"      → {c['hint']}")
    if r["stdout"]:
        print("\n출력:\n" + r["stdout"])
    if r["status"] == "pass":
        print("통과!")


def cli() -> None:
    args = sys.argv[1:]
    lessons = code_lessons()
    if not args:
        done = progress()
        module = ""
        for lesson in lessons:
            if lesson.module != module:
                module = lesson.module
                print(f"\n{module}")
            print(f"  {'✓' if done.get(lesson.id) else '·'} {lesson.slug}  {lesson.title}")
        print("\n채점: uv run carness-check 03   (코드는 practice/ 에 저장됩니다)")
        return
    hits = [lesson for lesson in lessons if lesson.slug.startswith(f"{args[0].zfill(2)}_")]
    if len(hits) != 1:
        sys.exit(f"없는 문제 번호입니다: {args[0]}")
    lesson = hits[0]
    if not practice_path(lesson).exists():
        save(lesson, lesson.starter)
        print(f"시작 코드를 만들었습니다: {practice_path(lesson).relative_to(ROOT)}  (편집한 뒤 다시 실행하세요)")
    r = run_saved(lesson)
    _print_result(lesson, r)
    sys.exit(0 if r["status"] == "pass" else 1)
