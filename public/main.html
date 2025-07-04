let allMembersData = [];
let filteredMembers = [];

const filterNameInput = document.getElementById("filterName");
const filterPeriodoSelect = document.getElementById("filterPeriodo");
const filterLiderInput = document.getElementById("filterLider");
const filterGapeInput = document.getElementById("filterGape");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const membersCardsContainer = document.getElementById("membersCardsContainer");
const messageArea = document.getElementById("messageArea");
const globalLoadingIndicator = document.getElementById("globalLoadingIndicator");
const loadingMessageSpan = document.getElementById("loadingMessage");

const toggleDashboardBtn = document.getElementById("toggleDashboardBtn");
const dashboardContainer = document.getElementById("dashboardContainer");
const dashboardOpenIcon = document.getElementById("dashboardOpenIcon");
const dashboardCloseIcon = document.getElementById("dashboardCloseIcon");
const dashboardOpenText = document.getElementById("dashboardOpenText");
const dashboardCloseText = document.getElementById("dashboardCloseText");

const dashboardPresencasMes = document.getElementById("dashboardPresencasMes");
const dashboardPeriodo = document.getElementById("dashboardPeriodo");
const dashboardLider = document.getElementById("dashboardLider");
const dashboardGape = document.getElementById("dashboardGape");
const totalCountsList = document.getElementById("totalCountsList");

// !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
const BACKEND_URL = 'https://backendbras.onrender.com';

/**
 * Exibe ou oculta o indicador de carregamento global.
 * @param {boolean} show - Se `true`, exibe o indicador; se `false`, oculta.
 * @param {string} message - A mensagem a ser exibida no indicador.
 */
function showGlobalLoading(show, message = "Carregando...") {
    if (globalLoadingIndicator && loadingMessageSpan) {
        loadingMessageSpan.textContent = message;
        if (show) {
            globalLoadingIndicator.style.display = "flex";
            // Pequeno atraso para garantir que a transição de opacidade funcione
            setTimeout(() => {
                globalLoadingIndicator.classList.add("show");
            }, 10);
        } else {
            globalLoadingIndicator.classList.remove("show");
            // Atraso para permitir que a transição de opacidade termine antes de ocultar
            setTimeout(() => {
                globalLoadingIndicator.style.display = "none";
            }, 300);
        }
    }
}

/**
 * Exibe uma mensagem de feedback para o usuário.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo da mensagem ('success', 'error', 'info', 'warning').
 */
function showMessage(message, type = "info") {
    // Adiciona uma condição para não mostrar mensagens específicas no messageArea global
    if (message.includes("Carregando dados dos membros...") || 
        message.includes("Carregando resumo do dashboard...") ||
        message.includes("Registrando presença para ")) { 
        return; // Não mostra essas mensagens no toast global
    }
    
    messageArea.textContent = message;
    messageArea.className = "message-box show"; // Remove 'hidden' e adiciona 'show' para animação
    
    // Limpa todas as classes de tipo antes de adicionar a nova
    messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800", "bg-yellow-100", "text-yellow-800"); 
    
    if (type === "success") {
        messageArea.classList.add("message-success");
    } else if (type === "error") {
        messageArea.classList.add("message-error");
    } else if (type === "warning") { 
        messageArea.classList.add("bg-yellow-100", "text-yellow-800");
    } else { // Default para 'info' ou qualquer outro tipo
        messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    // Esconde a mensagem após um tempo
    setTimeout(() => {
        messageArea.classList.remove("show");
        // Espera a transição de opacidade terminar antes de esconder completamente
        setTimeout(() => messageArea.classList.add("hidden"), 500); // tempo da transição no CSS
    }, 4000); // Tempo que a mensagem fica visível
}

/**
 * Busca os dados dos membros do backend.
 */
async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");
    membersCardsContainer.innerHTML = `
        <div class="col-span-full flex flex-col justify-center items-center py-8 gap-3">
            <svg class="animate-spin h-8 w-8 text-blue-700 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span class="text-blue-700 text-lg font-semibold animate-pulse">Carregando membros...</span>
        </div>
    `;

    try {
        const response = await fetch(`${BACKEND_URL}/get-membros`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        // Assume que os dados dos membros estão em data.membros ou data.data
        allMembersData = data.membros || data.data || [];

        if (allMembersData.length === 0) {
            showMessage("Nenhum membro encontrado ou dados vazios.", "info");
        } else {
            // showMessage(`Membros carregados com sucesso! Total: ${allMembersData.length}`, "success"); // Comentado para evitar mensagem extra
        }

        fillSelectOptions(); // Preenche os filtros de Líder e GAPE
        applyFilters(); // Aplica os filtros e exibe os membros
    } catch (error) {
        console.error("Erro ao carregar membros:", error);
        showMessage(`Erro ao carregar membros: ${error.message}`, "error");
        membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-red-600">Falha ao carregar dados dos membros. Verifique o console para detalhes.</div>`;
    } finally {
        showGlobalLoading(false); // Oculta o loading global
    }
}

/**
 * Aplica os filtros e atualiza a lista de membros exibida.
 */
function applyFilters() {
    const nameFilter = filterNameInput.value.toLowerCase().trim();
    const periodoFilter = filterPeriodoSelect.value.toLowerCase().trim();
    const liderFilter = filterLiderInput.value.toLowerCase().trim();
    const gapeFilter = filterGapeInput.value.toLowerCase().trim();

    filteredMembers = allMembersData.filter((member) => {
        const memberName = String(member.Nome || "").toLowerCase();
        const memberPeriodo = String(member.Periodo || "").toLowerCase();
        const memberLider = String(member.Lider || "").toLowerCase();
        const memberGape = String(member.GAPE || "").toLowerCase();

        const matchesName = nameFilter === "" || memberName.includes(nameFilter);
        const matchesPeriodo = periodoFilter === "" || memberPeriodo.includes(periodoFilter);
        const matchesLider = liderFilter === "" || memberLider.includes(liderFilter);
        const matchesGape = gapeFilter === "" || memberGape.includes(gapeFilter);

        return matchesName && matchesPeriodo && matchesLider && matchesGape;
    });

    displayMembers(filteredMembers); // Renderiza os membros filtrados
}

/**
 * Renderiza os cartões dos membros no container.
 * @param {Array} members - Array de objetos de membros a serem exibidos.
 */
function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");
    container.classList.remove("hidden"); // Garante que o container esteja visível
    container.innerHTML = ""; // Limpa o conteúdo anterior

    if (members.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-4 text-gray-500">Nenhum membro encontrado com os filtros aplicados.</div>`;
        return;
    }

    members.forEach((member, idx) => {
        const card = document.createElement("div");
        card.className = "fade-in-row bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative";
        card.style.animationDelay = `${idx * 0.04}s`; // Adiciona delay para animação em cascata
        card.innerHTML = `
            <div class="font-bold text-lg text-gray-800">${member.Nome || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>Período:</b> ${member.Periodo || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>Líder:</b> ${member.Lider || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>GAPE:</b> ${member.GAPE || "N/A"}</div>
            <label class="flex items-center gap-2 mt-2">
                <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox" data-member-name="${member.Nome}">
                <span class="text-sm text-gray-700">Presente</span>
            </label>
            <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300">Confirmar Presença</button>
            <div class="text-xs text-green-700 mt-1 hidden presence-info"></div>
        `;
        container.appendChild(card);

        const checkbox = card.querySelector(".presence-checkbox");
        const infoDiv = card.querySelector(".presence-info");
        const confirmBtn = card.querySelector(".btn-confirm-presence");

        // Event listener para o checkbox
        checkbox.addEventListener("change", function () {
            if (this.checked) {
                confirmBtn.classList.remove("hidden"); // Mostra o botão
            } else {
                confirmBtn.classList.add("hidden"); // Esconde o botão
                infoDiv.textContent = ""; // Limpa a mensagem de info
                infoDiv.classList.add("hidden"); // Esconde a div de info
                
                // Garante que o estado do botão e checkbox seja redefinido se desmarcar
                confirmBtn.disabled = false;
                checkbox.disabled = false;
                card.classList.remove('animate-pulse-green', 'animate-shake-red'); // Remove animações
            }
        });

        // Event listener para o botão de confirmar presença
        confirmBtn.addEventListener("click", async function () {
            const now = new Date();
            const dia = String(now.getDate()).padStart(2, "0");
            const mes = String(now.getMonth() + 1).padStart(2, "0");
            const ano = now.getFullYear();
            const hora = String(now.getHours()).padStart(2, "0");
            const min = String(now.getMinutes()).padStart(2, "0");
            const seg = String(now.getSeconds()).padStart(2, "0");
            const dataHora = `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;

            // Exibe mensagem de "Registrando..." no card
            infoDiv.textContent = `Registrando...`;
            infoDiv.classList.remove("hidden", "text-green-700", "text-red-600", "text-yellow-700"); 
            infoDiv.classList.add("text-blue-700"); // Cor azul para "registrando"
            
            // Desabilita o botão e o checkbox para evitar cliques múltiplos
            confirmBtn.disabled = true;
            checkbox.disabled = true;

            // Remove quaisquer animações anteriores para que possam ser re-aplicadas
            card.classList.remove('animate-pulse-green', 'animate-shake-red');

            try {
                const response = await fetch(`${BACKEND_URL}/presenca`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nome: member.Nome,
                        data: `${dia}/${mes}/${ano}`,
                        hora: `${hora}:${min}:${seg}`,
                        sheet: "PRESENCAS", // Nome da aba na planilha
                    }),
                });

                const responseData = await response.json();

                // Lógica de tratamento da resposta do backend
                if (response.ok) { // Se a requisição HTTP foi bem-sucedida (status 2xx)
                    if (responseData.message && responseData.message.includes("já foi registrada")) {
                        // Caso de sucesso (HTTP 200 OK) mas presença já existia para o dia
                        infoDiv.textContent = `Presença de ${member.Nome} já registrada hoje.`;
                        infoDiv.classList.remove("text-blue-700", "text-green-700");
                        infoDiv.classList.add("text-yellow-700"); // Cor de aviso para "já registrado"
                        showMessage(`Presença de ${member.Nome} já foi registrada hoje.`, "warning");
                        
                        // Animação de "chacoalhada" para indicar aviso/já existente
                        card.classList.add('animate-shake-red'); 
                        setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                        // Mantém desabilitado, pois a "ação" foi concluída (reconhecimento da presença)
                        // confirmBtn.disabled = true; // Já está desabilitado
                        // checkbox.disabled = true; // Já está desabilitado

                    } else if (responseData.success) { // Sucesso de registro de fato (primeira vez no dia)
                        infoDiv.textContent = `Presença marcada em ${dataHora}`;
                        infoDiv.classList.remove("text-blue-700", "text-yellow-700");
                        infoDiv.classList.add("text-green-700"); // Cor verde para sucesso
                        showMessage("Presença registrada com sucesso!", "success");
                        
                        // Animação de pulso verde para sucesso
                        card.classList.add('animate-pulse-green');
                        setTimeout(() => card.classList.remove('animate-pulse-green'), 1000);

                    } else { 
                        // response.ok é true, mas responseData.success é false ou não existe, 
                        // e não é a mensagem de "já registrada". Indica um erro lógico do backend.
                        infoDiv.textContent = `Erro: ${responseData.details || responseData.message || "Falha ao registrar"}`;
                        infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                        infoDiv.classList.add("text-red-600"); // Cor vermelha para erro
                        showMessage(`Erro ao registrar presença: ${responseData.details || responseData.message || "Erro desconhecido"}`, "error");
                        
                        // Animação de "chacoalhada" para erro
                        card.classList.add('animate-shake-red');
                        setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                        // Reabilita o botão e checkbox para nova tentativa em caso de erro lógico
                        confirmBtn.disabled = false;
                        checkbox.disabled = false;
                    }
                } else { // Erro HTTP (status 4xx, 5xx - problema de rede ou servidor)
                    infoDiv.textContent = `Erro: ${responseData.details || responseData.message || "Falha ao enviar para o servidor."}`;
                    infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                    infoDiv.classList.add("text-red-600"); // Cor vermelha para erro
                    showMessage(`Erro de rede ou servidor: ${responseData.details || responseData.message || "Erro desconhecido"} (HTTP ${response.status})`, "error");
                    
                    // Animação de "chacoalhada" para erro
                    card.classList.add('animate-shake-red');
                    setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                    // Reabilita o botão e checkbox para nova tentativa
                    confirmBtn.disabled = false;
                    checkbox.disabled = false;
                }
            } catch (e) {
                // Erro de conexão ou parsing do JSON
                console.error("Erro na requisição POST do frontend:", e);
                infoDiv.textContent = "Falha de conexão com o servidor.";
                infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                infoDiv.classList.add("text-red-600"); // Cor vermelha para erro
                showMessage("Falha ao enviar presença para o servidor. Verifique sua conexão.", "error");
                
                // Animação de "chacoalhada" para erro
                card.classList.add('animate-shake-red');
                setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                // Reabilita o botão e checkbox
                confirmBtn.disabled = false;
                checkbox.disabled = false;
            } finally {
                // Esconde o botão e desmarca o checkbox SEMPRE, 
                // mas o estado de 'disabled' para o checkbox/botão é controlado na lógica acima
                confirmBtn.classList.add("hidden"); 
                checkbox.checked = false; // Desmarca o checkbox visualmente
            }
        });
    });
}

/**
 * Preenche as opções dos seletores de filtro (Líder e GAPE) com base nos dados dos membros.
 */
function fillSelectOptions() {
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)),].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)),].sort();

    filterLiderInput.innerHTML = '<option value="">Todos</option>' + lideres.map((l) => `<option value="${l}">${l}</option>`).join("");
    filterGapeInput.innerHTML = '<option value="">Todos</option>' + gapes.map((g) => `<option value="${g}">${g}</option>`).join("");
}

/**
 * Limpa todos os campos de filtro e reaplica-os.
 */
function clearFilters() {
    showMessage("Limpando filtros...", "info");
    filterNameInput.value = "";
    filterPeriodoSelect.value = "";
    filterLiderInput.value = "";
    filterGapeInput.value = "";
    applyFilters();
}

/**
 * Aplica os filtros e exibe uma mensagem de "Aplicando filtros...".
 */
function applyFiltersWithMessage() {
    showMessage("Aplicando filtros...", "info");
    applyFilters();
}

/**
 * Busca e exibe o resumo do dashboard (total de presenças, etc.).
 */
async function fetchAndDisplaySummary() {
    showGlobalLoading(true, "Carregando resumo do dashboard...");
    try {
        const responseTotal = await fetch(`${BACKEND_URL}/get-presencas-total`);
        if (!responseTotal.ok) {
            throw new Error(`Erro ao buscar presenças totais: ${responseTotal.statusText}`);
        }
        const dataTotal = await responseTotal.json();

        const currentLiderFilter = filterLiderInput.value.toLowerCase().trim();
        const currentGapeFilter = filterGapeInput.value.toLowerCase().trim();

        // Filtra membros que correspondem aos filtros de Líder e GAPE para o resumo
        const membersMatchingLiderAndGape = allMembersData.filter(member => {
            const memberLider = String(member.Lider || "").toLowerCase();
            const memberGape = String(member.GAPE || "").toLowerCase();

            const matchesLider = currentLiderFilter === "" || memberLider.includes(currentLiderFilter);
            const matchesGape = currentGapeFilter === "" || memberGape.includes(currentGapeFilter);

            return matchesLider && matchesGape;
        }).map(member => member.Nome); // Pega apenas os nomes dos membros filtrados

        const filteredTotalCounts = {};
        let totalFilteredPresences = 0;

        // Itera sobre as presenças totais e filtra com base nos membros encontrados
        for (const memberName in dataTotal) {
            // Inclui o membro se não há filtros aplicados OU se o membro está na lista de membros filtrados
            if (membersMatchingLiderAndGape.includes(memberName) || (currentLiderFilter === "" && currentGapeFilter === "")) {
                filteredTotalCounts[memberName] = dataTotal[memberName];
                totalFilteredPresences += dataTotal[memberName];
            }
        }

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
        }

        if (totalCountsList) {
            totalCountsList.innerHTML = '';
            // Ordena as contagens de presença por valor decrescente
            const sortedCounts = Object.entries(filteredTotalCounts).sort(([, countA], [, countB]) => countB - countA);

            if (sortedCounts.length > 0) {
                sortedCounts.forEach(([name, count]) => {
                    const listItem = document.createElement('li');
                    listItem.className = "text-sm text-gray-100";
                    listItem.innerHTML = `<span class="font-semibold">${name}:</span> ${count} presenças`;
                    totalCountsList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.className = "text-sm text-gray-200 text-center";
                listItem.textContent = 'Nenhuma presença total registrada para os filtros aplicados.';
                totalCountsList.appendChild(listItem);
            }
        }

        // Pega períodos, líderes e gapes únicos dos membros ATUALMENTE FILTRADOS (filteredMembers)
        const uniquePeriods = [...new Set(filteredMembers.map(m => m.Periodo).filter(Boolean))];
        const uniqueLiders = [...new Set(filteredMembers.map(m => m.Lider).filter(Boolean))];
        const uniqueGapes = [...new Set(filteredMembers.map(m => m.GAPE).filter(Boolean))];

        if (dashboardPeriodo) {
            if (uniquePeriods.length === 0) {
                dashboardPeriodo.textContent = "N/A";
            } else if (uniquePeriods.length === 1) {
                dashboardPeriodo.textContent = uniquePeriods[0];
            } else {
                dashboardPeriodo.textContent = "Vários";
            }
        }

        if (dashboardLider) {
            if (uniqueLiders.length === 0) {
                dashboardLider.textContent = "N/A";
            } else if (uniqueLiders.length === 1) {
                dashboardLider.textContent = uniqueLiders[0];
            } else {
                dashboardLider.textContent = "Vários";
            }
        }

        if (dashboardGape) {
            if (uniqueGapes.length === 0) {
                dashboardGape.textContent = "N/A";
            } else if (uniqueGapes.length === 1) {
                dashboardGape.textContent = uniqueGapes[0];
            } else {
                dashboardGape.textContent = "Vários";
            }
        }
        // showMessage("Resumo carregado com sucesso!", "success"); // Comentado para evitar mensagem extra

    } catch (error) {
        console.error("Erro ao carregar o resumo:", error);
        showMessage(`Erro ao carregar o resumo: ${error.message}`, "error");
    } finally {
        showGlobalLoading(false); // Oculta o loading global
    }
}

/**
 * Alterna a visibilidade do container do dashboard.
 */
function toggleDashboardVisibility() {
    const isDashboardVisible = dashboardContainer.classList.contains("max-h-screen");

    if (isDashboardVisible) {
        // Oculta o dashboard
        dashboardContainer.classList.remove("max-h-screen", "opacity-100");
        dashboardContainer.classList.add("max-h-0", "opacity-0");
        dashboardOpenIcon.classList.remove("hidden");
        dashboardOpenText.classList.remove("hidden");
        dashboardCloseIcon.classList.add("hidden");
        dashboardCloseText.classList.add("hidden");
    } else {
        // Exibe o dashboard e busca os dados de resumo
        fetchAndDisplaySummary(); // Busca dados do resumo ao abrir
        dashboardContainer.classList.remove("max-h-0", "opacity-0");
        dashboardContainer.classList.add("max-h-screen", "opacity-100");
        dashboardOpenIcon.classList.add("hidden");
        dashboardOpenText.classList.add("hidden");
        dashboardCloseIcon.classList.remove("hidden");
        dashboardCloseText.classList.remove("hidden");
    }
}

// --- Event Listeners ---
applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
clearFiltersBtn.addEventListener("click", clearFilters);

// Event listeners para aplicar filtros ao digitar ou selecionar
filterNameInput.addEventListener("input", applyFilters);
filterPeriodoSelect.addEventListener("change", applyFilters);
filterLiderInput.addEventListener("change", applyFilters);
filterGapeInput.addEventListener("change", applyFilters);

// Event listener para o botão de alternar o dashboard
if (toggleDashboardBtn) {
    toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
}

// Carrega os membros quando a página é completamente carregada
window.addEventListener("load", fetchMembers);
