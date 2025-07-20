document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const messageArea = document.getElementById("messageArea");
  const loginButton = document.getElementById("loginButton"); // Referência ao botão de login
  const globalLoadingBar = document.getElementById("globalLoadingBar");

  // Detecta se está rodando localmente ou em produção
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const BACKEND_URL = isLocalhost
    ? "http://localhost:3000"
    : "https://backendbras.onrender.com";

  /**
   * Controla a barra de loading global
   * @param {boolean} show - Mostrar ou esconder a barra
   */
  function toggleGlobalLoading(show) {
    if (globalLoadingBar) {
      if (show) {
        globalLoadingBar.style.transform = "scaleX(1)";
      } else {
        globalLoadingBar.style.transform = "scaleX(0)";
      }
    }
  }

  /**
   * Exibe uma mensagem de status para o usuário.
   * @param {string} message - A mensagem a ser exibida.
   * @param {'success'|'error'|'info'} type - O tipo de mensagem (para estilização).
   */
  function showMessage(message, type = "info") {
    messageArea.textContent = message;
    messageArea.className = "message-box show"; // Adiciona animação
    messageArea.classList.remove("hidden"); // Garante que esteja visível

    // Remove todas as classes de tipo antes de adicionar a correta
    messageArea.classList.remove(
      "message-success",
      "message-error",
      "bg-blue-100",
      "text-blue-800"
    );

    if (type === "success") {
      messageArea.classList.add("message-success");
    } else if (type === "error") {
      messageArea.classList.add("message-error");
    } else {
      // Para 'info', usa as classes Tailwind que você já deve ter no seu CSS
      messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    // Esconde a mensagem após 5 segundos
    setTimeout(() => {
      messageArea.classList.remove("show"); // Inicia a animação de saída
      setTimeout(() => messageArea.classList.add("hidden"), 500); // Esconde completamente após a transição
    }, 5000);
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // --- PREPARAÇÃO E FEEDBACK DE CARREGAMENTO ---
    // 1. Ativa barra de loading global
    toggleGlobalLoading(true);

    // 2. Limpa qualquer mensagem anterior e a esconde
    messageArea.textContent = "";
    messageArea.classList.add("hidden");

    // 3. Desabilita o botão e adiciona indicador visual de carregamento
    loginButton.disabled = true;
    loginButton.classList.add("loading");
    const originalButtonText = loginButton.innerHTML;
    loginButton.innerHTML = `
            <div class="flex items-center justify-center">
                <svg class="spinner animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Fazendo login...
            </div>
        `;

    // 4. Mostra uma mensagem de carregamento com ícone
    showMessage("🔐 Verificando credenciais...", "info");

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // --- SUCESSO NO LOGIN ---
        // Feedback tátil de sucesso (se disponível)
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]); // Padrão de vibração para sucesso
        }

        loginButton.innerHTML = `
                    <div class="flex items-center justify-center">
                        <svg class="mr-2 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Login realizado!
                    </div>
                `;
        showMessage("✅ Login bem-sucedido! Redirecionando...", "success");

        // NOVO: Armazena o nome do líder no localStorage
        if (data.leaderName) {
          localStorage.setItem("loggedInLeaderName", data.leaderName);
          console.log(`Nome do líder armazenado: ${data.leaderName}`);
        } else {
          localStorage.removeItem("loggedInLeaderName"); // Limpa se não houver nome
          console.log("Nome do líder não recebido no login.");
        }

        setTimeout(() => {
          // Redireciona para a página principal do frontend
          window.location.href = "main.html"; // Caminho relativo correto
        }, 1500); // Pequeno atraso para a mensagem ser lida
      } else {
        // --- FALHA NO LOGIN (RESPOSTA DO BACKEND) ---
        // Feedback tátil de erro (se disponível)
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]); // Padrão de vibração para erro
        }

        // A mensagem de erro vem do backend (data.message)
        showMessage(
          "❌ " + (data.message || "Erro desconhecido no login."),
          "error"
        );
        localStorage.removeItem("loggedInLeaderName"); // Garante que o nome do líder seja removido em caso de falha
      }
    } catch (error) {
      // --- ERRO DE CONEXÃO OU OUTRO ERRO INESPERADO ---
      console.error("Erro na requisição de login:", error);
      showMessage(
        "🔌 Não foi possível conectar ao servidor. Verifique sua conexão e a URL do backend.",
        "error"
      );
      localStorage.removeItem("loggedInLeaderName"); // Garante que o nome do líder seja removido em caso de erro
    } finally {
      // --- FINALIZA O CARREGAMENTO ---
      // Desativa a barra de loading global
      toggleGlobalLoading(false);

      // Reabilita o botão de login e restaura texto original
      setTimeout(() => {
        loginButton.disabled = false;
        loginButton.innerHTML = originalButtonText;
        loginButton.classList.remove("loading");
      }, 1000); // Pequeno delay para dar tempo de ver o feedback visual
    }
  });
});
