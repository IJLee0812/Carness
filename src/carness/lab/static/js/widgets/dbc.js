import { $, $$, api, esc, hex, icon, sigColor, store } from '../core.js';

const SG_LINE = /^\s*SG_\s+(\w+)\s*(\S*)\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]*)\|([^\]]*)\]\s*"([^"]*)"\s*(.*)$/;
const ms = v => (v ? `${v.toFixed(1)} ms` : '-');

function explainSg(line) {
  const m = line.match(SG_LINE);
  if (!m) return '';
  const [, name, mux, start, len, order, sign, factor, offset, min, max, unit, rx] = m;
  const part = (code, text) => `<div><code>${esc(code)}</code>${text}</div>`;
  return `<div class="sg-explain">
    ${part(name, '신호 이름')}${mux ? part(mux, '멀티플렉스 표시') : ''}
    ${part(start, `시작 비트 · ${order === '0' ? 'Motorola라서 MSB' : 'Intel이라서 LSB'} (Byte ${start >> 3}의 bit ${start & 7})`)}
    ${part(len, '길이 (비트 수)')}
    ${part(`@${order}`, order === '0' ? 'Motorola (빅 엔디언)' : 'Intel (리틀 엔디언)')}
    ${part(sign, sign === '-' ? 'signed (2의 보수)' : 'unsigned')}
    ${part(`(${factor},${offset})`, `물리값 = raw × ${factor} + ${offset}`)}
    ${part(`[${min}|${max}]`, `물리값 범위 ${min} ~ ${max}`)}
    ${part(`"${unit}"`, unit ? `단위 ${esc(unit)}` : '단위 없음')}
    ${part(rx || '-', '받는 노드')}</div>`;
}

export async function mount(el, config) {
  const vehicles = await api('/api/vehicles');
  const st = {
    vehicle: config.vehicle || store.get('dbc.vehicle', 'rav4_2017'),
    view: config.view || 'message', overview: null, lint: [], msg: null, sig: 0, filter: '', onlySeen: false, matrix: null,
  };
  if (!vehicles.some(v => v.key === st.vehicle)) st.vehicle = vehicles[0].key;

  el.innerHTML = `<div class="w">
    <div class="w-bar">
      <span class="title">${icon('table')} DBC 탐색기</span>
      <select class="input vehicle">${vehicles.map(v => `<option value="${v.key}">${esc(v.label)}</option>`).join('')}</select>
      <div class="seg view"><button data-view="message">메시지별</button><button data-view="matrix">전체 표 (통신 매트릭스)</button></div>
      <span class="push row"><a class="btn sm csv">${icon('download')} CSV</a><a class="btn sm file">${icon('download')} DBC 원문</a></span>
    </div>
    <div class="dbc-summary"></div>
    <div class="message-view dbc-cols">
      <div class="dbc-list">
        <input class="input search" placeholder="메시지·ID·신호 검색">
        <label class="tiny muted row"><input type="checkbox" class="only-seen"> 로그에 있는 메시지만</label>
        <div class="items"></div>
      </div>
      <div class="dbc-detail">
        <div class="head"></div>
        <div><div class="card-title small">비트 배치</div><div class="layout"></div>
          <p class="tiny muted" style="margin:8px 0 0">한 줄이 1바이트, 칸 왼쪽 위 숫자는 비트 번호 k. 이름이 적힌 칸이 그 신호의 MSB, 「LSB」가 마지막 비트입니다. 빗금 칸은 쓰지 않는 비트입니다.</p></div>
        <div><div class="card-title small">신호</div><div class="table-wrap"><table class="dtable sigs"></table></div></div>
        <div><div class="card-title small">DBC 원문</div><div class="raw-host"></div></div>
      </div>
    </div>
    <div class="matrix-view w-body" hidden>
      <div class="row" style="margin-bottom:10px"><input class="input matrix-filter" style="width:320px;max-width:100%" placeholder="아무 열이나 검색 (예: SPEED, 0xB4, km/h)"><span class="tiny muted count"></span></div>
      <div class="table-wrap tall"><table class="dtable matrix"></table></div>
    </div></div>`;
  const q = s => $(s, el);

  function renderSummary() {
    const o = st.overview;
    const seen = o.messages.filter(m => m.buses.length).length;
    q('.dbc-summary').innerHTML = `<span class="mono" style="color:var(--text)">${esc(o.dbc)}.dbc</span>
      <span>메시지 <b>${o.messages.length}</b> · 신호 <b>${o.signals}</b></span>
      <span>노드(ECU) ${o.nodes.length ? o.nodes.map(n => `<span class="tag">${esc(n)}</span>`).join(' ') : '정의 없음'}</span>
      <span>${o.segment ? `로그에 있는 메시지 <b>${seen}</b>개` : '실측 로그 없음'}</span>
      ${st.lint.length ? `<details><summary class="bad">DBC lint ${st.lint.length}건</summary>${st.lint.map(i => `<div class="tiny" style="margin-top:6px"><span class="mono">${esc(i.original)}</span><br>${esc(i.action)}</div>`).join('')}</details>` : ''}`;
    q('.csv').href = `/api/dbc/matrix.csv?vehicle=${st.vehicle}`;
    q('.file').href = `/api/dbc/file?vehicle=${st.vehicle}`;
  }

  function renderList() {
    const f = st.filter.toLowerCase();
    const rows = st.overview.messages.filter(m => (!st.onlySeen || m.buses.length) && (!f || m.name.toLowerCase().includes(f)
      || hex(m.id).toLowerCase().includes(f) || m.signal_names.some(n => n.toLowerCase().includes(f))));
    q('.items').innerHTML = rows.map(m => `<div class="msg-item ${st.msg && st.msg.id === m.id ? 'on' : ''}" data-id="${m.id}">
        <span class="id">${hex(m.id)}</span><span>${esc(m.name)}</span><span class="n">${m.buses.length ? `버스 ${m.buses.join(',')}` : ''}</span></div>`).join('')
      || '<p class="tiny muted">없음</p>';
    $$('.msg-item', el).forEach(i => { i.onclick = () => selectMessage(+i.dataset.id); });
  }

  function renderHead() {
    const m = st.msg;
    const buses = Object.entries(m.buses);
    const fact = (label, value) => `<div class="fact"><small>${label}</small><b>${value}</b></div>`;
    q('.head').innerHTML = `<div class="row" style="justify-content:space-between"><h3>${esc(m.name)}</h3></div>
      <div class="facts" style="margin-top:10px">
        ${fact('ID', `<span class="mono">${hex(m.id)}</span> <span class="muted small">(${m.id})</span>`)}
        ${fact('DLC (바이트 수)', m.length)}
        ${fact('송신 노드', esc(m.senders.join(', ') || '-'))}
        ${fact('채널 (관측 버스)', buses.length ? buses.map(([b, o]) => `버스 ${b} · ${o.count}회`).join('<br>') : '<span class="muted">로그에 없음</span>')}
        ${fact('주기', `DBC ${m.cycle_time ? `${m.cycle_time} ms` : '없음'}<br><span class="small">실측 ${buses.length ? buses.map(([, o]) => ms(o.period_ms)).join(' · ') : '-'}</span>`)}
      </div>${m.comment ? `<p class="small muted" style="margin:8px 0 0">${esc(m.comment)}</p>` : ''}`;
  }

  function renderLayout() {
    const m = st.msg;
    const owners = {};
    m.signals.forEach((s, i) => s.positions.forEach((k, j) => { (owners[k] ||= []).push({ i, j, n: s.positions.length }); }));
    let html = '<div></div>' + [7, 6, 5, 4, 3, 2, 1, 0].map(b => `<div class="hd">bit ${b}</div>`).join('');
    for (let byte = 0; byte < m.length; byte++) {
      html += `<div class="hd">Byte ${byte}</div>`;
      for (let b = 7; b >= 0; b--) {
        const k = byte * 8 + b;
        const own = owners[k] || [];
        const o = own[0];
        const label = o && o.j === 0 ? `<span class="nm">${esc(m.signals[o.i].name)}</span>` : (o && o.j === o.n - 1 ? '<span class="lsb">LSB</span>' : '');
        const title = own.map(x => `${m.signals[x.i].name} · ${x.j + 1}/${x.n}번째`).join(' / ') || '사용 안 함';
        const cls = ['lcell', own.length > 1 ? 'overlap' : '', o && o.i === st.sig ? 'sel' : '', o ? '' : 'free'].join(' ');
        html += `<div class="${cls}" data-sig="${o ? o.i : ''}" title="비트 ${k} · ${esc(title)}" style="${o ? `background:${sigColor(o.i)}` : ''}"><span class="k">${k}</span>${label}</div>`;
      }
    }
    q('.layout').innerHTML = html;
    $$('.lcell', el).forEach(c => { if (c.dataset.sig !== '') c.onclick = () => selectSignal(+c.dataset.sig); });
  }

  function renderSignals() {
    q('.sigs').innerHTML = `<tr><th>신호</th><th>시작|길이</th><th>바이트 순서</th><th>부호</th><th>factor</th><th>offset</th><th>범위</th><th>단위</th><th>수신 노드</th><th>값 정의</th><th>설명</th></tr>`
      + st.msg.signals.map((s, i) => {
        const choices = Object.entries(s.choices);
        return `<tr class="click ${i === st.sig ? 'on' : ''}" data-i="${i}">
          <td><span class="row" style="flex-wrap:nowrap"><span class="swatch" style="background:${sigColor(i)}"></span><b>${esc(s.name)}</b></span></td>
          <td class="mono">${s.start}|${s.length}</td><td>${s.byte_order === 'big_endian' ? 'Motorola' : 'Intel'}</td>
          <td>${s.is_signed ? 'signed' : 'unsigned'}</td><td class="mono">${s.scale}</td><td class="mono">${s.offset}</td>
          <td class="mono">${s.minimum ?? '-'} ~ ${s.maximum ?? '-'}</td><td>${esc(s.unit) || '-'}</td><td>${esc(s.receivers.join(', ')) || '-'}</td>
          <td class="wrap tiny">${choices.length ? choices.map(([k, v]) => `${k}=${esc(v)}`).join(', ') : '-'}</td>
          <td class="wrap tiny">${esc(s.comment)}</td></tr>`;
      }).join('');
    $$('.sigs tr[data-i]', el).forEach(r => { r.onclick = () => selectSignal(+r.dataset.i); });
  }

  function renderRaw() {
    const s = st.msg.signals[st.sig];
    const own = new RegExp(`^\\s*SG_\\s+${s.name}\\b`);
    const related = new RegExp(`^(CM_ SG_|VAL_) \\d+ ${s.name}\\b`);
    const target = st.msg.block.find(l => own.test(l)) || '';
    q('.raw-host').innerHTML = `<pre class="raw">${st.msg.block.map(l => `<span class="${own.test(l) || related.test(l) ? 'hl' : ''}">${esc(l)}</span>`).join('\n')}</pre>
      <div class="small muted" style="margin-top:10px">고른 신호 <b style="color:var(--text)">${esc(s.name)}</b>의 <code>SG_</code> 줄 풀이</div>${explainSg(target)}`;
  }

  function selectSignal(i) {
    st.sig = i;
    renderLayout();
    renderSignals();
    renderRaw();
  }

  async function selectMessage(id) {
    st.msg = await api(`/api/message?vehicle=${st.vehicle}&id=${id}`);
    const wanted = config.signal ? st.msg.signals.findIndex(s => s.name === config.signal) : -1;
    renderHead();
    renderList();
    selectSignal(Math.max(0, wanted));
  }

  function renderMatrix() {
    const { columns, rows } = st.matrix;
    const f = q('.matrix-filter').value.trim().toLowerCase();
    const hit = f ? rows.filter(r => columns.some(c => String(r[c]).toLowerCase().includes(f))) : rows;
    q('.count').textContent = `${hit.length} / ${rows.length}행 · 신호 한 개 = 한 행`;
    q('.matrix').innerHTML = `<thead><tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${hit.map(r => `<tr>${columns.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  async function setView(view) {
    st.view = view;
    $$('.view button', el).forEach(b => b.classList.toggle('on', b.dataset.view === view));
    q('.message-view').hidden = view !== 'message';
    q('.matrix-view').hidden = view !== 'matrix';
    if (view === 'matrix') {
      st.matrix ||= await api(`/api/dbc/matrix?vehicle=${st.vehicle}`);
      renderMatrix();
    }
  }

  async function loadVehicle(v) {
    st.vehicle = v;
    st.matrix = null;
    if (config.full) store.set('dbc.vehicle', v);
    q('.vehicle').value = v;
    [st.overview, st.lint] = await Promise.all([api(`/api/dbc/overview?vehicle=${v}`), api(`/api/lint?vehicle=${v}`)]);
    renderSummary();
    renderList();
    const wanted = config.message && st.overview.messages.find(m => m.name === config.message);
    const first = wanted || st.overview.messages.find(m => m.buses.length) || st.overview.messages[0];
    await selectMessage(first.id);
    await setView(st.view);
  }

  q('.vehicle').onchange = e => loadVehicle(e.target.value);
  q('.search').oninput = e => { st.filter = e.target.value; renderList(); };
  q('.only-seen').onchange = e => { st.onlySeen = e.target.checked; renderList(); };
  q('.matrix-filter').oninput = renderMatrix;
  $$('.view button', el).forEach(b => { b.onclick = () => setView(b.dataset.view); });
  await loadVehicle(st.vehicle);
  return null;
}
