import json
import re

import pytest

from carness.io.comma2k19 import EXAMPLE, ROOT
from carness.lab import course, exercises

CODE = exercises.code_lessons()
HAS_EXAMPLE = (ROOT / EXAMPLE).exists()
WIDGETS = {"bitlab", "dbc"}


def test_course_structure():
    c = course.load()
    for m in c.modules:
        assert m.status in {"open", "soon"}
        assert m.lessons if m.status == "open" else not m.lessons
    ids = [lesson.id for lesson in c.lessons()]
    assert len(ids) == len(set(ids))
    assert [lesson.slug[:2] for lesson in CODE] == [f"{i:02d}" for i in range(len(CODE))]


@pytest.mark.parametrize("lesson", course.load().lessons(), ids=lambda le: le.id)
def test_lesson_renders_with_known_widgets(lesson):
    assert lesson.title and lesson.html
    assert "[!" not in lesson.html
    for name, config in re.findall(r'data-widget="(\w+)" data-config="([^"]*)"', lesson.html):
        assert name in WIDGETS
        json.loads(config.replace("&quot;", '"'))


@pytest.mark.parametrize("lesson", CODE, ids=lambda le: le.slug)
def test_solution_passes_and_starter_has_blanks(lesson):
    if "EXAMPLE" in "".join(exercises.prelude(lesson)) and not HAS_EXAMPLE:
        pytest.skip("예제 데이터 없음")
    assert lesson.hints and lesson.checks
    assert "___" in lesson.starter
    result = exercises.run_code(lesson, lesson.solution)
    assert result["status"] == "pass", result


def _code(slug_prefix):
    return next(lesson for lesson in CODE if lesson.slug.startswith(slug_prefix))


def test_runner_points_at_the_failing_line():
    result = exercises.run_code(_code("03_"), "def bit_of_byte(byte, bit):\n    return (byte >> bit) & one\n")
    assert result["status"] == "fail"
    assert all(not c["ok"] and c["line"] == 2 for c in result["checks"])


def test_runner_explains_missing_return():
    result = exercises.run_code(_code("00_"), "def kmh_to_ms(kmh):\n    kmh / 3.6\n")
    assert result["status"] == "fail"
    assert "return" in result["checks"][0]["hint"]


def test_runner_reports_syntax_error_line():
    result = exercises.run_code(_code("00_"), "def kmh_to_ms(kmh)\n    return kmh / 3.6\n")
    assert result["status"] == "error" and result["line"] == 1
