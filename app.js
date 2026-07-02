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

// Chave utilizada para salvar o progresso das respostas e configurações no localStorage.
const STORAGE_KEY = 'athens_simulado_v1';
// Chave reservada (atualmente não usada) para possivelmente guardar uma prova ou metadados extras.
const STORAGE_PROOF_KEY = 'athens_simulado_proof_v1';
// Chave utilizada para salvar a preferência de tema (claro ou escuro) do usuário.
const STORAGE_THEME_KEY = 'athens_theme';

// ---------- Utils (lógica) ----------
// Atalho para document.querySelector; busca o primeiro elemento HTML que combine com o seletor.
const $ = (sel) => document.querySelector(sel);
// Atalho para document.querySelectorAll; busca todos os elementos e os transforma em um Array real.
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Transforma o tipo da questão em uma string limpa, sem espaços e em letras minúsculas para evitar erros de digitação.
function normalizeTipo(tipo){
  return (tipo ?? '').toString().trim().toLowerCase();
}

// Garante que qualquer valor nulo ou indefinido vire uma string vazia, evitando quebras no código.
function safeString(v){
  return (v ?? '').toString();
}

// Converte o índice numérico da alternativa (Ex: 0, 1, 2) para letras maiúsculas (Ex: A, B, C).
function encodeRespostaMultipla(alternativaIndex){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[alternativaIndex] || String(alternativaIndex);
}

// Converte a letra da alternativa (Ex: 'B') de volta para o seu índice numérico correspondente (Ex: 1).
function decodeRespostaMultipla(letra){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const up = safeString(letra).trim().toUpperCase();
  const idx = letters.indexOf(up);
  return idx >= 0 ? idx : null; // Retorna null se a letra não for encontrada no alfabeto.
}

// Limita um número para que ele fique obrigatoriamente dentro de um valor mínimo (a) e máximo (b).
function clamp(n,a,b){
  return Math.max(a, Math.min(b, n));
}

// Algoritmo de Fisher-Yates para embaralhar uma cópia do array de questões sem modificar o original.
function shuffle(arr){
  const a = arr.slice(); // Cria uma cópia rasa do array.
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // Troca os elementos de posição.
  }
  return a; // Retorna o array embaralhado.
}

// Atualiza o texto de um elemento HTML de status de forma segura, se ele existir.
function setStatus(el, msg){
  if (!el) return;
  el.textContent = msg;
}

// Converte um objeto JavaScript em uma string JSON formatada (com 2 espaços de recuo) para exibição de tela.
function jsonPretty(obj){
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

// Exibe a caixinha de preview de JSON na tela e insere o texto formatado nela.
function showJSONPreview(payload){
  const pre = $('#jsonPreview');
  if (!pre) return;
  pre.hidden = false; // Torna o elemento visível removendo o atributo hidden.
  pre.textContent = jsonPretty(payload);
}

// Cria um arquivo em memória e força o navegador do usuário a fazer o download dele.
function buildDownload(filename, text){
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' }); // Define o tipo do arquivo.
  const url = URL.createObjectURL(blob); // Cria um link temporário para o arquivo virtual.
  const a = document.createElement('a'); // Cria uma tag <a> oculta.
  a.href = url;
  a.download = filename; // Define o nome com o qual o arquivo será salvo.
  document.body.appendChild(a);
  a.click(); // Simula o clique de download.
  a.remove(); // Remove o elemento oculto do HTML.
  setTimeout(() => URL.revokeObjectURL(url), 1000); // Libera a memória do navegador após 1 segundo.
}

// Tenta copiar um texto recebido diretamente para a área de transferência do sistema operacional.
async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text); // Usa a API moderna de área de transferência.
    return true; // Retorna verdadeiro se a cópia deu certo.
  } catch {
    return false; // Retorna falso caso o navegador bloqueie ou não suporte.
  }
}

// ---------- Parser/Validação do JSON do aluno (lógica) ----------
// Analisa a estrutura do texto colado para encontrar a lista de questões, aceitando 3 formatos diferentes.
function parseSimuladoJson(rawText){
  const text = safeString(rawText).trim();
  if (!text) throw new Error('Cole um JSON antes de carregar.');

  let parsed;
  try{
    parsed = JSON.parse(text); // Converte o texto bruto em objeto/array JS.
  } catch (e){
    throw new Error('JSON inválido: verifique vírgulas, aspas e colchetes.');
  }

  // Caso 1: O usuário colou direto um Array puro de questões `[...]`
  if (Array.isArray(parsed)){
    return { questoes: parsed };
  }

  // Caso 2 e 3: O usuário colou um objeto completo `{...}`
  if (parsed && typeof parsed === 'object'){
    // Verifica se possui a propriedade direta "questoes"
    if (Array.isArray(parsed.questoes)){
      return {
        titulo: parsed.titulo,
        materia: parsed.materia,
        tema: parsed.tema,
        questoes: parsed.questoes
      };
    }

    // Verifica se possui um objeto interno chamado "simulado" que por sua vez tem as questões.
    if (parsed.simulado && typeof parsed.simulado === 'object' && Array.isArray(parsed.simulado.questoes)){
      return {
        titulo: parsed.simulado.titulo,
        materia: parsed.simulado.materia,
        tema: parsed.simulado.tema,
        questoes: parsed.simulado.questoes
      };
    }
  }

  // Erro disparado se a estrutura do JSON não se encaixar em nenhum dos 3 padrões aceitos.
  throw new Error('Formato não reconhecido. Envie um array de questões ou um objeto com “questoes”/“simulado”.');
}

// Analisa uma única questão para garantir que ela tem todas as propriedades necessárias e válidas.
function validateQuestao(q, idx){
  const errors = [];
  if (!q || typeof q !== 'object'){
    errors.push(`Questão #${idx+1} é inválida.`);
    return errors;
  }

  const tipo = normalizeTipo(q.tipo); // Normaliza o tipo (ex: 'multipla_escolha')
  const id = q.id ?? (idx+1); // Se a questão não tiver ID próprio, assume o número do índice + 1.

  if (!tipo) errors.push(`Questão id ${id}: campo “tipo” é obrigatório.`);

  // Conjunto de termos aceitos para validação rápida do tipo de resposta.
  const supported = new Set(['multipla_escolha','verdadeiro_falso','resposta_curta','discursiva']);
  if (tipo && !supported.has(tipo)) errors.push(`Questão id ${id}: tipo não suportado (“${q.tipo}”).`);

  if (!safeString(q.pergunta).trim()) errors.push(`Questão id ${id}: “pergunta” é obrigatória.`);

  // Validação extra específica para múltipla escolha: exige alternativas em formato de lista.
  if (tipo === 'multipla_escolha'){
    if (!Array.isArray(q.alternativas) || q.alternativas.length < 2){
      errors.push(`Questão id ${id}: “alternativas” precisa ter pelo menos 2 itens.`);
    }
  }

  return errors; // Retorna a lista de erros encontrados nesta questão (vazia significa sucesso).
}

// Valida o simulado inteiro percorrendo e limpando a estrutura de cada questão enviada.
function validateSimulado(parsed){
  const { questoes } = parsed;
  if (!Array.isArray(questoes) || questoes.length === 0){
    throw new Error('O simulado precisa ter ao menos 1 questão.');
  }

  const allErrors = []; // Acumulador para listar todos os problemas de uma só vez na tela.
  const ids = new Set(); // Rastreador para impedir IDs duplicados no mesmo simulado.

  questoes.forEach((q, idx) => {
    const errs = validateQuestao(q, idx); // Valida a estrutura básica da questão.
    if (errs.length) allErrors.push(...errs); // Adiciona os erros encontrados ao montante geral.

    const id = q?.id ?? (idx+1);
    if (ids.has(id)) allErrors.push(`IDs duplicados: “${id}” aparece mais de uma vez.`);
    ids.add(id);
  });

  // Se houver qualquer erro acumulado, interrompe o carregamento e exibe a lista formatada.
  if (allErrors.length){
    throw new Error('Não foi possível carregar o simulado. Erros:\n- ' + allErrors.join('\n- '));
  }

  // Mapeia e higieniza as questões, removendo propositalmente gabaritos ou propriedades não autorizadas.
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
// Objeto de estado global da aplicação. Guarda tudo o que está acontecendo no momento atual.
const state = {
  meta: { titulo: '', materia: '', tema: '' }, // Metadados do simulado ativo.
  questoes: [], // Array com as questões higienizadas que estão em exibição.
  respostas: {}, // Dicionário indexado pelo ID da questão para guardar as respostas salvas do aluno.
  config: { embaralhar: false, persistir: true }, // Configurações de comportamento da sessão.
  startedAt: null // Carimbo de data/hora de quando o usuário iniciou o simulado.
};

// Gera um hash numérico rápido baseado no conteúdo textual das questões para identificar univocamente a prova.
function calcProofHash(questoes){
  const core = questoes.map(q => [q.id, q.tipo, q.pergunta, (q.alternativas||[]).join('|')].join('~')).join('||');
  let h = 0;
  for (let i = 0; i < core.length; i++) h = (h * 31 + core.charCodeAt(i)) >>> 0; // Bitwise shift para manter inteiro positivo.
  return String(h);
}

// Verifica no localStorage se existe um progresso salvo compatível e estruturado corretamente.
function hasPersistedProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && obj.proofHash && obj.questoesIds && obj.respostas;
  } catch { return false; }
}

// Restaura os dados de respostas e configurações armazenados localmente para o estado da aplicação.
function loadPersistedProgress(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const obj = JSON.parse(raw);

  state.respostas = obj.respostas || {};
  state.config = obj.config || state.config;

  return true;
}

// Salva o estado atual de respostas e configurações no localStorage do navegador.
function persistProgress(){
  const proofHash = calcProofHash(state.questoes);
  const questoesIds = state.questoes.map(q => q.id);

  const payload = {
    version: 1,
    proofHash, // Salva o hash para verificar se o usuário não mudou o JSON do simulado no meio do caminho.
    questoesIds,
    respostas: state.respostas,
    config: state.config,
    updatedAt: Date.now() // Timestamp da última alteração.
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return proofHash;
}

// Recupera unicamente o hash de identificação da prova guardado no armazenamento local.
function proofHashFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.proofHash ?? null;
  } catch { return null; }
}

// Limpa permanentemente a chave de progresso do localStorage (usado ao iniciar novos simulados).
function clearPersisted(){
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- Render/Interface (interface) ----------
let themeInitialized = false; // Flag para impedir múltiplos event listeners caso o tema inicialize duas vezes.

// Inicializa o sistema de tema (claro/escuro) lendo o estado prévio ou escutando cliques de alteração.
function initTheme(){
  if (themeInitialized) return;
  themeInitialized = true;

  const stored = localStorage.getItem(STORAGE_THEME_KEY);
  // Se estiver salvo como light, aplica o atributo correspondente no HTML.
  if (stored === 'light') document.documentElement.setAttribute('data-theme','light');

  // Adiciona o ouvinte de clique no botão de alternância de tema.
  $('#btnToggleTheme')?.addEventListener('click', () => {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'light' ? 'dark' : 'light';
    if (next === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme'); // Dark é o padrão omitido.
    localStorage.setItem(STORAGE_THEME_KEY, next); // Atualiza a preferência no armazenamento local.
  });
}

// Calcula e atualiza a barra de progresso visual e os contadores de questões respondidas.
function updateProgress(){
  const total = state.questoes.length;
  // Conta quantas questões possuem texto/valores válidos digitados ou marcados.
  const answered = state.questoes.reduce((acc, q) => {
    const r = state.respostas[q.id]?.resposta;
    return acc + (safeString(r).trim() ? 1 : 0);
  }, 0);

  // Atualiza os contadores numéricos textuais no cabeçalho/barra.
  $('#answeredCount').textContent = String(answered);
  $('#totalCount').textContent = String(total);

  // Calcula a porcentagem e ajusta dinamicamente a largura (width) do preenchimento da barra.
  const pct = total ? Math.round((answered/total)*100) : 0;
  const fill = $('#progressBarFill');
  if (fill) fill.style.width = pct + '%';

  // Desabilita o botão de finalizar/baixar se o estudante não tiver respondido absolutamente nada ainda.
  const btnBaixar = $('#btnBaixar');
  if (btnBaixar) btnBaixar.disabled = answered === 0;
}

// Função de espaço reservado caso queira mudar a classe CSS de um elemento individualmente ao responder.
function setQuestionAnsweredVisual(qId, tipo){
  void qId; void tipo; // Evita avisos de variáveis não utilizadas no linter.
}

// Limpa a área de exibição e reconstrói no HTML todas as questões do simulado a partir do estado atual.
function renderQuestoes(){
  const container = $('#questoes');
  container.innerHTML = ''; // Esvazia o container para não duplicar dados.

  const total = state.questoes.length;
  $('#quizMeta').textContent = `Questões: ${total} • Sem correção (apenas coleta)`;

  // Varre a lista estruturada de questões montando os elementos visuais.
  state.questoes.forEach((q, idx) => {
    const tipo = normalizeTipo(q.tipo);
    const already = state.respostas[q.id]?.resposta; // Verifica se já há uma resposta salva para esta questão.

    const card = document.createElement('article'); // Cria o bloco/card da questão.
    card.className = 'q-card';

    // Estrutura interna base com cabeçalho, texto da pergunta e o corpo onde entram as opções/inputs.
    card.innerHTML = `
      <div class="q-head">
        <div class="q-id">Q${idx+1}</div>
        <div class="q-metadata">${safeString(q.materia || '')} • ${safeString(q.tema || '')}</div>
      </div>
      <p class="q-text"></p>
      <div class="q-body"></div>
    `;

    card.querySelector('.q-text').textContent = safeString(q.pergunta); // Define o enunciado textualmente (segurança contra XSS).
    const body = card.querySelector('.q-body');

    // Desvia a renderização interna para a função correspondente ao tipo de questão encontrado.
    if (tipo === 'multipla_escolha'){
      renderMultipla(q, body, already);
    } else if (tipo === 'verdadeiro_falso'){
      renderVerdadeiroFalso(q, body, already);
    } else if (tipo === 'resposta_curta'){
      renderRespostaCurta(q, body, already);
    } else if (tipo === 'discursiva'){
      renderDiscursiva(q, body, already);
    } else {
      // Mensagem visual preventiva se houver um tipo não esperado.
      const p = document.createElement('p');
      p.className = 'panel__hint';
      p.textContent = `Tipo não suportado: ${tipo}`;
      body.appendChild(p);
    }

    container.appendChild(card); // Insere o card montado no container principal da tela.
  });

  updateProgress(); // Recalcula o progresso inicial após renderizar.
}

// Atualiza o valor da resposta no estado e dispara a gravação no localStorage se autorizado.
function setResposta(id, tipo, resposta){
  state.respostas[id] = { id, tipo, resposta };

  // Se a persistência estiver ativada nas opções e na interface, grava no disco.
  if (state.config.persistir && $('#chkPersistir')?.checked){
    persistProgress();
  }

  updateProgress(); // Atualiza a barra de progresso a cada tecla ou clique.
}

// Renderiza o grupo de inputs de rádio (Radio Buttons) para questões de múltipla escolha.
function renderMultipla(q, mount, already){
  const alternativas = Array.isArray(q.alternativas) ? q.alternativas : [];
  const list = document.createElement('div');
  list.className = 'choice-list';

  alternativas.forEach((alt, i) => {
    const letter = encodeRespostaMultipla(i); // Transforma o índice em letra (A, B, C...).
    const isChecked = safeString(already).trim().toUpperCase() === letter; // Checa se já estava marcada.

    const label = document.createElement('label');
    label.className = 'choice' + (isChecked ? ' is-answered' : '');
    label.innerHTML = `
      <input type="radio" name="q_${q.id}" value="${letter}" ${isChecked ? 'checked' : ''} />
      <span>${safeString(alt)}</span>
    `;

    // Escuta mudanças de seleção para gravar a letra escolhida no estado global.
    label.addEventListener('change', (ev) => {
      setResposta(q.id, 'multipla_escolha', ev.target.value);
    });

    list.appendChild(label);
  });

  mount.appendChild(list);
}

// Renderiza a estrutura de botões de rádio específicos para Verdadeiro (V) ou Falso (F).
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

// Renderiza um campo de texto de linha única de digitação curta.
function renderRespostaCurta(q, mount, already){
  const input = document.createElement('input');
  input.className = 'text-input';
  input.type = 'text';
  input.placeholder = 'Digite sua resposta...';
  input.value = already ? safeString(already) : ''; // Resgata valor se já existente.

  // Salva no estado a cada caractere modificado pelo usuário.
  input.addEventListener('input', () => {
    setResposta(q.id, 'resposta_curta', input.value);
  });

  mount.appendChild(input);
}

// Renderiza uma caixa de texto grande multi-linhas (Textarea) ideal para textos e redações longas.
function renderDiscursiva(q, mount, already){
  const textarea = document.createElement('textarea');
  textarea.className = 'textarea';
  textarea.placeholder = 'Escreva sua resposta...';
  textarea.value = already ? safeString(already) : '';

  // Captura o fluxo contínuo de digitação na caixa discursiva.
  textarea.addEventListener('input', () => {
    setResposta(q.id, 'discursiva', textarea.value);
  });

  mount.appendChild(textarea);
}

// Varre as questões ativas e formata um objeto limpo contendo apenas as respostas dadas para exportação.
function getExportPayload(){
  const respostasArr = state.questoes
    .map(q => state.respostas[q.id]) // Busca as respostas correspondentes.
    .filter(Boolean) // Remove furos ou indefinidos de questões puladas.
    .map(item => ({
      id: item.id,
      tipo: item.tipo,
      resposta: safeString(item.resposta)
    }))
    .filter(item => item.resposta.trim() !== ''); // Exporta apenas se a string de resposta não for vazia.

  return { respostas: respostasArr }; // Retorna envelopado num objeto principal.
}

// ---------- Fluxo Principal de Inicialização ----------
async function init(){
  initTheme(); // Ativa as configurações de cores da tela.

  // Mapeamento dos painéis de alternância de visualização da aplicação.
  const panelConfig = $('#panelConfig');
  const panelQuiz = $('#panelQuiz');
  const statusCfg = $('#configStatus');
  const statusQuiz = $('#quizStatus');

  // Mapeamento de controles e botões de ação.
  const inputSimuladoJson = $('#inputSimuladoJson');
  const btnCarregar = $('#btnCarregar');
  const btnNovoSimulado = $('#btnNovoSimulado');
  const btnNovoSimuladoFinal = $('#btnNovoSimuladoFinal');
  const btnFinalizar = $('#btnFinalizar');
  const btnBaixar = $('#btnBaixar');

  // Checkboxes de comportamento de jogo/simulado.
  const chkPersistir = $('#chkPersistir');
  const chkEmbaralhar = $('#chkEmbaralhar');

  const btnExemplo = $('#btnExemplo');
  if (btnExemplo){
    btnExemplo.addEventListener('click', () => {}); // Evento vazio; o comportamento padrão de link HTML assume.
  }

  // Função interna utilitária para sincronizar visualmente os checkboxes com as flags de configuração interna.
  function setConfigUI({ persistir, embaralhar }){
    if (chkPersistir) chkPersistir.checked = !!persistir;
    if (chkEmbaralhar) chkEmbaralhar.checked = !!embaralhar;
  }

  // Define o estado inicial lendo as posições dos elementos gráficos do formulário HTML.
  state.config.persistir = chkPersistir?.checked ?? true;
  state.config.embaralhar = chkEmbaralhar?.checked ?? false;

  function loadSimuladoFromParsed(parsed){
    const questoes = validateSimulado(parsed);

    state.questoes = questoes;
    state.respostas = {}; // Zera memória de respostas antigas em tempo de execução.
    state.startedAt = Date.now(); // Marca o momento de início do simulado.

    state.meta.titulo = safeString(parsed.titulo || 'Simulado');
    state.meta.materia = safeString(parsed.materia || '');
    state.meta.tema = safeString(parsed.tema || '');

    // Aplica a lógica de embaralhamento se a caixa estiver selecionada.
    const embaralhar = Boolean(chkEmbaralhar?.checked);
    if (embaralhar) state.questoes = shuffle(state.questoes);
    state.config.embaralhar = embaralhar;

    // Se a persistência estiver ligada, confere se o simulado carregado é idêntico ao que já estava salvo anteriormente.
    if (chkPersistir?.checked && hasPersistedProgress()){
      const storedHash = proofHashFromStorage();
      const newHash = calcProofHash(state.questoes);
      if (storedHash && storedHash === newHash){
        loadPersistedProgress();
        setStatus(statusCfg, 'Progresso restaurado com sucesso.');
      } else {
        clearPersisted();
      }
    }

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

    if (chkPersistir?.checked){
      state.config.persistir = true;
      persistProgress();
    }

    btnNovoSimulado.style.display = 'inline-flex';
    if (btnNovoSimuladoFinal) btnNovoSimuladoFinal.hidden = false;
  }

  // Gerencia o clique no botão que faz a leitura do JSON digitado e ativa o Simulado na interface.
  btnCarregar.addEventListener('click', () => {
    try{
      setStatus(statusCfg, 'Carregando simulado...');

      const parsed = parseSimuladoJson(inputSimuladoJson.value);
      loadSimuladoFromParsed(parsed);

    } catch (e){
      setStatus(statusCfg, safeString(e?.message || e));
    }
  });




  // Função interna para limpar o estado e restaurar a aplicação ao ponto original de inserção de JSON.
  function novoSimulado(){
    clearPersisted(); // Apaga do disco.
    state.questoes = []; // Reseta variáveis.
    state.respostas = {};
    state.startedAt = null;
    state.meta = { titulo:'', materia:'', tema:'' };

    // Reseta elementos visuais da interface para o padrão limpo de fábrica.
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

  // Vincula o gatilho de reinicialização aos botões apropriados de reset da UI.
  btnNovoSimulado?.addEventListener('click', novoSimulado);
  btnNovoSimuladoFinal?.addEventListener('click', novoSimulado);

  // Escuta alterações na caixa de salvar progresso para ligar/desligar armazenamento local em tempo real.
  chkPersistir?.addEventListener('change', () => {
    state.config.persistir = chkPersistir.checked;
    if (!state.config.persistir) clearPersisted();
  });

  // Escuta alterações na caixa de embaralhar.
  chkEmbaralhar?.addEventListener('change', () => {
    state.config.embaralhar = chkEmbaralhar.checked;
  });

  // Gerencia o clique de fechamento do simulado pelo estudante. Ele gera e exibe as respostas textuais coletadas.
  btnFinalizar.addEventListener('click', () => {
    const payload = getExportPayload();

    showJSONPreview(payload); // Exibe o texto cru estruturado na tela.
    setStatus(statusQuiz, 'Finalizado. Use “Copiar/Baixar JSON” para exportar as respostas.');
    if (btnBaixar) btnBaixar.disabled = false; // Torna o botão de download disponível.
  });

  // Exporta de verdade o resultado, enviando para a área de transferência e forçando o download físico do JSON.
  btnBaixar.addEventListener('click', async () => {
    const payload = getExportPayload();
    const text = JSON.stringify(payload);

    const copied = await copyToClipboard(text); // Tenta copiar via API.
    if (copied){
      setStatus(statusQuiz, 'JSON copiado para a área de transferência.');
    } else {
      setStatus(statusQuiz, 'Falha ao copiar automaticamente. Gerando download...');
    }

    // Cria um timestamp único (Ex: 2026-07-01T10-15-00) limpo para nomear o arquivo exportado sem conflitos.
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    buildDownload(`athens-respostas-${ts}.json`, JSON.stringify(payload, null, 2));
  });


  // Oculta os botões de encerramento até que um simulado esteja ativo.
  if (btnNovoSimulado) btnNovoSimulado.style.display = 'none';
  if (btnNovoSimuladoFinal) btnNovoSimuladoFinal.hidden = true;

  setStatus(statusCfg, ''); // Limpa estados visuais residuais.
}

// =========================================================================
// INTEGRADOR MODULAR: API ENEM -> MOTOR ATHENS
// Observação: o modo ENEM oficial do projeto roda em `modosimulados/enem.html` usando `modos_js/enem.js`.
// Este bloco antigo dentro do `app.js` pode conflitar com IDs e endpoints quando carregado em outras telas.
// Mantive a implementação, mas desativei o auto-start para não interferir.
// =========================================================================

// (Intencionalmente não registrado em DOMContentLoaded.)




// Dispara a execução imediata de todo o bloco de inicialização assim que o script é carregado pelo navegador.
init();
