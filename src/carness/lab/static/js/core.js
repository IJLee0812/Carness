export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const hex = (n, pad = 3) => `0x${n.toString(16).toUpperCase().padStart(pad, '0')}`;
export const hex2 = n => n.toString(16).toUpperCase().padStart(2, '0');
export const fmt = x => (x === null || x === undefined) ? '-' : (Number.isInteger(x) ? String(x) : String(+x.toFixed(6)));
export const sigColor = i => `var(--sig-${i % 8})`;

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function api(path, body) {
  const opts = body === undefined ? {} : { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) };
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`carness.${key}`); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`carness.${key}`, JSON.stringify(value)); } catch { /* 저장 불가 환경 */ }
  },
};

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  read: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  tool: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  code: '<path d="m8 7-5 5 5 5"/><path d="m16 7 5 5-5 5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  bits: '<rect x="3" y="5" width="4" height="4" rx="1"/><rect x="10" y="5" width="4" height="4" rx="1"/><rect x="17" y="5" width="4" height="4" rx="1"/><rect x="3" y="15" width="4" height="4" rx="1"/><rect x="10" y="15" width="4" height="4" rx="1"/><rect x="17" y="15" width="4" height="4" rx="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.3 1.8 1.4 2.5h5.2c.1-.7.6-1.7 1.4-2.5A6 6 0 0 0 12 3z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 21h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

export const icon = name => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;
export const KIND = { read: { label: '읽기', icon: 'read' }, tool: { label: '실습 도구', icon: 'tool' }, code: { label: '코드', icon: 'code' } };

export const TOOLS = {
  dbc: { title: 'DBC 탐색기', icon: 'table', desc: 'DBC를 메시지·신호·비트 배치로 펼쳐 보고, 통신 매트릭스로 내려받습니다.' },
  bitlab: { title: '비트 실험실', icon: 'bits', desc: '실제 프레임으로 신호를 손으로 디코딩하고 채점합니다.' },
};
