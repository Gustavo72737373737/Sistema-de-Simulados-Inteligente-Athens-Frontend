const copyContent = async () => {   
  try {      
    const elementoDeOrigem = document.getElementById('output'); // Captura o elemento de origem                    
    if (!elementoDeOrigem) return;      
    
    let text = elementoDeOrigem.value !== undefined ? elementoDeOrigem.value : elementoDeOrigem.innerText;
    if (!text || text.trim() === "") {       
      console.warn("A cópia foi cancelada porque o elemento está vazio.");       
      return;      
    }      

    // Tenta a API moderna da Área de Transferência
    if (navigator.clipboard && window.isSecureContext) {       
      try {         
        await navigator.clipboard.writeText(text);         
        alterarBotaoSucesso();         
        return;       
      } catch (apiErr) {         
        console.warn('Clipboard API falhou. Tentando Fallback...', apiErr);       
      }     
    }      

    // Fallback para navegadores antigos ou contextos não seguros
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

// ====== EVENTO DO SEGUNDO BOTÃO (JSON PREVIEW) ====== 
const copyContent_btnJsonPreview = async () => {   
  try {     
    const elementoDeOrigem = document.getElementById('jsonPreview');      
    if (!elementoDeOrigem) return;      
    
    let text = elementoDeOrigem.value !== undefined ? elementoDeOrigem.value : elementoDeOrigem.innerText;      
    if (!text || text.trim() === "") {       
      console.warn("A cópia foi cancelada porque o JSON Preview está vazio.");       
      return;      
    }      

    if (navigator.clipboard && window.isSecureContext) {       
      try {         
        await navigator.clipboard.writeText(text);         
        altera_btn_copiarJsonPreview();         
        return;       
      } catch (apiErr) {         
        console.warn('Clipboard API falhou no JSON Preview. Tentando Fallback...', apiErr);       
      }     
    }      

    const textareaTemporaria = document.createElement("textarea");     
    textareaTemporaria.value = text;     
    textareaTemporaria.style.position = "fixed";     
    textareaTemporaria.style.left = "-9999px";     textareaTemporaria.style.top = "0";          
    document.body.appendChild(textareaTemporaria);     
    textareaTemporaria.select();          
    
    const copiouComSucesso = document.execCommand("copy");     
    document.body.removeChild(textareaTemporaria);      

    if (copiouComSucesso) {       
      altera_btn_copiarJsonPreview();     
    } else {       
      alert("Não foi possível copiar automaticamente o JSON.");     
    }   
  } catch (err) {     
    console.error('Erro crítico ao copiar JSON: ', err);   
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
    alert('JSON copiado para a área de transferência!');   
  } else {     
    alert('JSON copiado para a área de transferência!');   
  } 
}  

// Ativa botões quando a página estiver carregada
document.addEventListener("DOMContentLoaded", () => {   
  const botaoCopiaOutput = document.getElementById('btn-copiar');   
  if (botaoCopiaOutput) {     
    botaoCopiaOutput.addEventListener('click', copyContent);   
  }    

  const botaoCopiaJson = document.getElementById('btn-copiarJsonPreview');   
  if (botaoCopiaJson) {     
    botaoCopiaJson.addEventListener('click', copyContent_btnJsonPreview);   
  } 
});  

/// SISTEMA DE LIMPEZA DE QUESTÕES ENEM (API ENEM.DEV)
const btnLimpar = document.getElementById('btn-limpar'); 
if (btnLimpar) { 
  btnLimpar.addEventListener('click', () => {     
    const output = document.getElementById('output');     
    if (output) output.textContent = '';      
    console.log('Conteúdo limpo com sucesso!');   
  }); 
}
