// ------------------------------------------------------
// Frontend JavaScript (dashboard.js)
// ------------------------------------------------------

// Variáveis globais para armazenar os dados dos membros e últimas presenças
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Objeto para armazenar a última presença de cada membro { "Nome do Membro": { data: "dd/MM/yyyy", hora: "HH:mm:ss", gape: "GAPE_VALUE" } }

// Referências aos elementos do DOM
const membersCardsContainer = document.getElementById("membersCardsContainer");
const messageArea = document.getElementById("messageArea");
const globalLoadingIndicator = document.getElementById("globalLoadingIndicator");
const loadingMessage = document.getElementById("loadingMessage");

// Filtros
const filterNameInput = document.getElementById("filterName");
const filterPeriodoSelect = document.getElementById("filterPeriodo");
const filterLiderSelect = document.getElementById("filterLider");
const filterGapeSelect = document.getElementById("filterGape");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// Dashboard
const toggleDashboardBtn = document.getElementById("toggleDashboardBtn");
const dashboardContainer = document.getElementById("dashboardContainer");
const dashboardOpenIcon = document.getElementById("dashboardOpenIcon");
const dashboardOpenText = document.getElementById("dashboardOpenText");
const dashboardCloseIcon = document.getElementById("dashboardCloseIcon");
const dashboardCloseText = document.getElementById("dashboardCloseText");
const dashboardPresencasMes = document.getElementById("dashboardPresencasMes");
const dashboardPeriodo = document.getElementById("dashboardPeriodo");
const dashboardLider = document.getElementById("dashboardLider");
const dashboardGape = document.getElementById("dashboardGape");
const totalCountsList = document.getElementById("totalCountsList");
let isDashboardOpen = false; // Estado inicial do dashboard

// Nome do líder logado
const loggedInLeaderNameElement = document.getElementById("loggedInLeaderName");

// Modal de Resumo Detalhado
const showDetailedSummaryBtn = document.getElementById("showDetailedSummaryBtn");
const detailedSummaryModal = document.getElementById("detailedSummaryModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const detailedSummaryText = document.getElementById("detailedSummaryText");
const summaryChartCanvas = document.getElementById('summaryChart');
const summaryBarChartCanvas = document.getElementById('summaryBarChart');
const reportInfo = document.getElementById('reportInfo');

// Filtros do Modal de Resumo
const summaryStartDateInput = document.getElementById('summaryStartDate');
const summaryEndDateInput = document.getElementById('summaryEndDate');
const summaryMemberSelect = document.getElementById('summaryMemberSelect');
let summaryChartInstance = null; // Para armazenar a instância do Chart.js
let summaryBarChartInstance = null; // Para armazenar a instância do Chart.js do gráfico de barras

// !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
const BACKEND_URL = 'https://backendbras.onrender.com';

// ------------------------------------------------------
// Funções Utilitárias
// ------------------------------------------------------

/**
 * Exibe ou oculta o indicador de carregamento global.
 * @param {boolean} show - true para mostrar, false para ocultar.
 * @param {string} message - Mensagem a ser exibida durante o carregamento.
 */
function showGlobalLoading(show, message = "Carregando...") {
    loadingMessage.textContent = message;
    if (show) {
        globalLoadingIndicator.classList.remove("opacity-0", "pointer-events-none");
        globalLoadingIndicator.classList.add("opacity-100");
    } else {
        globalLoadingIndicator.classList.remove("opacity-100");
        globalLoadingIndicator.classList.add("opacity-0", "pointer-events-none");
    }
}

/**
 * Exibe uma mensagem de status para o usuário.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success'|'error'|'info'|'warning'} type - O tipo de mensagem (para estilização).
 */
function showMessage(message, type = "info") {
    if (!message || message.trim() === "" || message.includes("Carregando...")) {
        // Ignora mensagens vazias ou de carregamento para não sobrescrever feedback importante
        return;
    }

    messageArea.textContent = message;
    messageArea.className = "message-box show"; // Reset classes and add 'show' for animation
    messageArea.classList.remove("hidden");

    // Remove todas as classes de tipo antes de adicionar a correta
    messageArea.classList.remove("message-success", "message-error", "message-info", "message-warning");

    if (type === "success") {
        messageArea.classList.add("message-success");
    } else if (type === "error") {
        messageArea.classList.add("message-error");
    } else if (type === "warning") {
        messageArea.classList.add("bg-yellow-100", "text-yellow-800"); // Exemplo de estilo para warning
    } else { // Default to info
        messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    // Esconde a mensagem após 4 segundos
    setTimeout(() => {
        messageArea.classList.remove("show"); // Inicia a animação de saída
        setTimeout(() => messageArea.classList.add("hidden"), 500); // Esconde completamente após a transição
    }, 4000);
}

// ------------------------------------------------------
// Lógica de Busca de Dados
// ------------------------------------------------------

/**
 * Busca a lista de membros e suas últimas presenças do backend.
 */
async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");
    membersCardsContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p class="text-gray-600">Carregando membros...</p>
        </div>
    `;

    try {
        const [membersResponse, lastPresencesResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/get-membros`),
            fetch(`${BACKEND_URL}/get-all-last-presences`)
        ]);

        const membersData = await membersResponse.json();
        const lastPresencesRaw = await lastPresencesResponse.json();

        if (membersResponse.ok && membersData.success) {
            allMembersData = membersData.membros || [];
            console.log("Dados de membros carregados:", allMembersData);
        } else {
            showMessage(membersData.message || "Erro ao carregar membros.", "error");
            allMembersData = [];
        }

        if (lastPresencesResponse.ok && lastPresencesRaw.success) {
            lastPresencesData = lastPresencesRaw.data || {};
            console.log("Últimas presenças carregadas:", lastPresencesData);
        } else {
            showMessage(lastPresencesRaw.message || "Erro ao carregar últimas presenças.", "error");
            lastPresencesData = {};
        }

        fillSelectOptions(); // Preenche os selects de filtro
        applyFilters(); // Aplica os filtros iniciais (mostra todos)

        // Exibe o nome do líder logado
        const leaderName = localStorage.getItem('loggedInLeaderName') || 'Não Identificado';
        loggedInLeaderNameElement.textContent = `Logado como: ${leaderName}`;

        if (isDashboardOpen) {
            fetchAndDisplaySummary();
        }

    } catch (error) {
        console.error("Erro ao buscar dados:", error);
        showMessage("Erro ao carregar dados. Verifique a conexão com o servidor.", "error");
        membersCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-600">
                <p>Não foi possível carregar os dados. Tente novamente mais tarde.</p>
            </div>
        `;
    } finally {
        showGlobalLoading(false);
    }
}

// ------------------------------------------------------
// Lógica de Filtragem e Exibição
// ------------------------------------------------------

/**
 * Aplica os filtros e exibe os membros correspondentes.
 */
function applyFilters() {
    const filterName = filterNameInput.value.toLowerCase().trim();
    const filterPeriodo = filterPeriodoSelect.value.toLowerCase().trim();
    const filterLider = filterLiderSelect.value.toLowerCase().trim();
    const filterGape = filterGapeSelect.value.toLowerCase().trim();

    filteredMembers = allMembersData.filter(member => {
        const matchesName = member.Nome.toLowerCase().includes(filterName);
        const matchesPeriodo = filterPeriodo === "" || member.Periodo.toLowerCase() === filterPeriodo;
        const matchesLider = filterLider === "" || member.Lider.toLowerCase().includes(filterLider);
        const matchesGape = filterGape === "" || member.GAPE.toLowerCase() === filterGape;

        return matchesName && matchesPeriodo && matchesLider && matchesGape;
    });

    displayMembers(filteredMembers);

    // Se o dashboard estiver aberto, atualiza-o com os novos filtros
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

/**
 * Exibe os cards dos membros no container.
 * @param {Array} members - Array de objetos de membros a serem exibidos.
 */
function displayMembers(members) {
    membersCardsContainer.innerHTML = ""; // Limpa o container

    if (members.length === 0) {
        membersCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-600">
                <p>Nenhum membro encontrado com os filtros aplicados.</p>
            </div>
        `;
        return;
    }

    members.forEach((member, index) => {
        const memberCard = document.createElement("div");
        memberCard.className = `member-card bg-white p-5 rounded-xl shadow-md flex flex-col fade-in-row`;
        memberCard.style.animationDelay = `${index * 0.05}s`; // Atraso para efeito cascata

        const memberName = member.Nome || "Nome Indisponível";
        const memberPeriodo = member.Periodo || "N/A";
        const memberLider = member.Lider || "N/A";
        const memberGape = member.GAPE || "N/A";

        memberCard.innerHTML = `
            <h3 class="text-xl font-semibold text-gray-800 mb-2">${memberName}</h3>
            <p class="text-gray-600 text-sm mb-1"><i class="fas fa-sun mr-2 text-yellow-500"></i>Período: ${memberPeriodo}</p>
            <p class="text-gray-600 text-sm mb-1"><i class="fas fa-users mr-2 text-blue-500"></i>Líder: ${memberLider}</p>
            <p class="text-gray-600 text-sm mb-3"><i class="fas fa-church mr-2 text-purple-500"></i>GAPE: ${memberGape}</p>
            
            <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-200">
                <label class="inline-flex items-center">
                    <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600 rounded-md presence-checkbox" data-member-name="${memberName}">
                    <span class="ml-2 text-gray-700 font-medium">Presente</span>
                </label>
                <button class="confirm-presence-btn bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 hidden" data-member-name="${memberName}">
                    <i class="fas fa-check-circle mr-2"></i> Confirmar
                </button>
            </div>
            <div class="info-div text-sm text-gray-500 mt-2"></div>
        `;

        membersCardsContainer.appendChild(memberCard);

        const checkbox = memberCard.querySelector(".presence-checkbox");
        const confirmBtn = memberCard.querySelector(".confirm-presence-btn");
        const infoDiv = memberCard.querySelector(".info-div");

        // Função para atualizar o status da última presença
        const updatePresenceStatus = () => {
            const lastPresence = lastPresencesData[memberName];
            if (lastPresence) {
                infoDiv.textContent = `Última presença: ${lastPresence.data} às ${lastPresence.hora}`;
                infoDiv.classList.remove("hidden");
            } else {
                infoDiv.textContent = "Nenhuma presença registrada.";
                infoDiv.classList.remove("hidden");
            }
        };

        // Chama a função para exibir o status inicial
        updatePresenceStatus();

        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                confirmBtn.classList.remove("hidden");
                infoDiv.textContent = "Marque e confirme a presença."; // Mensagem temporária
                infoDiv.classList.remove("hidden");
            } else {
                confirmBtn.classList.add("hidden");
                updatePresenceStatus(); // Volta a exibir a última presença
            }
        });

        confirmBtn.addEventListener("click", async () => {
            const now = new Date();
            const dataAtual = now.toLocaleDateString('pt-BR');
            const horaAtual = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            showMessage(`Registrando presença para ${memberName}...`, "info");
            confirmBtn.disabled = true;
            checkbox.disabled = true;

            try {
                const response = await fetch(`${BACKEND_URL}/presenca`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        nome: memberName,
                        data: dataAtual,
                        hora: horaAtual,
                        sheet: "PRESENCAS" // Nome da aba de presenças
                    }),
                });

                const responseData = await response.json();

                if (response.ok && responseData.success) {
                    showMessage(`Presença de ${memberName} registrada!`, "success");
                    memberCard.classList.add("animate-pulse-green");
                    setTimeout(() => memberCard.classList.remove("animate-pulse-green"), 1000);

                    // Atualiza lastPresencesData com a nova presença
                    lastPresencesData[memberName] = { data: dataAtual, hora: horaAtual, gape: member.GAPE };
                    updatePresenceStatus(); // Atualiza o texto da última presença

                    // Se o dashboard estiver aberto, atualiza-o
                    if (isDashboardOpen) {
                        fetchAndDisplaySummary();
                    }

                } else if (!responseData.success && responseData.message && responseData.message.includes("já foi registrada")) {
                    showMessage(`Atenção: Presença para ${memberName} já foi registrada hoje.`, "warning");
                    memberCard.classList.add("animate-shake-red");
                    setTimeout(() => memberCard.classList.remove("animate-shake-red"), 1000);
                    // Atualiza lastPresencesData com a presença que já estava registrada
                    if (responseData.lastPresence) {
                        lastPresencesData[memberName] = responseData.lastPresence;
                        updatePresenceStatus();
                    }
                }
                else {
                    showMessage(responseData.message || `Erro ao registrar presença para ${memberName}.`, "error");
                    memberCard.classList.add("animate-shake-red");
                    setTimeout(() => memberCard.classList.remove("animate-shake-red"), 1000);
                }
            } catch (error) {
                console.error("Erro ao confirmar presença:", error);
                showMessage(`Erro de conexão ao registrar presença para ${memberName}.`, "error");
                memberCard.classList.add("animate-shake-red");
                setTimeout(() => memberCard.classList.remove("animate-shake-red"), 1000);
            } finally {
                confirmBtn.classList.add("hidden");
                checkbox.checked = false;
                confirmBtn.disabled = false;
                checkbox.disabled = false;
            }
        });
    });
}

/**
 * Preenche os selects de filtro (Líder e GAPE) com base nos dados de todos os membros.
 */
function fillSelectOptions() {
    const lideres = new Set();
    const gapes = new Set();

    allMembersData.forEach(member => {
        if (member.Lider) lideres.add(member.Lider);
        if (member.GAPE) gapes.add(member.GAPE);
    });

    // Limpa e preenche o select de Líder
    filterLiderSelect.innerHTML = '<option value="">Todos</option>';
    Array.from(lideres).sort().forEach(lider => {
        const option = document.createElement("option");
        option.value = lider;
        option.textContent = lider;
        filterLiderSelect.appendChild(option);
    });

    // Limpa e preenche o select de GAPE
    filterGapeSelect.innerHTML = '<option value="">Todos</option>';
    Array.from(gapes).sort().forEach(gape => {
        const option = document.createElement("option");
        option.value = gape;
        option.textContent = gape;
        filterGapeSelect.appendChild(option);
    });
}

/**
 * Limpa todos os filtros e reaplica-os.
 */
function clearFilters() {
    filterNameInput.value = "";
    filterPeriodoSelect.value = "";
    filterLiderSelect.value = "";
    filterGapeSelect.value = "";
    applyFilters();
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

/**
 * Aplica filtros e exibe uma mensagem.
 */
function applyFiltersWithMessage() {
    showMessage("Aplicando filtros...", "info");
    applyFilters();
}

// ------------------------------------------------------
// Lógica do Dashboard
// ------------------------------------------------------

/**
 * Alterna a visibilidade do container do dashboard.
 */
function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;
    if (isDashboardOpen) {
        dashboardContainer.classList.remove("max-h-0", "opacity-0", "overflow-hidden");
        dashboardContainer.classList.add("max-h-screen", "opacity-100"); // max-h-screen para permitir expansão
        dashboardOpenIcon.classList.add("hidden");
        dashboardOpenText.classList.add("hidden");
        dashboardCloseIcon.classList.remove("hidden");
        dashboardCloseText.classList.remove("hidden");
        fetchAndDisplaySummary(); // Carrega os dados do dashboard ao abrir
    } else {
        dashboardContainer.classList.remove("max-h-screen", "opacity-100");
        dashboardContainer.classList.add("max-h-0", "opacity-0", "overflow-hidden");
        dashboardOpenIcon.classList.remove("hidden");
        dashboardOpenText.classList.remove("hidden");
        dashboardCloseIcon.classList.add("hidden");
        dashboardCloseText.classList.add("hidden");
    }
}

/**
 * Busca e exibe o resumo das presenças para o dashboard.
 */
async function fetchAndDisplaySummary() {
    showGlobalLoading(true, "Atualizando resumo do dashboard...");
    totalCountsList.innerHTML = '<li class="text-sm text-gray-200 text-center">Carregando dados...</li>';

    const periodo = filterPeriodoSelect.value;
    const lider = filterLiderSelect.value;
    const gape = filterGapeSelect.value;

    const queryParams = new URLSearchParams();
    if (periodo) queryParams.append('periodo', periodo);
    if (lider) queryParams.append('lider', lider);
    if (gape) queryParams.append('gape', gape);

    try {
        const response = await fetch(`${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`);
        const dataTotal = await response.json();

        if (response.ok) {
            const counts = dataTotal || {}; // O backend já retorna o objeto de contagens diretamente
            let totalPresencas = 0;
            totalCountsList.innerHTML = ''; // Limpa a lista antes de preencher

            const sortedCounts = Object.entries(counts).sort(([, countA], [, countB]) => countB - countA);

            if (sortedCounts.length > 0) {
                sortedCounts.forEach(([name, count]) => {
                    totalPresencas += count;
                    const listItem = document.createElement("li");
                    listItem.className = "flex justify-between items-center bg-gray-700 p-2 rounded-md";
                    listItem.innerHTML = `
                        <span class="text-gray-200">${name}</span>
                        <span class="text-green-400 font-bold">${count}</span>
                    `;
                    totalCountsList.appendChild(listItem);
                });
            } else {
                totalCountsList.innerHTML = '<li class="text-sm text-gray-200 text-center">Nenhuma presença encontrada para os filtros aplicados.</li>';
            }

            dashboardPresencasMes.textContent = totalPresencas;
            dashboardPeriodo.textContent = periodo || "Todos";
            dashboardLider.textContent = lider || "Todos";
            dashboardGape.textContent = gape || "Todos";

        } else {
            showMessage(dataTotal.message || "Erro ao carregar resumo do dashboard.", "error");
            dashboardPresencasMes.textContent = "Erro";
            dashboardPeriodo.textContent = "Erro";
            dashboardLider.textContent = "Erro";
            dashboardGape.textContent = "Erro";
            totalCountsList.innerHTML = '<li class="text-sm text-red-400 text-center">Falha ao carregar dados.</li>';
        }
    } catch (error) {
        console.error("Erro ao buscar resumo do dashboard:", error);
        showMessage("Erro de conexão ao carregar resumo do dashboard.", "error");
        dashboardPresencasMes.textContent = "Erro";
        dashboardPeriodo.textContent = "Erro";
        dashboardLider.textContent = "Erro";
        dashboardGape.textContent = "Erro";
        totalCountsList.innerHTML = '<li class="text-sm text-red-400 text-center">Falha na conexão.</li>';
    } finally {
        showGlobalLoading(false);
    }
}

// ------------------------------------------------------
// Lógica do Modal de Resumo Detalhado (Gráficos e Calendário)
// ------------------------------------------------------

/**
 * Abre o modal de resumo detalhado e carrega seus dados.
 */
async function openDetailedSummaryModal() {
    showGlobalLoading(true, "Gerando resumo detalhado...");
    detailedSummaryModal.classList.remove("hidden"); // Mostra o modal

    // Limpa conteúdo anterior
    detailedSummaryText.innerHTML = '';
    reportInfo.innerHTML = '';
    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    if (summaryChartInstance) summaryChartInstance.destroy();
    if (summaryBarChartInstance) summaryBarChartInstance.destroy();

    // Popula o select de membros no modal com os membros filtrados atualmente
    filteredMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.Nome;
        option.textContent = member.Nome;
        summaryMemberSelect.appendChild(option);
    });

    // Define as datas padrão para os filtros do modal (mês atual)
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    summaryStartDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    summaryEndDateInput.value = lastDayOfMonth.toISOString().split('T')[0];

    await updateDetailedSummary(); // Carrega os dados iniciais do resumo detalhado
    showGlobalLoading(false);
}

/**
 * Fecha o modal de resumo detalhado.
 */
function closeDetailedSummaryModal() {
    detailedSummaryModal.classList.add("hidden"); // Esconde o modal
    if (summaryChartInstance) summaryChartInstance.destroy();
    if (summaryBarChartInstance) summaryBarChartInstance.destroy();
}

/**
 * Atualiza o conteúdo do resumo detalhado com base nos filtros do modal.
 */
async function updateDetailedSummary() {
    showGlobalLoading(true, "Atualizando resumo...");

    const startDate = summaryStartDateInput.value;
    const endDate = summaryEndDateInput.value;
    const selectedMember = summaryMemberSelect.value;

    const queryParams = new URLSearchParams();
    queryParams.append('startDate', startDate);
    queryParams.append('endDate', endDate);
    if (selectedMember) queryParams.append('memberName', selectedMember);
    // Adiciona os filtros globais (periodo, lider, gape) para o resumo detalhado também
    queryParams.append('periodo', filterPeriodoSelect.value);
    queryParams.append('lider', filterLiderSelect.value);
    queryParams.append('gape', filterGapeSelect.value);

    try {
        // Nova rota no Apps Script para obter presenças detalhadas com filtros de data e membro
        const response = await fetch(`${BACKEND_URL}/get-detailed-presences?${queryParams.toString()}`);
        const data = await response.json();

        if (response.ok && data.success) {
            const presences = data.presences || [];
            const memberCounts = data.memberCounts || {};
            const totalPresences = presences.length;

            // 1. Informações do Relatório
            const leaderName = localStorage.getItem('loggedInLeaderName') || 'N/A';
            const currentDateTime = new Date().toLocaleString('pt-BR');
            reportInfo.innerHTML = `
                <p><strong>Relatório Gerado por:</strong> ${leaderName}</p>
                <p><strong>Data e Hora:</strong> ${currentDateTime}</p>
                <p><strong>Período Filtrado:</strong> ${filterPeriodoSelect.value || 'Todos'}</p>
                <p><strong>Líder Filtrado:</strong> ${filterLiderSelect.value || 'Todos'}</p>
                <p><strong>GAPE Filtrado:</strong> ${filterGapeSelect.value || 'Todos'}</p>
                <p><strong>Membro Específico:</strong> ${selectedMember || 'Todos os Membros Filtrados'}</p>
                <p><strong>Período de Datas:</strong> ${startDate} a ${endDate}</p>
            `;

            // 2. Resumo Textual
            let summaryHtml = `
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Estatísticas Gerais</h3>
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
            detailedSummaryText.innerHTML = summaryHtml;

            // 3. Gráficos
            renderCharts(memberCounts);

            // 4. Calendário
            renderCalendar(presences);

        } else {
            showMessage(data.message || "Erro ao carregar resumo detalhado.", "error");
            detailedSummaryText.innerHTML = '<p class="text-red-600">Falha ao carregar o resumo detalhado.</p>';
            reportInfo.innerHTML = '';
            if (summaryChartInstance) summaryChartInstance.destroy();
            if (summaryBarChartInstance) summaryBarChartInstance.destroy();
        }
    } catch (error) {
        console.error("Erro ao buscar resumo detalhado:", error);
        showMessage("Erro de conexão ao carregar resumo detalhado.", "error");
        detailedSummaryText.innerHTML = '<p class="text-red-600">Falha na conexão ao carregar o resumo detalhado.</p>';
        reportInfo.innerHTML = '';
        if (summaryChartInstance) summaryChartInstance.destroy();
        if (summaryBarChartInstance) summaryBarChartInstance.destroy();
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

    // Cores dinâmicas para os gráficos
    const backgroundColors = [
        '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0',
        '#00BCD4', '#FFEB3B', '#8BC34A', '#CDDC39', '#FF9800',
        '#607D8B', '#795548', '#E91E63', '#673AB7', '#3F51B5'
    ];
    const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));

    // Gráfico de Pizza
    if (summaryChartInstance) summaryChartInstance.destroy();
    summaryChartInstance = new Chart(summaryChartCanvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
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
                backgroundColor: backgroundColors,
                borderColor: borderColors,
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
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error("Elemento do calendário não encontrado!");
        return;
    }

    // Destrói a instância anterior do calendário se existir
    if (calendarEl.fullCalendar) {
        calendarEl.fullCalendar.destroy();
    }

    const events = presences.map(p => ({
        title: `${p.nome} (${p.hora})`, // Exibe nome e hora
        start: p.data, // A data já deve estar no formato YYYY-MM-DD ou dd/MM/yyyy
        extendedProps: {
            gape: p.gape // Armazena GAPE para uso futuro se necessário
        },
        // Cores baseadas no GAPE ou outras propriedades, se desejar
        backgroundColor: '#3b82f6', // Azul padrão
        borderColor: '#1d4ed8',
        textColor: '#ffffff'
    }));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br', // Define o idioma para português
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventDidMount: function(info) {
            // Personaliza a aparência do evento no calendário
            info.el.style.fontSize = '0.75em';
            info.el.style.padding = '2px 4px';
            info.el.style.borderRadius = '4px';
        },
        dateClick: function(info) {
            // Exemplo: ao clicar em um dia, pode-se abrir um modal com detalhes
            // alert('Você clicou em: ' + info.dateStr);
        },
        eventClick: function(info) {
            // Exemplo: ao clicar em um evento, pode-se mostrar mais detalhes
            // alert('Evento: ' + info.event.title + '\nData: ' + info.event.start.toLocaleDateString('pt-BR'));
        }
    });
    calendar.render();
}

// ------------------------------------------------------
// Listeners de Eventos
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // Carrega os membros ao carregar a página
    fetchMembers();

    // Listener para o botão de aplicar filtros
    applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);

    // Listener para o botão de limpar filtros
    clearFiltersBtn.addEventListener("click", clearFilters);

    // Listeners para os inputs de filtro (para atualização dinâmica)
    filterNameInput.addEventListener("input", applyFilters);
    filterPeriodoSelect.addEventListener("change", applyFilters);
    filterLiderSelect.addEventListener("change", applyFilters);
    filterGapeSelect.addEventListener("change", applyFilters);

    // Listener para o botão de alternar dashboard
    toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);

    // Listener para o botão de Trocar Usuário (Logout)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem('loggedInLeaderName'); // Remove o nome do líder do localStorage
            window.location.href = "/index.html"; // Redireciona para a página de login
        });
    }

    // NOVO: Listener para o botão "Resumo Detalhado"
    showDetailedSummaryBtn.addEventListener("click", openDetailedSummaryModal);

    // Listener para o botão de fechar o modal de resumo detalhado
    closeModalBtn.addEventListener("click", closeDetailedSummaryModal);

    // Listeners para os filtros dentro do modal de resumo detalhado
    summaryStartDateInput.addEventListener('change', updateDetailedSummary);
    summaryEndDateInput.addEventListener('change', updateDetailedSummary);
    summaryMemberSelect.addEventListener('change', updateDetailedSummary);
    
    // Configura o plugin ChartDataLabels globalmente (apenas uma vez)
    Chart.register(ChartDataLabels);
});
