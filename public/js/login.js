document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const messageArea = document.getElementById("messageArea");
    const loginButton = document.getElementById("loginButton"); // Referência ao botão de login

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
        messageArea.classList.remove("hidden"); // Garante que esteja visível

        // Remove todas as classes de tipo antes de adicionar a correta
        messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800"); 
        
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
        // 1. Limpa qualquer mensagem anterior e a esconde
        messageArea.textContent = "";
        messageArea.classList.add("hidden");

        // 2. Desabilita o botão para evitar cliques múltiplos
        loginButton.disabled = true; 
        
        // 3. Mostra uma mensagem de carregamento
        showMessage("Verificando credenciais...", "info");

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
                showMessage("Login bem-sucedido! Redirecionando...", "success");
                setTimeout(() => {
                    // Redireciona para a página principal do frontend
                    window.location.href = "/main.html"; // Ajuste o caminho se necessário
                }, 1500); // Pequeno atraso para a mensagem ser lida
            } else {
                // --- FALHA NO LOGIN (RESPOSTA DO BACKEND) ---
                // A mensagem de erro vem do backend (data.message)
                showMessage(data.message || "Erro desconhecido no login.", "error");
            }
        } catch (error) {
            // --- ERRO DE CONEXÃO OU OUTRO ERRO INESPERADO ---
            console.error("Erro na requisição de login:", error);
            showMessage("Não foi possível conectar ao servidor. Verifique sua conexão e a URL do backend.", "error");
        } finally {
            // --- FINALIZA O CARREGAMENTO ---
            // Reabilita o botão de login, independentemente do resultado
            loginButton.disabled = false;
            // A mensagem de "Verificando..." será automaticamente substituída
            // pela mensagem de sucesso/erro ou desaparecerá após o setTimeout.
        }
    });
});
