// js/dashboard.js

// Constantes e elementos do DOM
const globalLoadingIndicator = document.getElementById('globalLoadingIndicator');
const loadingMessage = document.getElementById('loadingMessage');
const loggedInLeaderNameDisplay = document.getElementById('loggedInLeaderName'); // Renomeado para clareza
const logoutBtn = document.getElementById('logoutBtn');
const messageArea = document.getElementById('messageArea');
const filterNameInput = document.getElementById('filterName'); // Renomeado para clareza
const filterPeriodoSelect = document.getElementById('filterPeriodo'); // Renomeado para clareza
const filterLiderSelect = document.getElementById('filterLider'); // Renomeado para clareza
const filterGapeSelect = document.getElementById('filterGape'); // Renomeado para clareza
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const toggleDashboardBtn = document.getElementById('toggleDashboardBtn');
const dashboardContainer = document.getElementById('dashboardContainer');
const dashboardOpenIcon = document.getElementById('dashboardOpenIcon');
const dashboardOpenText = document.getElementById('dashboardOpenText');
const dashboardCloseIcon = document.getElementById('dashboardCloseIcon');
const dashboardCloseText = document.getElementById('dashboardCloseText');
const dashboardPresencasMes = document.getElementById('dashboardPresencasMes');
const dashboardFaltasMes = document.getElementById('dashboardFaltasMes');
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
const reportInfo = document.getElementById('reportInfo');
const detailedSummaryText = document.getElementById('detailedSummaryText');
const summaryStartDateInput = document.getElementById('summaryStartDate');
const summaryEndDateInput = document.getElementById('summaryEndDate');
const summaryMemberSelect = document.getElementById('summaryMemberSelect');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const presenceDateInput = document.getElementById('presenceDateInput');

let currentFilters = {
    name: '',
    periodo: '',
    lider: '',
    gape: ''
};
let membersData = []; // Esta variável armazenará os membros para exibição
let summaryPieChart, summaryBarChart; // Variáveis para os gráficos

// --- Funções de Utilitários ---

function showLoading(message = 'Carregando...') {
    loadingMessage.textContent = message;
    globalLoadingIndicator.classList.remove('opacity-0', 'pointer-events-none');
    globalLoadingIndicator.classList.add('opacity-100');
}

function hideLoading() {
    globalLoadingIndicator.classList.add('opacity-0', 'pointer-events-none');
    globalLoadingIndicator.classList.remove('opacity-100');
}

function showMessage(message, type = 'info') {
    messageArea.textContent = message;
    messageArea.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800');
    if (type === 'success') {
        messageArea.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        messageArea.classList.add('bg-red-100', 'text-red-800');
    } else {
        messageArea.classList.add('bg-blue-100', 'text-blue-800');
    }
    setTimeout(() => {
        messageArea.classList.add('hidden');
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function getCurrentMonthDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

// --- Funções de Autenticação e Login Display ---

function updateLoginStatusDisplay() {
    const storedName = localStorage.getItem('loggedInLeaderName');
    if (storedName) {
        loggedInLeaderNameDisplay.textContent = `Logado como: ${storedName}`;
    } else {
        loggedInLeaderNameDisplay.textContent = 'Logado como: Não Autorizado';
        // Opcional: redirecionar para a página de login se não estiver autorizado
        // window.location.href = '/login.html';
    }
}

// --- Funções de Interação com o Backend (Node.js) ---

async function fetchInitialData() {
    showLoading("Carregando dados iniciais...");
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/get-membros`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar dados iniciais do servidor.');
        }
        const data = await response.json();

        hideLoading();

        if (data.success && Array.isArray(data.membros)) {
            // Extrair líderes e grupos (GAFEs) dos membros recebidos do backend
            const leaders = [...new Set(data.membros
                .filter(m => m.Lider && m.Lider.trim() !== '')
                .map(m => m.Lider.split('|').pop().trim()))].sort();

            const gapes = [...new Set(data.membros
                .filter(m => m.GAPE && m.GAPE.trim() !== '') // Use m.GAPE conforme o seu card
                .map(m => m.GAPE.trim()))].sort(); // Use m.GAPE conforme o seu card

            populateFilterOptions(leaders, gapes);
            membersData = data.membros; // Armazena todos os membros para populardropdowns de resumo
            populateSummaryMemberSelect(membersData); // Popula o select do modal de resumo com TODOS os membros iniciais
            fetchMembers(currentFilters); // Carrega os membros com os filtros atuais (vazios no início)
            fetchAndDisplaySummary(); // Carrega o resumo inicial

        } else {
            showMessage(`Erro ao processar dados iniciais: ${data.message || 'Dados inválidos recebidos.'}`, 'error');
            console.error("Dados iniciais inválidos:", data);
        }

    } catch (error) {
        hideLoading();
        showMessage(`Erro ao carregar dados iniciais: ${error.message}`, 'error');
        console.error("Erro ao carregar dados iniciais no frontend:", error);
    }
}

async function fetchMembers(filters) {
    showLoading("Buscando membros...");
    try {
        const queryParams = new URLSearchParams();
        if (filters.name) queryParams.append('nome', filters.name);
        if (filters.periodo) queryParams.append('periodo', filters.periodo);
        if (filters.lider) queryParams.append('lider', filters.lider);
        if (filters.gape) queryParams.append('gape', filters.gape);

        const response = await fetch(`${BACKEND_BASE_URL}/get-membros?${queryParams.toString()}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao buscar membros do servidor.');
        }

        const data = await response.json();

        hideLoading();

        if (data.success && Array.isArray(data.membros)) {
            membersData = data.membros; // Atualiza a variável global membersData para os membros FILTRADOS
            displayMembers(data.membros);
            // populateSummaryMemberSelect(data.membros); // Descomente se quiser que o select do modal mostre APENAS membros filtrados.
                                                        // Mantive a versão que popula com TODOS os membros em fetchInitialData
                                                        // para o caso de querer o resumo detalhado de qualquer membro, não apenas os visíveis.
            if (data.membros.length === 0) {
                showMessage("Nenhum membro encontrado com os filtros aplicados.", "info");
            }
        } else {
            showMessage(`Erro ao buscar membros: ${data.message || 'Dados inválidos.'}`, 'error');
            console.error("Dados de membros inválidos:", data);
        }
    } catch (error) {
        hideLoading();
        showMessage(`Erro ao buscar membros: ${error.message}`, 'error');
        console.error("Erro ao buscar membros no frontend:", error);
    }
}

// **Função para registrar a presença (AGORA USANDO FETCH PARA O NODE.JS)**
async function registerPresence(memberId, memberName, leaderName, gapeName, periodo, presenceDate) {
    showLoading(`Registrando presença para ${memberName}...`);
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/register-presence`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ memberId, memberName, leaderName, gapeName, periodo, presenceDate })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao registrar presença no servidor.');
        }

        const data = await response.json();

        hideLoading();
        if (data.success) {
            showMessage(`Presença de ${memberName} registrada com sucesso para ${formatDate(presenceDate)}.`, 'success');
            fetchMembers(currentFilters); // Recarrega para garantir dados atualizados (cards e filtros)
            fetchAndDisplaySummary(); // Atualiza o dashboard após o registro
        } else {
            showMessage(`Erro ao registrar presença para ${memberName}: ${data.message}`, 'error');
        }
    } catch (error) {
        hideLoading();
        showMessage(`Erro de comunicação ao registrar presença: ${error.message}`, 'error');
        console.error("Erro de comunicação ao registrar presença:", error);
    }
}

async function fetchAndDisplaySummary() {
    showLoading("Carregando resumo do dashboard...");
    const { start, end } = getCurrentMonthDateRange();

    const summaryFilters = {
        ...currentFilters,
        startDate: start,
        endDate: end
    };

    try {
        const queryParams = new URLSearchParams();
        if (summaryFilters.startDate) queryParams.append('startDate', summaryFilters.startDate);
        if (summaryFilters.endDate) queryParams.append('endDate', summaryFilters.endDate);
        if (summaryFilters.lider) queryParams.append('lider', summaryFilters.lider);
        if (summaryFilters.gape) queryParams.append('gape', summaryFilters.gape);

        const response = await fetch(`${BACKEND_BASE_URL}/get-presencas-total?${queryParams.toString()}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar resumo do servidor.');
        }

        const summaryData = await response.json();

        hideLoading();

        if (summaryData.success) {
            dashboardPresencasMes.textContent = summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0;
            dashboardFaltasMes.textContent = summaryData.totalAbsences !== undefined ? summaryData.totalAbsences : 0; // Verifica se totalAbsences existe

            dashboardPeriodo.textContent = currentFilters.periodo || 'Todos';
            dashboardLider.textContent = currentFilters.lider || 'Todos';
            dashboardGape.textContent = currentFilters.gape || 'Todos';

            totalCountsList.innerHTML = '';
            if (summaryData.memberCounts && Object.keys(summaryData.memberCounts).length > 0) {
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-green-300">Total Presenças (Mês): ${summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0}</li>`;
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-red-300">Membros Sem Presença (Mês): ${summaryData.totalAbsentMembers !== undefined ? summaryData.totalAbsentMembers : 0}</li>`;

                for (const memberName in summaryData.memberCounts) {
                    const count = summaryData.memberCounts[memberName];
                    const listItem = document.createElement('li');
                    listItem.className = 'text-sm text-gray-200 border-t border-gray-700 pt-2 mt-2';
                    listItem.textContent = `${memberName}: ${count} presenças`;
                    totalCountsList.appendChild(listItem);
                }
            } else {
                totalCountsList.innerHTML = '<li class="text-sm text-gray-200 text-center">Nenhum dado de presença disponível para os filtros atuais.</li>';
            }
        } else {
            showMessage(`Erro ao carregar resumo: ${summaryData.message || 'Dados inválidos.'}`, 'error');
            console.error("Dados de resumo inválidos:", summaryData);
        }
    } catch (error) {
        hideLoading();
        showMessage(`Erro ao carregar resumo: ${error.message}`, 'error');
        console.error("Erro ao carregar resumo no frontend:", error);
    }
}

async function fetchDetailedSummary(filters) {
    showLoading("Gerando resumo detalhado...");
    try {
        const queryParams = new URLSearchParams();
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.memberId) queryParams.append('memberId', filters.memberId);
        if (filters.lider) queryParams.append('lider', filters.lider);
        if (filters.gape) queryParams.append('gape', filters.gape);

        // Adapte esta rota para o seu backend Node.js
        const response = await fetch(`${BACKEND_BASE_URL}/get-detailed-summary?${queryParams.toString()}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar resumo detalhado do servidor.');
        }

        const summary = await response.json();

        hideLoading();

        if (summary.success) {
            updateDetailedSummaryModal(summary);
            detailedSummaryModal.classList.remove('hidden');
        } else {
            showMessage(`Erro ao carregar resumo detalhado: ${summary.message || 'Dados inválidos.'}`, 'error');
            console.error("Dados de resumo detalhados inválidos:", summary);
        }
    } catch (error) {
        hideLoading();
        showMessage(`Erro ao carregar resumo detalhado: ${error.message}`, 'error');
        console.error("Erro ao carregar resumo detalhado no frontend:", error);
    }
}

async function logout() {
    showLoading("Saindo...");
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/logout`, { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao fazer logout no servidor.');
        }

        localStorage.removeItem('authToken');
        localStorage.removeItem('loggedInLeaderName');

        hideLoading();
        window.location.href = '/login.html';
    } catch (error) {
        hideLoading();
        showMessage(`Erro ao fazer logout: ${error.message}`, 'error');
        console.error("Erro ao fazer logout no frontend:", error);
    }
}

// --- Funções de Manipulação do DOM ---

function populateFilterOptions(leaders, gapes) {
    filterLiderSelect.innerHTML = '<option value="">Todos</option>';
    leaders.forEach(leader => {
        const option = document.createElement('option');
        option.value = leader;
        option.textContent = leader;
        filterLiderSelect.appendChild(option);
    });

    filterGapeSelect.innerHTML = '<option value="">Todos</option>';
    gapes.forEach(gape => {
        const option = document.createElement('option');
        option.value = gape;
        option.textContent = gape;
        filterGapeSelect.appendChild(option);
    });
}

function displayMembers(members) {
    membersCardsContainer.innerHTML = '';
    if (members.length === 0) {
        membersCardsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full">Nenhum membro encontrado com os filtros aplicados.</p>';
        return;
    }

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-4 transition duration-300 ease-in-out hover:shadow-lg flex flex-col';
        card.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">${member.Nome || 'N/A'}</h3>
            <p class="text-sm text-gray-600">Período: ${member.Periodo || 'N/A'}</p>
            <p class="text-sm text-gray-600">Líder: ${member.Lider || 'N/A'}</p>
            <p class="text-sm text-gray-600 mb-4">GAPE: ${member.GAPE || 'N/A'}</p>
            <button class="btn-sm btn-primary mt-auto confirm-presence-btn"
                    data-member-id="${member.RI || ''}"
                    data-member-name="${member.Nome || ''}"
                    data-leader-name="${member.Lider || ''}"
                    data-gape-name="${member.GAPE || ''}"
                    data-periodo="${member.Periodo || ''}">
                Confirmar Presença
            </button>
        `;
        membersCardsContainer.appendChild(card);
    });

    // Adiciona event listeners aos novos botões DEPOIS que eles são criados
    document.querySelectorAll('.confirm-presence-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const memberId = event.target.dataset.memberId;
            const memberName = event.target.dataset.memberName;
            const leaderName = event.target.dataset.leaderName;
            const gapeName = event.target.dataset.gapeName;
            const periodo = event.target.dataset.periodo;
            const presenceDate = presenceDateInput.value;

            if (!presenceDate) {
                showMessage('Por favor, selecione uma Data da Presença.', 'error');
                return;
            }

            registerPresence(memberId, memberName, leaderName, gapeName, periodo, presenceDate);
        });
    });
}


function populateSummaryMemberSelect(members) {
    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.RI; // Use RI como ID
        option.textContent = member.Nome;
        summaryMemberSelect.appendChild(option);
    });
}

// Atualiza o conteúdo do modal de resumo detalhado
function updateDetailedSummaryModal(summary) {
    reportInfo.innerHTML = `
        <p><strong>Data do Relatório:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
        <p><strong>Período Filtrado:</strong> ${summary.filterInfo.startDate ? formatDate(summary.filterInfo.startDate) : 'N/A'} - ${summary.filterInfo.endDate ? formatDate(summary.filterInfo.endDate) : 'N/A'}</p>
        <p><strong>Líder Filtrado:</strong> ${summary.filterInfo.lider || 'Todos'}</p>
        <p><strong>GAPE Filtrado:</strong> ${summary.filterInfo.gape || 'Todos'}</p>
        <p><strong>Membro Específico:</strong> ${summary.filterInfo.memberName || 'Todos'}</p>
    `;

    detailedSummaryText.innerHTML = `
        <h3 class="text-xl font-bold text-gray-700 mb-2">Resultados do Resumo:</h3>
        <ul class="list-disc list-inside text-gray-700">
            <li><strong>Total de Membros com Presença:</strong> ${summary.totalPresentMembers}</li>
            <li><strong>Total de Membros Sem Presença (Faltas):</strong> ${summary.totalAbsentMembers}</li>
            <li><strong>Total de Registros de Presença:</strong> ${summary.totalPresencesCount}</li>
        </ul>
        <p class="mt-4 text-gray-600">
            Este resumo detalha a presença dos membros com base nos filtros aplicados.
            Os gráficos abaixo ilustram a distribuição de presenças e faltas,
            e as presenças por líder para o período selecionado.
        </p>
    `;

    updateDetailedSummaryChart(summary);
}

// Atualiza os gráficos no modal de resumo detalhado
function updateDetailedSummaryChart(summary) {
    const ctxPie = document.getElementById('summaryChart').getContext('2d');
    const ctxBar = document.getElementById('summaryBarChart').getContext('2d');

    if (summaryPieChart) summaryPieChart.destroy();
    if (summaryBarChart) summaryBarChart.destroy();

    summaryPieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Membros com Presença', 'Membros Sem Presença (Faltas)'],
            datasets: [{
                data: [summary.totalPresentMembers, summary.totalAbsentMembers],
                backgroundColor: ['#4CAF50', '#F44336'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Resumo Geral de Presenças vs Faltas',
                    font: { size: 16, family: 'Arial', weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                },
                datalabels: {
                    color: '#fff',
                    formatter: (value, context) => {
                        const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        return `${value} (${percentage})`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });

    const leaders = Object.keys(summary.presencesByLeader || {});
    const presences = Object.values(summary.presencesByLeader || {});

    summaryBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: leaders,
            datasets: [{
                label: 'Total de Presenças',
                data: presences,
                backgroundColor: '#3B82F6',
                borderColor: '#2563EB',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Presenças por Líder',
                    font: { size: 16, family: 'Arial', weight: 'bold' }
                },
                legend: {
                    display: false
                },
                datalabels: {
                    color: '#fff',
                    anchor: 'end',
                    align: 'start',
                    offset: -10,
                    font: {
                        weight: 'bold'
                    },
                    formatter: (value) => value
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Presenças'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Líder'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function downloadPdf() {
    showLoading("Gerando PDF...");
    html2canvas(detailedSummaryContent, {
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        const imgWidth = 280;
        const pageHeight = 210;

        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 5;

        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 10;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight - 10;
        }

        pdf.save('resumo_membros_ad.pdf');
        hideLoading();
    }).catch(error => {
        hideLoading();
        showMessage(`Erro ao gerar PDF: ${error.message}`, 'error');
        console.error("Erro ao gerar PDF:", error);
    });
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    updateLoginStatusDisplay(); // Exibe o nome do líder ao carregar
    fetchInitialData();
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    presenceDateInput.value = `${year}-${month}-${day}`;
});

logoutBtn.addEventListener('click', logout);

applyFiltersBtn.addEventListener('click', () => {
    currentFilters = {
        name: filterNameInput.value, // Usar filterNameInput
        periodo: filterPeriodoSelect.value, // Usar filterPeriodoSelect
        lider: filterLiderSelect.value, // Usar filterLiderSelect
        gape: filterGapeSelect.value // Usar filterGapeSelect
    };
    fetchMembers(currentFilters);
    fetchAndDisplaySummary();
});

clearFiltersBtn.addEventListener('click', () => {
    filterNameInput.value = '';
    filterPeriodoSelect.value = '';
    filterLiderSelect.value = '';
    filterGapeSelect.value = '';
    currentFilters = {};
    fetchMembers(currentFilters);
    fetchAndDisplaySummary();
});

toggleDashboardBtn.addEventListener('click', () => {
    if (dashboardContainer.classList.contains('max-h-0')) {
        dashboardContainer.classList.remove('max-h-0', 'opacity-0');
        dashboardContainer.classList.add('max-h-screen', 'opacity-100');
        dashboardOpenIcon.classList.add('hidden');
        dashboardOpenText.classList.add('hidden');
        dashboardCloseIcon.classList.remove('hidden');
        dashboardCloseText.classList.remove('hidden');
        fetchAndDisplaySummary();
    } else {
        dashboardContainer.classList.add('max-h-0', 'opacity-0');
        dashboardContainer.classList.remove('max-h-screen', 'opacity-100');
        dashboardOpenIcon.classList.remove('hidden');
        dashboardOpenText.classList.remove('hidden');
        dashboardCloseIcon.classList.add('hidden');
        dashboardCloseText.classList.add('hidden');
    }
});

showDetailedSummaryBtn.addEventListener('click', () => {
    const { start, end } = getCurrentMonthDateRange();
    summaryStartDateInput.value = start;
    summaryEndDateInput.value = end;
    summaryMemberSelect.value = '';

    const modalFilters = {
        startDate: summaryStartDateInput.value,
        endDate: summaryEndDateInput.value,
        memberId: summaryMemberSelect.value,
        lider: currentFilters.lider || '',
        gape: currentFilters.gape || ''
    };
    fetchDetailedSummary(modalFilters);
});

closeModalBtn.addEventListener('click', () => {
    detailedSummaryModal.classList.add('hidden');
});

detailedSummaryModal.querySelectorAll('#summaryStartDate, #summaryEndDate, #summaryMemberSelect').forEach(input => {
    input.addEventListener('change', () => {
        const modalFilters = {
            startDate: summaryStartDateInput.value,
            endDate: summaryEndDateInput.value,
            memberId: summaryMemberSelect.value,
            lider: currentFilters.lider || '',
            gape: currentFilters.gape || ''
        };
        fetchDetailedSummary(modalFilters);
    });
});

downloadPdfBtn.addEventListener('click', downloadPdf);
