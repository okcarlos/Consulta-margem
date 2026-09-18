const formulario = document.getElementById("formulario");
const arquivoInput = document.getElementById("arquivo");
const nomeArquivo = document.getElementById("nomeArquivo");
const btnProcessar = document.getElementById("btnProcessar");
const status = document.getElementById("status");

const API_BASE = "https://api-in100.onrender.com";

// ============================================================
// ARQUIVO SELECIONADO
// ============================================================

arquivoInput.addEventListener("change", () => {
  if (arquivoInput.files.length > 0) {
    nomeArquivo.textContent =
      arquivoInput.files[0].name;
  } else {
    nomeArquivo.textContent = "XLSX ou XLS";
  }
});

// ============================================================
// SUBMIT
// ============================================================

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();

  const arquivo = arquivoInput.files[0];

  if (!arquivo) {
    status.textContent =
      "Selecione uma planilha.";

    return;
  }

  const formData = new FormData();

  formData.append(
    "arquivo",
    arquivo
  );

  btnProcessar.disabled = true;
  btnProcessar.textContent =
    "Processando...";

  status.textContent =
    "Enviando planilha...";

  try {
    // ========================================================
    // 1. INICIAR PROCESSAMENTO
    // ========================================================

    const resposta = await fetch(
      `${API_BASE}/api/processar`,
      {
        method: "POST",
        body: formData
      }
    );

    console.log(
      "STATUS:",
      resposta.status
    );

    console.log(
      "STATUS TEXT:",
      resposta.statusText
    );

    console.log(
      "URL:",
      resposta.url
    );

    if (!resposta.ok) {
      let mensagem =
        "Erro ao iniciar o processamento.";

      try {
        const dados =
          await resposta.json();

        mensagem =
          dados.erro || mensagem;

      } catch (_) {}

      throw new Error(mensagem);
    }

    const dados =
      await resposta.json();

    const tarefaId =
      dados.tarefaId;

    if (!tarefaId) {
      throw new Error(
        "O servidor não retornou o ID da tarefa."
      );
    }

    console.log(
      "Tarefa criada:",
      tarefaId
    );

    // ========================================================
    // 2. ABRIR SSE
    // ========================================================

    status.textContent =
      "Preparando consultas...";

    const eventos = new EventSource(
      `${API_BASE}/api/progresso/${tarefaId}`
    );

    // ========================================================
    // INÍCIO
    // ========================================================

    eventos.addEventListener(
      "inicio",
      (event) => {
        const dados =
          JSON.parse(event.data);

        console.log(
          "Total de clientes:",
          dados.total
        );

        status.textContent =
          `Consultando IN100... 0 de ${dados.total}`;
      }
    );

    // ========================================================
    // PROGRESSO
    // ========================================================

    eventos.addEventListener(
      "progresso",
      (event) => {
        const dados =
          JSON.parse(event.data);

        const atual =
          dados.atual;

        const total =
          dados.total;

        const percentual =
          dados.percentual;

        status.textContent =
          `Consultando IN100... ${atual} de ${total} (${percentual}%)`;

        console.log(
          `Progresso: ${atual} de ${total}`
        );
      }
    );

    // ========================================================
    // FINALIZANDO
    // ========================================================

    eventos.addEventListener(
      "finalizando",
      (event) => {
        const dados =
          JSON.parse(event.data);

        status.textContent =
          `Consultas concluídas: ${dados.atual} de ${dados.total}. Gerando Excel...`;
      }
    );

    // ========================================================
    // CONCLUÍDO
    // ========================================================

    eventos.addEventListener(
      "concluido",
      (event) => {
        const dados =
          JSON.parse(event.data);

        status.textContent =
          `Concluído! ${dados.total} de ${dados.total}. Baixando resultado...`;

        eventos.close();

        btnProcessar.disabled = false;
        btnProcessar.textContent = "Processar planilha";

        // Pequena espera para mostrar "Concluído"
        setTimeout(() => {
          const link =
            document.createElement("a");

          link.href =
            `${API_BASE}${dados.download}`;

          link.download =
            "resultado_in100.xlsx";

          document.body.appendChild(link);

          link.click();

          link.remove();

          status.textContent =
            "Pronto! O resultado IN100 foi gerado.";
        }, 500);
      }
    );

    // ========================================================
    // ERRO
    // ========================================================

    eventos.addEventListener(
      "erro",
      (event) => {
        const dados =
          JSON.parse(event.data);

        eventos.close();

        btnProcessar.disabled = false;
        btnProcessar.textContent = "Processar planilha";

        throw new Error(
          dados.mensagem ||
          "Erro durante o processamento."
        );
      }
    );

    // ========================================================
    // ERRO DE CONEXÃO SSE
    // ========================================================

    eventos.onerror = (erro) => {
      console.error(
        "Erro na conexão de progresso:",
        erro
      );

      // O EventSource tenta reconectar
      // automaticamente.
      status.textContent =
        "Processamento em andamento... conexão de progresso sendo reconectada.";
    };

  } catch (erro) {
    console.error(erro);

    status.textContent =
      erro.message ||
      "Erro ao processar a planilha.";
  } finally {
    // Não liberamos o botão imediatamente,
    // pois o processamento continua depois
    // que /api/processar responde.
  }
});
