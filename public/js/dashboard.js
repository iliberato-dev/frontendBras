// ------------------------------------------------------
// Frontend (js/dashboard.js) - Versão Final com Informações de Relatório no PDF
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Variável para armazenar todas as últimas presenças
let myChart = null; // Variável para armazenar a instância do Chart.js (Pizza)
let myBarChart = null; // Variável para armazenar a instância do Chart.js (Barras)
let calendar = null; // Variável para armazenar a instância do FullCalendar

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

// Referência ao elemento onde o nome do líder será exibido
const loggedInLeaderNameElement = document.getElementById("loggedInLeaderName");

// Elementos do novo modal de resumo detalhado
const detailedSummaryModal = document.getElementById("detailedSummaryModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const summaryChartCanvas = document.getElementById("summaryChart"); // Canvas para o gráfico de Pizza
const summaryBarChartCanvas = document.getElementById("summaryBarChart"); // Canvas para o gráfico de Barras
const detailedSummaryText = document.getElementById("detailedSummaryText");
const showDetailedSummaryBtn = document.getElementById("showDetailedSummaryBtn");
const detailedSummaryContent = document.getElementById("detailedSummaryContent"); // Referência ao conteúdo do modal para PDF

// Novos elementos de filtro dentro do modal
const summaryStartDateInput = document.getElementById("summaryStartDate");
const summaryEndDateInput = document.getElementById("summaryEndDate");
const summaryMemberSelect = document.getElementById("summaryMemberSelect");
// const applySummaryFiltersBtn = document.getElementById("applySummaryFiltersBtn"); // Este botão não estava no seu HTML, comentei.

// Botão de Download PDF
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// Elemento para exibir informações do relatório no PDF
const reportInfo = document.getElementById("reportInfo");

// Elemento da seção de filtros dentro do modal de resumo
const summaryFilterSection = document.getElementById("summaryFilterSection");

// Contêiner do calendário
const calendarContainer = document.getElementById("calendar");


// NOVO: Botão Trocar Usuário
const changeUserBtn = document.getElementById("changeUserBtn");

// !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
// Deve ser a mesma URL definida na variável de ambiente FRONTEND_URL no seu backend Render
const BACKEND_URL = 'https://backendbras.onrender.com';

// --- NOVA VARIÁVEL DE CONTROLE DE ESTADO DO DASHBOARD ---
let isDashboardOpen = false;

/**
 * Exibe ou oculta o indicador de carregamento global.
 * @param {boolean} show - Se true, mostra o indicador; se false, oculta.
 * @param {string} message - Mensagem a ser exibida no indicador.
 */
function showGlobalLoading(show, message = "Carregando...") {
    if (globalLoadingIndicator && loadingMessageSpan) {
        loadingMessageSpan.textContent = message;
        if (show) {
            globalLoadingIndicator.style.display = "flex";
            setTimeout(() => {
                globalLoadingIndicator.classList.add("show");
            }, 10);
        } else {
            globalLoadingIndicator.classList.remove("show");
            setTimeout(() => {
                globalLoadingIndicator.style.display = "none";
            }, 300);
        }
    }
}

/**
 * Exibe uma mensagem temporária na área de mensagens.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo da mensagem ('info', 'success', 'warning', 'error').
 */
function showMessage(message, type = "info") {
    // Adiciona verificação para garantir que messageArea não é nulo
    if (!messageArea) {
        console.error("Erro: Elemento 'messageArea' não encontrado no DOM. Não foi possível exibir a mensagem:", message);
        return; // Sai da função para evitar o TypeError
    }

    // Evita mostrar mensagens de "Carregando..." na área de mensagem principal
    if (message.includes("Carregando dados dos membros...") ||
        message.includes("Carregando resumo do dashboard...") ||
        message.includes("Registrando presença para ") || // Adicionado para evitar poluição durante o registro
        !message.trim()) { // Adicionado para não mostrar mensagens vazias
        return;
    }

    messageArea.textContent = message;
    messageArea.className = "message-box show";

    // Remove todas as classes de tipo antes de adicionar a nova
    messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800", "bg-yellow-100", "text-yellow-800", "bg-red-100", "text-red-800", "bg-green-100", "text-green-800");

    if (type === "success") {
        messageArea.classList.add("message-success", "bg-green-100", "text-green-800");
    } else if (type === "error") {
        messageArea.classList.add("message-error", "bg-red-100", "text-red-800");
    } else if (type === "warning") {
        messageArea.classList.add("bg-yellow-100", "text-yellow-800");
    } else { // Default to info
        messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    setTimeout(() => {
        messageArea.classList.remove("show");
        // Dá um pequeno atraso para a transição de fade-out antes de ocultar totalmente
        setTimeout(() => messageArea.classList.add("hidden"), 500);
    }, 4000);
}

/**
 * Busca os dados dos membros e todas as últimas presenças do backend.
 */
async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");
    
    // Adiciona verificação para garantir que membersCardsContainer não é nulo
    if (!membersCardsContainer) {
        console.error("Erro: Elemento 'membersCardsContainer' não encontrado no DOM. Verifique seu HTML.");
        showMessage("Erro: Contêiner de membros não encontrado. Verifique a estrutura da página.", "error");
        showGlobalLoading(false);
        return; // Sai da função para evitar o TypeError
    }

    membersCardsContainer.innerHTML = `
        <div class="col-span-full flex flex-col justify-center items-center py-8 gap-3">
            <svg class="animate-spin h-8 w-8 text-blue-700 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-blue-700 text-lg font-semibold animate-pulse">Carregando membros...</span>
        </div>
    `;

    try {
        // Busca membros e últimas presenças em paralelo para maior eficiência
        const [membersResponse, presencesResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/get-membros`),
            fetch(`${BACKEND_URL}/get-all-last-presences`)
        ]);

        if (!membersResponse.ok) {
            throw new Error(`Erro HTTP ao carregar membros: ${membersResponse.status} - ${membersResponse.statusText}`);
        }
        if (!presencesResponse.ok) {
            throw new Error(`Erro HTTP ao carregar últimas presenças: ${presencesResponse.status} - ${presencesResponse.statusText}`);
        }

        const membersData = await membersResponse.json();
        allMembersData = membersData.membros || membersData.data || [];

        const lastPresencesRawData = await presencesResponse.json();
        lastPresencesData = lastPresencesRawData.data || lastPresencesRawData || {}; // Ajustado para pegar dados diretamente

        if (allMembersData.length === 0) {
            showMessage("Nenhum membro encontrado ou dados vazios.", "info");
        }

        fillSelectOptions();
        applyFilters(); // Aplica os filtros e exibe os cards
        if (isDashboardOpen) {
            fetchAndDisplaySummary(); // Atualiza o dashboard se estiver aberto
        }
    } catch (error) {
        console.error("Erro ao carregar membros ou presenças:", error);
        showMessage(`Erro ao carregar dados: ${error.message}`, "error");
        // Verifica novamente antes de tentar definir innerHTML em caso de erro
        if (membersCardsContainer) {
            membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-red-600">Falha ao carregar dados. Verifique o console.</div>`;
        }
    } finally {
        showGlobalLoading(false);
        setupLeaderView(); // Chama a função para configurar a visualização do líder
    }
}

/**
 * Aplica os filtros selecionados aos membros e atualiza a exibição dos cards.
 */
function applyFilters() {
    const nameFilter = filterNameInput ? filterNameInput.value.toLowerCase().trim() : '';
    const periodoFilter = filterPeriodoSelect ? filterPeriodoSelect.value.toLowerCase().trim() : '';
    const liderFilter = filterLiderInput ? filterLiderInput.value.toLowerCase().trim() : '';
    const gapeFilter = filterGapeInput ? filterGapeInput.value.toLowerCase().trim() : '';

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

    displayMembers(filteredMembers);
    // IMPORTANTE: Não chame fetchAndDisplaySummary aqui, ele já será chamado pelos event listeners
    // ou pela função applyFiltersWithMessage/clearFilters. Evita chamadas duplicadas.
}

/**
 * Exibe os cards dos membros no contêiner.
 * @param {Array<Object>} members - A lista de membros a serem exibidos.
 */
function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");
    
    // Adiciona verificação para garantir que o contêiner existe
    if (!container) {
        console.error("Erro: Elemento 'membersCardsContainer' não encontrado no DOM para exibição de cards.");
        return; // Sai da função
    }

    container.classList.remove("hidden");
    container.innerHTML = "";

    if (members.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-4 text-gray-500">Nenhum membro encontrado com os filtros aplicados.</div>`;
        return;
    }

    members.forEach((member, idx) => {
        const card = document.createElement("div");
        card.className = "fade-in-row bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative";
        card.style.animationDelay = `${idx * 0.04}s`;
        card.innerHTML = `
            <div class="font-bold text-lg text-gray-800">${member.Nome || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>Período:</b> ${member.Periodo || "N/A"}
                ${member.Periodo && member.Periodo.toLowerCase() === 'manhã' ? '<i class="fas fa-sun ml-1 text-yellow-500"></i>' : ''}
                ${member.Periodo && member.Periodo.toLowerCase() === 'tarde' ? '<i class="fas fa-cloud-sun ml-1 text-orange-500"></i>' : ''}
                ${member.Periodo && member.Periodo.toLowerCase() === 'noite' ? '<i class="fas fa-moon ml-1 text-gray-700"></i>' : ''}
            </div>
            <div class="text-sm text-gray-600"><b>Líder:</b> ${member.Lider || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>GAPE:</b> ${member.GAPE || "N/A"}</div>
            <label class="flex items-center gap-2 mt-2">
                <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox" data-member-name="${member.Nome}">
                <span class="text-sm text-gray-700">Presente</span>
            </label>
            <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300">Confirmar Presença</button>
            <div class="text-xs text-gray-500 mt-1 hidden presence-info"></div>
        `;
        container.appendChild(card);

        const checkbox = card.querySelector(".presence-checkbox");
        const infoDiv = card.querySelector(".presence-info");
        const confirmBtn = card.querySelector(".btn-confirm-presence");

        const updatePresenceStatus = () => {
            if (!infoDiv) return; // Add null check for infoDiv
            infoDiv.classList.remove("text-green-700", "text-red-600", "text-yellow-700", "text-blue-700", "text-gray-500");
            infoDiv.classList.add("block");

            const presence = lastPresencesData?.[member.Nome]; // Use optional chaining
            if (presence && presence.data && presence.hora) {
                infoDiv.textContent = `Últ. presença: ${presence.data} às ${presence.hora}`;
                infoDiv.classList.add("text-green-700");
            } else {
                infoDiv.textContent = `Nenhuma presença registrada ainda.`;
                infoDiv.classList.add("text-gray-500");
            }
            infoDiv.classList.remove("hidden");
        };

        updatePresenceStatus();

        checkbox.addEventListener("change", function () {
            if (!confirmBtn || !infoDiv) return; // Add null checks
            if (this.checked) {
                confirmBtn.classList.remove("hidden");
                infoDiv.textContent = "Clique em confirmar para registrar.";
                infoDiv.classList.remove("hidden", "text-green-700", "text-red-600", "text-yellow-700");
                infoDiv.classList.add("text-gray-500");
            } else {
                confirmBtn.classList.add("hidden");
                updatePresenceStatus();

                confirmBtn.disabled = false;
                checkbox.disabled = false;
                if (card) card.classList.remove('animate-pulse-green', 'animate-shake-red');
            }
        });

        confirmBtn.addEventListener("click", async function () {
            if (!infoDiv || !confirmBtn || !checkbox || !card) return; // Add null checks

            const now = new Date();
            const dia = String(now.getDate()).padStart(2, "0");
            const mes = String(now.getMonth() + 1).padStart(2, "0");
            const ano = now.getFullYear();
            const hora = String(now.getHours()).padStart(2, "0");
            const min = String(now.getMinutes()).padStart(2, "0");
            const seg = String(now.getSeconds()).padStart(2, "0");

            infoDiv.textContent = `Registrando presença para ${member.Nome}...`;
            infoDiv.classList.remove("hidden", "text-green-700", "text-red-600", "text-yellow-700", "text-gray-500");
            infoDiv.classList.add("text-blue-700");

            confirmBtn.disabled = true;
            checkbox.disabled = true;

            card.classList.remove('animate-pulse-green', 'animate-shake-red');

            try {
                const response = await fetch(`${BACKEND_URL}/presenca`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nome: member.Nome,
                        data: `${dia}/${mes}/${ano}`,
                        hora: `${hora}:${min}:${seg}`, // Corrigido para min:seg
                        sheet: "PRESENCAS",
                    }),
                });

                const responseData = await response.json();

                if (response.ok && responseData.success === true) {
                    infoDiv.textContent = `Presença de ${member.Nome} registrada com sucesso em ${responseData.lastPresence?.data || `${dia}/${mes}/${ano}`} às ${responseData.lastPresence?.hora || `${hora}:${min}:${seg}`}.`;
                    infoDiv.classList.remove("text-blue-700", "text-yellow-700");
                    infoDiv.classList.add("text-green-700");
                    showMessage("Presença registrada com sucesso!", "success");

                    card.classList.add('animate-pulse-green');
                    setTimeout(() => card.classList.remove('animate-pulse-green'), 1000);

                    lastPresencesData?.[member.Nome] = responseData.lastPresence || { data: `${dia}/${mes}/${ano}`, hora: `${hora}:${min}:${seg}` }; // Use optional chaining
                    updatePresenceStatus();
                    if (isDashboardOpen) { // Atualiza o dashboard após registrar uma presença
                        fetchAndDisplaySummary();
                    }

                } else if (responseData.success === false && responseData.message && responseData.message.includes("já foi registrada")) {
                    infoDiv.textContent = `Presença de ${member.Nome} já registrada hoje.`;
                    infoDiv.classList.remove("text-blue-700", "text-green-700");
                    infoDiv.classList.add("text-yellow-700");
                    showMessage(`Presença de ${member.Nome} já foi registrada hoje.`, "warning");

                    card.classList.add('animate-shake-red');
                    setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                    if (responseData.lastPresence) {
                        lastPresencesData?.[member.Nome] = responseData.lastPresence; // Use optional chaining
                    }
                    updatePresenceStatus();
                } else {
                    infoDiv.textContent = `Erro: ${responseData.message || "Falha ao registrar"}`;
                    infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                    infoDiv.classList.add("text-red-600");
                    showMessage(`Erro ao registrar presença: ${responseData.message || "Erro desconhecido"}`, "error");

                    card.classList.add('animate-shake-red');
                    setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                    confirmBtn.disabled = false;
                    checkbox.disabled = false;
                }
            } catch (e) {
                console.error("Erro na requisição POST do frontend:", e);
                infoDiv.textContent = "Falha de conexão com o servidor.";
                infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                infoDiv.classList.add("text-red-600");
                showMessage("Falha ao enviar presença para o servidor. Verifique sua conexão.", "error");

                card.classList.add('animate-shake-red');
                setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                confirmBtn.disabled = false;
                checkbox.disabled = false;
            } finally {
                confirmBtn.classList.add("hidden");
                checkbox.checked = false;
            }
        });
    });
}

/**
 * Preenche as opções dos selects de filtro de Líder e GAPE.
 */
function fillSelectOptions() {
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)),].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)),].sort();

    // Adiciona verificação para garantir que filterLiderInput e filterGapeInput não são nulos
    if (filterLiderInput) {
        filterLiderInput.innerHTML = '<option value="">Todos</option>' + lideres.map((l) => `<option value="${l}">${l}</option>`).join("");
    } else {
        console.warn("Elemento 'filterLiderInput' não encontrado no DOM.");
    }
    
    if (filterGapeInput) {
        filterGapeInput.innerHTML = '<option value="">Todos</option>' + gapes.map((g) => `<option value="${g}">${g}</option>`).join("");
    } else {
        console.warn("Elemento 'filterGapeInput' não encontrado no DOM.");
    }
}

/**
 * Limpa todos os filtros e aplica a exibição padrão.
 */
function clearFilters() {
    showMessage("Limpando filtros...", "info");
    if (filterNameInput) filterNameInput.value = "";
    if (filterPeriodoSelect) filterPeriodoSelect.value = "";
    if (filterLiderInput) filterLiderInput.value = "";
    if (filterGapeInput) filterGapeInput.value = "";
    applyFilters();
    // Atualiza o resumo do dashboard após limpar os filtros
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

/**
 * Aplica os filtros e exibe uma mensagem de feedback.
 */
function applyFiltersWithMessage() {
    showMessage("Aplicando filtros...", "info");
    applyFilters();
    // Atualiza o resumo do dashboard após aplicar os filtros
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

/**
 * Alterna a visibilidade do dashboard.
 */
function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;

    if (dashboardContainer) {
        if (isDashboardOpen) {
            dashboardContainer.classList.remove('max-h-0', 'opacity-0', 'overflow-hidden');
            dashboardContainer.classList.add('max-h-screen');

            if (dashboardOpenIcon) dashboardOpenIcon.classList.add('hidden');
            if (dashboardCloseIcon) dashboardCloseIcon.classList.remove('hidden');
            if (dashboardOpenText) dashboardOpenText.classList.add('hidden');
            if (dashboardCloseText) dashboardCloseText.classList.remove('hidden');

            console.log("Dashboard: Abrindo. Buscando resumo...");
            fetchAndDisplaySummary();
        } else {
            dashboardContainer.classList.remove('max-h-screen');
            dashboardContainer.classList.add('max-h-0', 'opacity-0', 'overflow-hidden');

            if (dashboardOpenIcon) dashboardOpenIcon.classList.remove('hidden');
            if (dashboardCloseIcon) dashboardCloseIcon.classList.add('hidden');
            if (dashboardOpenText) dashboardOpenText.classList.remove('hidden');
            if (dashboardCloseText) dashboardCloseText.classList.add('hidden');

            console.log("Dashboard: Fechando.");
        }
    } else {
        console.error("Elemento 'dashboardContainer' não encontrado no DOM.");
    }
}

/**
 * Busca e exibe o resumo das presenças totais no dashboard.
 */
async function fetchAndDisplaySummary() {
    showGlobalLoading(true, "Carregando resumo do dashboard...");
    try {
        const periodoFilter = filterPeriodoSelect ? filterPeriodoSelect.value.trim() : '';
        const liderFilter = filterLiderInput ? filterLiderInput.value.trim() : '';
        const gapeFilter = filterGapeInput ? filterGapeInput.value.trim() : '';

        // Constrói a URL com os parâmetros de consulta (query parameters)
        // Apenas inclui o parâmetro se o valor do filtro não for vazio
        const queryParams = new URLSearchParams();
        if (periodoFilter) queryParams.append('periodo', periodoFilter);
        if (liderFilter) queryParams.append('lider', liderFilter);
        if (gapeFilter) queryParams.append('gape', gapeFilter);

        const url = `${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`;
        console.log("URL da API para resumo do dashboard:", url); // Para depuração

        const responseTotal = await fetch(url);
        if (!responseTotal.ok) {
            throw new Error(`Erro ao buscar presenças totais: ${responseTotal.statusText}`);
        }
        const rawDataTotal = await responseTotal.json();
        
        // DEBUG: Logs para rastrear o valor de rawDataTotal e dataTotal
        console.log("DEBUG: rawDataTotal APÓS .json():", rawDataTotal);
        const dataTotal = rawDataTotal; // Mantido como rawDataTotal diretamente, sem || {}
        console.log("DEBUG: dataTotal APÓS atribuição:", dataTotal);

        const filteredTotalCounts = dataTotal; // O backend já enviará os dados filtrados
        let totalFilteredPresences = Object.values(dataTotal).reduce((sum, count) => sum + count, 0);
        console.log("DEBUG: totalFilteredPresences calculado:", totalFilteredPresences); // Novo log

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
        } else {
            console.warn("Elemento 'dashboardPresencasMes' não encontrado.");
        }

        if (totalCountsList) {
            totalCountsList.innerHTML = '';
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
        } else {
            console.warn("Elemento 'totalCountsList' não encontrado.");
        }

        // Os campos do dashboard (Periodo, Lider, GAPE) devem refletir os filtros ATUAIS
        // do formulário, e não serem derivados dos membros filtrados da lista.
        // Isso porque a lista de membros já está filtrada por TODOS os campos,
        // mas o resumo de presenças totais só será filtrado por Periodo, Lider, GAPE (se o backend aceitar).
        if (dashboardPeriodo) dashboardPeriodo.textContent = periodoFilter || "Todos";
        if (dashboardLider) dashboardLider.textContent = liderFilter || "Todos";
        if (dashboardGape) dashboardGape.textContent = gapeFilter || "Todos";


    } catch (error) {
        console.error("Erro ao carregar o resumo:", error);
        showMessage(`Erro ao carregar o resumo: ${error.message}`, "error");
        // Limpar os campos do dashboard em caso de erro
        if (dashboardPresencasMes) dashboardPresencasMes.textContent = "Erro";
        if (dashboardPeriodo) dashboardPeriodo.textContent = "Erro";
        if (dashboardLider) dashboardLider.textContent = "Erro";
        if (dashboardGape) dashboardGape.textContent = "Erro";
        if (totalCountsList) totalCountsList.innerHTML = `<li class="text-sm text-red-300 text-center">Falha ao carregar o resumo.</li>`;
    } finally {
        showGlobalLoading(false);
    }
}

/**
 * Exibe o resumo detalhado em um modal, incluindo um gráfico de pizza.
 */
function showDetailedSummary() {
    if (!detailedSummaryModal) {
        console.error("Elemento detailedSummaryModal não encontrado.");
        showMessage("Erro: Elemento de modal de resumo detalhado não encontrado.", "error");
        return;
    }

    // Popula o select de membros dentro do modal
    populateSummaryMemberSelect();

    // Define o intervalo de datas padrão para o mês atual
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formata as datas para AAAA-MM-DD para input type="date"
    if (summaryStartDateInput) summaryStartDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    if (summaryEndDateInput) summaryEndDateInput.value = lastDayOfMonth.toISOString().split('T')[0];

    // Recalcula e renderiza o gráfico e o calendário quando o modal é aberto ou filtros aplicados
    updateDetailedSummaryChart();

    // Exibe o modal
    detailedSummaryModal.classList.remove("hidden");
    detailedSummaryModal.classList.add("flex"); // Usa flex para centralizar
}

/**
 * Popula o select de membros dentro do modal de resumo detalhado.
 */
function populateSummaryMemberSelect() {
    // Adiciona verificação para garantir que summaryMemberSelect não é nulo
    if (!summaryMemberSelect) {
        console.error("Erro: Elemento 'summaryMemberSelect' não encontrado no DOM.");
        return; // Sai da função
    }

    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    // Usa filteredMembers como base para o select de membros do resumo
    const membersForSummarySelect = [...new Set(filteredMembers.map(m => m.Nome).filter(Boolean))].sort();
    membersForSummarySelect.forEach(memberName => {
        const option = document.createElement('option');
        option.value = memberName;
        option.textContent = memberName;
        summaryMemberSelect.appendChild(option);
    });
}

/**
 * Atualiza os gráficos e o texto do resumo detalhado com base nos filtros do modal.
 */
async function updateDetailedSummaryChart() {
    showGlobalLoading(true, "Gerando resumo detalhado...");

    let membersToAnalyze = filteredMembers;
    const selectedMemberName = summaryMemberSelect ? summaryMemberSelect.value.trim() : '';
    let summaryTitle = "Estatísticas do Grupo Filtrado";
    let reportEntityName = "o grupo filtrado";
    let reportLeader = "N/A";
    let reportGape = "N/A";

    // Pega as datas dos inputs do modal
    const startDate = summaryStartDateInput ? summaryStartDateInput.value : '';
    const endDate = summaryEndDateInput ? summaryEndDateInput.value : '';

    if (selectedMemberName !== "") {
        membersToAnalyze = filteredMembers.filter(member => String(member.Nome || '').trim() === selectedMemberName);
        summaryTitle = `Estatísticas para o Membro: ${selectedMemberName}`;
        reportEntityName = selectedMemberName;
        if (membersToAnalyze.length > 0) {
            reportLeader = membersToAnalyze[0].Lider || "N/A";
            reportGape = membersToAnalyze[0].GAPE || "N/A";
        }
        if (membersToAnalyze.length === 0) {
            if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-lg font-semibold text-gray-800 mb-2">Nenhum dado para o membro selecionado com os filtros atuais.</p>`;
            if (myChart) myChart.destroy();
            if (myBarChart) myBarChart.destroy(); // Destrói o gráfico de barras também
            if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Nenhum dado de membro encontrado para o relatório.</p>`;
            // Destrói o calendário se não houver dados
            if (calendar) {
                calendar.destroy();
                calendar = null;
            }
            showGlobalLoading(false);
            return;
        }
    } else {
        // Para o caso de "Todos os Membros Filtrados"
        const currentLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : 'Todos';
        const currentGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : 'Todos';
        
        reportLeader = currentLiderFilter !== "" ? currentLiderFilter : "Todos";
        reportGape = currentGapeFilter !== "" ? currentGapeFilter : "Todos";

        if (reportLeader !== "Todos" && reportGape !== "Todos") {
            reportEntityName = `o grupo do líder ${reportLeader} e GAPE ${reportGape}`;
        } else if (reportLeader !== "Todos") {
            reportEntityName = `o grupo do líder ${reportLeader}`;
        } else if (reportGape !== "Todos") {
            reportEntityName = `o grupo GAPE ${reportGape}`;
        } else {
            reportEntityName = `o grupo filtrado`;
        }
    }

    try {
        const queryParams = new URLSearchParams();
        // Adiciona filtros de período e GAPE do formulário principal
        const mainPeriodoFilter = filterPeriodoSelect ? filterPeriodoSelect.value.trim() : '';
        const mainLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : '';
        const mainGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : '';

        if (mainPeriodoFilter) queryParams.append('periodo', mainPeriodoFilter);
        if (mainLiderFilter) queryParams.append('lider', mainLiderFilter);
        if (mainGapeFilter) queryParams.append('gape', mainGapeFilter);

        // Adiciona filtros de data e membro específico do modal
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (selectedMemberName) queryParams.append('memberName', selectedMemberName);
        else {
            // Se "Todos os Membros Filtrados" estiver selecionado no modal,
            // precisamos enviar os nomes dos membros atualmente filtrados na lista principal.
            // Isso garante que o resumo "Todos os Membros Filtrados" respeite os filtros de nome, período, líder e GAPE aplicados na tela principal.
            const filteredMemberNames = filteredMembers.map(m => m.Nome);
            if (filteredMemberNames.length > 0) {
                queryParams.append('filteredMemberNames', JSON.stringify(filteredMemberNames));
            }
        }


        const url = `${BACKEND_URL}/get-detailed-presences?${queryParams.toString()}`;
        console.log("URL da API para resumo detalhado:", url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ao buscar presenças detalhadas: ${response.statusText}`);
        }
        const detailedData = await response.json();

        // Processa os dados para o gráfico de pizza (presenças vs. faltas)
        let totalPresencesCount = 0;
        let membersWithPresences = new Set();
        let allFilteredMembersNames = new Set(filteredMembers.map(m => m.Nome));
        let membersPresentInPeriod = new Set();
        let presencesByMember = {};
        let datesWithPresences = new Set();

        // Inicializa contadores para todos os membros filtrados para o período
        membersToAnalyze.forEach(member => {
            presencesByMember[member.Nome] = 0;
        });

        detailedData.forEach(p => {
            if (membersToAnalyze.some(m => m.Nome === p.Nome)) { // Garante que a presença é para um membro que estamos analisando
                totalPresencesCount++;
                membersPresentInPeriod.add(p.Nome);
                presencesByMember[p.Nome]++;
                datesWithPresences.add(p.Data); // Adiciona a data para o calendário
            }
        });

        const totalExpectedPresences = membersToAnalyze.length; // Quantidade de membros filtrados
        const totalAbsentCount = totalExpectedPresences - membersPresentInPeriod.size; // Membros que não apareceram no período

        let dataForPieChart = [membersPresentInPeriod.size, totalAbsentCount];
        let labelsForPieChart = ['Membros Presentes (ao menos 1x)', 'Membros Ausentes (no período)'];
        let colorsForPieChart = ['#4CAF50', '#F44336']; // Verde para presente, Vermelho para ausente

        if (selectedMemberName) {
            // Se for um membro específico, o gráfico de pizza deve mostrar o total de presenças vs. o total de dias no período
            const date1 = new Date(startDate);
            const date2 = new Date(endDate);
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final

            dataForPieChart = [totalPresencesCount, diffDays - totalPresencesCount];
            labelsForPieChart = ['Presenças Registradas', 'Dias Sem Presença'];
            colorsForPieChart = ['#2196F3', '#FFC107']; // Azul para presenças, Amarelo para dias sem presença
        } else if (membersPresentInPeriod.size === 0 && totalExpectedPresences === 0) {
             // Caso não haja membros no filtro principal, nem no modal, mostra um gráfico "vazio"
             dataForPieChart = [1];
             labelsForPieChart = ["Nenhum Membro para Análise"];
             colorsForPieChart = ["#9E9E9E"]; // Cinza
        } else if (membersPresentInPeriod.size === 0 && totalExpectedPresences > 0) {
            // Caso existam membros mas nenhum presente
            dataForPieChart = [0, totalExpectedPresences];
            labelsForPieChart = ['Membros Presentes (ao menos 1x)', 'Membros Ausentes (no período)'];
            colorsForPieChart = ['#4CAF50', '#F44336'];
        }

        renderPieChart(labelsForPieChart, dataForPieChart, colorsForPieChart);

        // Renderiza o gráfico de barras (Top 5 Membros com Mais Presenças)
        renderBarChart(presencesByMember);

        // Atualiza o texto do resumo
        updateSummaryText(totalPresencesCount, membersPresentInPeriod.size, totalExpectedMembers, selectedMemberName, presencesByMember);

        // Atualiza as informações do relatório (para PDF)
        updateReportInfo(summaryTitle, reportEntityName, reportLeader, reportGape, startDate, endDate);

        // Renderiza o calendário
        renderCalendar(detailedData, datesWithPresences);

    } catch (error) {
        console.error("Erro ao carregar o resumo detalhado:", error);
        showMessage(`Erro ao carregar o resumo detalhado: ${error.message}`, "error");
        if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-red-600">Falha ao carregar o resumo detalhado. ${error.message}</p>`;
        if (myChart) myChart.destroy();
        myChart = null;
        if (myBarChart) myBarChart.destroy();
        myBarChart = null;
        if (calendar) calendar.destroy();
        calendar = null;
        if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Falha ao carregar informações do relatório.</p>`;
    } finally {
        showGlobalLoading(false);
    }
}


/**
 * Renderiza o gráfico de pizza de presenças.
 * @param {Array<string>} labels - Rótulos para o gráfico.
 * @param {Array<number>} data - Dados para o gráfico.
 * @param {Array<string>} colors - Cores para as fatias.
 */
function renderPieChart(labels, data, colors) {
    if (myChart) {
        myChart.destroy(); // Destrói a instância anterior do gráfico
    }
    if (!summaryChartCanvas) {
        console.error("Canvas para o gráfico de pizza (summaryChart) não encontrado.");
        return;
    }
    const ctx = summaryChartCanvas.getContext('2d');
    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#333'
                    }
                },
                title: {
                    display: true,
                    text: 'Resumo de Presenças',
                    font: {
                        size: 16
                    },
                    color: '#333'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed;
                            }
                            return label;
                        }
                    }
                },
                datalabels: { // Configuração do plugin datalabels
                    color: '#fff',
                    formatter: (value, context) => {
                        const total = context.chart.data.datasets[0].data.reduce((sum, current) => sum + current, 0);
                        if (total === 0) return '0%'; // Evita divisão por zero
                        const percentage = ((value / total) * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    font: {
                        weight: 'bold'
                    },
                    display: function(context) {
                        return context.dataset.data[context.dataIndex] > 0; // Mostra o rótulo apenas se o valor for maior que 0
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Habilita o plugin datalabels
    });
}

/**
 * Renderiza o gráfico de barras horizontais para as presenças por membro.
 * @param {object} presencesByMember - Objeto com contagem de presenças por membro.
 */
function renderBarChart(presencesByMember) {
    if (myBarChart) {
        myBarChart.destroy(); // Destrói a instância anterior do gráfico
    }
    if (!summaryBarChartCanvas) {
        console.error("Canvas para o gráfico de barras (summaryBarChart) não encontrado.");
        return;
    }
    const ctx = summaryBarChartCanvas.getContext('2d');

    const sortedMembers = Object.entries(presencesByMember)
        .sort(([, countA], [, countB]) => countB - countA)
        .filter(([, count]) => count > 0) // Filtra membros com 0 presenças
        .slice(0, 5); // Pega apenas os 5 primeiros (Top 5)

    const labels = sortedMembers.map(([name]) => name);
    const data = sortedMembers.map(([, count]) => count);

    myBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Presenças',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Torna o gráfico horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Oculta a legenda, pois só há um dataset
                },
                title: {
                    display: true,
                    text: 'Top 5 Membros (Mais Presenças)',
                    font: {
                        size: 16
                    },
                    color: '#333'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.x} presenças`;
                        }
                    }
                },
                datalabels: {
                    color: '#333',
                    anchor: 'end',
                    align: 'start',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold'
                    },
                    display: function(context) {
                        return context.dataset.data[context.dataIndex] > 0;
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total de Presenças',
                        color: '#333'
                    },
                    ticks: {
                        color: '#333'
                    }
                },
                y: {
                    ticks: {
                        color: '#333'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


/**
 * Atualiza o texto descritivo do resumo detalhado.
 * @param {number} totalPresencesCount - O número total de presenças registradas.
 * @param {number} membersPresentInPeriod - O número de membros que tiveram ao menos uma presença.
 * @param {number} totalExpectedMembers - O número total de membros esperados (filtrados na tela principal).
 * @param {string} selectedMemberName - O nome do membro selecionado, se houver.
 * @param {object} presencesByMember - Objeto com contagem de presenças por membro.
 */
function updateSummaryText(totalPresencesCount, membersPresentInPeriod, totalExpectedMembers, selectedMemberName, presencesByMember) {
    if (!detailedSummaryText) return;

    let text = `<h3 class="text-xl font-semibold text-gray-800 mb-3">Detalhes do Período:</h3>`;

    if (selectedMemberName) {
        const memberTotal = presencesByMember[selectedMemberName] || 0;
        text += `<p class="text-gray-700 mb-2">O membro <b>${selectedMemberName}</b> registrou um total de <b>${memberTotal} presença(s)</b> no período selecionado.</p>`;
        text += `<p class="text-gray-600 text-sm">O gráfico de pizza mostra a proporção de presenças registradas versus dias sem presença para este membro.</p>`;
    } else {
        const absentMembersCount = totalExpectedMembers - membersPresentInPeriod;
        text += `<p class="text-gray-700 mb-2">No grupo filtrado (total de <b>${totalExpectedMembers} membros</b>):</p>`;
        text += `<ul class="list-disc list-inside text-gray-700 mb-2">
                    <li><b>${membersPresentInPeriod} membros</b> registraram pelo menos uma presença.</li>
                    <li><b>${absentMembersCount} membros</b> não registraram presença no período.</li>
                    <li>Um total de <b>${totalPresencesCount} presenças</b> foram registradas.</li>
                 </ul>`;
        text += `<p class="text-gray-600 text-sm">O gráfico de pizza ilustra a proporção de membros presentes vs. ausentes. O gráfico de barras mostra o total de presenças individuais para os 5 membros com mais registros.</p>`;
    }
    
    detailedSummaryText.innerHTML = text;
}

/**
 * Atualiza o bloco de informações do relatório que será incluído no PDF.
 * @param {string} title - Título principal do relatório.
 * @param {string} entityName - Nome da entidade que está sendo reportada (membro ou grupo).
 * @param {string} leader - Líder associado ao relatório.
 * @param {string} gape - GAPE associado ao relatório.
 * @param {string} startDate - Data de início do filtro.
 * @param {string} endDate - Data de fim do filtro.
 */
function updateReportInfo(title, entityName, leader, gape, startDate, endDate) {
    if (!reportInfo) return;

    const today = new Date();
    const generationDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const generationTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

    const loggedInLeader = sessionStorage.getItem('loggedInLeader') || 'N/A';

    let dateRangeText = "Todo o Período Registrado";
    if (startDate && endDate) {
        const formattedStartDate = new Date(startDate).toLocaleDateString('pt-BR');
        const formattedEndDate = new Date(endDate).toLocaleDateString('pt-BR');
        dateRangeText = `De ${formattedStartDate} a ${formattedEndDate}`;
    }

    reportInfo.innerHTML = `
        <h3 class="text-xl font-bold text-blue-900 mb-2 text-center">Relatório de Presenças</h3>
        <p><b>Gerado por:</b> ${loggedInLeader}</p>
        <p><b>Data de Geração:</b> ${generationDate} às ${generationTime}</p>
        <p><b>Filtro de Período:</b> ${dateRangeText}</p>
        <p><b>Filtro de Líder:</b> ${filterLiderInput ? filterLiderInput.value || 'Todos' : 'Todos'}</p>
        <p><b>Filtro de GAPE:</b> ${filterGapeInput ? filterGapeInput.value || 'Todos' : 'Todos'}</p>
        <p><b>Tipo de Análise:</b> ${entityName}</p>
    `;
}


/**
 * Renderiza o calendário FullCalendar com as datas de presença.
 * @param {Array<Object>} detailedData - Dados detalhados de presença.
 * @param {Set<string>} datesWithPresences - Conjunto de datas com presenças para o calendário.
 */
function renderCalendar(detailedData, datesWithPresences) {
    if (!calendarContainer) {
        console.error("Elemento 'calendar' não encontrado para renderizar o calendário.");
        return;
    }

    if (calendar) {
        calendar.destroy(); // Destrói a instância anterior do calendário
    }

    const events = Array.from(datesWithPresences).map(dateString => {
        // Ajusta a string de data para o formato YYYY-MM-DD para compatibilidade com o FullCalendar
        // Se a data já vem como DD/MM/YYYY, converte:
        const parts = dateString.split('/');
        const formattedDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString; // YYYY-MM-DD

        return {
            title: 'Presença',
            start: formattedDate,
            allDay: true,
            color: '#4CAF50' // Verde para as presenças
        };
    });

    calendar = new FullCalendar.Calendar(calendarContainer, {
        plugins: [FullCalendar.dayGridPlugin], // Usar o plugin corretamente
        initialView: 'dayGridMonth',
        locale: 'pt-br', // Define o idioma para português
        events: events,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia'
        },
        eventDidMount: function(info) {
            // Adiciona um tooltip simples ou informação ao passar o mouse
            info.el.title = info.event.title;
        }
    });
    calendar.render();
}

/**
 * Funções para configurar a visualização do líder logado.
 */
function setupLeaderView() {
    const loggedInLeader = sessionStorage.getItem('loggedInLeader');

    if (loggedInLeaderNameElement) {
        loggedInLeaderNameElement.textContent = `Logado como: ${loggedInLeader || 'N/A'}`;
    }

    if (loggedInLeader && loggedInLeader !== "Admin") {
        // Se não for admin, preenche o filtro de líder e o desabilita
        if (filterLiderInput) {
            filterLiderInput.value = loggedInLeader;
            filterLiderInput.disabled = true;
            // Força a aplicação dos filtros para garantir que apenas os membros do líder sejam mostrados
            applyFilters();
        }
    } else {
        // Se for admin ou não houver líder logado, garante que o filtro de líder está habilitado
        if (filterLiderInput) {
            filterLiderInput.disabled = false;
        }
    }
}

/**
 * Lida com o download do PDF.
 */
async function downloadPdf() {
    showGlobalLoading(true, "Preparando PDF...");

    if (!detailedSummaryContent) {
        console.error("Elemento detailedSummaryContent não encontrado para gerar PDF.");
        showMessage("Erro: Conteúdo do relatório não encontrado para PDF.", "error");
        showGlobalLoading(false);
        return;
    }

    // Temporariamente esconde botões e filtros que não devem aparecer no PDF
    if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';
    if (closeModalBtn) closeModalBtn.style.display = 'none';
    if (summaryFilterSection) summaryFilterSection.style.display = 'none';
    
    // Rola para o topo do conteúdo do modal para garantir que a captura comece do início
    detailedSummaryContent.scrollTop = 0;

    try {
        const canvas = await html2canvas(detailedSummaryContent, {
            scale: 2, // Aumenta a escala para melhor qualidade
            useCORS: true, // Importante se houver imagens de outra origem
            windowWidth: detailedSummaryContent.scrollWidth,
            windowHeight: detailedSummaryContent.scrollHeight + 100 // Adiciona um pouco de altura extra
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4'); // Define o PDF como paisagem (landscape) e A4

        const imgWidth = 280; // Largura para A4 paisagem em mm (297mm - 2*8mm de margem)
        const pageHeight = 200; // Altura para A4 paisagem em mm (210mm - 2*5mm de margem)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 5; // Margem superior inicial

        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight); // Adiciona a imagem com margem lateral
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight + 5; // Ajusta a posição para a próxima página
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const filename = `relatorio_presencas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
        pdf.save(filename);
        showMessage("PDF gerado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        showMessage(`Erro ao gerar PDF: ${error.message}`, "error");
    } finally {
        // Reexibe os elementos
        if (downloadPdfBtn) downloadPdfBtn.style.display = 'block';
        if (closeModalBtn) closeModalBtn.style.display = 'block';
        if (summaryFilterSection) summaryFilterSection.style.display = 'block';
        showGlobalLoading(false);
    }
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Inicializa a exibição do nome do líder e aplica a visibilidade do filtro de líder
    setupLeaderView();
    fetchMembers();

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
    } else {
        console.warn("Elemento 'applyFiltersBtn' não encontrado no DOM.");
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener("click", clearFilters);
    } else {
        console.warn("Elemento 'clearFiltersBtn' não encontrado no DOM.");
    }

    // Listener para os inputs de filtro para aplicar filtros ao digitar/selecionar
    if (filterNameInput) filterNameInput.addEventListener("input", applyFilters);
    if (filterPeriodoSelect) filterPeriodoSelect.addEventListener("change", applyFilters);
    if (filterLiderInput) filterLiderInput.addEventListener("change", applyFilters);
    if (filterGapeInput) filterGapeInput.addEventListener("change", applyFilters);

    if (toggleDashboardBtn) {
        toggleDashboardBtn.addEventListener('click', toggleDashboardVisibility);
    } else {
        console.warn("Elemento 'toggleDashboardBtn' não encontrado no DOM.");
    }

    if (showDetailedSummaryBtn) {
        showDetailedSummaryBtn.addEventListener('click', showDetailedSummary);
    } else {
        console.warn("Elemento 'showDetailedSummaryBtn' não encontrado no DOM.");
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (detailedSummaryModal) detailedSummaryModal.classList.add("hidden");
            // Destruir os gráficos e o calendário quando o modal é fechado para liberar memória
            if (myChart) { myChart.destroy(); myChart = null; }
            if (myBarChart) { myBarChart.destroy(); myBarChart = null; }
            if (calendar) { calendar.destroy(); calendar = null; }
        });
    } else {
        console.warn("Elemento 'closeModalBtn' não encontrado no DOM.");
    }

    // Listeners para os novos filtros dentro do modal
    if (summaryStartDateInput) summaryStartDateInput.addEventListener('change', updateDetailedSummaryChart);
    if (summaryEndDateInput) summaryEndDateInput.addEventListener('change', updateDetailedSummaryChart);
    if (summaryMemberSelect) summaryMemberSelect.addEventListener('change', updateDetailedSummaryChart);
    // if (applySummaryFiltersBtn) applySummaryFiltersBtn.addEventListener('click', updateDetailedSummaryChart); // Removido pois o botão não existe no HTML

    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPdf);
    } else {
        console.warn("Elemento 'downloadPdfBtn' não encontrado no DOM.");
    }

    // NOVO: Event listener para o botão "Trocar Usuário"
    if (changeUserBtn) {
        changeUserBtn.addEventListener('click', () => {
            sessionStorage.removeItem('loggedInLeader'); // Limpa a sessão do líder
            window.location.href = 'index.html'; // Redireciona para a página de login
        });
    } else {
        console.warn("Elemento 'changeUserBtn' não encontrado no DOM.");
    }
});
