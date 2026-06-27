/*
  Sistema de Simulados Inteligente (Athens)
  - Sem framework
  - Offline
  - Separação: Dados (questoes.json), Interface (index.html), Lógica (este arquivo)

  Regras:
  - Não corrigir e não exibir gabarito.
  - Exportar apenas respostas do aluno.
*/
let simuladoIdAtual = null; // Guarda o ID gerado pelo MySQL

const STORAGE_KEY = 'athens_simulado_v1';

// --------- UTIL (Lógica) ---------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function safeString(v){
  return (v ?? '').toString();
}

function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

function encodeRespostaMultipla(alternativaIndex){
  // Alternativas em ordem A, B, C...
  // Retorna letra (ex: 'B')
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[alternativaIndex] || String(alternativaIndex);
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
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function normalizeTipo(tipo){
  return safeString(tipo).trim().toLowerCase();
}

// --------- DADOS (carregamento dinâmico via JSON colado) ---------
function extractQuestoesFromAnyJson(parsed){
  // Aceita tanto array puro quanto objetos como:
  // { "questoes": [ ... ] } ou { "simulado": [ ... ] }
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.questoes)) return parsed.questoes;
  if (Array.isArray(parsed?.simulado)) return parsed.simulado;
  if (Array.isArray(parsed?.questoes?.items)) return parsed.questoes.items;
  return null;
}

function validateTipoSupportado(tipo){
  const t = normalizeTipo(tipo);
  return ['multipla_escolha','verdadeiro_falso','resposta_curta','discursiva'].includes(t);
}

function validateQuestao(q){
  // Validação mínima para evitar que o renderer quebre.
  if (!q || typeof q !== 'object') return { ok:false, err:'Questão inválida.' };
  if (typeof q.id !== 'number' && typeof q.id !== 'string') return { ok:false, err:'Questão sem id (number/string).' };
  if (!q.tipo) return { ok:false, err:`Questão ${q.id}: campo "tipo" ausente.` };
  if (!validateTipoSupportado(q.tipo)) return { ok:false, err:`Questão ${q.id}: tipo não suportado: ${q.tipo}` };
  if (!q.pergunta || typeof q.pergunta !== 'string') return { ok:false, err:`Questão ${q.id}: campo "pergunta" ausente.` };

  const tipo = normalizeTipo(q.tipo);

  if (tipo === 'multipla_escolha'){
    if (!Array.isArray(q.alternativas) || q.alternativas.length < 2) {
      return { ok:false, err:`Questão ${q.id}: "multipla_escolha" requer "alternativas" com >= 2 itens.` };
    }
  }

  // Para verdadeiro_falso, resposta_curta e discursiva não há campos extras mínimos.
  return { ok:true };
}

function parseSimuladoJson(rawText){
  const text = (rawText ?? '').toString().trim();
  if (!text) return { ok:false, err:'Cole um JSON antes de carregar.' };

  let parsed;
  try{
    parsed = JSON.parse(text);
  } catch (e){
    return { ok:false, err:'JSON inválido. Verifique aspas/ vírgulas.' };
  }

  const questoes = extractQuestoesFromAnyJson(parsed);
  if (!questoes || !Array.isArray(questoes)) return { ok:false, err:'JSON não contém uma lista de questões (esperado array/questoes/simulado).' };
  if (questoes.length === 0) return { ok:false, err:'Lista de questões vazia.' };

  const validated = [];
  for (const q of questoes){
    const v = validateQuestao(q);
    if (!v.ok) return v;
    validated.push(q);
  }

  // Remove duplicatas por id (mantém primeira)
  const seen = new Set();
  const dedup = [];
  for (const q of validated){
    const key = String(q.id);
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(q);
  }

  return { ok:true, questoes: dedup };
}


// --------- ESTADO (Lógica) ---------
// state:
// {
//   questoes: [...], // lista filtrada
//   indexAtual: 0, (para futuro)
//   respostas: { [id]: { id, tipo, resposta } }
//   meta: { materiaSelecionada, temaSelecionado, embaralhar }
// }
const state = {
  allQuestoes: [],
  questoes: [],
  respostas: {},
  config: {
    materia: '',
    tema: '',
    embaralhar: false
  }
};

function hasPersistedProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && Array.isArray(obj?.questoesIds) && typeof obj?.respostas === 'object';
  } catch { return false; }
}

function loadPersisted(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  const data = JSON.parse(raw);

  state.respostas = data.respostas || {};
  state.config = data.config || state.config;

  // A lista de questoes vem do filtro atual (carregamos depois), então aqui apenas restaura respostas.
}

function persistProgress(){
  const questoesIds = state.questoes.map(q => q.id);
  const payload = {
    version: 1,
    questoesIds,
    respostas: state.respostas,
    config: state.config,
    updatedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function resetPersisted(){
  localStorage.removeItem(STORAGE_KEY);
}

// --------- UI (Interface) ---------
let themeInitialized = false;
function initTheme(){
  if (themeInitialized) return;
  themeInitialized = true;

  const stored = localStorage.getItem('athens_theme');
  if (stored === 'light') document.documentElement.setAttribute('data-theme','light');

  $('#btnToggleTheme')?.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'light' ? 'dark' : 'light';
    if (next === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('athens_theme', next);
  });
}

function setStatus(el, msg){
  if (!el) return;
  el.textContent = msg;
}

function updateProgress(){
  const total = state.questoes.length;
  const answered = state.questoes.filter(q => Boolean(state.respostas[q.id]?.resposta !== undefined && state.respostas[q.id]?.resposta !== '')).length;

  $('#answeredCount').textContent = String(answered);
  $('#totalCount').textContent = String(total);

  const pct = total ? Math.round((answered/total)*100) : 0;
  $('#progressBarFill').style.width = pct + '%';
}

function getAnsweredCount(){
  return state.questoes.filter(q => {
    const r = state.respostas[q.id]?.resposta;
    return r !== undefined && safeString(r).trim() !== '';
  }).length;
}

function renderQuestoes(){
  const container = $('#questoes');
  container.innerHTML = '';

  const total = state.questoes.length;
  $('#quizMeta').textContent = `Questões: ${total} • Sem correção (apenas coleta de respostas)`;

  state.questoes.forEach((q, idx) => {
    const tipo = normalizeTipo(q.tipo);
    const card = document.createElement('article');
    card.className = 'q-card';

    const already = state.respostas[q.id]?.resposta;

    card.innerHTML = `
      <div class="q-head">
        <div class="q-id">Q${idx + 1}</div>
        <div class="q-metadata">${safeString(q.materia || '')} • ${safeString(q.tema || '')}</div>
      </div>
      <p class="q-text"></p>
      <div class="q-body"></div>
    `;

    card.querySelector('.q-text').textContent = q.pergunta || '';
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
      p.textContent = `Tipo de questão não suportado: ${tipo}`;
      body.appendChild(p);
    }

    container.appendChild(card);
  });

  updateProgress();
}

function setResposta(id, tipo, resposta){
  state.respostas[id] = { id, tipo, resposta };

  // Marca visual para múltipla (opcional)
  updateProgress();
  $('#btnBaixar').disabled = getAnsweredCount() === 0;

  if ($('#chkPersistir')?.checked) {
    persistProgress();
  }
}

function renderMultipla(q, mount, already){
  const alternativas = Array.isArray(q.alternativas) ? q.alternativas : [];
  const list = document.createElement('div');
  list.className = 'choice-list';

  alternativas.forEach((alt, i) => {
    const letter = encodeRespostaMultipla(i);
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';

    const isChecked = safeString(already) === letter;
    if (isChecked) wrapper.classList.add('is-answered');

    wrapper.innerHTML = `
      <input type="radio" name="q_${q.id}" value="${letter}" ${isChecked ? 'checked' : ''} />
      <span>${safeString(alt)}</span>
    `;

    wrapper.addEventListener('change', (ev) => {
      const v = ev.target.value;
      setResposta(q.id, 'multipla_escolha', v);
    });

    list.appendChild(wrapper);
  });

  mount.appendChild(list);
}

function renderVerdadeiroFalso(q, mount, already){
  const list = document.createElement('div');
  list.className = 'choice-list';

  const options = [
    { label: 'Verdadeiro', value: 'V' },
    { label: 'Falso', value: 'F' }
  ];

  options.forEach((opt) => {
    const isChecked = safeString(already) === opt.value;
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    if (isChecked) wrapper.classList.add('is-answered');

    wrapper.innerHTML = `
      <input type="radio" name="q_${q.id}" value="${opt.value}" ${isChecked ? 'checked' : ''} />
      <span>${opt.label}</span>
    `;

    wrapper.addEventListener('change', (ev) => {
      setResposta(q.id, 'verdadeiro_falso', ev.target.value);
    });

    list.appendChild(wrapper);
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
  // Regras do enunciado: apenas { respostas: [...] }
  const respostasArr = state.questoes
    .map(q => state.respostas[q.id])
    .filter(Boolean)
    .filter(item => safeString(item.resposta).trim() !== '');

  // Para garantir formato "tipo" como o que foi armazenado
  return { respostas: respostasArr };
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function showJSONPreview(payload){
  const pre = $('#jsonPreview');
  pre.hidden = false;
  pre.textContent = JSON.stringify(payload, null, 2);
}

// --------- FLUXO ---------
async function init(){
  initTheme();

  const btnCarregar = $('#btnCarregar');
  const btnNovoSimulado = $('#btnNovoSimulado');
  const btnFinalizar = $('#btnFinalizar');
  const btnBaixar = $('#btnBaixar');

  const panelConfig = $('#panelConfig');
  const panelQuiz = $('#panelQuiz');
  const statusCfg = $('#configStatus');
  const statusQuiz = $('#quizStatus');

  const inputSimuladoJson = $('#inputSimuladoJson');

  // Restaura progresso se existir (sem carregar questões automaticamente)
  if (hasPersistedProgress()){
    // Mantém o aluno na tela inicial até colar/carregar novo JSON.
    btnNovoSimulado.style.display = 'inline-flex';
    setStatus(statusCfg, 'Progresso detectado. Carregue o JSON para continuar ou clique em “Novo Simulado”.');
  }

  btnNovoSimulado.addEventListener('click', () => {
    resetPersisted();
    state.questoes = [];
    state.allQuestoes = [];
    state.respostas = {};

    panelQuiz.hidden = true;
    panelConfig.hidden = false;

    $('#jsonPreview').hidden = true;
    $('#btnBaixar').disabled = true;
    btnFinalizar.disabled = true;

    if (inputSimuladoJson) inputSimuladoJson.value = '';
    setStatus(statusCfg, 'Novo simulado. Cole um JSON para começar.');
    setTimeout(()=> setStatus(statusCfg,''), 1500);

    btnNovoSimulado.style.display = 'none';
  });

  function shuffle(arr){
    // Fisher-Yates
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function setQuizVisible(visible){
    panelQuiz.hidden = !visible;
    panelConfig.hidden = visible;
  }

  function startSimulado(questoes, { continuar=false } = {}){
    state.allQuestoes = questoes;
    state.questoes = questoes;

    if (state.questoes.length === 0){
      setStatus(statusCfg, 'Nenhuma questão encontrada no JSON.');
      return;
    }

    const embaralhar = Boolean($('#chkEmbaralhar')?.checked);
    state.config.embaralhar = embaralhar;

    if (embaralhar) {
      state.questoes = shuffle(state.questoes);
    }

    if (continuar) {
      loadPersisted();
    } else {
      state.respostas = {};
      if ($('#chkPersistir')?.checked) {
        resetPersisted();
      }
    }

    $('#quizTitle').textContent = 'Simulado';
    $('#jsonPreview').hidden = true;
    $('#btnBaixar').disabled = true;

    btnFinalizar.disabled = false;

    setQuizVisible(true);
    setStatus(statusQuiz, continuar ? 'Simulado retomado com sucesso.' : 'Simulado iniciado.');
    setTimeout(()=> setStatus(statusQuiz,''), 1200);

    renderQuestoes();
    updateProgress();
  }


  // --------- EVENTOS --------- Salvar simulado bruto no backend

  btnCarregar.addEventListener('click', () => {
     const rawText = inputSimuladoJson?.value || '';
     const parsed = parseSimuladoJson(rawText);
    if (!parsed.ok){
      setStatus(statusCfg, parsed.err);
      return;
    }
       fetch('/api/salvar-simulado-bruto', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain' // Envia como texto puro para o Java
      },
      body: rawText
    })
    .then(response => response.text())
   
    .then(idGerado => {
        simuladoIdAtual = parseInt(idGerado.trim(), 10); 
        console.log('Simulado salvo com ID numérico:', simuladoIdAtual);
    })
    .catch(err => console.error('Erro ao salvar simulado no banco:', err));

    
    // ----------------------------------
    
    // Aqui continua o seu código original que esconde o painel e monta as questões...

      
    

    // Se existir progresso persistido e o usuário marcou continuar implicitamente,
    // restauramos respostas no mesmo conjunto de ids.
    const continuar = hasPersistedProgress();

    // Revalida: se o conjunto de IDs atual não bater com o persistido, não continuamos.
    let continuarEfetivo = continuar;
    if (continuar){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = JSON.parse(raw);
        const idsNow = parsed.questoes.map(q => String(q.id));
        const idsSaved = (saved?.questoesIds || []).map(x => String(x));
        const same = idsNow.length === idsSaved.length && idsNow.every((id, i) => id === idsSaved[i]);
        continuarEfetivo = same;
      } catch { continuarEfetivo = false; }
    }

    setStatus(statusCfg, 'Carregando simulado...');
    setTimeout(() => {
      setStatus(statusCfg, '');
      startSimulado(parsed.questoes, { continuar: continuarEfetivo });
    }, 50);
  });



/// BOTÃO FINALIZAR: GERA JSON E ENVIA PARA O SERVIDOR


  btnFinalizar.addEventListener('click', () => {

    if (!simuladoIdAtual) {
        alert("Erro: Nenhum simulado ativo foi encontrado no banco de dados.");
        return;
    }
      // 1. Gera o payload nativo do seu sistema (que contém a lista de respostas correta)
      const payload = getExportPayload();
      showJSONPreview(payload);

      btnBaixar.disabled = getAnsweredCount() === 0;
      setStatus(statusQuiz, 'Finalizado. Use “Copiar/Baixar JSON” para exportar as respostas.');

      // 2. DISPARO DO FETCH: Envia o payload do seu sistema direto para o Spring Boot
      fetch(`/api/salvar-respostas/${simuladoIdAtual}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'text/plain' // Avisa o Java que é um JSON
          },
          body: JSON.stringify(payload) // Transforma o payload do seu próprio sistema em texto
      })
      .then(response => response.text())
      .then(mensagemDoServidor => {
          // Exibe o alerta de sucesso vindo do MySQL ("Todas as respostas foram guardadas no MySQL!")
          alert(mensagemDoServidor); 
          
          if ($('#quizStatus')) {
              $('#quizStatus').textContent = "Simulado salvo com sucesso no banco de dados!";
          }
      })
      .catch(erro => {
          console.error('Erro ao enviar respostas para o servidor:', erro);
          alert('Não foi possível salvar os dados no servidor. Verifique o console.');
      });
  });


  

  btnBaixar.addEventListener('click', async () => {
    const payload = getExportPayload();
    const text = JSON.stringify(payload);

    const copied = await copyToClipboard(text);

    if (copied) {
      setStatus(statusQuiz, 'JSON copiado para a área de transferência.');
    } else {
      setStatus(statusQuiz, 'Não foi possível copiar automaticamente. Gerando download...');
    }

    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    buildDownload(`athens-respostas-${ts}.json`, JSON.stringify(payload, null, 2));

    // atualiza preview
    showJSONPreview(payload);
  });

  // Inicial: render tema desabilitado até mudar matéria
  selMateria.dispatchEvent(new Event('change'));
}

init();

