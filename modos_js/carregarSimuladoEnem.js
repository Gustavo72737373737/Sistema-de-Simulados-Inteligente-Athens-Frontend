// modos_js/carregarSimuladoEnem.js

// Variáveis globais de controle da folha do Word
let todasQuestoesEnem = []; 
let paginaAtual = 1;
const questoesPorPagina = 5; // Quantidade de questões por folha

document.addEventListener("DOMContentLoaded", () => {
  const btnCarregar = document.getElementById('btnCarregar');
  const inputSimuladoJson = document.getElementById('inputSimuladoJson');
  const panelConfig = document.getElementById('panelConfig');
  const panelQuiz = document.getElementById('panelQuiz');
  const divQuestoes = document.getElementById('questoes'); 
  const totalCount = document.getElementById('totalCount');
  
  const cartaoGabarito = document.getElementById('cartao-gabarito');
  const linhasGabarito = document.getElementById('linhas-gabarito');

  const linksAbas = document.querySelectorAll('.aba-link');
  const btnAnt = document.getElementById('btn-pagina-anterior');
  const btnProx = document.getElementById('btn-proxima-pagina');
  const indicadorPagina = document.getElementById('indicador-pagina');

  const btnBaixar = document.getElementById('btnBaixar');
  const jsonPreview = document.getElementById('jsonPreview');
  const btnAnt2 = document.getElementById('btn-pagina-anterior2');
  const indicadorPagina2 = document.getElementById('indicador-pagina2');
  const btnProx2 = document.getElementById('btn-proxima-pagina2');

  // ==========================================
  // FUNÇÃO QUE DESENHA A PÁGINA ATUAL
  // ==========================================
  function mostrarPaginaWord() {
    if (!divQuestoes) return;
    divQuestoes.innerHTML = ''; 

    const inicio = (paginaAtual - 1) * questoesPorPagina;
    const fim = inicio + questoesPorPagina;
    
    const questoesDaPagina = todasQuestoesEnem.slice(inicio, fim);

    questoesDaPagina.forEach(questao => {
      const numeroReal = todasQuestoesEnem.indexOf(questao) + 1;

      const elementoQuestao = document.createElement('div');
      elementoQuestao.classList.add('item-questao');

      elementoQuestao.innerHTML = `
        <div class="titulo-questao">Questão ${numeroReal} - ${questao.titulo}</div>
        <div class="etiqueta-disciplina">${questao.disciplina}</div>
      `;

      if (questao.contextoParagrafos && Array.isArray(questao.contextoParagrafos)) {
        questao.contextoParagrafos.forEach(paragrafo => {
          const p = document.createElement('p');
          const textoMinulo = paragrafo.toLowerCase();
          if (textoMinulo.includes('disponível em') || textoMinulo.includes('acesso em') || textoMinulo.includes('adaptado')) {
            p.classList.add('texto-fonte-bibliografica');
          } else {
            p.classList.add('texto-contexto');
          }
          p.textContent = paragrafo.replace(/\*\*/g, '');
          elementoQuestao.appendChild(p);
        });
      }

      // CORREÇÃO AQUI: Garantido o uso correto de questao.imagemUrl
      if (questao.imagemUrl) {
        const img = document.createElement('img');
        img.src = questao.imagemUrl;
        img.classList.add('imagem-questao');
        elementoQuestao.appendChild(img);
      }

      const enunciado = document.createElement('p');
      enunciado.classList.add('enunciado-questao');
      enunciado.textContent = questao.enunciado;
      elementoQuestao.appendChild(enunciado);

      const blocoOpcoes = document.createElement('div');
      blocoOpcoes.classList.add('lista-opcoes');

      if (questao.alternativas && Array.isArray(questao.alternativas)) {
        questao.alternativas.forEach(opcao => {
          const labelOpcao = document.createElement('label');
          labelOpcao.classList.add('opcao-item');
          labelOpcao.innerHTML = `
            <input type="checkbox" class="chk-q-${numeroReal}" data-letra="${opcao.letra}">
            <span><strong>${opcao.letra})</strong> ${opcao.texto}</span>
          `;

          const chk = labelOpcao.querySelector('input');
          if (questao.respostaRascunho === opcao.letra) {
            chk.checked = true;
          }

          chk.addEventListener('change', (e) => {
            const todosDaQuestao = divQuestoes.querySelectorAll(`.chk-q-${numeroReal}`);
            todosDaQuestao.forEach(c => { if (c !== e.target) c.checked = false; });
            
            if (e.target.checked) {
              questao.respostaRascunho = opcao.letra; 
            } else {
              questao.respostaRascunho = null;
            }
          });

          blocoOpcoes.appendChild(labelOpcao);
        });
      }

      elementoQuestao.appendChild(blocoOpcoes);
      divQuestoes.appendChild(elementoQuestao);
    });

    const totalPaginas = Math.ceil(todasQuestoesEnem.length / questoesPorPagina);
    if (indicadorPagina) indicadorPagina.textContent = `Página ${paginaAtual} de ${totalPaginas || 1}`;
    if (indicadorPagina2) indicadorPagina2.textContent = `Página ${paginaAtual} de ${totalPaginas || 1}`;

    if (btnAnt && btnAnt2) {
      btnAnt.disabled = paginaAtual === 1;
      btnAnt2.disabled = paginaAtual === 1;

    }
    if (btnProx && btnProx2) {
      btnProx.disabled = paginaAtual === totalPaginas || totalPaginas === 0;
      btnProx2.disabled = paginaAtual === totalPaginas || totalPaginas === 0;
    }
  }

  // ==========================================
  // BOTÕES DE NAVEGAR NAS PÁGINAS
  // ==========================================
  if (btnAnt && btnAnt2) {
    btnAnt.addEventListener('click', () => {
      if (paginaAtual > 1) { paginaAtual--; mostrarPaginaWord();

       }
    });
      
    btnAnt2.addEventListener('click', () => {
      if (paginaAtual > 1) { paginaAtual--; mostrarPaginaWord();

       }
    });


  }



  if (btnProx && btnProx2) {
    btnProx.addEventListener('click', () => {
      const totalPaginas = Math.ceil(todasQuestoesEnem.length / questoesPorPagina);
      if (paginaAtual < totalPaginas) { paginaAtual++; mostrarPaginaWord();

       }
    });
      btnProx2.addEventListener('click', () => {
      const totalPaginas = Math.ceil(todasQuestoesEnem.length / questoesPorPagina);
      if (paginaAtual < totalPaginas) { paginaAtual++; mostrarPaginaWord();

       }
    });

  }

  function gerarJsonDoCartaoResposta() {
    const exportacao = {
      tipoSimulado: "ENEM",
      totalQuestoes: todasQuestoesEnem.length,
      respostasPreenchidas: {}
    };

    todasQuestoesEnem.forEach((q, idx) => {
      const numQ = idx + 1;
      const bolaMarcada = linhasGabarito ? linhasGabarito.querySelector(`.bola-q-${numQ}.preenchida`) : null;
      exportacao.respostasPreenchidas[`questao_${numQ}`] = bolaMarcada ? bolaMarcada.getAttribute('data-letra') : null;
    });

    return exportacao;
  }

  // ==========================================
  // CLIQUE DO BOTÃO CARREGAR SIMULADO
  // ==========================================
  if (btnCarregar) {
    btnCarregar.addEventListener('click', () => {
      if (!inputSimuladoJson) return;
      const textoJson = inputSimuladoJson.value.trim();
      if (!textoJson) { alert("O campo JSON está vazio!"); return; }

      try {
        const listaQuestoes = JSON.parse(textoJson);
        
        // CORREÇÃO DE SEGURANÇA: Verifica se o JSON realmente pertence ao ENEM de forma segura
        if (Array.isArray(listaQuestoes) && listaQuestoes.length > 0) {
          if (listaQuestoes[0].contextoParagrafos === undefined) return; // Se não for ENEM, deixa o outro script agir
        } else {
          return;
        }

        if (!document.getElementById('css-enem-dinamico')) {
          const linkCss = document.createElement('link');
          linkCss.id = 'css-enem-dinamico';
          linkCss.rel = 'stylesheet';
          linkCss.href = 'enemStyle.css';
          document.head.appendChild(linkCss);
        }

        todasQuestoesEnem = listaQuestoes;
        paginaAtual = 1;

        if (jsonPreview) { jsonPreview.hidden = true; jsonPreview.textContent = ''; }
        if (btnBaixar) btnBaixar.disabled = true; 

        if (linhasGabarito) {
          linhasGabarito.innerHTML = '';

          todasQuestoesEnem.forEach((q, idx) => {
            const numQ = idx + 1;
            const linhaGabarito = document.createElement('div');
            linhaGabarito.classList.add('gabarito-linha');
            linhaGabarito.innerHTML = `<span class="gabarito-numero">${String(numQ).padStart(2, '0')}</span>`;
            
            const divBolas = document.createElement('div');
            divBolas.classList.add('gabarito-opcoes');

            ['A', 'B', 'C', 'D', 'E'].forEach(letraBola => {
              const bola = document.createElement('div');
              bola.classList.add('gabarito-bola', `bola-q-${numQ}`);
              bola.setAttribute('data-letra', letraBola);
              bola.textContent = letraBola;

              bola.addEventListener('click', () => {
                if (bola.classList.contains('preenchida')) {
                  bola.classList.remove('preenchida');
                } else {
                  divBolas.querySelectorAll(`.bola-q-${numQ}`).forEach(b => b.classList.remove('preenchida'));
                  bola.classList.add('preenchida');
                }
                if (btnBaixar) btnBaixar.disabled = false;
              });

              divBolas.appendChild(bola);
            });

            linhaGabarito.appendChild(divBolas);
            linhasGabarito.appendChild(linhaGabarito);
          });
        }

        mostrarPaginaWord();

        if (panelConfig) panelConfig.hidden = true;
        if (panelQuiz) panelQuiz.hidden = false;
        if (cartaoGabarito) cartaoGabarito.hidden = false;
        if (totalCount) totalCount.textContent = todasQuestoesEnem.length;

        const primeiraAba = document.querySelector('.aba-link[href="#aba-caderno-prova"]');
        if (primeiraAba) {
          linksAbas.forEach(l => l.classList.remove('active', 'ativa'));
          primeiraAba.classList.add('ativa');
          const abaCaderno = document.getElementById('aba-caderno-prova');
          const abaCartao = document.getElementById('aba-cartao-resposta');
          if (abaCaderno) abaCaderno.hidden = false;
          if (abaCartao) abaCartao.hidden = true;
        }

      } catch (err) {
        console.error("Erro no carregador ENEM:", err);
      }
    });
  }

  if (btnBaixar) {
    btnBaixar.addEventListener('click', () => {
      const resultadoGabarito = gerarJsonDoCartaoResposta();
      const textoFormatado = JSON.stringify(resultadoGabarito, null, 2);
      if (jsonPreview) {
        jsonPreview.textContent = textoFormatado;
        jsonPreview.hidden = false; 
        jsonPreview.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // INTERRUPTOR DE ABAS
  linksAbas.forEach(link => {
    link.addEventListener('click', (evento) => {
      evento.preventDefault(); 
      linksAbas.forEach(l => l.classList.remove('ativa'));
link.classList.add('ativa');const idAlvo = link.getAttribute('href').replace('#', '');const abaCaderno = document.getElementById('aba-caderno-prova');

const abaCartao = document.getElementById('aba-cartao-resposta');if (abaCaderno) abaCaderno.hidden = true;

if (abaCartao) abaCartao.hidden = true;const painelAlvo = document.getElementById(idAlvo);

if (painelAlvo) {
   painelAlvo.hidden = false;
   }});
  
  });
  // ==========================================
  // REGRA DO BOTÃO FINALIZAR (CORREÇÃO AUTOMÁTICA)
  // ==========================================
  const btnFinalizar = document.getElementById('btnFinalizar');
  const quizStatus = document.getElementById('quizStatus');

  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
      if (todasQuestoesEnem.length === 0) return;

      let totalAcertos = 0;
      let totalRespondidas = 0;

      // Lista para guardar os detalhes da correção
      const relatorioCorrecao = {
        tipo: "Correção Oficial ENEM",
        totalQuestoes: todasQuestoesEnem.length,
        acertos: 0,
        erros: 0,
        detalhes: []
      };

      // Compara a bolinha preenchida com o gabarito oficial do JSON
      todasQuestoesEnem.forEach((questao, idx) => {
        const numQ = idx + 1;
        
        // Busca qual bolinha o aluno pintou de preto no cartão-resposta
        const bolaMarcada = linhasGabarito ? linhasGabarito.querySelector(`.bola-q-${numQ}.preenchida`) : null;
        const respostaAluno = bolaMarcada ? bolaMarcada.getAttribute('data-letra') : null;
        const respostaCorreta = questao.gabarito; // Pega o atributo correto do JSON

        if (respostaAluno) {
          totalRespondidas++;
          const acertou = respostaAluno === respostaCorreta;
          
          if (acertou) {
            totalAcertos++;
          }

          relatorioCorrecao.detalhes.push({
            questao: numQ,
            suaResposta: respostaAluno,
            gabaritoOficial: respostaCorreta,
            status: acertou ? "Correta" : "Errada"
          });
        } else {
          relatorioCorrecao.detalhes.push({
            questao: numQ,
            suaResposta: "Em branco",
            gabaritoOficial: respostaCorreta,
            status: "Não respondida"
          });
        }
      });

      // Atualiza o relatório final
      relatorioCorrecao.acertos = totalAcertos;
      relatorioCorrecao.erros = totalRespondidas - totalAcertos;

      // 1. Mostra o JSON da correção detalhada dentro do <pre id="jsonPreview">
      if (jsonPreview) {
        jsonPreview.textContent = JSON.stringify(relatorioCorrecao, null, 2);
        jsonPreview.hidden = false;
        jsonPreview.scrollIntoView({ behavior: 'smooth' });
      }

      // 2. Injeta um aviso em texto no rodapé do simulado (Aproveita a sua div quizStatus)
      if (quizStatus) {
        quizStatus.innerHTML = `
          <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid #16a34a; padding: 15px; border-radius: 8px; color: var(--text); margin-top: 15px; font-family: system-ui, sans-serif;">
            <h4 style="margin: 0 0 5px 0; color: #16a34a; font-weight: bold;">🎉 Simulado Concluído!</h4>
            <p style="margin: 0; font-size: 14px;">Você respondeu <strong>${totalRespondidas}</strong> de <strong>${todasQuestoesEnem.length}</strong> questões.</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">Acertos totais: <span style="color: #16a34a;">${totalAcertos} acertos</span>.</p>
          </div>
        `;
      }

      // 3. Libera o seu botão de baixar/copiar JSON caso queira salvar as respostas
      if (btnBaixar) btnBaixar.disabled = false;
    });
  }


});