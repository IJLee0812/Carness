import { $, api, esc, icon } from '../core.js';

const AUTOSAVE_MS = 1500;

function makeEditor(textarea, onChange, onRun) {
  if (window.CodeMirror) {
    const cm = window.CodeMirror.fromTextArea(textarea, {
      mode: 'python', lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false, viewportMargin: Infinity,
      extraKeys: {
        Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ')),
        'Shift-Tab': c => c.indentSelection('subtract'),
        'Cmd-Enter': onRun, 'Ctrl-Enter': onRun,
      },
    });
    cm.on('change', (_, change) => { if (change.origin !== 'setValue') onChange(); });
    let marks = [];
    return {
      get: () => cm.getValue(),
      set: v => { cm.setValue(v); cm.clearHistory(); },
      mark: lines => {
        marks.forEach(h => cm.removeLineClass(h, 'background', 'err-line'));
        marks = lines.filter(n => n >= 1 && n <= cm.lineCount()).map(n => cm.addLineClass(n - 1, 'background', 'err-line'));
      },
      refresh: () => cm.refresh(),
    };
  }
  textarea.classList.add('plain-editor');
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      textarea.setRangeText('    ', textarea.selectionStart, textarea.selectionEnd, 'end');
      onChange();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onRun(); }
  });
  textarea.addEventListener('input', onChange);
  return { get: () => textarea.value, set: v => { textarea.value = v; }, mark: () => {}, refresh: () => {} };
}

function checkHtml(c) {
  const vals = c.ok
    ? `결과 <code>${esc(c.got)}</code>`
    : `기대 <code>${esc(c.expected)}</code><br>내 결과 <code>${esc(c.got)}</code>`;
  return `<div class="chk ${c.ok ? '' : 'miss'}">
    <div class="expr"><span class="${c.ok ? 'ok' : 'bad'}">${c.ok ? '✓' : '✗'}</span><span>${esc(c.expr)}</span></div>
    <div class="vals">${vals}</div>${c.hint ? `<div class="why">${esc(c.hint)}${c.line ? ` (${c.line}번째 줄)` : ''}</div>` : ''}</div>`;
}

export async function mountWorkbench(host, lesson, onPass, next) {
  const base = `/api/lessons/${lesson.id}`;
  host.innerHTML = `<div class="code-split">
    <div class="prose">${lesson.html}</div>
    <div class="workbench">
      <div class="card editor-card">
        <div class="editor-head">${icon('code')}<span class="file">${esc(lesson.file)}</span><span class="saved"></span></div>
        <textarea spellcheck="false"></textarea>
        <div class="editor-actions">
          <button class="btn primary run">${icon('play')} 실행·채점 <kbd>⌘↵</kbd></button>
          <button class="btn hint-btn">${icon('bulb')} 힌트</button>
          <button class="btn ghost solution-btn">${icon('eye')} 정답</button>
          <button class="btn ghost reset push">${icon('undo')} 처음 코드로</button>
        </div>
        <div class="hints"></div><div class="solution"></div>
      </div>
      <div class="card card-pad"><div class="card-title">결과</div><div class="result"></div></div>
      <div class="card card-pad"><div class="card-title">준비된 함수·값</div><div class="given"></div></div>
    </div></div>`;
  const q = s => $(s, host);
  const st = { dirty: false, timer: null, hints: 0 };

  async function save() {
    if (!st.dirty) return;
    clearTimeout(st.timer);
    st.dirty = false;
    await api(`${base}/save`, { code: editor.get() });
    q('.saved').textContent = '저장됨';
  }

  function changed() {
    st.dirty = true;
    q('.saved').textContent = '';
    clearTimeout(st.timer);
    st.timer = setTimeout(save, AUTOSAVE_MS);
  }

  function renderChecks() {
    q('.result').innerHTML = `<p class="small muted" style="margin:0">실행하면 아래 식을 내 코드와 정답 코드로 각각 계산해 비교합니다.</p>
      <ul class="check-list">${lesson.checks.map(c => `<li>${esc(c)}</li>`).join('')}</ul>`;
  }

  function renderResult(r) {
    const head = r.status === 'pass'
      ? `<div class="result-head pass">${icon('check')} 통과! 모든 확인을 맞혔습니다.</div>`
      : `<div class="result-head ${r.status === 'blank' ? 'warn' : 'fail'}">${esc(r.message)}</div>`;
    const detail = r.detail ? `<pre class="err-detail">${esc(r.detail)}${r.line ? `\n→ ${r.line}번째 줄` : ''}</pre>` : '';
    const out = r.stdout ? `<div class="stdout"><div class="tiny muted">출력 (print)</div><pre>${esc(r.stdout)}</pre></div>` : '';
    const after = r.status === 'pass'
      ? `${lesson.after_html ? `<div class="after">${lesson.after_html}</div>` : ''}
         ${next ? `<a class="btn primary" style="margin-top:12px" href="#/learn/${next.id}">다음: ${esc(next.title)} ${icon('right')}</a>` : ''}`
      : '';
    q('.result').innerHTML = head + detail + (r.checks.length ? `<div class="checks">${r.checks.map(checkHtml).join('')}</div>` : '') + out + after;
    editor.mark(r.lines || [r.line, ...r.checks.map(c => c.line)].filter(Boolean));
  }

  async function run() {
    clearTimeout(st.timer);
    q('.run').disabled = true;
    q('.result').innerHTML = '<p class="small muted">실행 중…</p>';
    try {
      const r = await api(`${base}/run`, { code: editor.get() });
      st.dirty = false;
      q('.saved').textContent = '저장됨';
      renderResult(r);
      if (r.status === 'pass') await onPass();
    } catch (e) {
      q('.result').innerHTML = `<p class="bad small">${esc(e.message)}</p>`;
    } finally {
      q('.run').disabled = false;
    }
  }

  const editor = makeEditor(q('textarea'), changed, run);
  editor.set(lesson.code);

  const g = lesson.given;
  const tags = names => (names.length ? names.map(n => `<span class="tag">${esc(n)}</span>`).join('') : '<span class="tiny muted">없음</span>');
  q('.given').innerHTML = `<div class="tiny muted">앞 레슨의 함수 (정답 버전이 미리 들어 있음)</div><div class="tags">${tags(g.functions)}</div>
    <div class="tiny muted">준비된 값</div><div class="tags">${tags(g.values)}</div>
    ${lesson.setup ? `<details class="small"><summary>이 레슨의 준비 코드</summary><pre class="code-box">${esc(lesson.setup)}</pre></details>` : ''}`;
  renderChecks();

  const hintBtn = q('.hint-btn');
  const renderHintBtn = () => {
    hintBtn.innerHTML = `${icon('bulb')} 힌트 ${st.hints}/${lesson.hints.length}`;
    hintBtn.disabled = st.hints >= lesson.hints.length;
  };
  hintBtn.onclick = () => {
    st.hints += 1;
    q('.hints').innerHTML = lesson.hints.slice(0, st.hints).map((h, i) => `<div class="hint"><b>힌트 ${i + 1}</b>${h}</div>`).join('');
    renderHintBtn();
  };
  renderHintBtn();
  q('.run').onclick = run;
  q('.solution-btn').onclick = async () => {
    if (!confirm('정답을 볼까요? 힌트를 모두 보고도 막힐 때 보는 것을 권합니다.')) return;
    const { solution } = await api(`${base}/solution`);
    q('.solution').innerHTML = `<div class="tiny muted">정답</div><pre class="code-box">${esc(solution)}</pre>
      <button class="btn sm use" style="margin-top:8px">편집기에 넣기</button>`;
    q('.use').onclick = () => {
      if (!confirm('지금 편집기의 코드를 정답으로 바꿀까요?')) return;
      editor.set(solution);
      st.dirty = true;
      save();
    };
  };
  q('.reset').onclick = async () => {
    if (!confirm('작성한 코드를 지우고 처음 코드로 되돌릴까요?')) return;
    const { code } = await api(`${base}/reset`, {});
    editor.set(code);
    editor.mark([]);
    st.dirty = false;
    q('.saved').textContent = '';
    renderChecks();
  };
  const onHide = () => { if (document.visibilityState === 'hidden') save().catch(() => {}); };
  document.addEventListener('visibilitychange', onHide);
  setTimeout(() => editor.refresh(), 0);
  return async () => {
    document.removeEventListener('visibilitychange', onHide);
    await save().catch(() => {});
  };
}
