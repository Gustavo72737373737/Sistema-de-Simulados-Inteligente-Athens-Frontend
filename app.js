/*
  Athens - Sistema de Simulados Inteligente
  Frontend: HTML/CSS/JS puro (sem backend)

  Responsabilidades:
  - Carregar simulado a partir de JSON colado (array de questões ou objeto com questoes/simulado)
  - Renderizar questões por tipo
  - Registrar respostas (sem correção e sem gabarito)
  - Exportar JSON apenas com as respostas do aluno
  - Opcional: localStorage para continuar após fechar

  Regras:
  - Não corrigir.
  - Nunca mostrar gabarito.
  - Suporta tipos:
      multipla_escolha
      verdadeiro_falso
      resposta_curta
      discursiva
*/

const STORAGE_KEY = 'athens_simulado_v1';
const STORAGE_PROOF_KEY = 'athens_simulado_proof_v1';
const STORAGE_THEME_KEY = 'athens_theme';

// ---------- Utils (lógica) ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function normalizeTipo(tipo){
  return (tipo ?? '').toString().trim().toLowerCase();
}

function safeString(v){
  return (v ?? '').toString();
}

function encodeRespostaMultipla(alternativaIndex){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[alternativaIndex] || String(alternativaIndex);
}

function decodeRespostaMultipla(letra){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const up = safeString(letra).trim().toUpperCase();
  const idx = letters.indexOf(up);
  return idx >= 0 ? idx : null;
}

function clamp(n,a,b){
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setStatus(el, msg){
  if (!el) return;
  el.textContent = msg;
}

function jsonPretty(obj){
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function showJSONPreview(payload){
  const pre = $('#jsonPreview');
  if (!pre) return;
  pre.hidden = false;
  pre.textContent = jsonPretty(payload);
}

function buildDownload(filename, text){
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---------- Parser/Validação do JSON do aluno (lógica) ----------
// Aceita:
// 1) Array de questões
// 2) Objeto com questoes: [...]
// 3) Objeto com simulado: { questoes: [...] }
// Retorna { titulo?, materia?, tema?, questoes: [...] }

function parseSimuladoJson(rawText){
  const text = safeString(rawText).trim();
  if (!text) throw new Error('Cole um JSON antes de carregar.');

  let parsed;
  try{
    parsed = JSON.parse(text);
  } catch (e){
    throw new Error('JSON inválido: verifique vírgulas, aspas e colchetes.');
  }

  // Case 1: array
  if (Array.isArray(parsed)){
    return { questoes: parsed };
  }

  // Case 2: object com questoes
  if (parsed && typeof parsed === 'object'){
    if (Array.isArray(parsed.questoes)){
      return {
        titulo: parsed.titulo,
        materia: parsed.materia,
        tema: parsed.tema,
        questoes: parsed.questoes
      };
    }

    if (parsed.simulado && typeof parsed.simulado === 'object' && Array.isArray(parsed.simulado.questoes)){
      return {
        titulo: parsed.simulado.titulo,
        materia: parsed.simulado.materia,
        tema: parsed.simulado.tema,
        questoes: parsed.simulado.questoes
      };
    }
  }

  throw new Error('Formato não reconhecido. Envie um array de questões ou um objeto com “questoes”/“simulado”.');
}

function validateQuestao(q, idx){
  const errors = [];
  if (!q || typeof q !== 'object'){
    errors.push(`Questão #${idx+1} é inválida.`);
    return errors;
  }

  const tipo = normalizeTipo(q.tipo);
  const id = q.id ?? (idx+1);

  if (!tipo) errors.push(`Questão id ${id}: campo “tipo” é obrigatório.`);

  const supported = new Set(['multipla_escolha','verdadeiro_falso','resposta_curta','discursiva']);
  if (tipo && !supported.has(tipo)) errors.push(`Questão id ${id}: tipo não suportado (“${q.tipo}”).`);

  if (!safeString(q.pergunta).trim()) errors.push(`Questão id ${id}: “pergunta” é obrigatória.`);

  if (tipo === 'multipla_escolha'){
    if (!Array.isArray(q.alternativas) || q.alternativas.length < 2){
      errors.push(`Questão id ${id}: “alternativas” precisa ter pelo menos 2 itens.`);
    }
  }

  // resposta_curta/discursiva: não exigimos criterios/gabarito; aluno só responde.
  return errors;
}

function validateSimulado(parsed){
  const { questoes } = parsed;
  if (!Array.isArray(questoes) || questoes.length === 0){
    throw new Error('O simulado precisa ter ao menos 1 questão.');
  }

  const allErrors = [];
  const ids = new Set();

  questoes.forEach((q, idx) => {
    const errs = validateQuestao(q, idx);
    if (errs.length) allErrors.push(...errs);

    const id = q?.id ?? (idx+1);
    if (ids.has(id)) allErrors.push(`IDs duplicados: “${id}” aparece mais de uma vez.`);
    ids.add(id);
  });

  if (allErrors.length){
    // mensagem clara com lista
    throw new Error('Não foi possível carregar o simulado. Erros:\n- ' + allErrors.join('\n- '));
  }

  return questoes.map((q, idx) => ({
    id: q.id ?? (idx + 1),
    materia: q.materia ?? parsed.materia ?? '',
    tema: q.tema ?? parsed.tema ?? '',
    tipo: q.tipo,
    pergunta: q.pergunta,
    alternativas: Array.isArray(q.alternativas) ? q.alternativas : undefined
  }));
}

// ---------- Estado (lógica) ----------
// state:
// {
//   meta: { titulo, materia, tema, questoesHash? }
//   questoes: [...],
//   respostas: { [id]: { id, tipo, resposta } },
//   config: { embaralhar, persistir }
//   tempo: { startedAt }
// }

const state = {
  meta: { titulo: '', materia: '', tema: '' },
  questoes: [],
  respostas: {},
  config: { embaralhar: false, persistir: true },
  startedAt: null
};

function calcProofHash(questoes){
  // hash simples para identificar “qual simulado é esse” sem depender de criptografia
  const core = questoes.map(q => [q.id, q.tipo, q.pergunta, (q.alternativas||[]).join('|')].join('~')).join('||');
  let h = 0;
  for (let i = 0; i < core.length; i++) h = (h * 31 + core.charCodeAt(i)) >>> 0;
  return String(h);
}

function hasPersistedProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && obj.proofHash && obj.questoesIds && obj.respostas;
  } catch { return false; }
}

function loadPersistedProgress(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const obj = JSON.parse(raw);

  state.respostas = obj.respostas || {};
  state.config = obj.config || state.config;

  // não restaura state.questoes aqui: a lista vem do novo carregamento.
  return true;
}

function persistProgress(){
  const proofHash = calcProofHash(state.questoes);
  const questoesIds = state.questoes.map(q => q.id);

  const payload = {
    version: 1,
    proofHash,
    questoesIds,
    respostas: state.respostas,
    config: state.config,
    updatedAt: Date.now()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return proofHash;
}

function proofHashFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.proofHash ?? null;
  } catch { return null; }
}

function clearPersisted(){
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- Render/Interface (interface) ----------
let themeInitialized = false;
function initTheme(){
  if (themeInitialized) return;
  themeInitialized = true;

  const stored = localStorage.getItem(STORAGE_THEME_KEY);
  if (stored === 'light') document.documentElement.setAttribute('data-theme','light');

  $('#btnToggleTheme')?.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'light' ? 'dark' : 'light';
    if (next === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(STORAGE_THEME_KEY, next);
  });
}

function updateProgress(){
  const total = state.questoes.length;
  const answered = state.questoes.reduce((acc, q) => {
    const r = state.respostas[q.id]?.resposta;
    return acc + (safeString(r).trim() ? 1 : 0);
  }, 0);

  $('#answeredCount').textContent = String(answered);
  $('#totalCount').textContent = String(total);

  const pct = total ? Math.round((answered/total)*100) : 0;
  const fill = $('#progressBarFill');
  if (fill) fill.style.width = pct + '%';

  // enable download only if at least one answered
  const btnBaixar = $('#btnBaixar');
  if (btnBaixar) btnBaixar.disabled = answered === 0;
}

function setQuestionAnsweredVisual(qId, tipo){
  // opcional: adiciona classe visual; o render já faz.
  void qId; void tipo;
}

function renderQuestoes(){
  const container = $('#questoes');
  container.innerHTML = '';

  const total = state.questoes.length;
  $('#quizMeta').textContent = `Questões: ${total} • Sem correção (apenas coleta)`;

  state.questoes.forEach((q, idx) => {
    const tipo = normalizeTipo(q.tipo);
    const already = state.respostas[q.id]?.resposta;

    const card = document.createElement('article');
    card.className = 'q-card';

    card.innerHTML = `
      <div class="q-head">
        <div class="q-id">Q${idx+1}</div>
        <div class="q-metadata">${safeString(q.materia || '')} • ${safeString(q.tema || '')}</div>
      </div>
      <p class="q-text"></p>
      <div class="q-body"></div>
    `;

    card.querySelector('.q-text').textContent = safeString(q.pergunta);
    const body = card.querySelector('.q-body');

    if (tipo === 'multipla_escolha'){
      renderMultipla(q, body, already);
    } else if (tipo === 'verdadeiro_falso'){
      renderVerdadeiroFalso(q, body, already);
    } else if (tipo === 'resposta_curta'){
      renderRespostaCurta(q, body, already);
    } else if (tipo === 'discursiva'){
      renderDiscursiva(q, body, already);
    } else {
      const p = document.createElement('p');
      p.className = 'panel__hint';
      p.textContent = `Tipo não suportado: ${tipo}`;
      body.appendChild(p);
    }

    container.appendChild(card);
  });

  updateProgress();
}

function setResposta(id, tipo, resposta){
  state.respostas[id] = { id, tipo, resposta };

  if (state.config.persistir && $('#chkPersistir')?.checked){
    persistProgress();
  }

  updateProgress();
}

function renderMultipla(q, mount, already){
  const alternativas = Array.isArray(q.alternativas) ? q.alternativas : [];
  const list = document.createElement('div');
  list.className = 'choice-list';

  alternativas.forEach((alt, i) => {
    const letter = encodeRespostaMultipla(i);
    const isChecked = safeString(already).trim().toUpperCase() === letter;

    const label = document.createElement('label');
    label.className = 'choice' + (isChecked ? ' is-answered' : '');
    label.innerHTML = `
      <input type="radio" name="q_${q.id}" value="${letter}" ${isChecked ? 'checked' : ''} />
      <span>${safeString(alt)}</span>
    `;

    label.addEventListener('change', (ev) => {
      setResposta(q.id, 'multipla_escolha', ev.target.value);
    });

    list.appendChild(label);
  });

  mount.appendChild(list);
}

function renderVerdadeiroFalso(q, mount, already){
  const list = document.createElement('div');
  list.className = 'choice-list';

  const opts = [
    { label: 'Verdadeiro', value: 'V' },
    { label: 'Falso', value: 'F' }
  ];

  opts.forEach(opt => {
    const isChecked = safeString(already).trim().toUpperCase() === opt.value;

    const label = document.createElement('label');
    label.className = 'choice' + (isChecked ? ' is-answered' : '');
    label.innerHTML = `
      <input type="radio" name="q_${q.id}" value="${opt.value}" ${isChecked ? 'checked' : ''} />
      <span>${opt.label}</span>
    `;

    label.addEventListener('change', (ev) => {
      setResposta(q.id, 'verdadeiro_falso', ev.target.value);
    });

    list.appendChild(label);
  });

  mount.appendChild(list);
}

function renderRespostaCurta(q, mount, already){
  const input = document.createElement('input');
  input.className = 'text-input';
  input.type = 'text';
  input.placeholder = 'Digite sua resposta...';
  input.value = already ? safeString(already) : '';

  input.addEventListener('input', () => {
    setResposta(q.id, 'resposta_curta', input.value);
  });

  mount.appendChild(input);
}

function renderDiscursiva(q, mount, already){
  const textarea = document.createElement('textarea');
  textarea.className = 'textarea';
  textarea.placeholder = 'Escreva sua resposta...';
  textarea.value = already ? safeString(already) : '';

  textarea.addEventListener('input', () => {
    setResposta(q.id, 'discursiva', textarea.value);
  });

  mount.appendChild(textarea);
}

function getExportPayload(){
  const respostasArr = state.questoes
    .map(q => state.respostas[q.id])
    .filter(Boolean)
    .map(item => ({
      id: item.id,
      tipo: item.tipo,
      resposta: safeString(item.resposta)
    }))
    .filter(item => item.resposta.trim() !== '');

  return { respostas: respostasArr };
}

// ---------- Fluxo ----------
async function init(){
  initTheme();

  const panelConfig = $('#panelConfig');
  const panelQuiz = $('#panelQuiz');
  const statusCfg = $('#configStatus');
  const statusQuiz = $('#quizStatus');

  const inputSimuladoJson = $('#inputSimuladoJson');
  const btnCarregar = $('#btnCarregar');
  const btnNovoSimulado = $('#btnNovoSimulado');
  const btnNovoSimuladoFinal = $('#btnNovoSimuladoFinal');
  const btnFinalizar = $('#btnFinalizar');
  const btnBaixar = $('#btnBaixar');

  const chkPersistir = $('#chkPersistir');
  const chkEmbaralhar = $('#chkEmbaralhar');

  const btnExemplo = $('#btnExemplo');
  if (btnExemplo){
    // link já carrega exemplos.html; aqui não fazemos nada.
    btnExemplo.addEventListener('click', () => {});
  }

  function setConfigUI({ persistir, embaralhar }){
    if (chkPersistir) chkPersistir.checked = !!persistir;
    if (chkEmbaralhar) chkEmbaralhar.checked = !!embaralhar;
  }

  // Persistir config apenas localmente (não obrigatório)
  state.config.persistir = chkPersistir?.checked ?? true;
  state.config.embaralhar = chkEmbaralhar?.checked ?? false;

  btnCarregar.addEventListener('click', () => {
    try{
      setStatus(statusCfg, 'Carregando simulado...');

      const parsed = parseSimuladoJson(inputSimuladoJson.value);
      const questoes = validateSimulado(parsed);

      // configurar estado
      state.questoes = questoes;
      state.respostas = {};
      state.startedAt = Date.now();

      state.meta.titulo = safeString(parsed.titulo || 'Simulado');
      state.meta.materia = safeString(parsed.materia || '');
      state.meta.tema = safeString(parsed.tema || '');

      // embaralhar se selecionado
      const embaralhar = Boolean(chkEmbaralhar?.checked);
      if (embaralhar) state.questoes = shuffle(state.questoes);
      state.config.embaralhar = embaralhar;

      // Persistência: carregar apenas se o proofHash bater
      if (chkPersistir?.checked && hasPersistedProgress()){
        const storedHash = proofHashFromStorage();
        const newHash = calcProofHash(state.questoes);
        if (storedHash && storedHash === newHash){
          loadPersistedProgress();
          setStatus(statusCfg, 'Progresso restaurado com sucesso.');
          // continua com respostas já carregadas
        } else {
          clearPersisted();
        }
      }

      // UI
      $('#quizTitle').textContent = state.meta.titulo || 'Simulado';
      $('#jsonPreview').hidden = true;
      $('#btnBaixar').disabled = true;
      $('#btnNovoSimuladoFinal').hidden = false;

      panelConfig.hidden = true;
      panelQuiz.hidden = false;

      renderQuestoes();
      setStatus(statusCfg, '');
      setStatus(statusQuiz, 'Simulado pronto. Registre suas respostas.');
      setTimeout(() => setStatus(statusQuiz,''), 1200);

      // Atualiza persistência inicial
      if (chkPersistir?.checked){
        state.config.persistir = true;
        persistProgress();
      }

      // mostrar botão reset/novo
      btnNovoSimulado.style.display = 'inline-flex';

      // opcional: esconder botão NovoSimulado duplicado do layout do quiz
      if (btnNovoSimuladoFinal) btnNovoSimuladoFinal.hidden = false;

    } catch (e){
      setStatus(statusCfg, safeString(e?.message || e));
    }
  });

  function novoSimulado(){
    clearPersisted();
    state.questoes = [];
    state.respostas = {};
    state.startedAt = null;
    state.meta = { titulo:'', materia:'', tema:'' };

    // UI reset
    panelQuiz.hidden = true;
    panelConfig.hidden = false;
    $('#questoes').innerHTML = '';
    $('#jsonPreview').hidden = true;
    $('#jsonPreview').textContent = '';
    $('#btnBaixar').disabled = true;
    if (btnNovoSimulado) btnNovoSimulado.style.display = 'none';
    if (btnNovoSimuladoFinal) btnNovoSimuladoFinal.hidden = true;
    setStatus(statusCfg, '');
    setStatus(statusQuiz, '');
  }

  btnNovoSimulado?.addEventListener('click', novoSimulado);
  btnNovoSimuladoFinal?.addEventListener('click', novoSimulado);

  chkPersistir?.addEventListener('change', () => {
    state.config.persistir = chkPersistir.checked;
    if (!state.config.persistir) clearPersisted();
  });

  chkEmbaralhar?.addEventListener('change', () => {
    state.config.embaralhar = chkEmbaralhar.checked;
  });

  btnFinalizar.addEventListener('click', () => {
    const payload = getExportPayload();
    const text = JSON.stringify(payload);

    showJSONPreview(payload);
    setStatus(statusQuiz, 'Finalizado. Use “Copiar/Baixar JSON” para exportar as respostas.');
    if (btnBaixar) btnBaixar.disabled = false;
  });

  btnBaixar.addEventListener('click', async () => {
    const payload = getExportPayload();
    const text = JSON.stringify(payload);

    const copied = await copyToClipboard(text);
    if (copied){
      setStatus(statusQuiz, 'JSON copiado para a área de transferência.');
    } else {
      setStatus(statusQuiz, 'Falha ao copiar automaticamente. Gerando download...');
    }

    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    buildDownload(`athens-respostas-${ts}.json`, JSON.stringify(payload, null, 2));
  });

  // estado inicial UI
  if (btnNovoSimulado) btnNovoSimulado.style.display = 'none';
  if (btnNovoSimuladoFinal) btnNovoSimuladoFinal.hidden = true;

  // se houver json no storage de progresso, deixamos carregado; mas o usuário ainda precisa clicar em Carregar.
  // (para evitar render sem ter o proofHash)
  setStatus(statusCfg, '');
}

init();

