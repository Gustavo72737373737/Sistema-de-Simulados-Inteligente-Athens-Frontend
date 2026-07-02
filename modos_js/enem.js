document.addEventListener("DOMContentLoaded", verificarAnosDisponiveis);

async function verificarAnosDisponiveis() {
  try {
    const response = await fetch('https://api.enem.dev/v1/exams');
    
    if (!response.ok) {
      throw new Error(`Servidor respondeu com erro HTTP: ${response.status}`);
    }

    const provas = await response.json();
    const anosValidos = [...new Set(provas.map(p => p.year))];
    anosValidos.sort((a, b) => b - a);
    
    preencherCamposEAtivar(anosValidos);

  } catch (err) {
    console.warn("A API falhou ou está offline. Ativando modo de segurança local.");
    // Backup offline caso a API do enem apresente instabilidade
    const anosBackup = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];
    preencherCamposEAtivar(anosBackup);
  }
}

function preencherCamposEAtivar(listaDeAnos) {
  const selectAno = document.getElementById("selectAno");
  const selectDisciplina = document.getElementById("disciplina");
  const btnBuscar = document.getElementById("btnBuscarEnem");

  if (selectAno) {
    selectAno.innerHTML = ''; 
    listaDeAnos.forEach(ano => {
      const opt = document.createElement('option');
      opt.value = ano;
      opt.textContent = `${ano} ▼`;
      selectAno.appendChild(opt);
    });
    selectAno.disabled = false;
  }

  if (selectDisciplina) selectDisciplina.disabled = false;
  if (btnBuscar) btnBuscar.disabled = false;
}

async function buscarQuestoesPorAno() {
  const anoSelecionado = document.getElementById('selectAno').value;
  const disciplinaSelecionada = document.getElementById('disciplina').value;
  const configStatus = document.getElementById('configStatus');

  if (!anoSelecionado) {
    alert("Por favor, selecione um ano válido primeiro.");
    return;
  }

  if (configStatus) {
    configStatus.textContent = `Buscando questões do ENEM ${anoSelecionado}...`;
    configStatus.style.color = "var(--text-muted)";
  }

  const urlQuestoes = `https://api.enem.dev/v1/exams/${anoSelecionado}/questions?discipline=${encodeURIComponent(disciplinaSelecionada)}&limit=50`;

  try {
    const response = await fetch(urlQuestoes);
    
    if (!response.ok) {
      throw new Error(`Erro na API (Status HTTP: ${response.status})`);
    }

    const dadosDaProva = await response.json();
    const listaOriginal = dadosDaProva.questions || dadosDaProva;
    
    if (!Array.isArray(listaOriginal) || listaOriginal.length === 0) {
      throw new Error("Nenhuma questão encontrada para este filtro.");
    }

    // Filtra e converte para o formato puro que o app.js (Athens) aceita
    const questoesFormatadas = listaOriginal.map((q, idx) => {
      const listaAlternativas = Array.isArray(q.alternatives) 
        ? q.alternatives.map(alt => String(alt.text || '')) 
        : [];

      return {
        id: String(q.id || `enem_${anoSelecionado}_${idx+1}`),
        tipo: "multipla_escolha", 
        pergunta: String(q.context || q.pergunta || "Questão sem enunciado técnico"),
        alternativas: listaAlternativas
      };
    });

    // Envelopa no formato de objeto esperado pelo validador do app.js
    const payloadAthens = {
      titulo: `ENEM ${anoSelecionado} - ${document.getElementById('disciplina').options[document.getElementById('disciplina').selectedIndex].text}`,
      materia: disciplinaSelecionada,
      questoes: questoesFormatadas
    };

    const txtArea = document.getElementById("inputSimuladoJson");
    if (txtArea) {
      // Injeta o JSON gerado automaticamente na caixa de texto
      txtArea.value = JSON.stringify(payloadAthens, null, 2);
      
      // Avisa o app.js que o texto mudou
      txtArea.dispatchEvent(new Event('input', { bubbles: true }));
      txtArea.dispatchEvent(new Event('change', { bubbles: true }));
      
      if (configStatus) {
        configStatus.textContent = `Sucesso! ${questoesFormatadas.length} questões carregadas. Iniciando...`;
        configStatus.style.color = "#38bdf8";
      }

      // Clica automaticamente no botão "Carregar Simulado" original do app.js
      setTimeout(() => {
        const btnCarregarOriginal = document.getElementById("btnCarregar");
        if (btnCarregarOriginal) {
          btnCarregarOriginal.click(); 
        }
      }, 50);
    }

  } catch (err) {
    console.error('Erro na geração do caderno:', err);
    if (configStatus) {
      configStatus.textContent = `Erro: ${err.message}`;
      configStatus.style.color = "var(--danger)";
    }
    alert(`Não foi possível carregar as questões: ${err.message}`);
  }
}