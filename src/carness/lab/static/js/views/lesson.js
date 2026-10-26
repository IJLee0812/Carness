import { $, api, esc, icon, KIND } from '../core.js';
import { mountAll } from '../widgets/index.js';
import { mountWorkbench } from './workbench.js';

function pager(ctx, id) {
  const all = ctx.lessons();
  const i = all.findIndex(l => l.id === id);
  return { prev: all[i - 1], next: all[i + 1], index: i, total: all.length };
}

function pagerHtml(p) {
  return `${p.prev ? `<a class="pager" href="#/learn/${p.prev.id}"><small>${icon('left')} 이전</small>${esc(p.prev.title)}</a>` : ''}
    <span class="spacer"></span>
    ${p.next ? `<a class="pager next" href="#/learn/${p.next.id}"><small>다음 ${icon('right')}</small>${esc(p.next.title)}</a>` : ''}`;
}

export async function render(view, ctx, id) {
  const [module, slug] = id.split('/');
  const lesson = await api(`/api/lessons/${module}/${slug}`);
  const mod = ctx.course.modules.find(m => m.dir === module);
  const meta = ctx.lessons().find(l => l.id === id);
  const p = pager(ctx, id);
  ctx.crumbs([{ label: '홈', href: '#/' }, { label: mod.title, href: `#/learn/${mod.lessons[0].id}` }, { label: lesson.title }]);
  const kind = KIND[lesson.kind];
  const pos = mod.lessons.findIndex(l => l.id === id) + 1;
  view.innerHTML = `<article class="lesson ${lesson.kind}">
    <header class="lesson-head">
      <div class="eyebrow"><span>${esc(mod.title)} · ${pos}/${mod.lessons.length}</span>
        <span class="badge accent">${icon(kind.icon)}${kind.label}</span><span class="badge">${icon('clock')}약 ${lesson.minutes}분</span>
        <span class="badge ok done-badge" ${meta.done ? '' : 'hidden'}>${icon('check')}완료</span></div>
      <h1>${esc(lesson.title)}</h1>${lesson.summary ? `<p class="summary">${esc(lesson.summary)}</p>` : ''}
    </header>
    <div class="lesson-body"></div>
    <footer class="lesson-foot"></footer></article>`;

  const foot = $('.lesson-foot', view);
  const setDone = done => {
    meta.done = done;
    $('.done-badge', view).hidden = !done;
  };

  if (lesson.kind === 'code') {
    foot.innerHTML = pagerHtml(p);
    return mountWorkbench($('.lesson-body', view), lesson, async () => { setDone(true); await ctx.refresh(); }, p.next);
  }

  $('.lesson-body', view).innerHTML = `<div class="prose">${lesson.html}</div>`;
  const cleanup = await mountAll($('.lesson-body', view));
  const renderFoot = () => {
    foot.innerHTML = `${p.prev ? `<a class="pager" href="#/learn/${p.prev.id}"><small>${icon('left')} 이전</small>${esc(p.prev.title)}</a>` : ''}
      <span class="spacer"></span>
      ${meta.done ? `<button class="btn ghost sm undo">${icon('undo')} 완료 취소</button>` : ''}
      ${p.next
        ? `<a class="btn primary complete" href="#/learn/${p.next.id}">${meta.done ? '다음 레슨' : '완료하고 다음으로'} ${icon('right')}</a>`
        : `<button class="btn primary complete">${meta.done ? '완료됨' : '완료로 표시'}</button>`}`;
    $('.complete', foot).onclick = async e => {
      if (meta.done) return;
      e.preventDefault();
      await api(`/api/lessons/${module}/${slug}/progress`, { done: true });
      setDone(true);
      await ctx.refresh();
      if (p.next) location.hash = `#/learn/${p.next.id}`;
      else renderFoot();
    };
    const undo = $('.undo', foot);
    if (undo) {
      undo.onclick = async () => {
        await api(`/api/lessons/${module}/${slug}/progress`, { done: false });
        setDone(false);
        await ctx.refresh();
        renderFoot();
      };
    }
  };
  renderFoot();
  return cleanup;
}
