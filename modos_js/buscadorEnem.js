const anoSelecionado = document.getElementById('ano-selecionado');
const output = document.getElementById('output');
const btnBuscar = document.getElementById('btn-buscar');
const inputSimuladoJson = document.getElementById('inputSimuladoJson');

const inputBlocoMateria = document.getElementById('bloco-materia'); 
const inputIdiomaSelecionado = document.getElementById('idioma-selecionado');

const options = { method: 'GET' };

const fetchData = async (ano, offsetRaw, idiomaRaw) => {
  try {
    const anoTratado = ano.trim();
    
    let offsetTratado = offsetRaw ? offsetRaw.trim() : "0";
    if (offsetTratado === "" || isNaN(offsetTratado)) {
      offsetTratado = "0";
    }

    let idiomaParam = "";
    if (idiomaRaw) {
      const idiomaLimpo = idiomaRaw.toLowerCase().trim();
      if (idiomaLimpo === "inglês" || idiomaLimpo === "ingles") {
        idiomaParam = "&language=ingles";
      } else if (idiomaLimpo === "espanhol") {
        idiomaParam = "&language=espanhol";
      }
    }
  //fetch('https://api.enem.dev/v1/exams/2020/questions?limit=50&offset=1&language=ingles', options)
    const urlCompleta = `https://api.enem.dev/v1/exams/${anoTratado}/questions?limit=50&offset=${offsetTratado}${idiomaParam}`;
    console.log("Tentando conectar na URL:", urlCompleta);

    const res = await fetch(urlCompleta, options);
    
    if (!res.ok) {
      console.error(`Servidor rejeitou com status: ${res.status}`);
      return [];
    }

    const data = await res.json();
    
    if (!data || !data.questions || !Array.isArray(data.questions)) {
      return [];
    }
    
    const cofreGabaritosTemporario = {};

    const questoesFiltradas = data.questions.map(questao => {
      let paragrafosBrutos = questao.context ? questao.context.split('\n\n') : [];
      let imagemEncontrada = '';

      const paragrafosLimpos = paragrafosBrutos.filter(paragrafo => {
        const textoSemEspaco = paragrafo.trim();
        if (textoSemEspaco.startsWith('![') && textoSemEspaco.endsWith(')')) {
          const linkExtraido = textoSemEspaco.match(/\((.*?)\)/);
          if (linkExtraido && linkExtraido[1]) {
            imagemEncontrada = linkExtraido[1];
          }
          return false; 
        }
        return true; 
      });

      let urlFinalImagem = questao.files && questao.files.length > 0 ? questao.files[0] : imagemEncontrada;
      const idQuestao = questao.index;
      cofreGabaritosTemporario[`q_${idQuestao}`] = questao.correctAlternative;

      return {
        id: idQuestao,
        titulo: questao.title || `Questão ${questao.index}`,
        disciplina: questao.discipline,
        language: questao.language || "",
        contextoParagrafos: paragrafosLimpos,
        imagemUrl: urlFinalImagem,
        enunciado: questao.alternativesIntroduction,
        alternativas: questao.alternatives.map(alt => ({
          letra: alt.letter,
          texto: alt.text
        }))
      };
    });

    localStorage.setItem('athens_gabarito_secreto', JSON.stringify(cofreGabaritosTemporario));
    return questoesFiltradas; 

  } catch (err) {
    console.error('Erro de conexão ou sintaxe:', err);
    return []; 
  }
}

// CORRIGIDO: Evento de escuta limpo e sem duplicações de IF
if (btnBuscar) {
  btnBuscar.addEventListener('click', async () => {
    if (!anoSelecionado || !anoSelecionado.value.trim()) {
      alert("Por favor, digite um ano primeiro (Ex: 2022)!");
      return;
    }

    const ano = anoSelecionado.value;
    let offset = inputBlocoMateria ? inputBlocoMateria.value.trim() : "";
    const idioma = inputIdiomaSelecionado ? inputIdiomaSelecionado.value.trim() : "";

    // Sua estratégia salvadora: impede a mistura incorreta de offset alto + idioma
    if (idioma !== "") {
      console.log("Idioma detectado. Forçando offset para 0 para evitar erro 400 da API.");
      offset = "0"; 
      if (inputBlocoMateria) {
        inputBlocoMateria.value = "0"; 
      }
    }

    if (output) {
      output.textContent = "Buscando dados no servidor do ENEM...";
    }

    const result = await fetchData(ano, offset, idioma);

    if (result.length === 0) {
      alert("Nenhuma questão encontrada. Certifique-se de preencher apenas o Ano de forma regular ou use 'ingles'/'espanhol' com o Bloco em 0.");
      if (output) output.textContent = "Erro na requisição. Verifique o que digitou.";
      return;
    }
    
    const jsonSemSpoiler = JSON.stringify(result, null, 2);
    
    if (output) output.textContent = jsonSemSpoiler;
    if (inputSimuladoJson) inputSimuladoJson.value = jsonSemSpoiler;

    console.log("Simulado gerado com sucesso!");
  });
}