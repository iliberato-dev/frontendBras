let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {};
let myChart = null;
let myBarChart = null;
let isDashboardOpen = false;

const BACKEND_URL = 'https://backendbras.onrender.com';

// Seletores de Elementos
const globalLoadingIndicator = document.getElementById('globalLoadingIndicator');
const loadingMessage = document.getElementById('loadingMessage');
const messageArea = document.getElementById('messageArea');
const loggedInLeaderNameEl = document.getElementById('loggedInLeaderName');
const logoutBtn = document.getElementById('logoutBtn');
const filterNameInput = document.getElementById('filterName');
const filterPeriodoSelect = document.getElementById('filterPeriodo');
const filterLiderSelect = document.getElementById('filterLider');
const filterGapeSelect = document.getElementById('filterGape');
const toggleDashboardBtn = document.getElementById('toggleDashboardBtn');
const showDetailedSummaryBtn = document.getElementById('showDetailedSummaryBtn');
const membersCardsContainer = document.getElementById('membersCardsContainer');
const dashboardContainer = document.getElementById('dashboardContainer');
const dashboardPresencasMes = document.getElementById('dashboardPresencasMes');
const dashboardFaltasMes = document.getElementById('dashboardFaltasMes');
const dashboardPeriodo = document.getElementById('dashboardPeriodo');
const dashboardLider = document.getElementById('dashboardLider');
const dashboardGape = document.getElementById('dashboardGape');
const totalCountsList = document.getElementById('totalCountsList');
const totalAbsencesList = document.getElementById('totalAbsencesList');

// Modal de Resumo Detalhado
const detailedSummaryModal = document.getElementById('detailedSummaryModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const summaryStartDateInput = document.getElementById('summaryStartDate');
const summaryEndDateInput = document.getElementById('summaryEndDate');
const summaryMemberSelect = document.getElementById('summaryMemberSelect');
const detailedSummaryText = document.getElementById('detailedSummaryText');
const summaryChartCanvas = document.getElementById('summaryChart');
const summaryBarChartCanvas = document.getElementById('summaryBarChart');
const absentDatesList = document.getElementById('absentDatesList');
const presentDatesList = document.getElementById('presentDatesList');

// Modal de Histórico
const historyModal = document.getElementById('historyModal');
const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
const historyModalTitle = document.getElementById('historyModalTitle');
const presenceHistoryListContainer = document.getElementById('presenceHistoryListContainer');


document.addEventListener('DOMContentLoaded', () => {
    if (!sessionStorage.getItem('leaderName')) {
        window.location.href = 'index.html';
        return;
    }
    fetchMembers();
    displayLoggedInLeaderName();
    setupEventListeners();
    Chart.register(ChartDataLabels);
});

function setupEventListeners() {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });

    [filterNameInput, filterPeriodoSelect, filterLiderSelect, filterGapeSelect].forEach(el => {
        el.addEventListener('input', applyFilters);
    });

    toggleDashboardBtn.addEventListener('click', toggleDashboardVisibility);
    showDetailedSummaryBtn.addEventListener('click', showDetailedSummary);
    closeModalBtn.addEventListener('click', () => detailedSummaryModal.classList.add('hidden'));
    closeHistoryModalBtn.addEventListener('click', () => historyModal.classList.add('hidden'));

    [summaryStartDateInput, summaryEndDateInput, summaryMemberSelect].forEach(el => {
        el.addEventListener('change', updateDetailedSummaryChart);
    });

    // Event delegation for dynamically created buttons
    document.body.addEventListener('click', e => {
        if (e.target.closest('.btn-history')) {
            const memberName = e.target.closest('.btn-history').dataset.memberName;
            showPresenceHistory(memberName);
        }
        if (e.target.closest('.btn-remove-presence')) {
            const button = e.target.closest('.btn-remove-presence');
            const nome = button.dataset.nome;
            const data = button.dataset.data;
            if (confirm(`Tem certeza que deseja remover a presença de ${nome} na data ${data}?`)) {
                removePresence(nome, data);
            }
        }
    });
}

function showGlobalLoading(show, message = 'Carregando...') {
    loadingMessage.textContent = message;
    globalLoadingIndicator.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.className = `message-box text-center py-2 px-4 rounded-lg shadow-md mb-4 transition-all duration-500 ease-in-out ${
        type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`;
    messageArea.classList.remove('hidden');
    setTimeout(() => messageArea.classList.add('hidden'), 5000);
}

async function fetchMembers() {
    showGlobalLoading(true, 'Buscando dados dos membros...');
    try {
        const [membrosRes, presencesRes] = await Promise.all([
            fetch(`${BACKEND_URL}/get-membros`),
            fetch(`${BACKEND_URL}/get-all-last-presences`)
        ]);
        if (!membrosRes.ok || !presencesRes.ok) throw new Error('Falha ao comunicar com o servidor.');

        const membrosData = await membrosRes.json();
        const presencesData = await presencesRes.json();

        if (!membrosData.success) throw new Error(membrosData.message);
        if (!presencesData.success) throw new Error(presencesData.message);

        allMembersData = membrosData.membros;
        lastPresencesData = presencesData.data;
        
        setupLeaderView();
        fillSelectOptions();
        applyFilters();

    } catch (error) {
        showMessage(`Erro Crítico: ${error.message}`, 'error');
    } finally {
        showGlobalLoading(false);
    }
}

function applyFilters() {
    const nameFilter = filterNameInput.value.toLowerCase();
    const periodoFilter = filterPeriodoSelect.value;
    const liderFilter = filterLiderSelect.value;
    const gapeFilter = filterGapeSelect.value;

    filteredMembers = allMembersData.filter(member => {
        const nameMatch = member.Nome.toLowerCase().includes(nameFilter);
        const periodoMatch = !periodoFilter || member.Periodo === periodoFilter;
        const liderMatch = !liderFilter || member.Lider.includes(liderFilter);
        const gapeMatch = !gapeFilter || member.GAPE === gapeFilter;
        return nameMatch && periodoMatch && liderMatch && gapeMatch;
    });

    displayMembers(filteredMembers);
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

function displayMembers(members) {
    membersCardsContainer.innerHTML = "";
    if (members.length === 0) {
        membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-gray-500">Nenhum membro encontrado com os filtros atuais.</div>`;
        return;
    }

    members.forEach(member => {
        const card = document.createElement("div");
        card.className = "fade-in-row bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative";
        
        const lastPresence = lastPresencesData[member.Nome];
        let presenceInfoHtml = `<div class="text-xs text-gray-500 mt-1 presence-info">Nenhuma presença registrada.</div>`;
        if (lastPresence && lastPresence.data !== 'N/A') {
            let displayText = `Últ. presença: ${lastPresence.data}`;
            if (lastPresence.hora && lastPresence.hora !== '00:00:00' && lastPresence.hora !== 'N/A') {
                displayText += ` às ${lastPresence.hora}`;
            }
            if (lastPresence.diaSemana) {
                const diaFormatado = lastPresence.diaSemana.charAt(0).toUpperCase() + lastPresence.diaSemana.slice(1);
                displayText += ` (${diaFormatado})`;
            }
            presenceInfoHtml = `<div class="text-xs text-green-700 mt-1 presence-info">${displayText}</div>`;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                    <div class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 flex-shrink-0 group">
                        <img src="${member.FotoURL || 'https://png.pngtree.com/png-vector/20191208/ourmid/pngtree-beautiful-create-user-glyph-vector-icon-png-image_2084391.jpg'}" alt="Foto de ${member.Nome}" class="member-photo w-full h-full object-cover">
                    </div>
                    <div class="font-bold text-lg text-gray-800">${member.Nome || "N/A"}</div>
                </div>
                <button class="btn-history text-gray-400 hover:text-blue-600 transition" data-member-name="${member.Nome}" title="Ver Histórico de Presenças">
                    <i class="fas fa-history fa-lg"></i>
                </button>
            </div>
            <div class="text-sm text-gray-600"><b>Período:</b> ${member.Periodo || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>Líder:</b> ${member.Lider || "N/A"}</div>
            <div class="text-sm text-gray-600"><b>GAPE:</b> ${member.GAPE || "N/A"}</div>
            <label class="flex items-center gap-2 mt-2">
                <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox">
                <span class="text-sm text-gray-700">Registrar Presença</span>
            </label>
            <div class="presence-date-container mt-2 hidden">
                <label class="text-sm text-gray-600 font-semibold">Data da presença (opcional):</label>
                <input type="date" class="presence-date-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>
            <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Confirmar</button>
            ${presenceInfoHtml}
        `;
        membersCardsContainer.appendChild(card);

        const checkbox = card.querySelector(".presence-checkbox");
        const confirmBtn = card.querySelector(".btn-confirm-presence");
        const dateContainer = card.querySelector(".presence-date-container");
        
        checkbox.addEventListener("change", function() {
            dateContainer.classList.toggle("hidden", !this.checked);
            confirmBtn.classList.toggle("hidden", !this.checked);
        });

        confirmBtn.addEventListener("click", async () => {
            showGlobalLoading(true, 'Registrando...');
            const dateInput = card.querySelector(".presence-date-input");
            const selectedDate = dateInput.value;
            let presenceDate, presenceTime;

            if (selectedDate) {
                const [year, month, day] = selectedDate.split('-');
                presenceDate = `${day}/${month}/${year}`;
                presenceTime = "00:00:00";
            } else {
                const now = new Date();
                presenceDate = now.toLocaleDateString('pt-BR');
                presenceTime = now.toLocaleTimeString('pt-BR', { hour12: false });
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
            } finally {
                showGlobalLoading(false);
            }
        });
    });
}

async function showPresenceHistory(memberName) {
    historyModalTitle.textContent = `Histórico de Presenças de ${memberName}`;
    presenceHistoryListContainer.innerHTML = `<p class="text-center text-gray-500">Carregando...</p>`;
    historyModal.classList.remove("hidden");

    try {
        const response = await fetch(`${BACKEND_URL}/presences/${encodeURIComponent(memberName)}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        const presences = data.presences || [];
        if (presences.length === 0) {
            presenceHistoryListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma presença registrada.</p>`;
            return;
        }

        presenceHistoryListContainer.innerHTML = `<ul class="space-y-2">${presences.map(p => {
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
                <button class="btn-remove-presence text-red-500 hover:text-red-700 font-bold text-xl" data-nome="${memberName}" data-data="${p.data}" title="Remover">&times;</button>
            </li>`;
        }).join('')}</ul>`;
    } catch (error) {
        presenceHistoryListContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
    }
}

async function removePresence(nome, data) {
    showGlobalLoading(true, 'Removendo presença...');
    try {
        const response = await fetch(`${BACKEND_URL}/presenca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', nome, data })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        showMessage('Presença removida com sucesso!', 'success');
        showPresenceHistory(nome); // Refresh the history list
    } catch (error) {
        showMessage(`Erro ao remover presença: ${error.message}`, 'error');
    } finally {
        showGlobalLoading(false);
    }
}

function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;
    const iconOpen = document.getElementById('dashboardOpenIcon');
    const textOpen = document.getElementById('dashboardOpenText');
    const iconClose = document.getElementById('dashboardCloseIcon');
    const textClose = document.getElementById('dashboardCloseText');

    if (isDashboardOpen) {
        dashboardContainer.classList.remove('max-h-0', 'opacity-0');
        dashboardContainer.classList.add('max-h-screen', 'opacity-100');
        iconOpen.classList.add('hidden');
        textOpen.classList.add('hidden');
        iconClose.classList.remove('hidden');
        textClose.classList.remove('hidden');
        fetchAndDisplaySummary();
    } else {
        dashboardContainer.classList.add('max-h-0', 'opacity-0');
        dashboardContainer.classList.remove('max-h-screen');
        iconOpen.classList.remove('hidden');
        textOpen.classList.remove('hidden');
        iconClose.classList.add('hidden');
        textClose.classList.add('hidden');
    }
}

async function fetchAndDisplaySummary() {
    showGlobalLoading(true, "Carregando resumo...");
    try {
        const queryParams = new URLSearchParams({
            periodo: filterPeriodoSelect.value,
            lider: filterLiderSelect.value,
            gape: filterGapeSelect.value
        });
        
        const [presencesRes, absencesRes] = await Promise.all([
            fetch(`${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`),
            fetch(`${BACKEND_URL}/get-faltas?${queryParams.toString()}`)
        ]);

        if (!presencesRes.ok || !absencesRes.ok) throw new Error('Falha ao buscar dados para o resumo.');

        const presencesResponse = await presencesRes.json();
        const absencesResponse = await absencesRes.json();

        const presencesData = presencesResponse.data || {};
        const absencesData = absencesResponse.data || {};

        const totalPresences = Object.values(presencesData).reduce((sum, data) => sum + (data.totalPresencas || 0), 0);
        const totalAbsences = Object.values(absencesData).reduce((sum, data) => sum + (data.totalFaltas || 0), 0);
        
        dashboardPresencasMes.textContent = totalPresences;
        dashboardFaltasMes.textContent = totalAbsences;
        dashboardPeriodo.textContent = filterPeriodoSelect.options[filterPeriodoSelect.selectedIndex].text;
        dashboardLider.textContent = filterLiderSelect.options[filterLiderSelect.selectedIndex].text;
        dashboardGape.textContent = filterGapeSelect.options[filterGapeSelect.selectedIndex].text;

        const sortedPresences = Object.entries(presencesData).sort(([, a], [, b]) => b.totalPresencas - a.totalPresencas);
        totalCountsList.innerHTML = sortedPresences.length > 0 
            ? sortedPresences.map(([name, data]) => `<li class="text-sm text-green-300"><span class="font-semibold text-green-100">${name}:</span> ${data.totalPresencas} presenças</li>`).join('')
            : '<li class="text-sm text-gray-400 text-center">Nenhuma presença.</li>';

        const sortedAbsences = Object.entries(absencesData).sort(([, a], [, b]) => b.totalFaltas - a.totalFaltas);
        totalAbsencesList.innerHTML = sortedAbsences.length > 0
            ? sortedAbsences.map(([name, data]) => `<li class="text-sm text-red-300"><span class="font-semibold text-red-100">${name}:</span> ${data.totalFaltas} faltas</li>`).join('')
            : '<li class="text-sm text-gray-400 text-center">Nenhuma falta.</li>';

    } catch (error) {
        showMessage(`Erro ao carregar resumo: ${error.message}`, "error");
    } finally {
        showGlobalLoading(false);
    }
}

function showDetailedSummary() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    summaryStartDateInput.value = firstDayOfMonth;
    summaryEndDateInput.value = lastDayOfMonth;
    
    populateSummaryMemberSelect();
    detailedSummaryModal.classList.remove('hidden');
    updateDetailedSummaryChart();
}

function populateSummaryMemberSelect() {
    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    filteredMembers.sort((a, b) => a.Nome.localeCompare(b.Nome)).forEach(member => {
        const option = document.createElement('option');
        option.value = member.Nome;
        option.textContent = member.Nome;
        summaryMemberSelect.appendChild(option);
    });
}

async function updateDetailedSummaryChart() {
    showGlobalLoading(true, "Carregando resumo detalhado...");
    if (myChart) myChart.destroy();
    if (myBarChart) myBarChart.destroy();
    detailedSummaryText.innerHTML = '';
    absentDatesList.innerHTML = '';
    presentDatesList.innerHTML = '';

    try {
        const startDateStr = summaryStartDateInput.value;
        const endDateStr = summaryEndDateInput.value;
        const selectedMemberName = summaryMemberSelect.value;
        
        const queryParams = new URLSearchParams();
        if (startDateStr) queryParams.append('dataInicio', startDateStr);
        if (endDateStr) queryParams.append('dataFim', endDateStr);

        let title = '';
        let membersToAnalyze = [];

        if (selectedMemberName) {
            title = `Estatísticas para ${selectedMemberName}`;
            membersToAnalyze = [allMembersData.find(m => m.Nome === selectedMemberName)];
            queryParams.append('nome', selectedMemberName);
        } else {
            title = 'Estatísticas do Grupo Filtrado';
            membersToAnalyze = filteredMembers;
            if (filterLiderSelect.value) queryParams.append('lider', filterLiderSelect.value);
            if (filterGapeSelect.value) queryParams.append('gape', filterGapeSelect.value);
            if (filterPeriodoSelect.value) queryParams.append('periodo', filterPeriodoSelect.value);
        }

        if (!membersToAnalyze || membersToAnalyze.length === 0) {
            detailedSummaryText.innerHTML = `<p>Nenhum membro para analisar.</p>`;
            return;
        }

        const [presencesRes, absencesRes] = await Promise.all([
            fetch(`${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`),
            fetch(`${BACKEND_URL}/get-faltas?${queryParams.toString()}`)
        ]);
        if (!presencesRes.ok || !absencesRes.ok) throw new Error("Falha ao buscar dados detalhados.");
        
        const presencesResponse = await presencesRes.json();
        const absencesResponse = await absencesRes.json();
        
        const presencesDetails = presencesResponse.data || {};
        const absencesDetails = absencesResponse.data || {};

        let totalPresences = Object.values(presencesDetails).reduce((sum, data) => sum + data.totalPresencas, 0);
        let totalAbsences = Object.values(absencesDetails).reduce((sum, data) => sum + data.totalFaltas, 0);
        
        detailedSummaryText.innerHTML = `<h3 class="text-lg font-semibold text-gray-800 mb-2">${title}</h3>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Total de Membros Analisados: <span class="font-bold">${membersToAnalyze.length}</span></li>
                <li>Total de Presenças Registradas: <span class="font-bold text-green-600">${totalPresences}</span></li>
                <li>Total de Faltas Calculadas: <span class="font-bold text-red-600">${totalAbsences}</span></li>
            </ul>`;

        let presencesHtml = Object.entries(presencesDetails).map(([name, data]) => 
            (selectedMemberName ? '' : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) + 
            data.presencas.map(date => `<li class="text-sm text-gray-800">${date}</li>`).join('')
        ).join('');
        
        let absencesHtml = Object.entries(absencesDetails).map(([name, data]) => 
            (selectedMemberName ? '' : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) +
            data.faltas.map(date => `<li class="text-sm text-gray-800">${date}</li>`).join('')
        ).join('');

        presentDatesList.innerHTML = presencesHtml || '<li>Nenhuma presença no período.</li>';
        absentDatesList.innerHTML = absencesHtml || '<li>Nenhuma falta no período.</li>';
        
        const chartOptions = {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Proporção Presenças vs Faltas' },
                datalabels: {
                    formatter: (value, context) => {
                        const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        if (total === 0 || value === 0) return '';
                        const percentage = (value / total * 100).toFixed(1) + '%';
                        return percentage;
                    },
                    color: '#fff', font: { weight: 'bold', size: 14 }
                }
            }
        };

        const pieCtx = summaryChartCanvas.getContext('2d');
        myChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Presenças', 'Faltas'],
                datasets: [{
                    data: [totalPresences, totalAbsences],
                    backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
                }]
            },
            options: chartOptions,
            plugins: [ChartDataLabels]
        });

    } catch (error) {
        showMessage(`Erro ao atualizar resumo: ${error.message}`, 'error');
        detailedSummaryText.innerHTML = `<p class="text-red-500">Falha ao carregar dados: ${error.message}</p>`;
    } finally {
        showGlobalLoading(false);
    }
}

function fillSelectOptions() {
    const lideres = new Set();
    const gapes = new Set();
    allMembersData.forEach(member => {
        if (member.Lider) lideres.add(member.Lider);
        if (member.GAPE) gapes.add(member.GAPE);
    });

    filterLiderSelect.innerHTML = '<option value="">Todos</option>';
    [...lideres].sort().forEach(lider => {
        const option = document.createElement('option');
        option.value = lider;
        option.textContent = lider;
        filterLiderSelect.appendChild(option);
    });

    filterGapeSelect.innerHTML = '<option value="">Todos</option>';
    [...gapes].sort().forEach(gape => {
        const option = document.createElement('option');
        option.value = gape;
        option.textContent = gape;
        filterGapeSelect.appendChild(option);
    });
}

function displayLoggedInLeaderName() {
    const leaderName = sessionStorage.getItem('leaderName');
    if (leaderName) {
        loggedInLeaderNameEl.textContent = `Logado como: ${leaderName === 'admin' ? 'Administrador' : leaderName}`;
    }
}

function setupLeaderView() {
    const leaderName = sessionStorage.getItem('leaderName');
    if (leaderName && leaderName !== 'admin') {
        filterLiderSelect.value = leaderName;
        filterLiderSelect.disabled = true;
    } else {
        filterLiderSelect.disabled = false;
    }
}
