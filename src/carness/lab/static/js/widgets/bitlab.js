import { $, $$, api, esc, fmt, hex, hex2, icon, sigColor, store } from '../core.js';

function handDecode(sig, data) {
  const bits = sig.positions.map(k => (data[k >> 3] >> (k & 7)) & 1).join('');
  const unsigned = parseInt(bits, 2);
  const raw = sig.is_signed && bits[0] === '1' ? unsigned - 2 ** sig.length : unsigned;
  return { bits, unsigned, raw, physical: raw * sig.scale + sig.offset };
}

const at = k => `Byte ${k >> 3}의 bit ${k & 7}`;

function howTo(s) {
  const msb = s.positions[0];
  const lsb = s.positions[s.positions.length - 1];
  const rows = [...new Set(s.positions.map(k => k >> 3))];
  const where = s.byte_order === 'big_endian'
    ? `Motorola: 시작 비트 ${s.start}(${at(s.start)})가 <b>MSB</b>라서 여기서 읽기 시작합니다.`
    : `Intel: 시작 비트 ${s.start}(${at(s.start)})는 <b>LSB</b>라서 마지막에 읽습니다. 읽기 시작하는 MSB는 비트 ${msb}(${at(msb)})입니다.`;
  return `<div class="howto"><b>이 신호 읽는 법</b><ol>
    <li>${where}</li>
    <li>격자에서 ${rows.map(b => `Byte ${b}`).join(' → ')} 줄 순서로, 각 줄은 왼쪽 → 오른쪽으로 순서 번호 1~${s.length} 칸을 읽습니다 (끝 칸: 비트 ${lsb}).</li>
    <li>${s.is_signed ? `signed: 첫 비트가 1이면 10진수 값에서 ${2 ** s.length}(2<sup>${s.length}</sup>)를 뺍니다.` : 'unsigned: 2진수를 그대로 10진수로 바꿉니다.'}</li>
    <li>물리값 = raw × ${s.scale} + ${s.offset}</li></ol></div>`;
}

function stepsHtml(r, s) {
  const pos = r.positions.map(k => `${k >> 3}.${k & 7}`).join(' ');
  const signed = s.is_signed
    ? (r.bits[0] === '1' ? `첫 비트가 1 → ${r.raw_unsigned} − 2<sup>${s.length}</sup> = <b>${r.raw}</b>` : `첫 비트가 0 → 그대로 <b>${r.raw}</b>`)
    : `unsigned → <b>${r.raw}</b>`;
  return `<ol class="steps">
    <li>읽는 칸 (바이트.비트, MSB → LSB): <span class="mono">${pos}</span></li>
    <li>읽은 비트 <span class="mono">${r.bits}</span> = ${r.raw_unsigned}</li>
    <li>${signed}</li>
    <li>${r.raw} × ${s.scale} + ${s.offset} = <b>${fmt(r.physical)}</b> ${esc(r.unit)}${r.choice ? ` (${esc(r.choice)})` : ''}</li>
    <li>cantools 결과: <span class="mono">${r.cantools === null ? '디코딩 거부 (DBC lint 참고)' : fmt(r.cantools)}</span></li></ol>`;
}

export async function mount(el, config) {
  const vehicles = await api('/api/vehicles');
  const st = {
    vehicle: config.vehicle || store.get('bitlab.vehicle', 'example'),
    mode: config.mode || 'practice',
    messages: [], msg: null, sig: 0, data: [], answered: new Set(),
    score: store.get('score', { ok: 0, total: 0 }),
  };
  if (!vehicles.some(v => v.key === st.vehicle)) st.vehicle = vehicles[0].key;
  const free = config.full || config.free || !config.message;

  el.innerHTML = `<div class="w">
    <div class="w-bar">
      <span class="title">${icon('bits')} 비트 실험실</span>
      ${free ? `<select class="input vehicle">${vehicles.map(v => `<option value="${v.key}">${esc(v.label)}</option>`).join('')}</select>
                <select class="input message"></select>` : '<span class="msg-label mono small"></span>'}
      <div class="seg mode"><button data-mode="practice">연습</button><button data-mode="view">풀이 보기</button></div>
      ${config.full ? '<span class="push small muted score"></span>' : ''}
    </div>
    <div class="w-body"><div class="w-cols">
      <div>
        <div class="row small muted msg-meta"></div>
        <div class="row" style="margin:10px 0 6px">
          <button class="btn sm real">실제 데이터에서</button><button class="btn sm random">무작위</button><button class="btn sm zero">0으로</button>
          <span class="tiny muted src"></span>
        </div>
        <div class="bytes"></div>
        <div class="grid"></div>
        <p class="grid-note">비트 번호 k = 바이트 × 8 + 비트 (칸 왼쪽 위). 굵은 숫자는 읽는 순서(1 = MSB), 「시작」은 DBC에 적힌 시작 비트입니다. 칸을 누르면 비트가 바뀝니다.</p>
        <div class="chips row"></div>
        <div class="live-host"></div>
      </div>
      <div><div class="w-panel def"></div><div class="w-panel work"></div></div>
    </div></div></div>`;
  const q = s => $(s, el);

  async function loadVehicle(v) {
    st.vehicle = v;
    if (config.full) store.set('bitlab.vehicle', v);
    st.messages = await api(`/api/messages?vehicle=${v}`);
    const veh = vehicles.find(x => x.key === v);
    q('.real').disabled = !veh.segment;
    if (free) {
      q('.vehicle').value = v;
      q('.message').innerHTML = st.messages.map(m => `<option value="${m.id}">${hex(m.id)} ${esc(m.name)}${m.observed ? ` · ${m.observed}회` : ''}</option>`).join('');
    }
    const wanted = config.message && st.messages.find(m => m.name === config.message);
    await selectMessage((wanted || st.messages[0]).id, true);
  }

  async function selectMessage(id, initial = false) {
    st.msg = await api(`/api/message?vehicle=${st.vehicle}&id=${id}`);
    const wantedSig = initial && config.signal ? st.msg.signals.findIndex(s => s.name === config.signal) : -1;
    st.sig = wantedSig >= 0 ? wantedSig : Math.max(0, st.msg.signals.findIndex(s => !s.multiplexed && s.length > 1));
    if (free) q('.message').value = String(id);
    else q('.msg-label').textContent = `${st.msg.name} (${hex(id)})`;
    const meta = st.messages.find(m => m.id === id);
    q('.msg-meta').innerHTML = `<b style="color:var(--text)">${esc(st.msg.name)}</b><span class="mono">${hex(id)}</span><span>DLC ${st.msg.length}</span>
      ${meta && meta.observed ? `<span>로그 관측 ${meta.observed}회 · 버스 ${Object.keys(meta.buses).join(', ')}</span>` : ''}`;
    if (initial && config.frame) {
      st.data = config.frame.trim().split(/\s+/).map(h => parseInt(h, 16));
      while (st.data.length < st.msg.length) st.data.push(0);
      q('.src').textContent = '레슨 예제 프레임';
      renderAll();
    } else {
      await newFrame(meta && meta.observed ? 'real' : 'random');
    }
  }

  async function newFrame(source) {
    if (source === 'zero') {
      st.data = Array(st.msg.length).fill(0);
      q('.src').textContent = '';
    } else {
      try {
        const f = await api(`/api/frame?vehicle=${st.vehicle}&id=${st.msg.id}&source=${source}`);
        st.data = f.data.match(/../g).map(h => parseInt(h, 16));
        q('.src').textContent = f.t ? `${f.source} · t=${f.t.toFixed(3)}s · 버스 ${f.bus}` : f.source;
      } catch (e) {
        q('.src').textContent = e.message;
        if (st.data.length !== st.msg.length) st.data = Array(st.msg.length).fill(0);
      }
    }
    renderAll();
  }

  function owners() {
    const map = {};
    st.msg.signals.forEach((s, i) => s.positions.forEach((k, j) => { if (!(k in map)) map[k] = { i, order: j + 1 }; }));
    return map;
  }

  function renderBytes() {
    q('.bytes').innerHTML = st.data.map((b, i) => `<label>Byte ${i}<input data-i="${i}" value="${hex2(b)}" maxlength="2"></label>`).join('');
    $$('.bytes input', el).forEach(inp => {
      inp.onchange = () => {
        const v = parseInt(inp.value, 16);
        if (Number.isNaN(v) || v < 0 || v > 255) { inp.value = hex2(st.data[+inp.dataset.i]); return; }
        st.data[+inp.dataset.i] = v;
        renderAll();
      };
    });
  }

  function renderGrid() {
    const own = owners();
    const sel = st.msg.signals[st.sig];
    let html = '<div></div>' + [7, 6, 5, 4, 3, 2, 1, 0].map(b => `<div class="hd">bit ${b}</div>`).join('');
    st.data.forEach((byte, i) => {
      html += `<div class="hd">Byte ${i}<br><span class="mono">0x${hex2(byte)}</span></div>`;
      for (let b = 7; b >= 0; b--) {
        const k = i * 8 + b;
        const o = own[k];
        const isSel = o && o.i === st.sig;
        const cls = ['cell', isSel ? 'sel' : '', o && !isSel ? 'dim' : ''].join(' ');
        html += `<div class="${cls}" data-k="${k}" style="${o ? `background:${sigColor(o.i)}` : ''}">
          <span class="k">${k}</span>${isSel && k === sel.start ? '<span class="tagline">시작</span>' : ''}
          ${(byte >> b) & 1}${isSel ? `<span class="ord">${o.order}</span>` : ''}</div>`;
      }
    });
    q('.grid').innerHTML = html;
    $$('.cell', el).forEach(c => {
      c.onclick = () => {
        const k = +c.dataset.k;
        st.data[k >> 3] ^= 1 << (k & 7);
        renderAll();
      };
    });
  }

  function renderChips() {
    q('.chips').innerHTML = st.msg.signals.map((s, i) =>
      `<span class="chip ${i === st.sig ? 'on' : ''}" data-i="${i}"><span class="swatch" style="background:${sigColor(i)}"></span>${esc(s.name)}</span>`).join('');
    $$('.chip', el).forEach(c => { c.onclick = () => { st.sig = +c.dataset.i; renderAll(); }; });
    q('.live-host').innerHTML = st.mode === 'view' ? `<table class="live"><tr><th>신호</th><th>raw</th><th>물리값</th></tr>${st.msg.signals.map(s => {
      const d = handDecode(s, st.data);
      return `<tr><td>${esc(s.name)}</td><td class="mono">${d.raw}</td><td class="mono">${fmt(d.physical)} ${esc(s.unit)}</td></tr>`;
    }).join('')}</table>` : '';
  }

  function renderDef() {
    const s = st.msg.signals[st.sig];
    const moto = s.byte_order === 'big_endian';
    const choices = Object.entries(s.choices);
    q('.def').innerHTML = `<h4>${esc(s.name)}</h4><table class="kv">
      <tr><td>시작 비트</td><td class="mono">${s.start} <span class="muted">(${moto ? 'MSB' : 'LSB'} · ${at(s.start)})</span></td></tr>
      <tr><td>길이</td><td class="mono">${s.length} bit</td></tr>
      <tr><td>바이트 순서</td><td>${moto ? 'Motorola (빅 엔디언)' : 'Intel (리틀 엔디언)'}</td></tr>
      <tr><td>부호</td><td>${s.is_signed ? 'signed (2의 보수)' : 'unsigned'}</td></tr>
      <tr><td>factor · offset</td><td class="mono">${s.scale} · ${s.offset}</td></tr>
      <tr><td>단위 · 범위</td><td>${esc(s.unit) || '-'} · ${fmt(s.minimum)} ~ ${fmt(s.maximum)}</td></tr>
      ${choices.length ? `<tr><td>값 정의</td><td class="tiny">${choices.slice(0, 8).map(([k, v]) => `${k}=${esc(v)}`).join(', ')}${choices.length > 8 ? ' …' : ''}</td></tr>` : ''}
    </table>`;
  }

  async function check(withAnswers) {
    const s = st.msg.signals[st.sig];
    const body = { vehicle: st.vehicle, id: st.msg.id, data: st.data.map(hex2).join(''), signal: s.name };
    if (withAnswers) {
      const raw = q('.ans-raw').value.trim();
      const phys = q('.ans-phys').value.trim();
      if (raw !== '') body.raw = parseInt(raw, 10);
      if (phys !== '') body.physical = parseFloat(phys);
    }
    return api('/api/check', body);
  }

  async function renderWork() {
    const s = st.msg.signals[st.sig];
    if (st.mode === 'view') {
      q('.work').innerHTML = `<h4>풀이</h4>${howTo(s)}${stepsHtml(await check(false), s)}`;
      return;
    }
    q('.work').innerHTML = `<h4>손으로 풀기</h4>${howTo(s)}
      <label class="field"><span>① MSB부터 읽은 2진수 (${s.length}자리)</span><input class="ans-bits"></label>
      <label class="field"><span>② raw (정수, ${s.is_signed ? '2의 보수 반영' : 'unsigned'})</span><input class="ans-raw"></label>
      <label class="field"><span>③ 물리값 = raw × ${s.scale} + ${s.offset}</span><input class="ans-phys"></label>
      <div class="row"><button class="btn primary sm do-check">확인</button><button class="btn sm do-steps">풀이 보기</button><button class="btn ghost sm do-next">다음 프레임</button></div>
      <div class="result"></div>`;
    const key = () => `${st.vehicle}|${st.msg.id}|${s.name}|${st.data.join(',')}`;
    q('.do-check').onclick = async () => {
      const r = await check(true);
      const bits = q('.ans-bits').value.replace(/\s/g, '');
      const bitsOk = bits ? bits === r.bits : null;
      const mark = (v, label) => (v === null || v === undefined ? '' : `<div class="${v ? 'ok' : 'bad'} small">${label} ${v ? '정답' : '오답'}</div>`);
      q('.result').innerHTML = `<div style="margin-top:10px">${mark(bitsOk, '①') + mark(r.raw_ok, '②') + mark(r.physical_ok, '③') || '<span class="muted small">답을 하나 이상 적어 주세요.</span>'}</div>`;
      const all = [bitsOk, r.raw_ok, r.physical_ok].filter(v => v !== null && v !== undefined);
      if (all.length && !st.answered.has(key())) {
        st.answered.add(key());
        st.score.total += 1;
        if (all.every(Boolean)) st.score.ok += 1;
        store.set('score', st.score);
        renderScore();
      }
    };
    q('.do-steps').onclick = async () => { q('.result').innerHTML = stepsHtml(await check(false), s); };
    q('.do-next').onclick = () => newFrame(vehicles.find(x => x.key === st.vehicle).segment ? 'real' : 'random');
  }

  function renderScore() {
    if (config.full) q('.score').textContent = `맞힌 문제 ${st.score.ok} / ${st.score.total}`;
  }

  function renderMode() {
    $$('.mode button', el).forEach(b => b.classList.toggle('on', b.dataset.mode === st.mode));
  }

  function renderAll() {
    renderBytes();
    renderGrid();
    renderChips();
    renderDef();
    renderWork();
  }

  $$('.mode button', el).forEach(b => { b.onclick = () => { st.mode = b.dataset.mode; renderMode(); renderAll(); }; });
  q('.real').onclick = () => newFrame('real');
  q('.random').onclick = () => newFrame('random');
  q('.zero').onclick = () => newFrame('zero');
  if (free) {
    q('.vehicle').onchange = e => loadVehicle(e.target.value);
    q('.message').onchange = e => selectMessage(+e.target.value);
  }
  renderMode();
  renderScore();
  await loadVehicle(st.vehicle);
  return null;
}
