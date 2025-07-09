// const BACKEND_URL = "https://backendbras.onrender.com"; // **ATUALIZE COM A URL DO SEU BACKEND NO RENDER**
// ------------------------------------------------------
// Frontend JavaScript (dashboard.js) - SEM ALTERAÇÕES NECESSÁRIAS
// ------------------------------------------------------

const BACKEND_URL = "https://backendbras.onrender.com"; // **ATUALIZE COM A URL DO SEU BACKEND NO RENDER**

let allMembers = []; // Armazena todos os membros para uso nos filtros
let currentFilteredMembersData = []; // Armazena os dados dos membros filtrados para o dashboard
let currentDetailedPresences = []; // Armazena as presenças detalhadas para o modal
let calendar; // Instância do FullCalendar

// Referências aos elementos do DOM
const messageArea = document.getElementById('messageArea');
const loggedInLeaderNameSpan = document.getElementById('loggedInLeaderName');
const logoutBtn = document.getElementById('logoutBtn');
const filterNameInput = document.getElementById('filterName');
const filterPeriodoSelect = document.getElementById('filterPeriodo');
const filterLiderSelect = document.getElementById('filterLider');
const filterGapeSelect = document.getElementById('filterGape');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const toggleDashboardBtn = document.getElementById('toggleDashboardBtn');
const dashboardContainer = document.getElementById('dashboardContainer');
const dashboardOpenIcon = document.getElementById('dashboardOpenIcon');
const dashboardOpenText = document.getElementById('dashboardOpenText');
const dashboardCloseIcon = document.getElementById('dashboardCloseIcon');
const dashboardCloseText = document.getElementById('dashboardCloseText');
const dashboardPresencasMes = document.getElementById('dashboardPresencasMes');
const dashboardPeriodo = document.getElementById('dashboardPeriodo');
const dashboardLider = document.getElementById('dashboardLider');
const dashboardGape = document.getElementById('dashboardGape');
const totalCountsList = document.getElementById('totalCountsList');
const membersCardsContainer = document.getElementById('membersCardsContainer');

// Elementos do Modal de Resumo Detalhado
const showDetailedSummaryBtn = document.getElementById('showDetailedSummaryBtn');
const detailedSummaryModal = document.getElementById('detailedSummaryModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const detailedSummaryContent = document.getElementById('detailedSummaryContent');
const reportInfoDiv = document.getElementById('reportInfo');
const detailedSummaryTextDiv = document.getElementById('detailedSummaryText');
const summaryStartDateInput = document.getElementById('summaryStartDate');
const summaryEndDateInput = document.getElementById('summaryEndDate');
const summaryMemberSelect = document.getElementById('summaryMemberSelect');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

let summaryPieChart = null;
let summaryBarChart = null;

// --- Funções de UI ---

function showMessage(message, type = 'info', duration = 5000) {
    messageArea.textContent = message;
    messageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800', 'bg-yellow-100', 'text-yellow-800');

    if (type === 'success') {
        messageArea.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        messageArea.classList.add('bg-red-100', 'text-red-800');
    } else if (type === 'warning') {
        messageArea.classList.add('bg-yellow-100', 'text-yellow-800');
    } else {
        messageArea.classList.add('bg-blue-100', 'text-blue-800');
    }
    messageArea.classList.add('fade-in-out'); // Adiciona classe para animação
    messageArea.classList.remove('hidden');

    setTimeout(() => {
        messageArea.classList.add('hidden');
        messageArea.classList.remove('fade-in-out');
    }, duration);
}

function showLoadingIndicator(message = "Carregando...") {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('globalLoadingIndicator').classList.remove('opacity-0', 'pointer-events-none');
    document.getElementById('globalLoadingIndicator').classList.add('opacity-100');
}

function hideLoadingIndicator() {
    document.getElementById('globalLoadingIndicator').classList.remove('opacity-100');
    document.getElementById('globalLoadingIndicator').classList.add('opacity-0', 'pointer-events-none');
}

// --- Funções de Dados ---

async function fetchMembers() {
    showLoadingIndicator("Buscando membros...");
    try {
        const response = await fetch(`${BACKEND_URL}/get-membros`);
        const data = await response.json();
        
        // CORREÇÃO AQUI: Verifique se data.data existe e, em seguida, acesse data.data.membros
        if (data.success && data.data && data.data.membros) { // <-- Lógica Corrigida
            allMembers = data.data.membros; // <-- Acessando a propriedade correta
            populateFilterOptions(allMembers);
            applyFilters(); // Aplica os filtros iniciais e renderiza os cards
        } else {
            // Se 'data.data.membros' não existir, ou 'success' for falso, ou 'data' não existir
            showMessage(`Erro ao carregar membros: ${data.message || 'Dados de membros não encontrados ou erro desconhecido.'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao buscar membros:', error);
        showMessage('Erro ao conectar com o servidor para buscar membros. Verifique sua conexão e o backend.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function fetchLastPresences() {
    try {
        const response = await fetch(`${BACKEND_URL}/get-all-last-presences`);
        const data = await response.json();
        if (data.success && data.data) {
            return data.data; // Retorna um objeto { 'Nome Membro': { data: 'DD/MM/YYYY', hora: 'HH:MM' } }
        } else {
            console.error('Erro ao buscar últimas presenças:', data.message);
            return {};
        }
    } catch (error) {
        console.error('Erro de rede ao buscar últimas presenças:', error);
        return {};
    }
}

async function registerPresence(member) {
    showLoadingIndicator("Registrando presença...");
    try {
        // Obter a data e hora atual do cliente
        const now = new Date();
        const clientDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const clientTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

        const response = await fetch(`${BACKEND_URL}/presenca`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: member.Nome,
                data: clientDate,
                hora: clientTime,
                sheet: 'Presenças' // Nome da sua planilha de presenças
            })
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`Presença de ${member.Nome} registrada com sucesso!`, 'success');
            // Atualiza apenas o card do membro específico
            updateMemberCard(member.Nome, clientDate, clientTime);
            // Re-fetch e atualiza o dashboard para refletir a nova presença
            await updateDashboardSummary();
        } else {
            showMessage(`Erro ao registrar presença para ${member.Nome}: ${data.message}`, 'warning');
        }
    } catch (error) {
        console.error('Erro ao registrar presença:', error);
        showMessage('Erro ao conectar com o servidor para registrar presença.', 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function updateDashboardSummary() {
    showLoadingIndicator("Atualizando dashboard...");
    try {
        const filterPeriodo = filterPeriodoSelect.value;
        const filterLider = filterLiderSelect.value;
        const filterGape = filterGapeSelect.value;

        const queryParams = new URLSearchParams();
        if (filterPeriodo) queryParams.append('periodo', filterPeriodo);
        if (filterLider) queryParams.append('lider', filterLider);
        if (filterGape) queryParams.append('gape', filterGape);
        
        const response = await fetch(`${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`);
        const data = await response.json();

        if (data.success !== false) { // Verifica se não houve erro no backend (Apps Script retornaria success: false)
            const totalCounts = data.totalPresences || {};
            const generalTotal = data.generalTotal || 0;

            dashboardPresencasMes.textContent = generalTotal;
            dashboardPeriodo.textContent = filterPeriodo || 'Todos';
            dashboardLider.textContent = filterLider || 'Todos';
            dashboardGape.textContent = filterGape || 'Todos';

            totalCountsList.innerHTML = '';
            const sortedMembers = Object.entries(totalCounts).sort((a, b) => b[1] - a[1]); // Ordena por contagem (maior primeiro)

            if (sortedMembers.length === 0) {
                totalCountsList.innerHTML = '<li class="text-sm text-gray-400 text-center">Nenhuma presença encontrada com os filtros atuais.</li>';
            } else {
                sortedMembers.forEach(([name, count]) => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center bg-gray-800 p-2 rounded';
                    li.innerHTML = `<span class="font-medium text-gray-100">${name}</span>
                                    <span class="text-green-400 font-bold">${count}</span>`;
                    totalCountsList.appendChild(li);
                });
            }
        } else {
            showMessage(`Erro ao carregar dashboard: ${data.message}`, 'error');
            resetDashboardDisplays(); // Limpa os displays em caso de erro
        }
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
        showMessage('Erro de rede ao carregar o dashboard.', 'error');
        resetDashboardDisplays(); // Limpa os displays em caso de erro
    } finally {
        hideLoadingIndicator();
    }
}

function resetDashboardDisplays() {
    dashboardPresencasMes.textContent = '0';
    dashboardPeriodo.textContent = 'N/A';
    dashboardLider.textContent = 'N/A';
    dashboardGape.textContent = 'N/A';
    totalCountsList.innerHTML = '<li class="text-sm text-gray-400 text-center">Nenhum dado disponível.</li>';
}


// --- Funções de Renderização ---

async function renderMemberCards(members) {
    membersCardsContainer.innerHTML = '';
    showLoadingIndicator("Carregando cards de membros...");
    const lastPresences = await fetchLastPresences(); // Busca as últimas presenças uma vez

    if (members.length === 0) {
        membersCardsContainer.innerHTML = '<p class="text-gray-600 text-center col-span-full">Nenhum membro encontrado com os filtros aplicados.</p>';
        hideLoadingIndicator();
        return;
    }

    members.forEach(member => {
        const lastPresence = lastPresences[member.Nome] || { data: 'N/A', hora: 'N/A' };
        const card = document.createElement('div');
        card.className = 'member-card bg-white p-4 rounded-lg shadow-md flex flex-col items-center text-center transition-transform transform hover:scale-105 hover:shadow-lg fade-in';
        card.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-1">${member.Nome}</h3>
            <p class="text-sm text-gray-600">Período: <span class="font-medium">${member.Periodo}</span></p>
            <p class="text-sm text-gray-600">Líder: <span class="font-medium">${member.Lider}</span></p>
            <p class="text-sm text-gray-600 mb-2">GAPE: <span class="font-medium">${member.GAPE}</span></p>
            <p class="text-xs text-gray-500 mb-3">Última Presença: ${lastPresence.data} às ${lastPresence.hora}</p>
            <button class="btn-register-presence bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition duration-300 w-full">
                <i class="fas fa-check-circle mr-2"></i> Registrar Presença
            </button>
        `;
        const registerBtn = card.querySelector('.btn-register-presence');
        registerBtn.addEventListener('click', () => registerPresence(member));
        membersCardsContainer.appendChild(card);
    });
    hideLoadingIndicator();
}

function updateMemberCard(memberName, newDate, newTime) {
    const cards = membersCardsContainer.querySelectorAll('.member-card');
    cards.forEach(card => {
        const nameElement = card.querySelector('h3');
        if (nameElement && nameElement.textContent === memberName) {
            const lastPresenceElement = card.querySelector('p:last-of-type');
            if (lastPresenceElement) {
                lastPresenceElement.textContent = `Última Presença: ${newDate} às ${newTime}`;
                // Opcional: Adicionar um feedback visual temporário, como um brilho verde
                card.classList.add('border-2', 'border-green-500', 'animate-pulse-once');
                setTimeout(() => {
                    card.classList.remove('border-2', 'border-green-500', 'animate-pulse-once');
                }, 1500);
            }
        }
    });
}

// --- Funções de Filtro ---

function populateFilterOptions(members) {
    const periodos = new Set();
    const lideres = new Set();
    const gapes = new Set();

    members.forEach(member => {
        if (member.Periodo) periodos.add(member.Periodo);
        if (member.Lider) lideres.add(member.Lider);
        if (member.GAPE) gapes.add(member.GAPE);
    });

    // Populate Periodo (já tem opções estáticas, mas pode ser dinâmico se preferir)
    // No momento, as opções de período são fixas no HTML.

    // Populate Lideres
    filterLiderSelect.innerHTML = '<option value="">Todos</option>';
    Array.from(lideres).sort().forEach(lider => {
        const option = document.createElement('option');
        option.value = lider;
        option.textContent = lider;
        filterLiderSelect.appendChild(option);
    });

    // Populate GAPEs
    filterGapeSelect.innerHTML = '<option value="">Todos</option>';
    Array.from(gapes).sort().forEach(gape => {
        const option = document.createElement('option');
        option.value = gape;
        option.textContent = gape;
        filterGapeSelect.appendChild(option);
    });
}

function applyFilters() {
    const nameFilter = filterNameInput.value.toLowerCase();
    const periodoFilter = filterPeriodoSelect.value;
    const liderFilter = filterLiderSelect.value;
    const gapeFilter = filterGapeSelect.value;

    currentFilteredMembersData = allMembers.filter(member => {
        const matchesName = member.Nome.toLowerCase().includes(nameFilter);
        const matchesPeriodo = !periodoFilter || member.Periodo === periodoFilter;
        const matchesLider = !liderFilter || member.Lider === liderFilter;
        const matchesGape = !gapeFilter || member.GAPE === gapeFilter;
        return matchesName && matchesPeriodo && matchesLider && matchesGape;
    });

    renderMemberCards(currentFilteredMembersData);
    updateDashboardSummary(); // Atualiza o dashboard com os filtros aplicados
}

function clearFilters() {
    filterNameInput.value = '';
    filterPeriodoSelect.value = '';
    filterLiderSelect.value = '';
    filterGapeSelect.value = '';
    applyFilters();
}

// --- Funções do Modal de Resumo Detalhado ---

async function openDetailedSummaryModal() {
    detailedSummaryModal.classList.remove('hidden');
    // Preenche o select de membros do modal com os membros atualmente filtrados do dashboard principal
    populateSummaryMemberSelect(currentFilteredMembersData);
    // Define as datas padrão (últimos 30 dias ou mês atual)
    setInitialDateFilters();
    // Atualiza o resumo detalhado ao abrir o modal
    await updateDetailedSummary();
}

function populateSummaryMemberSelect(members) {
    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    // Ordena os membros por nome para a lista suspensa
    const sortedMembers = [...members].sort((a, b) => a.Nome.localeCompare(b.Nome));
    sortedMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.Nome; // Usamos o nome completo como valor
        option.textContent = member.Nome;
        summaryMemberSelect.appendChild(option);
    });
}

function setInitialDateFilters() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Formata para 'YYYY-MM-DD'
    summaryStartDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    summaryEndDateInput.value = lastDayOfMonth.toISOString().split('T')[0];
}

async function updateDetailedSummary() {
    showLoadingIndicator("Gerando resumo detalhado...");
    try {
        const startDate = summaryStartDateInput.value;
        const endDate = summaryEndDateInput.value;
        const selectedMemberName = summaryMemberSelect.value;

        // Recupera os filtros do dashboard principal para enviar junto
        const mainFilterPeriodo = filterPeriodoSelect.value;
        const mainFilterLider = filterLiderSelect.value;
        const mainFilterGape = filterGapeSelect.value;

        const queryParamsDetailed = new URLSearchParams();
        if (startDate) queryParamsDetailed.append('startDate', startDate);
        if (endDate) queryParamsDetailed.append('endDate', endDate);
        if (selectedMemberName) queryParamsDetailed.append('memberName', selectedMemberName);
        if (mainFilterPeriodo) queryParamsDetailed.append('mainFilterPeriodo', mainFilterPeriodo);
        if (mainFilterLider) queryParamsDetailed.append('mainFilterLider', mainFilterLider);
        if (mainFilterGape) queryParamsDetailed.append('mainFilterGape', mainFilterGape);

        const response = await fetch(`${BACKEND_URL}/get-detailed-presences?${queryParamsDetailed.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
            currentDetailedPresences = data.data.detailedPresences || [];
            const attendanceByPeriod = data.data.attendanceByPeriod || {};
            const memberAttendanceCounts = data.data.memberAttendanceCounts || {};

            renderReportInfo(startDate, endDate, selectedMemberName, mainFilterPeriodo, mainFilterLider, mainFilterGape);
            renderDetailedSummaryText(currentDetailedPresences.length, attendanceByPeriod);
            renderSummaryCharts(attendanceByPeriod, memberAttendanceCounts);
            renderCalendar(currentDetailedPresences);
        } else {
            showMessage(`Erro ao carregar resumo detalhado: ${data.message || 'Dados inválidos.'}`, 'error');
            clearDetailedSummaryContent();
        }
    } catch (error) {
        console.error('Erro ao buscar resumo detalhado:', error);
        showMessage('Erro de rede ao carregar o resumo detalhado.', 'error');
        clearDetailedSummaryContent();
    } finally {
        hideLoadingIndicator();
    }
}

function clearDetailedSummaryContent() {
    reportInfoDiv.innerHTML = '<p class="text-gray-500">Nenhum dado disponível para os filtros selecionados.</p>';
    detailedSummaryTextDiv.innerHTML = '';
    if (summaryPieChart) summaryPieChart.destroy();
    if (summaryBarChart) summaryBarChart.destroy();
    if (calendar) calendar.destroy();
    document.getElementById('calendar').innerHTML = ''; // Limpa o container do calendário
}

function renderReportInfo(startDate, endDate, selectedMemberName, mainPeriodo, mainLider, mainGape) {
    const loggedLeader = localStorage.getItem('loggedInLeaderName') || 'Desconhecido';
    const generationTime = new Date().toLocaleString('pt-BR');

    let filtersApplied = [];
    if (startDate && endDate) filtersApplied.push(`Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`);
    if (selectedMemberName) filtersApplied.push(`Membro: ${selectedMemberName}`);
    if (mainPeriodo) filtersApplied.push(`Período Geral: ${mainPeriodo}`);
    if (mainLider) filtersApplied.push(`Líder Geral: ${mainLider}`);
    if (mainGape) filtersApplied.push(`GAPE Geral: ${mainGape}`);

    reportInfoDiv.innerHTML = `
        <p><strong>Relatório Gerado por:</strong> ${loggedLeader}</p>
        <p><strong>Data e Hora:</strong> ${generationTime}</p>
        <p><strong>Filtros Aplicados:</strong> ${filtersApplied.join(' | ') || 'Nenhum'}</p>
    `;
}

function renderDetailedSummaryText(totalPresencesCount, attendanceByPeriod) {
    let text = `
        <h3 class="text-xl font-semibold text-gray-800 mb-2">Estatísticas Gerais</h3>
        <p class="text-gray-700">Total de presenças encontradas: <span class="font-bold text-blue-600">${totalPresencesCount}</span></p>
        <h4 class="text-lg font-semibold text-gray-800 mt-4 mb-2">Presenças por Período:</h4>
        <ul class="list-disc list-inside text-gray-700">
    `;
    const sortedPeriods = Object.entries(attendanceByPeriod).sort((a, b) => b[1] - a[1]);
    if (sortedPeriods.length > 0) {
        sortedPeriods.forEach(([period, count]) => {
            text += `<li>${period}: <span class="font-bold">${count}</span> presenças</li>`;
        });
    } else {
        text += '<li>Nenhuma presença registrada por período.</li>';
    }
    text += `</ul>`;
    detailedSummaryTextDiv.innerHTML = text;
}

function renderSummaryCharts(attendanceByPeriod, memberAttendanceCounts) {
    // Destrói gráficos antigos se existirem
    if (summaryPieChart) summaryPieChart.destroy();
    if (summaryBarChart) summaryBarChart.destroy();

    const pieCtx = document.getElementById('summaryChart').getContext('2d');
    const barCtx = document.getElementById('summaryBarChart').getContext('2d');

    const periods = Object.keys(attendanceByPeriod);
    const periodCounts = Object.values(attendanceByPeriod);

    // Geração de cores dinâmicas (melhorar se tiver muitos períodos)
    const backgroundColors = periods.map((_, i) => `hsl(${i * (360 / periods.length)}, 70%, 70%)`);
    const borderColors = periods.map((_, i) => `hsl(${i * (360 / periods.length)}, 70%, 50%)`);

    // Gráfico de Pizza (Presenças por Período)
    summaryPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: periods,
            datasets: [{
                data: periodCounts,
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
                    text: 'Presenças por Período',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                },
                datalabels: { // Configuração do plugin datalabels
                    color: '#fff',
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                        return percentage > 0 ? `${percentage}%` : ''; // Mostra a porcentagem se for maior que 0
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    display: function(context) { // Esconde se o fatia for muito pequena
                        return context.dataset.data[context.dataIndex] / context.dataset.data.reduce((a, b) => a + b, 0) > 0.05; // 5%
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Adiciona o plugin datalabels
    });

    // Gráfico de Barras Horizontais (Presenças por Membro - Top N, para não lotar)
    const sortedMemberCounts = Object.entries(memberAttendanceCounts).sort(([, countA], [, countB]) => countB - countA);
    const topMembers = sortedMemberCounts.slice(0, 10); // Mostra os top 10 membros
    const memberLabels = topMembers.map(entry => entry[0]);
    const memberData = topMembers.map(entry => entry[1]);

    summaryBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: memberLabels,
            datasets: [{
                label: 'Número de Presenças',
                data: memberData,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Faz o gráfico de barras horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Não precisa de legenda para um único dataset
                },
                title: {
                    display: true,
                    text: 'Top 10 Membros por Presença',
                    font: { size: 16 }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#444',
                    formatter: Math.round,
                    font: {
                        weight: 'bold',
                        size: 10
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Contagem de Presenças'
                    },
                    ticks: {
                        stepSize: 1 // Garante que os ticks sejam inteiros
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
        plugins: [ChartDataLabels]
    });
}

function renderCalendar(presences) {
    const calendarEl = document.getElementById('calendar');

    // Destrói a instância anterior do calendário se ela existir
    if (calendar) {
        calendar.destroy();
    }

    const events = presences.map(p => ({
        title: p.nome,
        start: p.data, // Data no formato YYYY-MM-DD
        allDay: true, // Ou false se quiser incluir a hora
        extendedProps: {
            periodo: p.periodo,
            lider: p.lider,
            gape: p.gape,
            hora: p.hora
        },
        // Cor do evento (opcional, pode variar por período ou líder)
        backgroundColor: p.periodo === 'Manhã' ? '#4CAF50' : (p.periodo === 'Tarde' ? '#2196F3' : '#9C27B0'),
        borderColor: p.periodo === 'Manhã' ? '#388E3C' : (p.periodo === 'Tarde' ? '#1976D2' : '#7B1FA2'),
        textColor: '#FFFFFF', // Cor do texto do evento
    }));

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        eventDisplay: 'block', // Garante que eventos sejam exibidos como blocos
        eventTimeFormat: { // Formato da hora exibida nos eventos
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false // Remove AM/PM
        },
        eventDidMount: function(info) {
            // Adiciona tooltips ou mais detalhes ao passar o mouse
            const eventEl = info.el;
            const event = info.event;
            eventEl.title = `Membro: ${event.title}\nPeríodo: ${event.extendedProps.periodo}\nHora: ${event.extendedProps.hora}\nLíder: ${event.extendedProps.lider}`;
        }
    });
    calendar.render();
}

// --- Event Listeners ---

// Autenticação e logout
document.addEventListener('DOMContentLoaded', () => {
    const loggedInLeader = localStorage.getItem('loggedInLeaderName');
    if (loggedInLeader) {
        loggedInLeaderNameSpan.textContent = `Logado como: ${loggedInLeader}`;
    } else {
        window.location.href = "/index.html"; // Redireciona se não estiver logado
    }
    fetchMembers(); // Carrega os membros ao iniciar
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('loggedInLeaderName');
    window.location.href = "/index.html";
});

// Filtros do Dashboard Principal
applyFiltersBtn.addEventListener('click', applyFilters);
clearFiltersBtn.addEventListener('click', clearFilters);
filterNameInput.addEventListener('input', applyFilters); // Filtro em tempo real
filterPeriodoSelect.addEventListener('change', applyFilters);
filterLiderSelect.addEventListener('change', applyFilters);
filterGapeSelect.addEventListener('change', applyFilters);

// Toggle Dashboard
toggleDashboardBtn.addEventListener('click', () => {
    const isOpen = dashboardContainer.classList.toggle('max-h-0');
    dashboardContainer.classList.toggle('opacity-0');
    dashboardContainer.classList.toggle('max-h-[1000px]'); // Altura máxima para animação
    dashboardContainer.classList.toggle('opacity-100');

    if (!isOpen) {
        dashboardOpenIcon.classList.add('hidden');
        dashboardOpenText.classList.add('hidden');
        dashboardCloseIcon.classList.remove('hidden');
        dashboardCloseText.classList.remove('hidden');
        updateDashboardSummary(); // Atualiza o dashboard quando abre
    } else {
        dashboardOpenIcon.classList.remove('hidden');
        dashboardOpenText.classList.remove('hidden');
        dashboardCloseIcon.classList.add('hidden');
        dashboardCloseText.classList.add('hidden');
    }
});

// Modal de Resumo Detalhado
showDetailedSummaryBtn.addEventListener('click', openDetailedSummaryModal);
closeModalBtn.addEventListener('click', () => detailedSummaryModal.classList.add('hidden'));

// Eventos dos filtros do Modal
summaryStartDateInput.addEventListener('change', updateDetailedSummary);
summaryEndDateInput.addEventListener('change', updateDetailedSummary);
summaryMemberSelect.addEventListener('change', updateDetailedSummary);


// Download PDF
downloadPdfBtn.addEventListener('click', async () => {
    showLoadingIndicator("Gerando PDF...");
    const content = document.getElementById('detailedSummaryContent');

    // Crie um elemento de estilo temporário com os estilos de impressão
    const printStyles = `
        body { margin: 0; padding: 0; box-sizing: border-box; }
        #downloadPdfBtn, #summaryFilterSection, #logoutBtnContainer { display: none !important; }
        #detailedSummaryContent {
            display: flex; flex-direction: column; align-items: center; padding: 8mm;
            max-height: none !important; overflow: visible !important; width: 100%; box-sizing: border-box;
        }
        #reportInfo { margin-bottom: 8mm; padding-top: 6mm; padding-bottom: 6mm; width: 100%; font-size: 0.8em; box-sizing: border-box; }
        #reportInfo p { margin-bottom: 0.2mm; }
        #detailedSummaryText { margin-bottom: 8mm; width: 100%; font-size: 0.8em; box-sizing: border-box; }
        #detailedSummaryText h3 { font-size: 0.95em; }
        #detailedSummaryText ul { font-size: 0.8em; }
        #detailedSummaryText p { font-size: 0.7em; }
        .chart-container-wrapper {
            display: flex; flex-direction: row; justify-content: space-around;
            align-items: flex-start; width: 100%; gap: 0.3rem; box-sizing: border-box;
        }
        .chart-container {
            width: 49% !important; height: auto; max-height: 80mm; box-sizing: border-box;
        }
        #calendar-container { width: 100% !important; margin-top: 10mm; page-break-before: auto; page-break-after: auto; box-sizing: border-box; }
        .fc .fc-toolbar { display: none !important; }
        .fc .fc-daygrid-day-number { font-size: 0.7em !important; }
        .fc .fc-event { font-size: 0.6em !important; padding: 1px 2px !important; }
        .fc-daygrid-event-harness { overflow: visible !important; }
        .fc-daygrid-day-top { flex-direction: column; align-items: flex-start; }
        .fc .fc-col-header-cell-cushion { font-size: 0.75em !important; padding: 2px 0 !important; }
        @page { size: A4 landscape; margin: 5mm; }
    `;
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);

    // Dê um breve momento para os estilos serem aplicados
    await new Promise(resolve => setTimeout(resolve, 100));

    // Captura o conteúdo do modal
    const canvas = await html2canvas(content, {
        scale: 2, // Maior escala para melhor qualidade
        useCORS: true, // Importante se houver imagens de outros domínios
        logging: false, // Desabilita logs do html2canvas
        windowWidth: content.scrollWidth, // Captura a largura total do conteúdo
        windowHeight: content.scrollHeight // Captura a altura total do conteúdo
    });

    // Remove os estilos de impressão temporários
    document.head.removeChild(styleElement);

    const imgData = canvas.toDataURL('image/png');
    
    // Calcula as dimensões da imagem no PDF para preencher a página A4 paisagem
    const pdf = new window.jspdf.jsPDF({
        orientation: 'landscape', // A4 paisagem
        unit: 'mm',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth - 10; // Margem de 5mm de cada lado
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 5; // Posição inicial no topo da página

    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);

    let heightLeft = imgHeight - (pdfHeight - 10); // Altura restante após a primeira página (desconta as margens)

    while (heightLeft > -1) { // -1 para garantir que a última parte seja capturada
        position -= (pdfHeight - 10); // Move a posição para cima para capturar a próxima parte
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 10);
    }

    pdf.save('Resumo_Presencas_AD.pdf');
    hideLoadingIndicator();
});
