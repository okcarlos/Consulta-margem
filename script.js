const formulario = document.getElementById("formulario");
const arquivoInput = document.getElementById("arquivo");
const nomeArquivo = document.getElementById("nomeArquivo");
const btnProcessar = document.getElementById("btnProcessar");
const status = document.getElementById("status");

arquivoInput.addEventListener("change", () => {
  if (arquivoInput.files.length > 0) {
    nomeArquivo.textContent = arquivoInput.files[0].name;
  } else {
    nomeArquivo.textContent = "XLSX ou XLS";
  }
});

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();

  const arquivo = arquivoInput.files[0];

  if (!arquivo) {
    status.textContent = "Selecione uma planilha.";
    return;
  }

  const formData = new FormData();
  formData.append("arquivo", arquivo);

  btnProcessar.disabled = true;
  btnProcessar.textContent = "Processando...";
  status.textContent = "Formatando e consultando IN100. Isso pode levar alguns minutos...";

  try {
    const resposta = await fetch("https://api-in100.onrender.com/api/processar", {
      method: "POST",
      body: formData
    });

    console.log("STATUS:", resposta.status);
    console.log("STATUS TEXT:", resposta.statusText);
    console.log("URL:", resposta.url);

    if (!resposta.ok) {
      let mensagem = "Erro ao processar a planilha.";

      try {
        const dados = await resposta.json();
        mensagem = dados.erro || mensagem;
      } catch (_) {}

      throw new Error(mensagem);
    }

    const blob = await resposta.blob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "resultado_in100.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    status.textContent = "Pronto! O resultado IN100 foi gerado.";
  } catch (erro) {
    console.error(erro);
    status.textContent = erro.message;
  } finally {
    btnProcessar.disabled = false;
    btnProcessar.textContent = "Processar planilha";
  }
});