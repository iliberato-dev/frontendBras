// ------------------------------------------------------
// Frontend (js/dashboard.js) - Versão Final com Informações de Relatório no PDF
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Variável para armazenar todas as últimas presenças
let summaryChartInstance = null; // Variável para armazenar a instância do Chart.js (Pizza)
let summaryBarChartInstance = null; // Variável para armazenar a instância do Chart.js (Barras)
let calendarInstance = null; // Variável para armazenar a instância do FullCalendar

// Cores para os gráficos e calendário
const COLOR_PRESENT = '#4CAF50'; // Verde (ex: para presenças no gráfico e eventos no calendário)
const COLOR_NOT_PRESENT = '#cccccc'; // Cinza claro (ex: para membros sem presença no gráfico, se aplicável)

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
// const applySummaryFiltersBtn = document.getElementById("applySummaryFiltersBtn"); // Removido, pois o updateDetailedSummaryChart já é chamado nos listeners de change

// Botão de Download PDF
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// Elemento para exibir informações do relatório no PDF
const reportInfo = document.getElementById("reportInfo");

// Elemento da seção de filtros dentro do modal de resumo
const summaryFilterSection = document.getElementById("summaryFilterSection");

// Contêiner do calendário (o FullCalendar será renderizado dentro do div com id='calendar')
const calendarDiv = document.getElementById("calendar");


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
        setupLeaderView(); // NOVO: Chama a função para configurar a visualização do líder
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
            <div class="text-sm text-gray-600"><b>Período:</b> ${member.Periodo || "N/A"}</div>
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

            const presence = lastPresencesData[member.Nome];

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

                    lastPresencesData[member.Nome] = responseData.lastPresence || { data: `${dia}/${mes}/${ano}`, hora: `${hora}:${min}:${seg}` };
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
                        lastPresencesData[member.Nome] = responseData.lastPresence;
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
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean))].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean))].sort();

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
async function showDetailedSummary() {
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
    await updateDetailedSummary(); // Usa await para garantir que os dados sejam carregados antes de mostrar o modal

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
 * Esta versão chama a API sem os parâmetros de filtro avançados, pois o backend foi revertido.
 */
async function updateDetailedSummary() {
    showGlobalLoading(true, "Gerando resumo detalhado...");

    // Os valores dos filtros do modal são lidos, mas não são enviados para o backend nesta versão.
    // Eles serão usados apenas para a exibição de informações no relatório (reportInfo).
    const startDate = summaryStartDateInput ? summaryStartDateInput.value : '';
    const endDate = summaryEndDateInput ? summaryEndDateInput.value : '';
    const selectedMemberName = summaryMemberSelect ? summaryMemberSelect.value.trim() : '';

    let summaryTitle = "Estatísticas do Grupo Filtrado";
    let reportEntityName = "o grupo filtrado";
    let reportLeader = filterLiderInput ? filterLiderInput.value.trim() || "Todos" : "Todos";
    let reportGape = filterGapeInput ? filterGapeInput.value.trim() || "Todos" : "Todos";
    let reportPeriodo = filterPeriodoSelect ? filterPeriodoSelect.value.trim() || "Todos" : "Todos";

    if (selectedMemberName !== "") {
        const member = allMembersData.find(m => String(m.Nome || '').trim() === selectedMemberName);
        summaryTitle = `Estatísticas para o Membro: ${selectedMemberName}`;
        reportEntityName = selectedMemberName;
        if (member) {
            reportLeader = member.Lider || "N/A";
            reportGape = member.GAPE || "N/A";
            reportPeriodo = member.Periodo || "N/A";
        }
    }

    try {
        // CORREÇÃO: Chamada à API sem os parâmetros de filtro avançados, conforme a reversão do Apps Script.
        const response = await fetch(`${BACKEND_URL}/get-detailed-presences`);
        const data = await response.json();

        if (response.ok && data.success) {
            const presences = data.presences || [];
            const memberCounts = data.memberCounts || {};
            const totalPresences = presences.length;

            // 1. Informações do Relatório
            const leaderName = localStorage.getItem('loggedInLeaderName') || 'N/A';
            const currentDateTime = new Date().toLocaleString('pt-BR');
            if (reportInfo) {
                reportInfo.innerHTML = `
                    <p><strong>Relatório Gerado por:</strong> ${leaderName}</p>
                    <p><strong>Data e Hora:</strong> ${currentDateTime}</p>
                    <p><strong>Período Filtrado (Global):</strong> ${reportPeriodo}</p>
                    <p><strong>Líder Filtrado (Global):</strong> ${reportLeader}</p>
                    <p><strong>GAPE Filtrado (Global):</strong> ${reportGape}</p>
                    <p><strong>Membro Específico (Modal):</strong> ${selectedMemberName || 'Todos os Membros'}</p>
                    <p><strong>Período de Datas (Modal):</strong> ${startDate || 'Todas'} a ${endDate || 'Todas'}</p>
                `;
            }

            // 2. Resumo Textual
            let summaryHtml = `
                <h3 class="text-xl font-semibold text-gray-800 mb-2">${summaryTitle}</h3>
                <p class="text-gray-700">Total de presenças no período: <span class="font-bold text-blue-600">${totalPresences}</span></p>
            `;

            if (Object.keys(memberCounts).length > 0) {
                summaryHtml += `<h3 class="text-xl font-semibold text-gray-800 mt-4 mb-2">Presenças por Membro</h3><ul>`;
                Object.entries(memberCounts).sort(([, countA], [, countB]) => countB - countA).forEach(([name, count]) => {
                    summaryHtml += `<li class="text-gray-700">${name}: <span class="font-bold">${count}</span> presenças</li>`;
                });
                summaryHtml += `</ul>`;
            } else {
                summaryHtml += `<p class="text-gray-700 mt-2">Nenhuma presença encontrada para os critérios selecionados.</p>`;
            }
            if (detailedSummaryText) detailedSummaryText.innerHTML = summaryHtml;

            // 3. Gráficos
            renderCharts(memberCounts);

            // 4. Calendário
            renderCalendar(presences);

        } else {
            showMessage(data.message || "Erro ao carregar resumo detalhado.", "error");
            if (detailedSummaryText) detailedSummaryText.innerHTML = '<p class="text-red-600">Falha ao carregar o resumo detalhado.</p>';
            if (reportInfo) reportInfo.innerHTML = '';
            if (summaryChartInstance) summaryChartInstance.destroy();
            if (summaryBarChartInstance) summaryBarChartInstance.destroy();
            if (calendarInstance) calendarInstance.destroy();
            calendarInstance = null;
        }
    } catch (error) {
        console.error("Erro ao buscar resumo detalhado:", error);
        showMessage("Erro de conexão ao carregar resumo detalhado.", "error");
        if (detailedSummaryText) detailedSummaryText.innerHTML = '<p class="text-red-600">Falha na conexão ao carregar o resumo detalhado.</p>';
        if (reportInfo) reportInfo.innerHTML = '';
        if (summaryChartInstance) summaryChartInstance.destroy();
        if (summaryBarChartInstance) summaryBarChartInstance.destroy();
        if (calendarInstance) calendarInstance.destroy();
        calendarInstance = null;
    } finally {
        showGlobalLoading(false);
    }
}

/**
 * Renderiza os gráficos de pizza e barras horizontais.
 * @param {Object} memberCounts - Objeto com a contagem de presenças por membro.
 */
function renderCharts(memberCounts) {
    const labels = Object.keys(memberCounts);
    const data = Object.values(memberCounts);

    // Cores para os gráficos (usando as variáveis globais)
    const chartColors = [
        COLOR_PRESENT, // Verde para "Presente"
        '#2196F3', // Azul
        '#FFC107', // Amarelo
        '#FF5722', // Laranja
        '#9C27B0', // Roxo
        '#00BCD4', // Ciano
        '#FFEB3B', // Amarelo claro
        '#8BC34A', // Verde limão
        '#CDDC39', // Verde oliva
        '#FF9800', // Laranja escuro
        '#607D8B', // Cinza azulado
        '#795548', // Marrom
        '#E91E63', // Rosa
        '#673AB7', // Roxo escuro
        '#3F51B5'  // Azul índigo
    ];

    // Gráfico de Pizza
    if (summaryChartInstance) summaryChartInstance.destroy();
    summaryChartInstance = new Chart(summaryChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors.slice(0, labels.length), // Usa as primeiras cores disponíveis
                borderColor: '#ffffff', // Borda branca para contraste
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Distribuição de Presenças',
                    font: { size: 16, weight: 'bold' }
                },
                datalabels: {
                    color: '#fff',
                    formatter: (value, context) => {
                        const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Habilita o plugin de data labels
    });

    // Gráfico de Barras Horizontais
    if (summaryBarChartInstance) summaryBarChartInstance.destroy();
    summaryBarChartInstance = new Chart(summaryBarChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Presenças',
                data: data,
                backgroundColor: chartColors.slice(0, labels.length), // Usa as mesmas cores do gráfico de pizza
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Torna o gráfico horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Não precisa de legenda para barras únicas
                },
                title: {
                    display: true,
                    text: 'Presenças por Membro (Gráfico de Barras)',
                    font: { size: 16, weight: 'bold' }
                },
                datalabels: {
                    color: '#000', // Cor dos rótulos de dados
                    anchor: 'end',
                    align: 'start',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total de Presenças'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Membro'
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Habilita o plugin de data labels
    });
}

/**
 * Renderiza o calendário com os eventos de presença.
 * @param {Array} presences - Array de objetos de presença (nome, data, hora, gape).
 */
function renderCalendar(presences) {
    if (!calendarDiv) {
        console.error("Elemento do calendário não encontrado!");
        return;
    }

    // Destrói a instância anterior do calendário se existir
    if (calendarInstance) {
        calendarInstance.destroy();
    }

    const events = presences.map(p => ({
        title: `${p.nome} (${p.hora})`, // Exibe nome e hora
        start: p.data, // A data já deve estar no formato YYYY-MM-DD
        extendedProps: {
            gape: p.gape // Armazena GAPE para uso futuro se necessário
        },
        // Define a cor do evento como a cor de "presente"
        backgroundColor: COLOR_PRESENT,
        borderColor: COLOR_PRESENT,
        textColor: '#ffffff' // Texto branco para contraste
    }));

    calendarInstance = new FullCalendar.Calendar(calendarDiv, {
        initialView: 'dayGridMonth',
        locale: 'pt-br', // Define o idioma para português
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventDidMount: function(info) {
            // Personaliza a aparência do evento no calendário para responsividade
            // Reduz o tamanho da fonte para eventos em telas menores
            if (window.innerWidth <= 768) { // Exemplo para telas de tablet e celular
                info.el.style.fontSize = '0.65em';
                info.el.style.padding = '1px 2px';
            } else {
                info.el.style.fontSize = '0.75em';
                info.el.style.padding = '2px 4px';
            }
            info.el.style.borderRadius = '4px';
        },
        // dayCellDidMount: function(info) {
        //     // Lógica para colorir o fundo dos dias (se necessário para "não presente")
        //     // Isso seria mais complexo, exigiria saber todos os membros e verificar ausências
        //     // Por enquanto, focamos em colorir apenas os eventos de presença.
        //     // Se desejar esta funcionalidade, precisaremos de mais lógica no backend para
        //     // retornar dados de ausência ou processar isso no frontend.
        // }
    });
    calendarInstance.render();
}

/**
 * Configura a visualização do nome do líder logado.
 */
function setupLeaderView() {
    const leaderName = localStorage.getItem('loggedInLeaderName') || 'Não Identificado';
    if (loggedInLeaderNameElement) {
        loggedInLeaderNameElement.textContent = `Logado como: ${leaderName}`;
    } else {
        console.warn("Elemento 'loggedInLeaderNameElement' não encontrado.");
    }
}

// ------------------------------------------------------
// Listeners de Eventos
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // Carrega os membros ao carregar a página
    fetchMembers();

    // Listener para o botão de aplicar filtros
    if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);

    // Listener para o botão de limpar filtros
    if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

    // Listeners para os inputs de filtro (para atualização dinâmica)
    if (filterNameInput) filterNameInput.addEventListener("input", applyFilters);
    if (filterPeriodoSelect) filterPeriodoSelect.addEventListener("change", applyFilters);
    if (filterLiderInput) filterLiderInput.addEventListener("change", applyFilters);
    if (filterGapeInput) filterGapeInput.addEventListener("change", applyFilters);

    // Listener para o botão de alternar dashboard
    if (toggleDashboardBtn) toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);

    // Listener para o botão de Trocar Usuário (Logout)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem('loggedInLeaderName'); // Remove o nome do líder do localStorage
            window.location.href = "/index.html"; // Redireciona para a página de login
        });
    }

    // Listener para o botão "Resumo Detalhado"
    if (showDetailedSummaryBtn) showDetailedSummaryBtn.addEventListener("click", showDetailedSummary);

    // Listener para o botão de fechar o modal de resumo detalhado
    if (closeModalBtn) closeModalBtn.addEventListener("click", () => {
        if (detailedSummaryModal) detailedSummaryModal.classList.add("hidden");
        if (calendarInstance) calendarInstance.destroy(); // Destrói a instância do calendário ao fechar o modal
        calendarInstance = null;
    });

    // Listeners para os filtros dentro do modal de resumo detalhado
    // Estes listeners chamarão updateDetailedSummary, que agora não envia os filtros para o backend
    if (summaryStartDateInput) summaryStartDateInput.addEventListener('change', updateDetailedSummary);
    if (summaryEndDateInput) summaryEndDateInput.addEventListener('change', updateDetailedSummary);
    if (summaryMemberSelect) summaryMemberSelect.addEventListener('change', updateDetailedSummary);
    
    // Listener para o botão de Download PDF
    if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", async () => {
        showGlobalLoading(true, "Gerando PDF...");
        // Oculta elementos que não devem aparecer no PDF
        if (summaryFilterSection) summaryFilterSection.style.display = 'none';
        if (closeModalBtn) closeModalBtn.style.display = 'none';
        if (downloadPdfBtn) downloadPdfBtn.style.display = 'none';

        // Oculta a toolbar do FullCalendar para impressão
        const fcToolbar = document.querySelector('.fc-toolbar');
        if (fcToolbar) fcToolbar.style.display = 'none';

        // Força o calendário a renderizar em um tamanho fixo para o PDF
        if (calendarInstance) {
            calendarInstance.setOption('height', 600); // Altura fixa para o PDF
            calendarInstance.setOption('aspectRatio', 1.5); // Proporção para o PDF
            calendarInstance.render(); // Re-renderiza o calendário com as novas opções
        }

        try {
            const canvas = await html2canvas(detailedSummaryContent, {
                scale: 2, // Aumenta a escala para melhor qualidade no PDF
                useCORS: true, // Importante se tiver imagens de outras origens
                logging: true,
                onclone: (document) => {
                    // Oculta o scrollbar no clone para o PDF
                    const contentDiv = document.getElementById('detailedSummaryContent');
                    if (contentDiv) {
                        contentDiv.style.overflow = 'visible';
                        contentDiv.style.maxHeight = 'none';
                    }
                }
            });

            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;

            const doc = new jsPDF('p', 'mm', 'a4');
            let position = 0;

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save('resumo_detalhado_presencas.pdf');
            showMessage("PDF gerado com sucesso!", "success");

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showMessage(`Erro ao gerar PDF: ${error.message}`, "error");
        } finally {
            // Restaura a visibilidade dos elementos e o calendário
            if (summaryFilterSection) summaryFilterSection.style.display = 'block';
            if (closeModalBtn) closeModalBtn.style.display = 'block';
            if (downloadPdfBtn) downloadPdfBtn.style.display = 'block';
            if (fcToolbar) fcToolbar.style.display = ''; // Restaura o display padrão

            if (calendarInstance) {
                calendarInstance.setOption('height', 'auto'); // Volta para altura automática
                calendarInstance.setOption('aspectRatio', 1.35); // Volta para proporção padrão (ou o que você tinha)
                calendarInstance.render(); // Re-renderiza o calendário com as opções normais
            }
            showGlobalLoading(false);
        }
    });

    // Configura o plugin ChartDataLabels globalmente (apenas uma vez)
    Chart.register(ChartDataLabels);
});
