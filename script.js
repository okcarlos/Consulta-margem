const formulario =
  document.getElementById("formulario");

const arquivoInput =
  document.getElementById("arquivo");

const nomeArquivo =
  document.getElementById("nomeArquivo");

const btnProcessar =
  document.getElementById("btnProcessar");

const status =
  document.getElementById("status");

const API_BASE =
  "https://api-in100.onrender.com";

// ============================================================
// CONTROLE DA TAREFA
// ============================================================

let eventos = null;
let tarefaId = null;
let processamentoFinalizado = false;
let intervaloFallback = null;

// ============================================================
// ARQUIVO SELECIONADO
// ============================================================

arquivoInput.addEventListener(
  "change",
  () => {

    if (
      arquivoInput.files.length > 0
    ) {

      nomeArquivo.textContent =
        arquivoInput.files[0].name;

    } else {

      nomeArquivo.textContent =
        "XLSX ou XLS";
    }
  }
);

// ============================================================
// ATUALIZAR STATUS
// ============================================================

function atualizarProgresso(
  atual,
  total,
  percentual
) {

  status.textContent =
    `Consultando IN100... ${atual} de ${total} (${percentual}%)`;

  console.log(
    `Progresso: ${atual} de ${total}`
  );
}

// ============================================================
// FINALIZAR INTERFACE
// ============================================================

function liberarInterface() {

  btnProcessar.disabled =
    false;

  btnProcessar.textContent =
    "Processar planilha";
}

// ============================================================
// PARAR FALLBACK
// ============================================================

function pararFallback() {

  if (intervaloFallback) {

    clearInterval(
      intervaloFallback
    );

    intervaloFallback =
      null;
  }
}

// ============================================================
// DOWNLOAD
// ============================================================

function baixarResultado(
  download
) {

  if (!download) {

    status.textContent =
      "Processamento concluído, mas o arquivo não foi localizado.";

    liberarInterface();

    return;
  }

  status.textContent =
    "Concluído! Baixando resultado...";

  setTimeout(
    () => {

      const link =
        document.createElement("a");

      link.href =
        `${API_BASE}${download}`;

      link.download =
        "resultado_in100.xlsx";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      status.textContent =
        "Pronto! O resultado IN100 foi gerado.";

      liberarInterface();

    },
    500
  );
}

// ============================================================
// PROCESSAMENTO CONCLUÍDO
// ============================================================

function processamentoConcluido(
  dados
) {

  if (
    processamentoFinalizado
  ) {
    return;
  }

  processamentoFinalizado =
    true;

  pararFallback();

  if (eventos) {

    eventos.close();

    eventos = null;
  }

  baixarResultado(
    dados.download
  );
}

// ============================================================
// ERRO DA TAREFA
// ============================================================

function erroProcessamento(
  mensagem
) {

  pararFallback();

  if (eventos) {

    eventos.close();

    eventos = null;
  }

  liberarInterface();

  status.textContent =
    mensagem ||
    "Erro durante o processamento.";

  console.error(
    "Erro da tarefa:",
    mensagem
  );
}

// ============================================================
// CONSULTAR STATUS DA TAREFA
// ============================================================

async function consultarStatusTarefa() {

  if (
    !tarefaId ||
    processamentoFinalizado
  ) {
    return;
  }

  try {

    const resposta =
      await fetch(
        `${API_BASE}/api/status-tarefa/${tarefaId}`,
        {
          cache: "no-store"
        }
      );

    // --------------------------------------------------------
    // TAREFA NÃO ENCONTRADA
    // --------------------------------------------------------

    if (
      resposta.status === 404
    ) {

      console.warn(
        "Tarefa não encontrada no servidor."
      );

      status.textContent =
        "Não foi possível localizar a tarefa no servidor.";

      return;
    }

    if (!resposta.ok) {
      return;
    }

    const dados =
      await resposta.json();

    if (
      !dados.encontrada
    ) {
      return;
    }

    // --------------------------------------------------------
    // ERRO
    // --------------------------------------------------------

    if (dados.erro) {

      erroProcessamento(
        dados.erro
      );

      return;
    }

    // --------------------------------------------------------
    // CONCLUÍDO
    // --------------------------------------------------------

    if (
      dados.concluida
    ) {

      processamentoConcluido({
        total:
          dados.total,

        download:
          dados.download
      });

      return;
    }

    // --------------------------------------------------------
    // PROGRESSO
    // --------------------------------------------------------

    const atual =
      Number(
        dados.processados || 0
      );

    const total =
      Number(
        dados.total || 0
      );

    const percentual =
      Number(
        dados.percentual || 0
      );

    if (total > 0) {

      atualizarProgresso(
        atual,
        total,
        percentual
      );
    }

  } catch (erro) {

    console.warn(
      "Falha ao consultar status da tarefa:",
      erro
    );
  }
}

// ============================================================
// INICIAR FALLBACK
// ============================================================

function iniciarFallback() {

  pararFallback();

  // Consulta imediatamente
  consultarStatusTarefa();

  // Depois consulta periodicamente
  intervaloFallback =
    setInterval(
      consultarStatusTarefa,
      5000
    );
}

// ============================================================
// ABRIR SSE
// ============================================================

function abrirSSE() {

  if (!tarefaId) {
    return;
  }

  if (eventos) {

    eventos.close();

    eventos = null;
  }

  console.log(
    "Abrindo SSE:",
    tarefaId
  );

  eventos =
    new EventSource(
      `${API_BASE}/api/progresso/${tarefaId}`
    );

  // ----------------------------------------------------------
  // INÍCIO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "inicio",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        console.log(
          "Total de clientes:",
          dados.total
        );

        status.textContent =
          `Consultando IN100... 0 de ${dados.total}`;

      } catch (erro) {

        console.error(
          "Erro no evento inicio:",
          erro
        );
      }
    }
  );

  // ----------------------------------------------------------
  // CONSULTANDO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "consultando",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        const atual =
          Number(
            dados.atual || 0
          );

        const total =
          Number(
            dados.total || 0
          );

        const percentual =
          Number(
            dados.percentual || 0
          );

        status.textContent =
          `Consultando IN100... ${atual} de ${total} (${percentual}%)`;

      } catch (erro) {

        console.error(
          "Erro no evento consultando:",
          erro
        );
      }
    }
  );

  // ----------------------------------------------------------
  // PROGRESSO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "progresso",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        atualizarProgresso(
          dados.atual,
          dados.total,
          dados.percentual
        );

      } catch (erro) {

        console.error(
          "Erro no evento progresso:",
          erro
        );
      }
    }
  );

  // ----------------------------------------------------------
  // FINALIZANDO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "finalizando",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        status.textContent =
          `Consultas concluídas: ${dados.atual} de ${dados.total}. Gerando Excel...`;

      } catch (erro) {

        console.error(
          "Erro no evento finalizando:",
          erro
        );
      }
    }
  );

  // ----------------------------------------------------------
  // CONCLUÍDO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "concluido",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        processamentoConcluido(
          dados
        );

      } catch (erro) {

        console.error(
          "Erro no evento concluido:",
          erro
        );
      }
    }
  );

  // ----------------------------------------------------------
  // ERRO
  // ----------------------------------------------------------

  eventos.addEventListener(
    "erro",
    (event) => {

      try {

        const dados =
          JSON.parse(
            event.data
          );

        erroProcessamento(
          dados.mensagem ||
          "Erro durante o processamento."
        );

      } catch (erro) {

        erroProcessamento(
          "Erro durante o processamento."
        );
      }
    }
  );

  // ----------------------------------------------------------
  // CONEXÃO ABERTA
  // ----------------------------------------------------------

  eventos.onopen =
    () => {

      console.log(
        "SSE conectado."
      );

      // Quando reconectar,
      // consulta o estado atual também.
      consultarStatusTarefa();
    };

  // ----------------------------------------------------------
  // ERRO SSE
  // ----------------------------------------------------------

  eventos.onerror =
    (erro) => {

      console.warn(
        "Conexão SSE perdida. O EventSource tentará reconectar.",
        erro
      );

      status.textContent =
        "Processamento em andamento... reconectando conexão de progresso.";

      // ------------------------------------------------------
      // IMPORTANTE:
      //
      // Mesmo com o SSE desconectado,
      // consultamos o estado diretamente.
      // ------------------------------------------------------

      iniciarFallback();
    };
}

// ============================================================
// SUBMIT
// ============================================================

formulario.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const arquivo =
      arquivoInput.files[0];

    if (!arquivo) {

      status.textContent =
        "Selecione uma planilha.";

      return;
    }

    // --------------------------------------------------------
    // RESET
    // --------------------------------------------------------

    processamentoFinalizado =
      false;

    tarefaId = null;

    pararFallback();

    if (eventos) {

      eventos.close();

      eventos = null;
    }

    // --------------------------------------------------------
    // FORM DATA
    // --------------------------------------------------------

    const formData =
      new FormData();

    formData.append(
      "arquivo",
      arquivo
    );

    btnProcessar.disabled =
      true;

    btnProcessar.textContent =
      "Processando...";

    status.textContent =
      "Enviando planilha...";

    try {

      // ======================================================
      // 1. INICIAR PROCESSAMENTO
      // ======================================================

      const resposta =
        await fetch(
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
            dados.erro ||
            mensagem;

        } catch (_) {}

        throw new Error(
          mensagem
        );
      }

      const dados =
        await resposta.json();

      tarefaId =
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

      // ======================================================
      // 2. ABRIR SSE
      // ======================================================

      status.textContent =
        "Preparando consultas...";

      abrirSSE();

    } catch (erro) {

      console.error(
        erro
      );

      pararFallback();

      if (eventos) {

        eventos.close();

        eventos = null;
      }

      liberarInterface();

      status.textContent =
        erro.message ||
        "Erro ao processar a planilha.";
    }
  }
);
