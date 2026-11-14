/* Interface: ficha do militar, abas de uniformes, ilustração dinâmica e cartões de regras. */
(function () {
  'use strict';
  const D = window.CBMDF, U = window.UNIFORMES, Draw = window.Draw;
  const KEY = 'cbmdf-uniformes-v1';
  const ORDEM = ['1b', '2a', '3a', '4a'];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const EXEMPLO = {
    nome: 'SILVA', sexo: 'M', sangue: 'O+', obm: '1º GBM', coesp: false, posto: 'cap', quadro: 'combatente', funcao: '',
    carreira: { id: 'cfo', sigla: '' },
    cursos: [{ id: 'csu-aph', externo: false, instrutor: false }, { id: 'cmte', externo: false, instrutor: true }, { id: 'cobs', externo: false, instrutor: false }],
    nCond: 3, medalhas: [],
    modo: 'barretas', manD: 'auto', manE: 'auto', tfmManga: 'curta',
  };
  const VAZIO = { nome: '', sexo: 'M', sangue: 'O+', obm: '', coesp: false, posto: 'ten2', quadro: 'combatente', funcao: '', carreira: { id: '', sigla: '' }, cursos: [], nCond: 0, medalhas: [], modo: 'barretas', manD: 'auto', manE: 'auto', tfmManga: 'curta' };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  let st, ativa = '1b';
  const views = { '1b': 'geral', '2a': 'geral', '3a': 'geral', '4a': 'geral' };
  const filtros = { '1b': 'todos', '2a': 'todos', '3a': 'todos', '4a': 'todos' };
  const pronto = {};

  // condecorações: só a quantidade; as fitas são sorteadas de forma estável (mesma quantidade => mesmas cores)
  function gerarCondecoracoes(n) {
    const out = [];
    let x = 7;
    for (let i = 0; i < n; i++) { x = (x * 73 + 41 + i * 11) % 997; out.push({ nome: 'Condecoração ' + (i + 1), tipo: 'medalha', origem: 'cbmdf', cor: D.coresFita[x % D.coresFita.length].id }); }
    return out;
  }
  function normalizar(s) {
    if (typeof s.nCond !== 'number') s.nCond = (s.medalhas || []).filter((m) => m.tipo !== 'comenda').length;
    s.nCond = Math.max(0, Math.min(32, Math.round(s.nCond) || 0));
    s.medalhas = gerarCondecoracoes(s.nCond);
    if (s.carreira && s.carreira.id && !D.cursosCarreira.some((c) => c.id === s.carreira.id)) s.carreira.id = '';
    return s;
  }
  function carregar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const o = JSON.parse(raw); if (o && o.st) { ativa = ORDEM.includes(o.ativa) ? o.ativa : '1b'; return normalizar(Object.assign(clone(EXEMPLO), o.st)); } }
    } catch (e) { /* armazenamento indisponível */ }
    return normalizar(clone(EXEMPLO));
  }
  let saveT;
  function salvar() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ st, ativa })); } catch (e) { /* ignora */ } }, 200);
  }

  /* ---------------- ficha ---------------- */
  function fillSelect(sel, opts, valueKey, labelKey) {
    sel.innerHTML = opts.map((o) => `<option value="${esc(o[valueKey])}">${esc(o[labelKey])}</option>`).join('');
  }
  function iniciarFicha() {
    $('#f-sangue').innerHTML = D.sangues.map((s) => `<option>${s}</option>`).join('');
    $('#dl-obm').innerHTML = D.obms.map((s) => `<option value="${esc(s)}">`).join('');
    // posto agrupado por categoria
    const grupos = {};
    D.postos.forEach((p) => { (grupos[p.cat] = grupos[p.cat] || []).push(p); });
    $('#f-posto').innerHTML = Object.keys(grupos).map((g) => `<optgroup label="${esc(g)}">${grupos[g].map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join('')}</optgroup>`).join('');
    $('#f-funcao').innerHTML = D.funcoes.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join('');
    $('#f-carreira').innerHTML = `<option value="">— nenhum —</option>` + D.cursosCarreira.map((c) => `<option value="${c.id}">${esc((c.sigla ? c.sigla + ' — ' : '') + c.nome)}</option>`).join('');
    const mo = `<option value="auto">Automático</option><option value="">Nenhuma</option>` + D.cursosEsp.map((c) => `<option value="${esc(c.insc)}">${esc(c.insc)}</option>`).join('');
    $('#f-manD').innerHTML = mo; $('#f-manE').innerHTML = mo;
    refletirFicha();
  }
  function listaQuadros() { const p = D.postos.find((x) => x.id === st.posto); return p.grupo === 'praca' || p.grupo === 'st' ? D.qualificacoesPracas : D.quadrosOficiais; }
  function refletirFicha() {
    $('#f-nome').value = st.nome;
    $$('input[name=f-sexo]').forEach((r) => { r.checked = r.value === st.sexo; });
    $$('input[name=f-modo]').forEach((r) => { r.checked = r.value === st.modo; });
    $('#f-sangue').value = st.sangue; $('#f-obm').value = st.obm; $('#f-ncond').value = st.nCond;
    $('#f-posto').value = st.posto;
    atualizarQuadro();
    $('#f-carreira').value = st.carreira.id || '';
    $('#f-carreira-sigla').hidden = st.carreira.id !== 'outro';
    $('#f-carreira-sigla').value = st.carreira.sigla || '';
    $('#f-manD').value = st.manD == null ? 'auto' : st.manD; $('#f-manE').value = st.manE == null ? 'auto' : st.manE;
    validarObm(); listarCursos();
  }
  function atualizarQuadro() {
    const p = D.postos.find((x) => x.id === st.posto);
    const lista = listaQuadros();
    if (!lista.some((q) => q.id === st.quadro)) st.quadro = lista[0].id;
    fillSelect($('#f-quadro'), lista, 'id', 'nome');
    $('#f-quadro').value = st.quadro;
    $('#lbl-quadro').textContent = p.grupo === 'praca' || p.grupo === 'st' ? 'Qualificação BM' : p.grupo === 'esp' ? 'Quadro de formação' : 'Quadro';
    const ofi = p.grupo === 'of';
    $('#f-funcao').disabled = !ofi;
    if (!ofi) st.funcao = '';
    $('#f-funcao').value = st.funcao || '';
  }
  function validarObm() {
    const v = (st.obm || '').trim();
    const ok = !v || D.obms.includes(v) || /^\d{1,2}º (GBM|ESAV)$/.test(v);
    const m = $('#msg-obm');
    m.hidden = ok;
    m.textContent = ok ? '' : 'Sigla fora da tabela de lotação (item 3.2, p. 106–108). O regulamento só admite as siglas listadas.';
  }
  function nomeCurso(c) { const r = Draw.resolverCurso(c); return r; }
  function listarCursos() {
    const ul = $('#lista-cursos');
    ul.innerHTML = st.cursos.map((c, i) => {
      const r = nomeCurso(c);
      return `<li data-i="${i}"><span class="ord">${i + 1}</span><span class="nm"><b>${esc(r.sigla)}</b><small>${esc(r.nome || '')}</small></span>
<label class="tgl" title="Curso realizado fora do CBMDF (órgão público ou militar)"><input type="checkbox" data-k="externo" ${c.externo ? 'checked' : ''}><span>externo</span></label>
<label class="tgl" title="É ou foi instrutor neste curso"><input type="checkbox" data-k="instrutor" ${c.instrutor ? 'checked' : ''}><span>instrutor</span></label>
<span class="ops"><button type="button" data-act="up" aria-label="Subir prioridade">▲</button><button type="button" data-act="down" aria-label="Descer prioridade">▼</button><button type="button" data-act="del" aria-label="Remover">✕</button></span></li>`;
    }).join('') || '<li class="vazio">Nenhum curso informado.</li>';
    const usados = new Set(st.cursos.map((c) => c.id));
    $('#f-curso-add').innerHTML = D.cursosEsp.filter((c) => !usados.has(c.id)).map((c) => `<option value="${c.id}">${esc(c.sigla)} — ${esc(c.nome)}</option>`).join('') || '<option value="">(todos adicionados)</option>';
  }
  function mover(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

  function ligarFicha() {
    $('#f-nome').addEventListener('input', (e) => { st.nome = e.target.value.toUpperCase(); mudou(); });
    $$('input[name=f-sexo]').forEach((r) => r.addEventListener('change', () => { st.sexo = r.value; mudou(); }));
    $$('input[name=f-modo]').forEach((r) => r.addEventListener('change', () => { st.modo = r.value; mudou(); }));
    $('#f-sangue').addEventListener('change', (e) => { st.sangue = e.target.value; mudou(); });
    $('#f-obm').addEventListener('input', (e) => { st.obm = e.target.value.toUpperCase().replace('º GBM', 'º GBM'); validarObm(); mudou(); });
    $('#f-ncond').addEventListener('input', (e) => { st.nCond = Math.max(0, Math.min(32, parseInt(e.target.value, 10) || 0)); st.medalhas = gerarCondecoracoes(st.nCond); mudou(); });
    $('#f-ncond').addEventListener('change', (e) => { e.target.value = st.nCond; });
    $('#f-posto').addEventListener('change', (e) => { st.posto = e.target.value; atualizarQuadro(); mudou(); });
    $('#f-quadro').addEventListener('change', (e) => { st.quadro = e.target.value; mudou(); });
    $('#f-funcao').addEventListener('change', (e) => { st.funcao = e.target.value; mudou(); });
    $('#f-carreira').addEventListener('change', (e) => { st.carreira.id = e.target.value; $('#f-carreira-sigla').hidden = e.target.value !== 'outro'; mudou(); });
    $('#f-carreira-sigla').addEventListener('input', (e) => { st.carreira.sigla = e.target.value.toUpperCase(); mudou(); });
    $('#f-manD').addEventListener('change', (e) => { st.manD = e.target.value; mudou(); });
    $('#f-manE').addEventListener('change', (e) => { st.manE = e.target.value; mudou(); });
    $('#btn-curso-add').addEventListener('click', () => { const v = $('#f-curso-add').value; if (v) { st.cursos.push({ id: v, externo: false, instrutor: false }); listarCursos(); mudou(); } });
    $('#btn-curso-custom').addEventListener('click', () => { const i = $('#f-curso-custom'); const v = i.value.trim().toUpperCase(); if (v) { st.cursos.push({ id: 'custom:' + v + ':' + Date.now(), sigla: v, nome: 'Curso informado por você', externo: false, instrutor: false }); i.value = ''; listarCursos(); mudou(); } });
    $('#lista-cursos').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const i = +b.closest('li').dataset.i;
      if (b.dataset.act === 'up') mover(st.cursos, i, -1); else if (b.dataset.act === 'down') mover(st.cursos, i, 1); else st.cursos.splice(i, 1);
      listarCursos(); mudou();
    });
    $('#lista-cursos').addEventListener('change', (e) => { const cb = e.target.closest('input[data-k]'); if (!cb) return; st.cursos[+cb.closest('li').dataset.i][cb.dataset.k] = cb.checked; mudou(); });
    $('#btn-exemplo').addEventListener('click', () => { st = normalizar(clone(EXEMPLO)); refletirFicha(); mudou(); });
    $('#btn-limpar').addEventListener('click', () => { if (confirm('Limpar todos os dados da ficha?')) { st = normalizar(clone(VAZIO)); refletirFicha(); mudou(); } });
    const bt = $('#btn-ficha-toggle');
    bt.addEventListener('click', () => { const f = $('#ficha'); const aberto = f.classList.toggle('fechada') === false; bt.setAttribute('aria-expanded', String(aberto)); });
    if (window.matchMedia('(max-width: 900px)').matches) { $('#ficha').classList.add('fechada'); bt.setAttribute('aria-expanded', 'false'); }
  }

  /* ---------------- abas ---------------- */
  const NIVEIS = { alerta: ['Atenção', 0], obrig: ['Obrigatório', 1], opc: ['Opcional', 2], vedado: ['Vedado', 3], info: ['Informação', 4] };
  const VIEWS = [['geral', 'Visão geral'], ['peito', 'Peito e ombros'], ['mangaD', 'Manga direita'], ['mangaE', 'Manga esquerda'], ['cobertura', 'Cobertura']];

  function montarPaineis() {
    const tabs = $('.tabs'), pan = $('.tabpanels');
    tabs.innerHTML = ORDEM.map((k) => `<button role="tab" id="t-${k}" aria-controls="p-${k}" aria-selected="false" tabindex="-1" data-k="${k}"><i style="background:${U[k].cor}"></i><span><b>${esc(U[k].aba)}</b><small>${esc(U[k].codigo)}</small></span></button>`).join('');
    pan.innerHTML = ORDEM.map((k) => {
      const u = U[k];
      return `<section class="uni" id="p-${k}" role="tabpanel" aria-labelledby="t-${k}" data-k="${k}" hidden>
<div class="uni-head"><span class="codigo" style="background:${u.cor}">${esc(u.codigo)}</span><div><h2>${esc(u.titulo)}</h2><p class="resumo"></p></div>
<dl class="ficha-uni">${u.ficha.map((f) => `<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('')}</dl></div>
<div class="uni-grid">
 <div class="box stage">
  <div class="stage-bar"><div class="views" role="group" aria-label="Enquadramento">${VIEWS.map((v) => `<button type="button" data-view="${v[0]}" aria-pressed="${v[0] === 'geral'}">${v[1]}</button>`).join('')}</div>
   <div class="zoom-ctl" role="group" aria-label="Zoom"><button type="button" data-zoom="out" title="Afastar" aria-label="Afastar">−</button><button type="button" data-zoom="in" title="Aproximar" aria-label="Aproximar">+</button><button type="button" data-zoom="reset" title="Restaurar enquadramento" aria-label="Restaurar enquadramento">⟲</button></div></div>
  <div class="svgwrap" aria-live="polite"></div>
  <p class="stage-note">Passe o mouse numa peça ou cartão para destacar; clique numa peça para localizar a regra (ela pisca por 3 s). Role o mouse sobre a imagem para aproximar, arraste para mover e dê duplo clique para restaurar.</p>
 </div>
 <div class="box rules">
  <div class="rules-head"><h3>Regras para você <span class="cont"></span></h3>
   <div class="chips" role="group" aria-label="Filtrar regras">${[['todos', 'Todas'], ['obrig', 'Obrigatório'], ['opc', 'Opcional'], ['vedado', 'Vedado'], ['alerta', 'Atenção'], ['info', 'Info']].map((f) => `<button type="button" data-f="${f[0]}" aria-pressed="${f[0] === 'todos'}">${f[1]}</button>`).join('')}</div></div>
  <ul class="cards"></ul>
 </div>
</div>
<div class="uni-extra">
 <div class="box refs"><h3>Referência oficial</h3><div class="fotos">${u.fotos.map((f) => `<figure><img src="${f.src}" alt="${esc(f.cap)}" loading="lazy"><figcaption>${esc(f.cap)}</figcaption></figure>`).join('')}</div></div>
 <div class="box comp"><h3>Composição <span class="sx"></span></h3><ul class="comp-list"></ul></div>
 <div class="box espec"><h3>Especificidades do regulamento</h3>${u.espec.map((e) => `<details><summary>${esc(e[0])}</summary><p>${esc(e[1])} <span class="pag">${esc(e[2])}</span></p></details>`).join('')}</div>
</div>
${(u.figuras || []).length ? `<div class="box figs"><h3>Modo correto de uso — figuras do regulamento</h3><div class="figs-grid">${u.figuras.map((f) => `<figure><img src="${f.src}" alt="${esc(f.cap)}" loading="lazy"><figcaption>${esc(f.cap)}</figcaption></figure>`).join('')}</div></div>` : ''}</section>`;
    }).join('');
    tabs.addEventListener('click', (e) => { const b = e.target.closest('button[data-k]'); if (b) abrir(b.dataset.k); });
    tabs.addEventListener('keydown', (e) => {
      const i = ORDEM.indexOf(ativa);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = ORDEM[(i + (e.key === 'ArrowRight' ? 1 : ORDEM.length - 1)) % ORDEM.length]; abrir(n); $('#t-' + n).focus(); e.preventDefault(); }
    });
    ORDEM.forEach((k) => ligarPainel(k));
  }

  function ligarPainel(k) {
    const p = $('#p-' + k);
    $$('[data-view]', p).forEach((b) => b.addEventListener('click', () => setView(k, b.dataset.view)));
    $$('[data-f]', p).forEach((b) => b.addEventListener('click', () => { filtros[k] = b.dataset.f; $$('[data-f]', p).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pintarCards(k); }));
    $$('input[name=manga-' + k + ']', p).forEach((r) => r.addEventListener('change', () => { st.tfmManga = r.value; mudou(); }));
    ligarZoom(k, p);
    const alvo = (e) => e.target.closest('[data-hs]');
    p.addEventListener('mouseover', (e) => { const el = alvo(e); destacar(p, el ? el.dataset.hs : null); });
    p.addEventListener('mouseout', (e) => { if (!e.relatedTarget || !p.contains(e.relatedTarget) || !e.relatedTarget.closest('[data-hs]')) destacar(p, null); });
    p.addEventListener('focusin', (e) => { const el = alvo(e); if (el) destacar(p, el.dataset.hs); });
    p.addEventListener('focusout', () => destacar(p, null));
    p.addEventListener('click', (e) => {
      const el = alvo(e); if (!el) return;
      const key = el.dataset.hs;
      if (el.closest('.cards')) { setView(k, viewPara(key)); }
      else {
        let cs = $$('.cards [data-hs="' + key + '"]', p);
        if (!cs.length && filtros[k] !== 'todos') {
          filtros[k] = 'todos';
          $$('[data-f]', p).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === 'todos')));
          pintarCards(k);
          cs = $$('.cards [data-hs="' + key + '"]', p);
        }
        if (cs.length) {
          cs[0].scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
          cs.forEach((c) => { c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); clearTimeout(c._ft); c._ft = setTimeout(() => c.classList.remove('flash'), 3000); });
        }
      }
    });
  }
  // zoom (roda do mouse / pinça / botões) e pan (arrastar) direto no viewBox do SVG
  function ligarZoom(k, p) {
    const wrap = $('.svgwrap', p);
    const getSvg = () => $('svg', wrap);
    const vbOf = (svg) => svg.getAttribute('viewBox').split(' ').map(Number);
    const baseW = () => (pronto[k] ? pronto[k].vb.geral : '0 0 760 650').split(' ').map(Number)[2];
    const setVB = (svg, v) => {
      svg.setAttribute('viewBox', v.map((n) => n.toFixed(2)).join(' '));
      const ref = pronto[k] ? pronto[k].vb[views[k]].split(' ').map(Number)[2] : v[2];
      wrap.classList.toggle('zoomed', Math.abs(v[2] - ref) > ref * 0.02);
    };
    const pt = (svg, x, y) => { const m = svg.getScreenCTM(); return m ? new DOMPoint(x, y).matrixTransform(m.inverse()) : null; };
    function zoomEm(svg, cx, cy, f) {
      if (svg._raf) cancelAnimationFrame(svg._raf);
      const v = vbOf(svg), bw = baseW();
      const w = Math.max(bw * 0.06, Math.min(bw * 1.25, v[2] / f)), s = w / v[2];
      setVB(svg, [cx - (cx - v[0]) * s, cy - (cy - v[1]) * s, w, v[3] * s]);
    }
    wrap.addEventListener('wheel', (e) => {
      const svg = getSvg(); if (!svg) return;
      e.preventDefault();
      const q = pt(svg, e.clientX, e.clientY); if (q) zoomEm(svg, q.x, q.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016)));
    }, { passive: false });

    const ptrs = new Map();
    let moved = false, start = null, pinchD = 0;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false; start = { x: e.clientX, y: e.clientY };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    wrap.addEventListener('pointermove', (e) => {
      const last = ptrs.get(e.pointerId); if (!last) return;
      const svg = getSvg(); if (!svg) return;
      if (svg._raf) cancelAnimationFrame(svg._raf);
      const cur = { x: e.clientX, y: e.clientY };
      if (ptrs.size === 2) {
        ptrs.set(e.pointerId, cur);
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        const q = pt(svg, (a.x + b.x) / 2, (a.y + b.y) / 2);
        if (q && pinchD) zoomEm(svg, q.x, q.y, d / pinchD);
        pinchD = d; moved = true; return;
      }
      if (!moved) {
        if (Math.hypot(cur.x - start.x, cur.y - start.y) < 5) return;
        moved = true; wrap.classList.add('panning');
        try { wrap.setPointerCapture(e.pointerId); } catch (_) { /* ignora */ }
      }
      const m = svg.getScreenCTM(); if (!m) return;
      const v = vbOf(svg);
      setVB(svg, [v[0] - (cur.x - last.x) / m.a, v[1] - (cur.y - last.y) / m.d, v[2], v[3]]);
      ptrs.set(e.pointerId, cur);
    });
    const fim = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinchD = 0; if (!ptrs.size) wrap.classList.remove('panning'); };
    wrap.addEventListener('pointerup', fim);
    wrap.addEventListener('pointercancel', fim);
    // um arraste não deve contar como clique numa peça
    wrap.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    wrap.addEventListener('dblclick', () => setView(k, views[k]));
    $$('[data-zoom]', p).forEach((b) => b.addEventListener('click', () => {
      const svg = getSvg(); if (!svg) return;
      if (b.dataset.zoom === 'reset') { setView(k, views[k]); return; }
      const v = vbOf(svg);
      zoomEm(svg, v[0] + v[2] / 2, v[1] + v[3] / 2, b.dataset.zoom === 'in' ? 1.4 : 1 / 1.4);
    }));
  }
  function destacar(p, key) {
    $$('.hl', p).forEach((x) => x.classList.remove('hl'));
    p.classList.toggle('focus', !!key);
    if (key) $$('[data-hs="' + key + '"]', p).forEach((x) => x.classList.add('hl'));
  }
  function viewPara(key) {
    const pr = D.postos.find((x) => x.id === st.posto).grupo === 'praca';
    if (['bandeira', 'manicacaD', 'caeo', 'instrutor'].includes(key) || (key === 'posto' && pr)) return 'mangaD';
    if (['emblema', 'manicacaE'].includes(key)) return 'mangaE';
    if (key === 'cobertura' || key === 'boina') return 'cobertura';
    if (['bermuda', 'composicao', 'transito', 'vedados', 'vedcond', 'vedaplique', 'calca'].includes(key)) return 'geral';
    return 'peito';
  }
  function setView(k, v) {
    views[k] = v;
    const p = $('#p-' + k);
    $$('[data-view]', p).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    $('.svgwrap', p).classList.remove('zoomed');
    const svg = $('svg', p);
    if (svg && pronto[k]) tween(svg, pronto[k].vb[v]);
  }
  function tween(svg, to) {
    const t = to.split(' ').map(Number);
    if (svg._raf) cancelAnimationFrame(svg._raf);
    if (reduced) { svg.setAttribute('viewBox', to); return; }
    const f = svg.getAttribute('viewBox').split(' ').map(Number);
    const t0 = performance.now(), dur = 480;
    const step = (now) => {
      let x = Math.min(1, (now - t0) / dur); x = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      svg.setAttribute('viewBox', f.map((a, i) => (a + (t[i] - a) * x).toFixed(2)).join(' '));
      if (x < 1) svg._raf = requestAnimationFrame(step);
    };
    svg._raf = requestAnimationFrame(step);
  }

  function abrir(k) {
    ativa = k; salvar();
    ORDEM.forEach((x) => {
      const on = x === k;
      const t = $('#t-' + x); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      $('#p-' + x).hidden = !on;
    });
    desenhar(k);
    history.replaceState(null, '', '#' + k);
  }

  function pintarCards(k) {
    const p = $('#p-' + k), res = pronto[k]; if (!res) return;
    const f = filtros[k];
    const lista = res.items.slice().sort((a, b) => NIVEIS[a.nivel][1] - NIVEIS[b.nivel][1]);
    const vis = lista.filter((it) => f === 'todos' || it.nivel === f);
    $('.cont', p).textContent = `(${vis.length})`;
    $('.cards', p).innerHTML = vis.map((it) => `<li class="card nv-${it.nivel}" data-hs="${it.key}" tabindex="0">
<div class="cb"><div class="ttl"><span>${esc(it.titulo)}</span><em class="tag">${NIVEIS[it.nivel][0]}</em></div><p>${esc(it.texto)}</p><span class="pag">${esc(it.pag || '')}</span></div></li>`).join('') || '<li class="vazio">Nenhuma regra neste filtro.</li>';
  }

  function resumoTexto() {
    const p = D.postos.find((x) => x.id === st.posto);
    const q = listaQuadros().find((x) => x.id === st.quadro) || {};
    return `${p.abrev} ${st.nome || 'NOME'} · ${q.nome || ''} · ${st.sexo === 'F' ? 'feminino' : 'masculino'}${st.obm ? ' · ' + st.obm : ''}`;
  }

  function desenhar(k) {
    const p = $('#p-' + k);
    const res = Draw.build(k, st);
    pronto[k] = res;
    const wrap = $('.svgwrap', p);
    wrap.innerHTML = res.svg;
    wrap.style.aspectRatio = res.aspect || '760 / 650';
    wrap.classList.remove('zoomed');
    $('svg', wrap).setAttribute('viewBox', res.vb[views[k]]);
    $('.resumo', p).textContent = resumoTexto();
    $$('input[name=manga-' + k + ']', p).forEach((r) => { r.checked = r.value === st.tfmManga; });
    pintarCards(k);
    // composição
    const sx = st.sexo === 'F' ? 'F' : 'M';
    $('.sx', p).textContent = '— versão ' + (sx === 'F' ? 'feminina' : 'masculina');
    $('.comp-list', p).innerHTML = U[k].composicao[sx].map((x) => `<li>${esc(x)}</li>`).join('');
  }

  let raf;
  function mudou() { salvar(); cancelAnimationFrame(raf); raf = requestAnimationFrame(() => desenhar(ativa)); }

  /* ---------------- início ---------------- */
  st = carregar();
  const h = (location.hash || '').replace('#', '');
  if (ORDEM.includes(h)) ativa = h;
  iniciarFicha();
  ligarFicha();
  montarPaineis();
  abrir(ativa);
})();
