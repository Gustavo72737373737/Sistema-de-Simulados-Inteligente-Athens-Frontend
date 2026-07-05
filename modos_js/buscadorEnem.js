const anoSelecionado = document.getElementById('ano-selecionado');
const output = document.getElementById('output');
const btnBuscar = document.getElementById('btn-buscar');
const selectAno = document.getElementById('selectAno');
const inputSimuladoJson = document.getElementById('inputSimuladoJson');

const options = { method: 'GET' };

// Refatorado para usar async/await e filtrar apenas o que você quer
const fetchData = async (value) => {
  try {
    const res = await fetch(`https://api.enem.dev/v1/exams/${value}/questions?limit=50`, options);
    const data = await res.json();
    
    // Criamos um cofre temporário para guardar os gabaritos reais deste ano buscado
    const cofreGabaritosTemporario = {};

    // Mapeia e higieniza as questões
    const questoesFiltradas = data.questions.map(questao => {
      
      // 1. Processamento e limpeza de parágrafos/imagens que você criou
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

      // Se a API não veio com link na array files, usa a que você extraiu do texto
      let urlFinalImagem = questao.files && questao.files.length > 0 ? questao.files[0] : imagemEncontrada;

      // 2. SALVA NO COFRE DA MEMÓRIA: Guardamos a resposta certa usando o index da questão
      const idQuestao = questao.index;
      cofreGabaritosTemporario[`q_${idQuestao}`] = questao.correctAlternative;

      // 3. RETORNA O OBJETO SEM O GABARITO (Esconde a resposta da tela)
      return {
        id: idQuestao,
        titulo: questao.title || `Questão ${questao.index}`,
        disciplina: questao.discipline,
        contextoParagrafos: paragrafosLimpos,
        imagemUrl: urlFinalImagem,
        enunciado: questao.alternativesIntroduction,
        alternativas: questao.alternatives.map(alt => {
          return {
            letra: alt.letter,
            texto: alt.text
          };
        })
        // O "gabarito" NÃO entra aqui. Ele foi totalmente deletado deste objeto!
      };
    });

    // 4. Salva o cofre secreto no localStorage para o script de correção ler depois
    localStorage.setItem('athens_gabarito_secreto', JSON.stringify(cofreGabaritosTemporario));

    return questoesFiltradas; 

  } catch (err) {
    console.error('Erro na requisição:', err);
    return []; 
  }
}

// Evento do botão que consome os objetos filtrados
btnBuscar.addEventListener('click', async () => {
   if (!anoSelecionado.value.trim()) {
     alert("Por favor, digite um ano!");
     return;
   }

   const result = await fetchData(anoSelecionado.value);

   if (result.length === 0) {
     alert("Nenhuma questão encontrada para este ano ou erro na API.");
     return;
   }
   
   // Exibe os novos objetos filtrados e 100% SEM GABARITO na tela
   const jsonSemSpoiler = JSON.stringify(result, null, 2);
   
   output.textContent = jsonSemSpoiler;
   
   // Preenche automaticamente a textarea se ela existir na tela para poupar seu tempo
   if (inputSimuladoJson) {
     inputSimuladoJson.value = jsonSemSpoiler;
   }

   console.log("Simulado gerado e gabaritos salvos em segredo no localStorage!");
});