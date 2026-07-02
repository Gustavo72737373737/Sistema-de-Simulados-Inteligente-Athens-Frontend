// A função fica isolada aqui, sem poluir o HTML


/*
navigator.permissions.query({ name: "write-on-clipboard" }).then((result) => {
  if (result.state == "granted" || result.state == "prompt") {
    alert("Write access granted!");
  }
});
const outputElement = document.getElementById('output');
const btnCopiar = document.getElementById('btn-copiar');

async function copiarConteudo() {
  const textoParaCopiar = document.getElementById(outputElement).innerText;
  try {
    await navigator.clipboard.writeText(textoParaCopiar);
    document.getElementById('mensagem-feedback').innerText = 'Conteúdo copiado com sucesso!';
  } catch (err) {
    document.getElementById('mensagem-feedback').innerText = 'Erro ao tentar copiar.';
    console.error('Erro ao copiar: ', err);
  }
}  
const btnCopiar = document.getElementById('btn-copiar');
const outputElement = document.getElementById('output');





   function copyDivToClipboard(outputElement) {

console.log("Copying content of div with id: " + outputElement);

var range = document.createRange();

range.selectNode(document.getElementById(outputElement));

window.getSelection().removeAllRanges(); // clear current selection

window.getSelection().addRange(range); // to select text

document.execCommand("copy"); // copy selected text to clipboard

window.getSelection().removeAllRanges();// to deselect

} */

/*
const btnCopiar = document.getElementById('btn-copiar');
const outputElement = document.getElementById('output');

 let text = document.getElementById('outpu').innerText;
  const copyContent = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        console.log('Content copied to clipboard');
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        console.log('Content copied to clipboard');
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
  */

  // Função de cópia ajustada para ler o valor atual da textarea
const copyContent = async () => {
  try {
    // 1. Busca o valor ATUALIZADO da textarea no exato momento do clique usando .value
    const textareaDeOrigem = document.getElementById('output');
    let text = textareaDeOrigem.value;

    // 2. Proteção: Se a API falhou ou ainda não preencheu a textarea, avisa você
    if (!text || text.trim() === "") {
      console.warn("A cópia foi cancelada porque a textarea ainda está vazia. Aguarde o retorno da API.");
      alert("Ainda não há conteúdo para copiar! Aguarde o carregamento da API.");
      return; 
    }

    // 3. Executa a cópia normalmente com o dado atualizado
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      console.log('Conteúdo da API copiado com sucesso!');
      alert('Copiado para a área de transferência!');
    } else {
      // Sistema de segurança (Fallback) para navegadores antigos
      const textareaTemporaria = document.createElement("textarea");
      textareaTemporaria.value = text;
      document.body.appendChild(textareaTemporaria);
      textareaTemporaria.select();
      document.execCommand("copy");
      document.body.removeChild(textareaTemporaria);
      console.log('Conteúdo da API copiado via Fallback!');
      alert('Copiado para a área de transferência!');
    }
  } catch (err) {
    console.error('Erro crítico ao tentar copiar: ', err);
  }
}

// 4. Ativa a função quando o botão for clicado (Sem poluir o HTML)
document.getElementById('btn-copiar').addEventListener('click', copyContent);
