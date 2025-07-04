document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const messageArea = document.getElementById("messageArea");
    const loginButton = document.getElementById("loginButton"); // Assume que você tem um ID para o botão de login

    // !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
    const BACKEND_URL = 'https://backendbras.onrender.com';

    /**
     * Exibe uma mensagem de status para o usuário.
     * @param {string} message - A mensagem a ser exibida.
     * @param {'success'|'error'|'info'} type - O tipo de mensagem (para estilização).
     */
    function showMessage(message, type = "info") {
        messageArea.textContent = message;
        messageArea.className = "message-box show"; // Adiciona animação
        messageArea.classList.remove("hidden");

        // Remove todas as classes de tipo antes de adicionar a correta
        messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800");
        
        if (type === "success") {
            messageArea.classList.add("message-success");
        } else if (type === "error") {
            messageArea.classList.add("message-error");
        } else {
            messageArea.classList.add("bg-blue-100", "text-blue-800"); // Classes para info
        }

        // Esconde a mensagem após 5 segundos
        setTimeout(() => {
            messageArea.classList.remove("show");
            setTimeout(() => messageArea.classList.add("hidden"), 500); // Garante que a animação termine antes de esconder
        }, 5000);
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Limpa a mensagem anterior e a esconde antes de iniciar o processo
        messageArea.textContent = "";
        messageArea.classList.add("hidden");

        // --- Feedback de Carregamento ---
        // 1. Desabilita o botão para evitar múltiplos cliques
        loginButton.disabled = true; 
        // 2. Mostra uma mensagem de carregamento inicial
        showMessage("Verificando credenciais...", "info");

        try {
            // Usa a URL do backend do Render
            const response = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Login bem-sucedido
                showMessage("Login bem-sucedido! Redirecionando...", "success");
                setTimeout(() => {
                    // Redireciona para a página principal do frontend (ainda no Vercel)
                    window.location.href = "/main.html";
                }, 1500);
            } else {
                // Login falhou (resposta OK do servidor, mas com erro de lógica como senha inválida)
                // A mensagem vem do backend (data.message)
                showMessage(data.message || "Erro desconhecido no login.", "error");
            }
        } catch (error) {
            // Erro de rede, servidor fora do ar ou outro erro inesperado
            console.error("Erro na requisição de login:", error);
            showMessage("Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.", "error");
        } finally {
            // --- Finaliza o Carregamento ---
            // 1. Reabilita o botão
            loginButton.disabled = false;
            // A mensagem de "Verificando credenciais..." será substituída
            // pela mensagem de sucesso ou erro, ou por uma nova chamada a showMessage.
            // A função showMessage já gerencia o setTimeout para esconder a mensagem.
        }
    });
});
