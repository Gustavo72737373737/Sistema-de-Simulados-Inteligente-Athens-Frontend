

const copyContent = async () => {
  try {

    const elementoDeOrigem = document.getElementById('output'); // Captura o elemento de origem do conteúdo a ser copiado
    
    
    
    if (!elementoDeOrigem) return;

    let text = elementoDeOrigem.value !== undefined ? elementoDeOrigem.value : elementoDeOrigem.innerText;

    if (!text || text.trim() === "") {
      console.warn("A cópia foi cancelada porque o elemento está vazio.");
      return; 
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        alterarBotaoSucesso();
        return;
      } catch (apiErr) {
        console.warn('Clipboard API falhou. Tentando Fallback...', apiErr);
      }
    }

    const textareaTemporaria = document.createElement("textarea");
    textareaTemporaria.value = text;
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

function alterarBotaoSucesso() {
  const btn = document.getElementById('btn-copiar');
  if (btn) {
    const textoOriginal = btn.innerText || btn.value;
    if (btn.tagName.toLowerCase() === 'button') {
      btn.innerText = "✓ Copiado!";
      btn.style.background = "#16a34a";
      setTimeout(() => {
        btn.innerText = textoOriginal;
        btn.style.background = "#2563eb";
      }, 2000);
    } else {  
      btn.value = "✓ Copiado!";
      setTimeout(() => { btn.value = textoOriginal; }, 2000);
    }
    alert('Copiado para a área de transferência!');
  } else {
    alert('Copiado para a área de transferência!');
  }
}

// ====== NOVO: EVENTO DO SEGUNDO BOTÃO COPIAR O PREVIEWJSON ======
const copyContent_btnJsonPreview = async () => {
  try {
    const elementoDeOrigem = document.getElementById('jsonPreview'); 
    if (!elementoDeOrigem) return;

    let text = elementoDeOrigem.value !== undefined ? elementoDeOrigem.value : elementoDeOrigem.innerText;

    if (!text || text.trim() === "") {
      console.warn("A cópia foi cancelada porque o elemento está vazio.");
      return; 
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        altera_btn_copiarJsonPreview(); // CORRIGIDO: Nome da função de feedback visual
        return;
      } catch (apiErr) {
        console.warn('Clipboard API falhou. Tentando Fallback...', apiErr);
      }
    }

    const textareaTemporaria = document.createElement("textarea");
    textareaTemporaria.value = text;
    textareaTemporaria.style.position = "fixed";
    textareaTemporaria.style.left = "-9999px";
    textareaTemporaria.style.top = "0";
    
    document.body.appendChild(textareaTemporaria);
    textareaTemporaria.select();
    
    const copiouComSucesso = document.execCommand("copy");
    document.body.removeChild(textareaTemporaria);

    if (copiouComSucesso) {
      altera_btn_copiarJsonPreview(); // CORRIGIDO: Nome da função de feedback visual
    } else {
      alert("Não foi possível copiar automaticamente.");
    }
  } catch (err) {
    console.error('Erro crítico ao copiar: ', err);
  }
}

function altera_btn_copiarJsonPreview() {
  const btnj = document.getElementById('btn-copiarJsonPreview'); 
  if (btnj) {
    const textoOriginal = btnj.innerText || btnj.value;
    if (btnj.tagName.toLowerCase() === 'button') {
      btnj.innerText = "✓ Copiado!";
      btnj.style.background = "#16a34a";
      setTimeout(() => {
        btnj.innerText = textoOriginal;
        btnj.style.background = "#2563eb";
      }, 2000);
    } else {
      btnj.value = "✓ Copiado!";
      setTimeout(() => { btnj.value = textoOriginal; }, 2000);
    }
    alert('Copiado para a área de transferência!');
  } else {
    alert('Copiado para a área de transferência!');
  }
}

// Ativa botoes de copiar quando a página estiver carregada
document.addEventListener("DOMContentLoaded", () => {
  const botaoCopia = document.getElementById('btn-copiar');
  if (botaoCopia) {
    botaoCopia.addEventListener('click', copyContent);
  }

  // CORRIGIDO: Mudamos o nome da variável local (botaoCopiaJson) para não chocar com a função
  const botaoCopiaJson = document.getElementById('btn-copiarJsonPreview');
  if (botaoCopiaJson) {
    botaoCopiaJson.addEventListener('click', copyContent_btnJsonPreview);
  }
});

/// SISTEMA DE LIMPEZA DE QUESTÕES ENEM (API ENEM.DEV) - 2024
const btnLimpar = document.getElementById('btn-limpar');
if (btnLimpar) { // Proteção adicionada para não quebrar em páginas que não têm esse botão
  btnLimpar.addEventListener('click', () => {
    const output = document.getElementById('output');
    if (output) output.textContent = ''; 
    console.log('Conteúdo limpo com sucesso!');
  });
}
