import { esc, icon, TOOLS } from '../core.js';
import { mountWidget } from '../widgets/index.js';

export async function render(view, ctx, name) {
  const t = TOOLS[name];
  ctx.crumbs([{ label: '홈', href: '#/' }, { label: '도구', href: '#/' }, { label: t.title }]);
  view.innerHTML = `<div class="lesson tool">
    <header class="lesson-head"><div class="eyebrow">${icon(t.icon)} 도구</div><h1>${esc(t.title)}</h1><p class="summary">${esc(t.desc)}</p></header>
    <div id="tool-host"></div></div>`;
  return mountWidget(view.querySelector('#tool-host'), name, { full: true });
}
