// ------------------------------------------------------
// Frontend (js/dashboard.js) - VERSÃO COMPLETA E FINAL
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {};
let allAbsencesData = {};
let myChart = null;
let myBarChart = null;

// --- Seletores de Elementos Globais ---
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

// Elementos do Dashboard Principal
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
const dashboardFaltasMes = document.getElementById("dashboardFaltasMes");

// Elementos de Login e Usuário
const loggedInLeaderNameElement = document.getElementById("loggedInLeaderName");

// Elementos do Modal de Resumo Detalhado
const detailedSummaryModal = document.getElementById("detailedSummaryModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const summaryChartCanvas = document.getElementById("summaryChart");
const summaryBarChartCanvas = document.getElementById("summaryBarChart");
const detailedSummaryText = document.getElementById("detailedSummaryText");
const showDetailedSummaryBtn = document.getElementById("showDetailedSummaryBtn");
const detailedSummaryContent = document.getElementById("detailedSummaryContent");
const detailedAbsencesList = document.getElementById("detailedAbsencesList");
const absentMembersList = document.getElementById("absentMembersList");
const summaryStartDateInput = document.getElementById("summaryStartDate");
const summaryEndDateInput = document.getElementById("summaryEndDate");
const summaryMemberSelect = document.getElementById("summaryMemberSelect");
const applySummaryFiltersBtn = document.getElementById("applySummaryFiltersBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const reportInfo = document.getElementById("reportInfo");
const summaryFilterSection = document.getElementById("summaryFilterSection");

// Elementos do Modal de Histórico de Presenças
const historyModal = document.getElementById("historyModal");
const closeHistoryModalBtn = document.getElementById("closeHistoryModalBtn");
const historyModalTitle = document.getElementById("historyModalTitle");
const historyListContainer = document.getElementById("presenceHistoryListContainer");

// --- Configurações ---
const BACKEND_URL = 'https://backendbras.onrender.com';
let isDashboardOpen = false;

// --- Funções Utilitárias ---

function showGlobalLoading(show, message = "Carregando...") {
    if (globalLoadingIndicator && loadingMessageSpan) {
        loadingMessageSpan.textContent = message;
        globalLoadingIndicator.style.display = show ? "flex" : "none";
        if (show) {
            setTimeout(() => globalLoadingIndicator.classList.add("show"), 10);
        } else {
            globalLoadingIndicator.classList.remove("show");
        }
    }
}

function showMessage(message, type = "info") {
    if (!messageArea) return;
    if (message.includes("Carregando") || !message.trim()) return;

    messageArea.textContent = message;
    messageArea.className = "message-box show";
    messageArea.classList.remove("message-success", "message-error", "bg-green-100", "text-green-800", "bg-red-100", "text-red-800", "bg-yellow-100", "text-yellow-800", "bg-blue-100", "text-blue-800");

    switch (type) {
        case "success":
            messageArea.classList.add("message-success", "bg-green-100", "text-green-800");
            break;
        case "error":
            messageArea.classList.add("message-error", "bg-red-100", "text-red-800");
            break;
        case "warning":
            messageArea.classList.add("bg-yellow-100", "text-yellow-800");
            break;
        default:
            messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    setTimeout(() => {
        messageArea.classList.remove("show");
    }, 4000);
}

// --- Funções Principais de Dados e UI ---

async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");
    if (!membersCardsContainer) {
        showMessage("Erro crítico: Contêiner de membros não encontrado.", "error");
        showGlobalLoading(false);
        return;
    }

    try {
        const [membersResponse, presencesResponse] = await Promise.all([
            fetch(`${BACKEND_URL}/get-membros`),
            fetch(`${BACKEND_URL}/get-all-last-presences`)
        ]);

        if (!membersResponse.ok || !presencesResponse.ok) {
            const errorData = await membersResponse.json();
            throw new Error(errorData.message || 'Falha ao carregar dados do servidor.');
        }

        const membersData = await membersResponse.json();
        allMembersData = membersData.membros || [];
        const lastPresencesRawData = await presencesResponse.json();
        lastPresencesData = lastPresencesRawData.data || {};

        fillSelectOptions();
        applyFilters();
    } catch (error) {
        showMessage(`Erro ao carregar dados: ${error.message}`, "error");
    } finally {
        showGlobalLoading(false);
        setupLeaderView();
    }
}

function applyFilters() {
    const filters = {
        name: (filterNameInput?.value || "").toLowerCase().trim(),
        periodo: (filterPeriodoSelect?.value || "").toLowerCase().trim(),
        lider: (filterLiderInput?.value || "").toLowerCase().trim(),
        gape: (filterGapeInput?.value || "").toLowerCase().trim()
    };

    filteredMembers = allMembersData.filter(member => {
        const memberName = (member.Nome || "").toLowerCase();
        return (!filters.name || memberName.includes(filters.name)) &&
               (!filters.periodo || (member.Periodo || "").toLowerCase().includes(filters.periodo)) &&
               (!filters.lider || (member.Lider || "").toLowerCase().includes(filters.lider)) &&
               (!filters.gape || (member.GAPE || "").toLowerCase().includes(filters.gape));
    });

    displayMembers(filteredMembers);
}

function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (members.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-4 text-gray-500">Nenhum membro encontrado.</div>`;
        return;
    }

    members.forEach((member) => {
        const card = document.createElement("div");
        card.className = "fade-in-row bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative";
        
        // --- LÓGICA ADICIONADA PARA ESCOLHER O ÍCONE DO PERÍODO ---
        let periodoIcon = '<i class="fas fa-question-circle text-gray-400 fa-fw"></i>'; // Ícone padrão
        if (member.Periodo) {
            const periodoLower = member.Periodo.toLowerCase();
            if (periodoLower.includes("manhã") || periodoLower.includes("tarde")) {
                periodoIcon = '<i class="fas fa-sun text-yellow-500 fa-fw"></i>'; // Ícone de sol
            } else if (periodoLower.includes("noite")) {
                periodoIcon = '<i class="fas fa-moon text-blue-500 fa-fw"></i>'; // Ícone de lua
            }
        }
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                    <div class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 flex-shrink-0 group">
                        <img src="${member.FotoURL || 'https://png.pngtree.com/png-vector/20191208/ourmid/pngtree-beautiful-create-user-glyph-vector-icon-png-image_2084391.jpg'}" alt="Foto de ${member.Nome}" class="member-photo w-full h-full object-cover">
                        <input type="file" class="photo-upload-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" data-member-name="${member.Nome}">
                        <div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs text-center p-1 z-0">Trocar Foto</div>
                    </div>
                    <div class="font-bold text-lg text-gray-800">${member.Nome || "N/A"}</div>
                </div>
                <button class="btn-history text-gray-400 hover:text-blue-600 transition" data-member-name="${member.Nome}" title="Ver Histórico de Presenças">
                    <i class="fas fa-history fa-lg"></i>
                </button>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                ${periodoIcon}
                <span><b>Período:</b> ${member.Periodo || "N/A"}</span>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                <i class="fas fa-star text-yellow-600 fa-fw"></i>
                <span><b>Líder:</b> ${member.Lider || "N/A"}</span>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                <i class="fas fa-users text-purple-600 fa-fw"></i>
                <span><b>GAPE:</b> ${member.GAPE || "N/A"}</span>
            </div>
            <label class="flex items-center gap-2 mt-2">
                <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox">
                <span class="text-sm text-gray-700">Presente</span>
            </label>
            <div class="presence-date-container mt-2 hidden">
                <label class="text-sm text-gray-600 font-semibold">Escolha a data da presença (opcional):</label>
                <input type="date" class="presence-date-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>
            <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Confirmar Presença</button>
            <div class="text-xs text-gray-500 mt-1 presence-info"></div>
        `;
        container.appendChild(card);

        // O restante da sua função (event listeners, etc.) permanece exatamente o mesmo
        const checkbox = card.querySelector(".presence-checkbox");
        const infoDiv = card.querySelector(".presence-info");
        const confirmBtn = card.querySelector(".btn-confirm-presence");
        const dateContainer = card.querySelector(".presence-date-container");
        const dateInput = card.querySelector(".presence-date-input");
        const historyBtn = card.querySelector(".btn-history");

        const updatePresenceStatus = () => {
            if (!infoDiv) return;
            const presence = lastPresencesData[member.Nome];
            if (presence && presence.data && presence.data !== 'N/A') {
                let displayText = `Últ. presença: ${presence.data}`;
                if (presence.hora && presence.hora !== '00:00:00' && presence.hora !== 'N/A') {
                    displayText += ` às ${presence.hora}`;
                }
                if (presence.diaSemana) {
                    const diaFormatado = presence.diaSemana.charAt(0).toUpperCase() + presence.diaSemana.slice(1);
                    displayText += ` (${diaFormatado})`;
                }
                infoDiv.textContent = displayText;
                infoDiv.className = "text-xs text-green-700 mt-1 presence-info";
            } else {
                infoDiv.textContent = `Nenhuma presença registrada.`;
                infoDiv.className = "text-xs text-gray-500 mt-1 presence-info";
            }
        };

        updatePresenceStatus();

        historyBtn.addEventListener("click", () => showPresenceHistory(member.Nome));
        
        checkbox.addEventListener("change", function() {
            dateContainer.classList.toggle("hidden", !this.checked);
            confirmBtn.classList.toggle("hidden", !this.checked);
            if (this.checked) {
                infoDiv.textContent = "Clique em confirmar para registrar.";
                infoDiv.className = "text-xs text-gray-500 mt-1 presence-info";
            } else {
                updatePresenceStatus();
            }
        });

        confirmBtn.addEventListener("click", async () => {
            confirmBtn.disabled = true;
            infoDiv.textContent = `Registrando...`;
            infoDiv.className = "text-xs text-blue-700 mt-1 presence-info animate-pulse";
            
            const selectedDate = dateInput.value;
            let presenceDate, presenceTime;
            if (selectedDate) {
                presenceDate = selectedDate.split('-').reverse().join('/');
                presenceTime = "00:00:00";
            } else {
                const now = new Date();
                presenceDate = now.toLocaleDateString('pt-BR');
                presenceTime = now.toLocaleTimeString('pt-BR');
            }

            try {
                const response = await fetch(`${BACKEND_URL}/presenca`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'add', nome: member.Nome, data: presenceDate, hora: presenceTime })
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.message);
                
                showMessage('Presença registrada com sucesso!', 'success');
                fetchMembers(); 
            } catch (error) {
                showMessage(`Erro: ${error.message}`, 'error');
                updatePresenceStatus();
            } finally {
                checkbox.checked = false;
                confirmBtn.classList.add("hidden");
                dateContainer.classList.add("hidden");
                confirmBtn.disabled = false;
                infoDiv.classList.remove("animate-pulse");
            }
        });
    });
}

// --- Funções de Histórico de Presença ---

async function showPresenceHistory(memberName) {
    if (!historyModal || !historyModalTitle || !historyListContainer) return;

    historyModalTitle.textContent = `Histórico de Presenças de ${memberName}`;
    historyListContainer.innerHTML = `<p class="text-center text-gray-500">Carregando...</p>`;
    historyModal.classList.remove("hidden");

    try {
        const response = await fetch(`${BACKEND_URL}/presences/${encodeURIComponent(memberName)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        const presences = data.presences || [];
        if (presences.length === 0) {
            historyListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma presença registrada.</p>`;
            return;
        }

        // --- ALTERAÇÃO AQUI ---
        // Modificamos o HTML para incluir o dia da semana
        historyListContainer.innerHTML = `<ul class="space-y-2" id="history-ul">${presences.map(p => {
            const diaSemanaFormatado = p.diaSemana ? `(${p.diaSemana})` : '';
            const horaFormatada = (p.hora && p.hora !== '00:00:00') ? `às ${p.hora}` : '';

            return `
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                <span>
                    <i class="fas fa-check-circle text-green-500 mr-2"></i>
                    <strong>Data:</strong> ${p.data}
                    <span class="text-gray-600 text-sm ml-2">${diaSemanaFormatado}</span>
                    <span class="text-gray-500 text-xs ml-2">${horaFormatada}</span>
                </span>
                <button class="btn-remove-presence text-red-500 hover:text-red-700 font-bold" data-nome="${memberName}" data-data="${p.data}" title="Remover">&times;</button>
            </li>`;
        }).join('')}</ul>`;
    } catch (error) {
        historyListContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
    }
}

async function removePresence(nome, data) {
    showGlobalLoading(true, "Removendo presença...");
    try {
        const response = await fetch(`${BACKEND_URL}/presenca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', nome, data })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
        showMessage('Presença removida com sucesso!', 'success');
        showPresenceHistory(nome);
        fetchMembers(); 
    } catch (error) {
        showMessage(`Erro ao remover: ${error.message}`, 'error');
    } finally {
        showGlobalLoading(false);
    }
}

// --- Funções do Dashboard e Relatórios ---

function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;
    if (!dashboardContainer) return;
    
    dashboardContainer.classList.toggle('max-h-0', !isDashboardOpen);
    dashboardContainer.classList.toggle('opacity-0', !isDashboardOpen);
    dashboardContainer.classList.toggle('overflow-hidden', !isDashboardOpen);
    dashboardContainer.classList.toggle('max-h-screen', isDashboardOpen);

    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

async function fetchAndDisplaySummary() {
    const totalAbsencesList = document.getElementById("totalAbsencesList");
    if (!totalCountsList || !totalAbsencesList) {
        console.error("Elementos de lista do dashboard não encontrados no HTML.");
        return;
    }

    showGlobalLoading(true, "Carregando resumo...");
    try {
        const queryParams = new URLSearchParams({
            periodo: filterPeriodoSelect.value,
            lider: filterLiderInput.value,
            gape: filterGapeInput.value
        });
        
        // --- CHAMADA ÚNICA E OTIMIZADA ---
        // Usamos a mesma rota eficiente do modal detalhado
        const response = await fetch(`${BACKEND_URL}/detailed-summary?${queryParams.toString()}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Falha ao carregar resumo do painel.');
        }

        const summaryResponse = await response.json();
        if (!summaryResponse.success) {
            throw new Error(summaryResponse.message);
        }
        
        const summaryData = summaryResponse.data;
        const presencesDetails = summaryData.presences || {};
        const absencesDetails = summaryData.absences || {};

        // Processa os dados recebidos para os cards principais
        const totalPresences = Object.values(presencesDetails).reduce((sum, data) => sum + (data.totalPresencas || 0), 0);
        const totalAbsences = Object.values(absencesDetails).reduce((sum, data) => sum + (data.totalFaltas || 0), 0);
        
        dashboardPresencasMes.textContent = totalPresences;
        dashboardFaltasMes.textContent = totalAbsences;
        dashboardPeriodo.textContent = filterPeriodoSelect.options[filterPeriodoSelect.selectedIndex].text;
        dashboardLider.textContent = filterLiderInput.options[filterLiderInput.selectedIndex].text;
        dashboardGape.textContent = filterGapeInput.options[filterGapeInput.selectedIndex].text;

        // Atualiza a lista de Ranking de Presenças (em verde)
        const sortedPresences = Object.entries(presencesDetails).sort(([, a], [, b]) => b.totalPresencas - a.totalPresencas);
        totalCountsList.innerHTML = sortedPresences.length > 0 
            ? sortedPresences.map(([name, data]) => `<li class="text-sm text-green-300"><span class="font-semibold text-green-100">${name}:</span> ${data.totalPresencas} presenças</li>`).join('')
            : '<li class="text-sm text-gray-400 text-center">Nenhuma presença.</li>';

        // Atualiza a lista de Ranking de Faltas (em vermelho)
        const sortedAbsences = Object.entries(absencesDetails).sort(([, a], [, b]) => b.totalFaltas - a.totalFaltas);
        totalAbsencesList.innerHTML = sortedAbsences.length > 0
            ? sortedAbsences.map(([name, data]) => `<li class="text-sm text-red-300"><span class="font-semibold text-red-100">${name}:</span> ${data.totalFaltas} faltas</li>`).join('')
            : '<li class="text-sm text-gray-400 text-center">Nenhuma falta.</li>';

    } catch (error) {
        showMessage(`Erro ao carregar resumo: ${error.message}`, 'error');
        dashboardPresencasMes.textContent = '-';
        dashboardFaltasMes.textContent = '-';
    } finally {
        showGlobalLoading(false);
    }
}

function showDetailedSummary() {
    if (!detailedSummaryModal) return;
    populateSummaryMemberSelect();
    const today = new Date();
    summaryStartDateInput.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    summaryEndDateInput.value = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    updateDetailedSummaryChart();
    detailedSummaryModal.classList.remove("hidden");
    detailedSummaryModal.classList.add("flex");
}

function populateSummaryMemberSelect() {
    if (!summaryMemberSelect) return;
    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    const membersForSelect = [...new Set(filteredMembers.map(m => m.Nome).filter(Boolean))].sort();
    membersForSelect.forEach(name => {
        summaryMemberSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

// dashboard.js - Substitua sua função por esta versão

async function updateDetailedSummaryChart() {
    showGlobalLoading(true, "Carregando resumo detalhado...");

    // Limpa o estado anterior
    if (myChart) myChart.destroy();
    if (myBarChart) myBarChart.destroy();
    detailedSummaryText.innerHTML = '';
    const absentDatesList = document.getElementById('absentDatesList');
    const presentDatesList = document.getElementById('presentDatesList');
    if(absentDatesList) absentDatesList.innerHTML = '';
    if(presentDatesList) presentDatesList.innerHTML = '';

    try {
        const startDateStr = summaryStartDateInput.value;
        const endDateStr = summaryEndDateInput.value;
        const selectedMemberName = summaryMemberSelect.value;
        
        // Constrói os parâmetros de busca
        const queryParams = new URLSearchParams();
        if (startDateStr) queryParams.append('dataInicio', startDateStr);
        if (endDateStr) queryParams.append('dataFim', endDateStr);

        let title = '';
        let membersToAnalyze = [];

        // Define os filtros da busca
        if (selectedMemberName) {
            title = `Estatísticas para ${selectedMemberName}`;
            membersToAnalyze = allMembersData.filter(m => m.Nome === selectedMemberName);
            queryParams.append('nome', selectedMemberName);
        } else {
            title = 'Estatísticas do Grupo Filtrado';
            membersToAnalyze = filteredMembers;
            if (filterLiderInput.value) queryParams.append('lider', filterLiderInput.value);
            if (filterGapeInput.value) queryParams.append('gape', filterGapeInput.value);
            if (filterPeriodoSelect.value) queryParams.append('periodo', filterPeriodoSelect.value);
        }

        if (membersToAnalyze.length === 0) {
            detailedSummaryText.innerHTML = `<p class="text-lg font-semibold">Nenhum membro para analisar.</p>`;
            showGlobalLoading(false);
            return;
        }

        // --- CHAMADA ÚNICA E OTIMIZADA ---
        const response = await fetch(`${BACKEND_URL}/detailed-summary?${queryParams.toString()}`);
        if (!response.ok) throw new Error("Falha ao buscar dados detalhados.");
        
        const summaryResponse = await response.json();
        if (!summaryResponse.success) throw new Error(summaryResponse.message);
        
        const summaryData = summaryResponse.data;
        const presencesDetails = summaryData.presences || {};
        const absencesDetails = summaryData.absences || {};
        
        // Processa os dados recebidos
        const totalPresences = Object.values(presencesDetails).reduce((sum, data) => sum + data.totalPresencas, 0);
        const totalAbsences = Object.values(absencesDetails).reduce((sum, data) => sum + data.totalFaltas, 0);
        
        let summaryHtml, chartData, chartLabels, chartTitle;

        if (selectedMemberName) {
            // --- LÓGICA PARA VISÃO INDIVIDUAL ---
            const totalMeetingDays = summaryData.totalMeetingDays || (totalPresences + totalAbsences);
            summaryHtml = `
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${title}</h3>
                <ul class="list-disc list-inside text-gray-700 space-y-1">
                    <li>Total de Reuniões no Período: <span class="font-bold">${totalMeetingDays}</span></li>
                    <li>Presenças Registradas: <span class="font-bold text-green-600">${totalPresences}</span></li>
                    <li>Faltas Calculadas: <span class="font-bold text-red-600">${totalAbsences}</span></li>
                </ul>`;
            chartData = [totalPresences, totalAbsences];
            chartLabels = ['Presenças', 'Faltas'];
            chartTitle = 'Proporção Presenças vs Faltas';

        } else {
            // --- LÓGICA PARA VISÃO DE GRUPO ---
            const membersWithPresence = Object.keys(presencesDetails).length;
            const membersWithoutPresence = membersToAnalyze.length - membersWithPresence;
            summaryHtml = `
                <h3 class="text-lg font-semibold text-gray-800 mb-2">${title}</h3>
                <ul class="list-disc list-inside text-gray-700 space-y-1">
                    <li>Total de Membros Analisados: <span class="font-bold">${membersToAnalyze.length}</span></li>
                    <li>Membros com Presença no Período: <span class="font-bold text-green-600">${membersWithPresence}</span></li>
                    <li>Membros Sem Presença no Período: <span class="font-bold text-red-600">${membersWithoutPresence}</span></li>
                    <li>Total de Faltas Registradas no Grupo: <span class="font-bold">${totalAbsences}</span></li>
                </ul>`;
            chartData = [membersWithPresence, membersWithoutPresence];
            chartLabels = ['Membros com Presença', 'Membros Sem Presença'];
            chartTitle = 'Proporção de Membros com/sem Presença';
        }

        detailedSummaryText.innerHTML = summaryHtml;
        
        let presencesHtml = Object.entries(presencesDetails).map(([name, data]) => (selectedMemberName ? '' : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) + (data.presencas || []).map(date => `<li class="text-sm text-gray-800">${date}</li>`).join('')).join('');
        let absencesHtml = Object.entries(absencesDetails).map(([name, data]) => (selectedMemberName ? '' : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) + (data.faltas || []).map(date => `<li class="text-sm text-gray-800">${date}</li>`).join('')).join('');

        if (presentDatesList) presentDatesList.innerHTML = presencesHtml || '<li>Nenhuma presença no período.</li>';
        if (absentDatesList) absentDatesList.innerHTML = absencesHtml || '<li>Nenhuma falta no período.</li>';

        // Lógica do gráfico (agora unificada)
        const pieCtx = summaryChartCanvas.getContext('2d');
        myChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{ data: chartData, backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'] }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: chartTitle },
                    datalabels: {
                        formatter: (value, context) => {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            if (total === 0 || value === 0) return '';
                            return (value / total * 100).toFixed(1) + '%';
                        },
                        color: '#fff', font: { weight: 'bold', size: 14 }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

    } catch (error) {
        showMessage(`Erro ao atualizar resumo: ${error.message}`, 'error');
        detailedSummaryText.innerHTML = `<p class="text-red-500">Falha ao carregar dados: ${error.message}</p>`;
    } finally {
        showGlobalLoading(false);
    }
}

async function handleDownloadPdf() {
  const doc = new jsPDF();
  const container = document.getElementById('detailedSummaryContent');
  const canvas = await html2canvas(container);

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 10, 10, 180, 0);
  doc.save('resumo_presenca.pdf');
}

function fillSelectOptions() {
    const lideres = [...new Set(allMembersData.map(m => m.Lider).filter(Boolean))].sort();
    const gapes = [...new Set(allMembersData.map(m => m.GAPE).filter(Boolean))].sort();

    if (filterLiderInput) {
        filterLiderInput.innerHTML = '<option value="">Todos</option>' + lideres.map(l => `<option value="${l}">${l}</option>`).join('');
    }
    if (filterGapeInput) {
        filterGapeInput.innerHTML = '<option value="">Todos</option>' + gapes.map(g => `<option value="${g}">${g}</option>`).join('');
    }
}

// --- Funções de Autenticação e Visão de Líder ---

function displayLoggedInLeaderName() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (loggedInLeaderNameElement) {
        loggedInLeaderNameElement.innerHTML = leaderName 
            ? `Logado como: <span class="text-blue-600 font-bold">${leaderName}</span>`
            : `Logado como: Não identificado`;
    }
}

function setupLeaderView() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (leaderName && leaderName !== 'admin') {
        const loggedInMember = allMembersData.find(member => 
            (member.Nome || '').toLowerCase().trim() === leaderName.toLowerCase().trim()
        );
        if (loggedInMember) {
            if (filterLiderInput) filterLiderInput.value = loggedInMember.Lider;
            if (filterGapeInput) filterGapeInput.value = loggedInMember.GAPE;
        }
        if (filterLiderInput) filterLiderInput.disabled = true;
        if (filterGapeInput) filterGapeInput.disabled = true;
        applyFilters();
        if (isDashboardOpen) fetchAndDisplaySummary();
    }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    fetchMembers();
    displayLoggedInLeaderName();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('loggedInLeaderName');
            window.location.href = 'index.html';
        });
    }

    if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", () => { applyFilters(); if(isDashboardOpen) fetchAndDisplaySummary(); });
    if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", () => {
        if(filterNameInput) filterNameInput.value = "";
        if(filterPeriodoSelect) filterPeriodoSelect.value = "";
        if(!filterLiderInput?.disabled) filterLiderInput.value = "";
        if(!filterGapeInput?.disabled) filterGapeInput.value = "";
        applyFilters();
        if(isDashboardOpen) fetchAndDisplaySummary();
    });

    if (toggleDashboardBtn) toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
    if (showDetailedSummaryBtn) showDetailedSummaryBtn.addEventListener("click", showDetailedSummary);
    if (closeModalBtn) closeModalBtn.addEventListener("click", () => detailedSummaryModal.classList.add("hidden"));
    if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener("click", () => historyModal.classList.add("hidden"));
    
    if (historyListContainer) {
        historyListContainer.addEventListener("click", (e) => {
            const button = e.target.closest('.btn-remove-presence');
            if (button) {
                const { nome, data } = button.dataset;
                if (confirm(`Tem certeza que deseja remover a presença de ${nome} do dia ${data}?`)) {
                    removePresence(nome, data);
                }
            }
        });
    }

    // Listeners para filtros do modal de resumo
    if(applySummaryFiltersBtn) applySummaryFiltersBtn.addEventListener("click", updateDetailedSummaryChart);
    if(summaryStartDateInput) summaryStartDateInput.addEventListener("change", updateDetailedSummaryChart);
    if(summaryEndDateInput) summaryEndDateInput.addEventListener("change", updateDetailedSummaryChart);
    if(summaryMemberSelect) summaryMemberSelect.addEventListener("change", updateDetailedSummaryChart);
    if(downloadPdfBtn) downloadPdfBtn.addEventListener("click", handleDownloadPdf);
});
