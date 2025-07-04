document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const messageArea = document.getElementById("messageArea");

    // !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
    // Exemplo: const BACKEND_URL = 'https://seu-app-backend.onrender.com';
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

        messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800");
        if (type === "success") {
            messageArea.classList.add("message-success");
        } else if (type === "error") {
            messageArea.classList.add("message-error");
        } else {
            messageArea.classList.add("bg-blue-100", "text-blue-800");
        }

        setTimeout(() => {
            messageArea.classList.remove("show");
            setTimeout(() => messageArea.classList.add("hidden"), 500);
        }, 5000);
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        messageArea.textContent = "";
        messageArea.classList.add("hidden");

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
                showMessage("Login bem-sucedido! Redirecionando...", "success");
                setTimeout(() => {
                    // Redireciona para a página principal do frontend (ainda no Vercel)
                    window.location.href = "/main.html";
                }, 1500);
            } else {
                showMessage(data.message || "Erro desconhecido no login.", "error");
            }
        } catch (error) {
            console.error("Erro na requisição de login:", error);
            showMessage("Não foi possível conectar ao servidor. Verifique sua conexão e a URL do backend.", "error");
        }
    });
});
