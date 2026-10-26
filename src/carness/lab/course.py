import html
import json
import re
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[3]
COURSE_DIR = ROOT / "course"
KINDS = {"read", "tool", "code"}

_FENCE = re.compile(r"```python (starter|solution|setup|check)\n(.*?)```\n?", re.DOTALL)
_SECTION = re.compile(r"^## (.+)$", re.MULTILINE)
_HINT = re.compile(r"^\d+\.\s+(.*)$", re.MULTILINE)
_CALLOUT = re.compile(r"<blockquote>\n<p>\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*")
_CALLOUT_TITLE = {"NOTE": "참고", "TIP": "팁", "IMPORTANT": "핵심", "WARNING": "주의"}
_SPECIAL_SECTIONS = {"힌트", "정답", "확인", "통과 후"}


def _widget_fence(self, tokens, idx, options, env):
    token = tokens[idx]
    kind, _, name = token.info.strip().partition(" ")
    if kind != "widget":
        return self.fence(tokens, idx, options, env)
    config = json.dumps(tomllib.loads(token.content), ensure_ascii=False)
    return f'<div class="widget" data-widget="{html.escape(name.strip())}" data-config="{html.escape(config)}"></div>\n'


_md = MarkdownIt("commonmark", {"html": True}).enable("table")
_md.add_render_rule("fence", _widget_fence)


def render(text: str) -> str:
    out = _md.render(text)
    return _CALLOUT.sub(lambda m: f'<blockquote class="callout callout-{m.group(1).lower()}">'
                                  f'<p><span class="callout-title">{_CALLOUT_TITLE[m.group(1)]}</span>', out)


@dataclass
class Lesson:
    id: str
    module: str
    slug: str
    title: str
    kind: str
    minutes: int
    summary: str
    html: str
    after_html: str = ""
    hints: list[str] = field(default_factory=list)
    starter: str = ""
    solution: str = ""
    setup: str = ""
    checks: list[str] = field(default_factory=list)


@dataclass
class Module:
    dir: str
    title: str
    summary: str
    status: str
    planned: list[str]
    lessons: list[Lesson]


@dataclass
class Course:
    title: str
    subtitle: str
    description: str
    modules: list[Module]

    def lessons(self) -> list[Lesson]:
        return [lesson for m in self.modules for lesson in m.lessons]

    def find(self, lesson_id: str) -> Lesson:
        for lesson in self.lessons():
            if lesson.id == lesson_id:
                return lesson
        raise KeyError(lesson_id)


def _front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    head, body = text[4:].split("\n---\n", 1)
    meta = {}
    for line in head.splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return meta, body


def _lesson(module: str, path: Path) -> Lesson:
    meta, text = _front_matter(path.read_text())
    kind = meta.get("type", "read")
    if kind not in KINDS:
        raise ValueError(f"{path}: type은 {sorted(KINDS)} 중 하나여야 합니다")
    blocks = dict(_FENCE.findall(text))
    pieces = _SECTION.split(_FENCE.sub("", text))
    body, after, hints = [pieces[0]], "", []
    for name, content in zip(pieces[1::2], pieces[2::2]):
        name = name.strip()
        if name == "힌트":
            hints = [_md.renderInline(h) for h in _HINT.findall(content)]
        elif name == "통과 후":
            after = render(content)
        elif name not in _SPECIAL_SECTIONS:
            body.append(f"## {name}\n{content}")
    return Lesson(
        id=f"{module}/{path.stem}", module=module, slug=path.stem, title=meta.get("title", path.stem), kind=kind,
        minutes=int(meta.get("minutes", 5)), summary=meta.get("summary", ""), html=render("".join(body)),
        after_html=after, hints=hints, starter=blocks.get("starter", ""), solution=blocks.get("solution", ""),
        setup=blocks.get("setup", ""), checks=[c for c in blocks.get("check", "").splitlines() if c.strip()],
    )


def load() -> Course:
    spec = tomllib.loads((COURSE_DIR / "course.toml").read_text())
    modules = []
    for m in spec["modules"]:
        folder = COURSE_DIR / m["dir"]
        lessons = [_lesson(m["dir"], p) for p in sorted(folder.glob("*.md"))] if folder.is_dir() else []
        modules.append(Module(m["dir"], m["title"], m.get("summary", ""), m.get("status", "open"),
                              m.get("planned", []), lessons))
    return Course(spec["title"], spec.get("subtitle", ""), spec.get("description", ""), modules)
