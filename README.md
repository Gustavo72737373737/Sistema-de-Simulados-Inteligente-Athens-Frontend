# Sistema de Simulados Inteligente (Athens)

## O que é
Um sistema 100% offline (HTML/CSS/JS puro) para o aluno responder simulados e exportar **apenas as respostas** para uma correção posterior (ex.: IA).

## Como usar
1. Garanta que os arquivos estejam nesta estrutura:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `data/questoes.json`
2. Abra o `index.html` no navegador.

> Observação: como o app faz `fetch('./data/questoes.json')`, alguns navegadores bloqueiam leitura de arquivo local via `file://`. O ideal é usar um servidor estático local (por exemplo: VSCode Live Server).

## Formato do JSON das questões
`data/questoes.json` deve ser um array de objetos. Tipos suportados:
- `multipla_escolha` com `alternativas: [ ... ]`
- `verdadeiro_falso`
- `resposta_curta`
- `discursiva`

## Export
Ao finalizar, o app gera e copia/baixa um arquivo JSON no formato:

```json
{
  "respostas": [
    { "id": 1, "tipo": "multipla_escolha", "resposta": "B" }
  ]
}
```

