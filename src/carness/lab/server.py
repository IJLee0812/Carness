import os
import random
import threading
import webbrowser
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np
import uvicorn
from cantools.database import DecodeError
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from carness.can import matrix
from carness.can.bits import bit_positions, hand_decode
from carness.can.dbc import VEHICLES, load, message_block
from carness.io import comma2k19
from carness.lab import course, exercises
from carness.lab.course import Lesson

STATIC = Path(__file__).parent / "static"
app = FastAPI(title="Carness")
# 코드를 실행하는 서버라서 다른 사이트가 이 주소로 요청을 보내지 못하게 막는다
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])


def _message(vehicle: str, frame_id: int):
    try:
        return load(vehicle).db.get_message_by_frame_id(frame_id)
    except KeyError:
        raise HTTPException(404, "DBC에 없는 메시지")


def _segment(vehicle: str) -> str | None:
    return comma2k19.first_segment(vehicle)


@lru_cache(maxsize=4)
def _observed(vehicle: str) -> Counter:
    seg = _segment(vehicle)
    if not seg:
        return Counter()
    raw = comma2k19.load_raw_can(seg)
    return Counter(zip(raw.src.tolist(), raw.address.tolist()))


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/vehicles")
def vehicles():
    return [
        {"key": k, "label": v["label"], "dbc": v["dbc"], "segment": _segment(k), "lint": len(load(k).issues)}
        for k, v in VEHICLES.items()
    ]


@app.get("/api/lint")
def lint(vehicle: str):
    return [{"line": i.line, "original": i.original, "action": i.action} for i in load(vehicle).issues]


@app.get("/api/messages")
def messages(vehicle: str):
    seen = _observed(vehicle)
    out = []
    for m in load(vehicle).db.messages:
        buses = {bus: n for (bus, addr), n in seen.items() if addr == m.frame_id}
        out.append({
            "id": m.frame_id, "name": m.name, "length": m.length, "signals": len(m.signals),
            "observed": sum(buses.values()), "buses": buses, "comment": m.comment,
        })
    return sorted(out, key=lambda x: (-x["observed"], x["id"]))


@app.get("/api/message")
def message(vehicle: str, id: int):
    m = _message(vehicle, id)
    buses = matrix.observed(_segment(vehicle)).get(m.frame_id, {})
    return {
        "id": m.frame_id, "name": m.name, "length": m.length, "comment": m.comment, "senders": m.senders,
        "cycle_time": m.cycle_time, "block": message_block(load(vehicle).text, m),
        "buses": {str(b): {"count": o.count, "period_ms": o.period_ms} for b, o in sorted(buses.items())},
        "signals": [{
            "name": s.name, "start": s.start, "length": s.length, "byte_order": s.byte_order,
            "is_signed": s.is_signed, "scale": s.scale, "offset": s.offset, "unit": s.unit or "",
            "minimum": s.minimum, "maximum": s.maximum, "comment": s.comment,
            "choices": {str(k): str(v) for k, v in (s.choices or {}).items()},
            "multiplexed": bool(s.multiplexer_ids), "receivers": s.receivers,
            "positions": bit_positions(s.start, s.length, s.byte_order),
        } for s in m.signals],
    }


@app.get("/api/frame")
def frame(vehicle: str, id: int, source: str = "real"):
    m = _message(vehicle, id)
    if source == "random":
        return {"data": bytes(random.randrange(256) for _ in range(m.length)).hex(), "source": "무작위"}
    seg = _segment(vehicle)
    if not seg:
        raise HTTPException(404, "이 차종의 실제 데이터가 아직 없습니다")
    raw = comma2k19.load_raw_can(seg)
    idx = np.flatnonzero(raw.address == id)
    if not len(idx):
        raise HTTPException(404, "이 세그먼트에서 관측되지 않은 메시지입니다")
    j = int(random.choice(idx))
    return {
        "data": bytes(raw.data[j][: m.length]).hex(), "source": "실제 데이터",
        "t": float(raw.t[j]), "bus": int(raw.src[j]), "segment": seg,
    }


class CheckRequest(BaseModel):
    vehicle: str
    id: int
    data: str
    signal: str
    raw: int | None = None
    physical: float | None = None


@app.post("/api/check")
def check(req: CheckRequest):
    m = _message(req.vehicle, req.id)
    data = bytes.fromhex(req.data)
    if len(data) != m.length:
        raise HTTPException(400, f"바이트 수가 DLC({m.length})와 다릅니다")
    try:
        sig = m.get_signal_by_name(req.signal)
    except KeyError:
        raise HTTPException(404, "없는 신호")
    hand = hand_decode(data, sig.start, sig.length, sig.byte_order, sig.is_signed, sig.scale, sig.offset)
    try:
        ref = m.decode(data, decode_choices=False).get(sig.name)
    except DecodeError:
        ref = None
    tol = abs(sig.scale) / 2 if sig.scale else 1e-9
    return {
        "positions": hand.positions, "bits": hand.bits, "raw_unsigned": hand.raw_unsigned, "raw": hand.raw,
        "physical": hand.physical, "cantools": ref, "unit": sig.unit or "",
        "choice": str(sig.choices[hand.raw]) if sig.choices and hand.raw in sig.choices else None,
        "raw_ok": None if req.raw is None else req.raw == hand.raw,
        "physical_ok": None if req.physical is None else abs(req.physical - hand.physical) <= tol,
    }


@app.get("/api/dbc/overview")
def dbc_overview(vehicle: str):
    loaded = load(vehicle)
    seen = matrix.observed(_segment(vehicle))
    messages = []
    for m in sorted(loaded.db.messages, key=lambda m: m.frame_id):
        buses = seen.get(m.frame_id, {})
        main = matrix.main_bus(buses)
        messages.append({
            "id": m.frame_id, "name": m.name, "length": m.length, "senders": m.senders, "signals": len(m.signals),
            "signal_names": [sig.name for sig in m.signals],
            "buses": sorted(buses), "period_ms": main[1].period_ms if main else None,
        })
    return {
        "dbc": loaded.name, "nodes": [n.name for n in loaded.db.nodes], "segment": _segment(vehicle),
        "signals": sum(len(m.signals) for m in loaded.db.messages), "lint": len(loaded.issues), "messages": messages,
    }


@app.get("/api/dbc/matrix")
def dbc_matrix(vehicle: str):
    return {"columns": matrix.COLUMNS, "rows": matrix.rows(load(vehicle).db, matrix.observed(_segment(vehicle)))}


@app.get("/api/dbc/matrix.csv")
def dbc_matrix_csv(vehicle: str):
    table = matrix.rows(load(vehicle).db, matrix.observed(_segment(vehicle)))
    name = f"{load(vehicle).name}_matrix.csv"
    return Response(matrix.csv_text(table), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.get("/api/dbc/file")
def dbc_file(vehicle: str):
    loaded = load(vehicle)
    return Response(loaded.text, media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{loaded.name}.dbc"'})


@app.get("/dbc")
def old_dbc_page():
    return RedirectResponse("/#/tools/dbc")


@app.get("/code")
def old_code_page():
    return RedirectResponse("/#/")


def _json_only(request: Request) -> None:
    if not request.headers.get("content-type", "").startswith("application/json"):
        raise HTTPException(415, "JSON 요청만 받습니다")


def _lesson(module: str, slug: str) -> Lesson:
    try:
        return course.load().find(f"{module}/{slug}")
    except KeyError:
        raise HTTPException(404, "없는 레슨")


def _code_lesson(module: str, slug: str) -> Lesson:
    lesson = _lesson(module, slug)
    if lesson.kind != "code":
        raise HTTPException(400, "코드 레슨이 아닙니다")
    return lesson


@app.get("/api/course")
def course_outline():
    c = course.load()
    done = exercises.progress()
    return {
        "title": c.title, "subtitle": c.subtitle, "description": c.description,
        "modules": [{
            "dir": m.dir, "title": m.title, "summary": m.summary, "status": m.status, "planned": m.planned,
            "lessons": [{"id": le.id, "title": le.title, "kind": le.kind, "minutes": le.minutes,
                         "done": done.get(le.id, False)} for le in m.lessons],
        } for m in c.modules],
    }


@app.get("/api/lessons/{module}/{slug}")
def lesson_detail(module: str, slug: str):
    le = _lesson(module, slug)
    out = {"id": le.id, "module": le.module, "title": le.title, "kind": le.kind, "minutes": le.minutes,
           "summary": le.summary, "html": le.html}
    if le.kind == "code":
        out |= {"after_html": le.after_html, "hints": le.hints, "checks": le.checks, "setup": le.setup,
                "given": exercises.given(le), "code": exercises.current_code(le),
                "file": str(exercises.practice_path(le).relative_to(exercises.ROOT))}
    return out


class ProgressRequest(BaseModel):
    done: bool


@app.post("/api/lessons/{module}/{slug}/progress", dependencies=[Depends(_json_only)])
def lesson_progress(module: str, slug: str, req: ProgressRequest):
    exercises.mark(_lesson(module, slug).id, req.done)
    return {"done": req.done}


@app.get("/api/lessons/{module}/{slug}/solution")
def lesson_solution(module: str, slug: str):
    return {"solution": _code_lesson(module, slug).solution}


class CodeRequest(BaseModel):
    code: str


@app.post("/api/lessons/{module}/{slug}/save", dependencies=[Depends(_json_only)])
def lesson_save(module: str, slug: str, req: CodeRequest):
    exercises.save(_code_lesson(module, slug), req.code)
    return {"saved": True}


@app.post("/api/lessons/{module}/{slug}/run", dependencies=[Depends(_json_only)])
def lesson_run(module: str, slug: str, req: CodeRequest):
    lesson = _code_lesson(module, slug)
    exercises.save(lesson, req.code)
    return exercises.run_saved(lesson)


@app.post("/api/lessons/{module}/{slug}/reset", dependencies=[Depends(_json_only)])
def lesson_reset(module: str, slug: str):
    return {"code": exercises.reset(_code_lesson(module, slug))}


app.mount("/static", StaticFiles(directory=STATIC), name="static")


def main() -> None:
    port = int(os.environ.get("CARNESS_LAB_PORT", "8780"))
    url = f"http://127.0.0.1:{port}"
    if os.environ.get("CARNESS_LAB_NO_BROWSER") != "1":
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    print(f"Carness: {url}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
