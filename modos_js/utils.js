const copyContent = async () => {
  try {
    const elementoDeOrigem = document.getElementById('output'); // Captura o elemento de origem do conteúdo a ser copiado
    if (!elementoDeOrigem) return;

    // DETECÇÃO AUTOMÁTICA: Se tiver .value (textarea), usa. Se não, usa .innerText (pre)
    let text = elementoDeOrigem.value !== undefined ? elementoDeOrigem.value : elementoDeOrigem.innerText;

    // Proteção caso esteja vazio
    if (!text || text.trim() === "") {
      console.warn("A cópia foi cancelada porque o elemento está vazio.");
      return; 
    }

    // 1. Tenta usar a API moderna (HTTPS ou Localhost)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        alterarBotaoSucesso();
        return;
      } catch (apiErr) {
        console.warn('Clipboard API falhou. Tentando Fallback...', apiErr);
      }
    }

    // 2. Fallback Universal (Para qualquer navegador, sistema ou HTTP comum)
    const textareaTemporaria = document.createElement("textarea");
    textareaTemporaria.value = text;
    
    // Oculta o elemento perfeitamente em qualquer dispositivo/mobile
    textareaTemporaria.style.position = "fixed";
    textareaTemporaria.style.left = "-9999px";
    textareaTemporaria.style.top = "0";
    
    document.body.appendChild(textareaTemporaria);
    textareaTemporaria.select();
    
    const copiouComSucesso = document.execCommand("copy");
    document.body.removeChild(textareaTemporaria);

    if (copiouComSucesso) {
      alterarBotaoSucesso();
    } else {
      alert("Não foi possível copiar automaticamente.");
    }

  } catch (err) {
    console.error('Erro crítico ao copiar: ', err);
  }
}

// Função de feedback visual (Funciona se o botão existir na tela)
function alterarBotaoSucesso() {
  const btn = document.getElementById('btn-copiar');
  if (btn) {
    const textoOriginal = btn.innerText || btn.value;
    
    // Se for um botão de tag <button>
    if (btn.tagName.toLowerCase() === 'button') {
      btn.innerText = "✓ Copiado!";
      btn.style.background = "#16a34a";
      setTimeout(() => {
        btn.innerText = textoOriginal;
        btn.style.background = "#2563eb";
      }, 2000);



    } 
    // Se o seu botão em outra tela for um <input type="button">
    else {
      btn.value = "✓ Copiado!";
      setTimeout(() => { btn.value = textoOriginal; }, 2000);
    }
    
          alert('Copiado para a área de transferência!');
  } else {
    // Se a tela não tiver o botão 'btn-copiar' (ex: clicou direto na imagem), mostra um alert simples
    alert('Copiado para a área de transferência!');
  }
}

// Ativa o clique de forma segura nas duas telas
document.addEventListener("DOMContentLoaded", () => {
  const botaoCopia = document.getElementById('btn-copiar');
  if (botaoCopia) {
    botaoCopia.addEventListener('click', copyContent);
  }
});





/// SISTEMA DE LIMPEZA DE QUESTÕES ENEM (API ENEM.DEV) - 2024

// Capture o novo botão lá no topo do seu arquivo com os outros
const btnLimpar = document.getElementById('btn-limpar');

// Adicione este evento no final do seu código
btnLimpar.addEventListener('click', () => {
  // Limpa o texto de dentro do elemento <pre>
  output.textContent = ''; 
  
  console.log('Conteúdo limpo com sucesso!');
});
