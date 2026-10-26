import { esc, icon, TOOLS } from '../core.js';

const HERO_BITS = [0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1];

export async function render(view, ctx) {
  ctx.crumbs([{ label: '홈' }]);
  const all = ctx.lessons();
  const done = all.filter(l => l.done).length;
  const next = ctx.nextLesson();
  const minutes = all.filter(l => !l.done).reduce((s, l) => s + l.minutes, 0);
  const cards = ctx.course.modules.map((m, i) => {
    const num = String(i + 1).padStart(2, '0');
    if (m.status === 'soon') {
      return `<div class="card module-card soon">
        <div class="top"><span class="num">${num}</span><span class="badge warn">준비 중</span></div>
        <h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p>
        ${m.planned.length ? `<ul>${m.planned.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>`;
    }
    const d = m.lessons.filter(l => l.done).length;
    const target = m.lessons.find(l => !l.done) || m.lessons[0];
    const mins = m.lessons.reduce((s, l) => s + l.minutes, 0);
    return `<a class="card module-card" href="#/learn/${target.id}">
      <div class="top"><span class="num">${num}</span>${d === m.lessons.length ? '<span class="badge ok">완료</span>' : d ? '<span class="badge accent">진행 중</span>' : ''}</div>
      <h3>${esc(m.title)}</h3><p>${esc(m.summary)}</p>
      <div class="meta"><span>레슨 ${m.lessons.length}개 · 약 ${mins}분</span><div class="bar"><i style="width:${(d / m.lessons.length) * 100}%"></i></div><span>${d}/${m.lessons.length}</span></div></a>`;
  }).join('');
  const tools = Object.entries(TOOLS).map(([k, t]) => `<a class="card tool-card" href="#/tools/${k}">
      <span class="ic">${icon(t.icon)}</span><span><h4>${esc(t.title)}</h4><p>${esc(t.desc)}</p></span></a>`).join('');
  view.innerHTML = `<div class="home">
    <section class="hero">
      <div class="hero-grid">${HERO_BITS.map(b => `<i class="${b ? 'on' : ''}"></i>`).join('')}</div>
      <h1>${esc(ctx.course.title)}</h1>
      <div class="hero-sub">${esc(ctx.course.subtitle)}</div>
      <p>${esc(ctx.course.description)}</p>
      <div class="bar"><i style="width:${all.length ? (done / all.length) * 100 : 0}%"></i></div>
      <div class="small">레슨 ${done} / ${all.length} 완료${minutes ? ` · 남은 시간 약 ${minutes}분` : ''}</div>
      ${next ? `<a class="btn" href="#/learn/${next.id}">${done ? '이어서 학습하기' : '처음부터 시작하기'} · ${esc(next.title)} ${icon('right')}</a>` : ''}
    </section>
    <h2 class="section-title">학습 경로 <span class="muted small">위에서부터 순서대로 진행합니다</span></h2>
    <div class="modules">${cards}</div>
    <h2 class="section-title">도구 <span class="muted small">레슨과 상관없이 언제든 쓸 수 있습니다</span></h2>
    <div class="tools">${tools}</div>
  </div>`;
}
