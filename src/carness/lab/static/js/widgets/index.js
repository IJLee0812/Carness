import { esc } from '../core.js';
import * as bitlab from './bitlab.js';
import * as dbc from './dbc.js';

const WIDGETS = { bitlab, dbc };

export async function mountWidget(el, name, config = {}) {
  const w = WIDGETS[name];
  if (!w) {
    el.innerHTML = `<div class="empty">알 수 없는 위젯: ${esc(name)}</div>`;
    return null;
  }
  try {
    return await w.mount(el, config);
  } catch (e) {
    el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    return null;
  }
}

export async function mountAll(root) {
  const cleanups = [];
  for (const el of root.querySelectorAll('.widget[data-widget]')) {
    cleanups.push(await mountWidget(el, el.dataset.widget, JSON.parse(el.dataset.config || '{}')));
  }
  return () => cleanups.forEach(c => c && c());
}
