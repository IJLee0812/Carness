import { $, $$, api, esc, icon, store, KIND, TOOLS } from './core.js';
import * as home from './views/home.js';
import * as lesson from './views/lesson.js';
import * as tool from './views/tool.js';

const ctx = {
  course: null,
  route: null,
  cleanup: null,
  async refresh() {
    ctx.course = await api('/api/course');
    renderSidebar();
  },
  lessons() {
    return ctx.course.modules.flatMap((m, mi) => m.lessons.map(l => ({ ...l, module: m, moduleIndex: mi })));
  },
  nextLesson() {
    const all = ctx.lessons();
    return all.find(l => !l.done) || all[0];
  },
  crumbs(items) {
    $('#crumbs').innerHTML = items.map((c, i) => (i === items.length - 1
      ? `<b>${esc(c.label)}</b>` : `<a href="${c.href}">${esc(c.label)}</a><span>/</span>`)).join('');
  },
};

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'learn' && parts.length === 3) return { name: 'lesson', id: `${parts[1]}/${parts[2]}` };
  if (parts[0] === 'tools' && TOOLS[parts[1]]) return { name: 'tool', tool: parts[1] };
  return { name: 'home' };
}

function moduleState(m) {
  const done = m.lessons.filter(l => l.done).length;
  return { done, total: m.lessons.length, complete: m.lessons.length > 0 && done === m.lessons.length };
}

function renderSidebar() {
  const c = ctx.course;
  const all = ctx.lessons();
  const done = all.filter(l => l.done).length;
  const route = ctx.route || {};
  const open = new Set(store.get('open-modules', []));
  const currentModule = route.name === 'lesson' ? route.id.split('/')[0] : null;
  const mods = c.modules.map((m, i) => {
    const s = moduleState(m);
    const expanded = m.status !== 'soon' && (open.has(m.dir) || m.dir === currentModule);
    const lessons = expanded ? `<div class="mod-lessons">${m.lessons.map(l => `
        <a class="lesson-link ${l.done ? 'done' : ''} ${route.id === l.id ? 'on' : ''}" href="#/learn/${l.id}">
          <span class="st"></span><span class="t">${esc(l.title)}</span><span class="k" title="${KIND[l.kind].label}">${icon(KIND[l.kind].icon)}</span></a>`).join('')}</div>` : '';
    return `<div class="mod ${s.complete ? 'complete' : ''} ${m.status === 'soon' ? 'soon' : ''}">
        <button class="mod-head" data-dir="${m.dir}" ${m.status === 'soon' ? 'disabled' : ''}>
          <span class="mod-num">${s.complete ? icon('check') : i + 1}</span><span class="mod-title">${esc(m.title)}</span>
          <span class="mod-count">${m.status === 'soon' ? '준비 중' : `${s.done}/${s.total}`}</span></button>${lessons}</div>`;
  }).join('');
  const tools = Object.entries(TOOLS).map(([k, t]) => `<a class="nav-item ${route.tool === k ? 'on' : ''}" href="#/tools/${k}">${icon(t.icon)}${esc(t.title)}</a>`).join('');
  $('#sidebar').innerHTML = `
    <a class="brand" href="#/"><span class="brand-mark">C</span><span><b>${esc(c.title)}</b><small>${esc(c.subtitle)}</small></span></a>
    <div class="side-progress tiny muted">전체 진행 ${done} / ${all.length}<div class="bar"><i style="width:${all.length ? (done / all.length) * 100 : 0}%"></i></div></div>
    <div class="nav-section"><a class="nav-item ${route.name === 'home' ? 'on' : ''}" href="#/">${icon('home')}홈</a></div>
    <div class="nav-section"><div class="nav-label">학습 경로</div>${mods}</div>
    <div class="nav-section"><div class="nav-label">도구</div>${tools}</div>
    <div class="side-foot">공개 데이터만 사용합니다 · comma2k19 · opendbc</div>`;
  $$('.mod-head[data-dir]').forEach(b => {
    b.onclick = () => {
      const set = new Set(store.get('open-modules', []));
      set.has(b.dataset.dir) ? set.delete(b.dataset.dir) : set.add(b.dataset.dir);
      store.set('open-modules', [...set]);
      renderSidebar();
    };
  });
}

async function go() {
  if (ctx.cleanup) { await ctx.cleanup(); ctx.cleanup = null; }
  ctx.route = parseRoute();
  $('#app').classList.remove('nav-open');
  renderSidebar();
  const view = $('#view');
  view.innerHTML = '';
  window.scrollTo(0, 0);
  try {
    const r = ctx.route;
    if (r.name === 'lesson') ctx.cleanup = await lesson.render(view, ctx, r.id);
    else if (r.name === 'tool') ctx.cleanup = await tool.render(view, ctx, r.tool);
    else ctx.cleanup = await home.render(view, ctx);
  } catch (e) {
    view.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set('theme', t);
  $('#theme-btn').innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
}

async function init() {
  $('#menu-btn').innerHTML = icon('menu');
  $('#menu-btn').onclick = () => $('#app').classList.toggle('nav-open');
  setTheme(document.documentElement.dataset.theme || 'light');
  $('#theme-btn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  await ctx.refresh();
  window.addEventListener('hashchange', go);
  await go();
}

init().catch(e => { $('#view').innerHTML = `<div class="empty">${esc(e.message)}</div>`; });
