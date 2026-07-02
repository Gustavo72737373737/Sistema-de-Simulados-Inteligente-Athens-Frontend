const anoSelecionado = document.getElementById('ano-selecionado');
const output = document.getElementById('output');
const btnBuscar = document.getElementById('btn-buscar');




const options = {method: 'GET'};


  const fetchData = (value) => {
 const response = fetch(`https://api.enem.dev/v1/exams/${value}/questions?limit=10`, options)

  .then(res => res.json())
  .then(data => {
    console.log(data);
    return data;
  })
  return response
  .catch(err => console.error(err));

}




btnBuscar.addEventListener('click', async () => {
   const result = await fetchData(anoSelecionado.value);
   output.textContent = JSON.stringify(result , null, 2);
});




