// Constantes e elementos do DOM
const globalLoadingIndicator = document.getElementById('globalLoadingIndicator');
const loadingMessage = document.getElementById('loadingMessage');
const loggedInLeaderName = document.getElementById('loggedInLeaderName');
const logoutBtn = document.getElementById('logoutBtn');
const messageArea = document.getElementById('messageArea');
const filterName = document.getElementById('filterName');
const filterPeriodo = document.getElementById('filterPeriodo');
const filterLider = document.getElementById('filterLider');
const filterGape = document.getElementById('filterGape');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const toggleDashboardBtn = document.getElementById('toggleDashboardBtn');
const dashboardContainer = document.getElementById('dashboardContainer');
const dashboardOpenIcon = document.getElementById('dashboardOpenIcon');
const dashboardOpenText = document.getElementById('dashboardOpenText');
const dashboardCloseIcon = document.getElementById('dashboardCloseIcon');
const dashboardCloseText = document.getElementById('dashboardCloseText');
const dashboardPresencasMes = document.getElementById('dashboardPresencasMes');
const dashboardFaltasMes = document.getElementById('dashboardFaltasMes'); // Novo elemento para faltas
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

// Novo elemento para o input de data de presença
const presenceDateInput = document.getElementById('presenceDateInput');

let currentFilters = {};
let membersData = [];
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
    }, 5000); // Esconde a mensagem após 5 segundos
}

// Formata a data para 'DD/MM/YYYY'
function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Pega o primeiro e o último dia do mês atual para o resumo
function getCurrentMonthDateRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
    
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}


// --- Funções de Interação com Google Apps Script (Backend) ---

// Função para buscar os dados iniciais (líderes, gapes, etc.)
async function fetchInitialData() {
    showLoading("Carregando dados iniciais...");
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/get-membros`); // Chama a rota do seu backend Node.js
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar dados iniciais do servidor.');
        }
        const data = await response.json(); // Espera um objeto como { success: true, membros: [...] }

        hideLoading();

        if (data.success && Array.isArray(data.membros)) {
            // Extrair líderes e grupos (GAFEs) dos membros recebidos do backend
            const leaders = [...new Set(data.membros
                .filter(m => m.Lider && m.Lider.trim() !== '')
                .map(m => m.Lider.split('|').pop().trim()))].sort(); // Extrai apenas o nome do líder e ordena
            
            const gapes = [...new Set(data.membros
                .filter(m => m.Congregacao && m.Congregacao.trim() !== '')
                .map(m => m.Congregacao.trim()))].sort(); // Extrai o nome da congregação e ordena
            
            populateFilterOptions(leaders, gapes);
            
            // O nome do usuário logado deve vir do processo de login, não da busca inicial de membros.
            // Se você configurou seu /login para retornar o nome do líder, ele já estaria setado.
            // loggedInLeaderName.textContent = `Logado como: ${data.loggedInUser}`; // Remova ou ajuste esta linha
            
            fetchMembers(currentFilters); // Carrega os membros após popular os filtros
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

// --- NOVO fetchMembers no dashboard.js ---
async function fetchMembers(filters) {
    showLoading("Buscando membros...");
    try {
        const queryParams = new URLSearchParams();
        // Mapeia os filtros para os nomes esperados pelo seu backend
        if (filters.name) queryParams.append('nome', filters.name);
        if (filters.periodo) queryParams.append('periodo', filters.periodo);
        if (filters.lider) queryParams.append('lider', filters.lider);
        if (filters.gape) queryParams.append('gape', filters.gape);

        const response = await fetch(`${BACKEND_BASE_URL}/get-membros?${queryParams.toString()}`); // Chama o backend
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao buscar membros do servidor.');
        }

        const data = await response.json();

        hideLoading();
        
        if (data.success && Array.isArray(data.membros)) {
            membersData = data.membros; // Atualiza a variável global membersData
            displayMembers(data.membros);
            populateSummaryMemberSelect(data.membros); // Atualiza a lista de membros no modal de resumo
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

// Função para registrar a presença
function registerPresence(memberId, memberName, leaderName, gapeName, periodo, presenceDate) {
    showLoading(`Registrando presença para ${memberName}...`);
    google.script.run
        .withSuccessHandler(response => {
            hideLoading();
            if (response.success) {
                showMessage(`Presença de ${memberName} registrada com sucesso para ${formatDate(presenceDate)}.`, 'success');
                // Opcional: Atualizar apenas o card do membro ou recarregar tudo
                fetchMembers(currentFilters); // Recarregar para garantir dados atualizados
                fetchAndDisplaySummary(); // Atualizar o dashboard após o registro
            } else {
                showMessage(`Erro ao registrar presença para ${memberName}: ${response.message}`, 'error');
            }
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro de comunicação ao registrar presença: ${error.message}`, 'error');
            console.error("Erro de comunicação ao registrar presença:", error);
        })
        .registerMemberPresence(memberId, memberName, leaderName, gapeName, periodo, presenceDate); // Nome da função no seu Apps Script
}

// Função para buscar e exibir o resumo no dashboard principal
// --- NOVO fetchAndDisplaySummary no dashboard.js ---
async function fetchAndDisplaySummary() {
    showLoading("Carregando resumo do dashboard...");
    const { start, end } = getCurrentMonthDateRange();

    const summaryFilters = {
        ...currentFilters, // Inclui os filtros atuais da tela principal
        startDate: start,
        endDate: end
    };

    try {
        const queryParams = new URLSearchParams();
        if (summaryFilters.startDate) queryParams.append('startDate', summaryFilters.startDate);
        if (summaryFilters.endDate) queryParams.append('endDate', summaryFilters.endDate);
        if (summaryFilters.lider) queryParams.append('lider', summaryFilters.lider);
        if (summaryFilters.gape) queryParams.append('gape', summaryFilters.gape);

        const response = await fetch(`${BACKEND_BASE_URL}/get-presencas-total?${queryParams.toString()}`); // Chama o backend
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar resumo do servidor.');
        }

        const summaryData = await response.json(); // Espera um objeto como { success: true, totalPresences: X, totalAbsences: Y, ... }

        hideLoading();
        
        if (summaryData.success) {
            dashboardPresencasMes.textContent = summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0;
            dashboardFaltasMes.textContent = summaryData.totalAbsences !== undefined ? summaryData.totalAbsences : 0;

            dashboardPeriodo.textContent = currentFilters.periodo || 'Todos';
            dashboardLider.textContent = currentFilters.lider || 'Todos';
            dashboardGape.textContent = currentFilters.gape || 'Todos';

            totalCountsList.innerHTML = '';
            // Os dados `memberCounts` precisam vir do seu backend e Apps Script
            if (summaryData.memberCounts && Object.keys(summaryData.memberCounts).length > 0) {
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-green-300">Total Presenças (Mês): ${summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0}</li>`;
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-red-300">Membros Sem Presença (Mês): ${summaryData.totalAbsentMembers !== undefined ? summaryData.totalAbsentMembers : 0}</li>`; // Use totalAbsentMembers
                
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

// Função para buscar dados detalhados para o modal de resumo
// --- NOVO fetchDetailedSummary no dashboard.js ---
async function fetchDetailedSummary(filters) {
    showLoading("Gerando resumo detalhado...");
    try {
        const queryParams = new URLSearchParams();
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.memberId) queryParams.append('memberId', filters.memberId); // Ou memberName, dependendo do backend
        if (filters.lider) queryParams.append('lider', filters.lider);
        if (filters.gape) queryParams.append('gape', filters.gape);

        // Se /get-faltas não retorna todos os dados que você precisa para o modal detalhado,
        // você pode precisar de uma nova rota no server.js (ex: /get-detailed-summary)
        // que seu Apps Script também implementaria (ex: getDetailedSummary).
        const response = await fetch(`${BACKEND_BASE_URL}/get-faltas?${queryParams.toString()}`); // Adapte para a rota correta do seu backend
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao carregar resumo detalhado do servidor.');
        }

        const summary = await response.json(); // Espera o mesmo formato que google.script.run retornaria
                                            // { success: true, totalPresentMembers: X, totalAbsentMembers: Y, totalPresencesCount: Z, filterInfo: {...}, presencesByLeader: {...}}

        hideLoading();

        if (summary.success) {
            updateDetailedSummaryModal(summary);
            detailedSummaryModal.classList.remove('hidden'); // Exibe o modal
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

// Função para fazer logout
// --- NOVO logout no dashboard.js ---
async function logout() {
    showLoading("Saindo...");
    try {
        // Se você tiver uma rota de logout no Node.js para limpar tokens/sessões:
        const response = await fetch(`${BACKEND_BASE_URL}/logout`, { method: 'POST' }); 
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao fazer logout no servidor.');
        }
        
        // Limpar qualquer token/info de sessão armazenada no frontend (localStorage, sessionStorage)
        localStorage.removeItem('authToken'); 
        localStorage.removeItem('loggedInLeaderName'); // Remova qualquer info de login que você armazena

        hideLoading();
        // Redirecionar para a página de login após o logout bem-sucedido
        window.location.href = '/login.html'; // Ou 'index.html' se for a sua página de login
    } catch (error) {
        hideLoading();
        showMessage(`Erro ao fazer logout: ${error.message}`, 'error');
        console.error("Erro ao fazer logout no frontend:", error);
    }
}


// --- Funções de Manipulação do DOM ---

function populateFilterOptions(leaders, gapes) {
    // Popula líderes
    filterLider.innerHTML = '<option value="">Todos</option>';
    leaders.forEach(leader => {
        const option = document.createElement('option');
        option.value = leader;
        option.textContent = leader;
        filterLider.appendChild(option);
    });

    // Popula GAPEs
    filterGape.innerHTML = '<option value="">Todos</option>';
    gapes.forEach(gape => {
        const option = document.createElement('option');
        option.value = gape;
        option.textContent = gape;
        filterGape.appendChild(option);
    });
}

function displayMembers(members) {
    membersCardsContainer.innerHTML = ''; // Limpa os cartões existentes
    if (members.length === 0) {
        membersCardsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full">Nenhum membro encontrado com os filtros aplicados.</p>';
        return;
    }

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-4 transition duration-300 ease-in-out hover:shadow-lg flex flex-col';
        card.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">${member.nome}</h3>
            <p class="text-sm text-gray-600">Período: ${member.periodo}</p>
            <p class="text-sm text-gray-600">Líder: ${member.lider}</p>
            <p class="text-sm text-gray-600 mb-4">GAPE: ${member.gape}</p>
            <button class="btn-sm btn-primary mt-auto confirm-presence-btn" 
                    data-member-id="${member.id}" 
                    data-member-name="${member.nome}"
                    data-leader-name="${member.lider}"
                    data-gape-name="${member.gape}"
                    data-periodo="${member.periodo}">
                Confirmar Presença
            </button>
        `;
        membersCardsContainer.appendChild(card);
    });

    // Adiciona event listeners aos novos botões
    document.querySelectorAll('.confirm-presence-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const memberId = event.target.dataset.memberId;
            const memberName = event.target.dataset.memberName;
            const leaderName = event.target.dataset.leaderName;
            const gapeName = event.target.dataset.gapeName;
            const periodo = event.target.dataset.periodo;
            const presenceDate = presenceDateInput.value; // Pega a data do input

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
        option.value = member.id; // Ou member.nome, dependendo de como você filtra no backend
        option.textContent = member.nome;
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

    // Destroi gráficos existentes para evitar duplicidade
    if (summaryPieChart) summaryPieChart.destroy();
    if (summaryBarChart) summaryBarChart.destroy();

    // Gráfico de Pizza/Donut (Presenças vs Faltas)
    summaryPieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Membros com Presença', 'Membros Sem Presença (Faltas)'],
            datasets: [{
                data: [summary.totalPresentMembers, summary.totalAbsentMembers],
                backgroundColor: ['#4CAF50', '#F44336'], // Verde para presença, Vermelho para faltas
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

    // Gráfico de Barras (Presenças por Líder)
    // Adapte 'summary.presencesByLeader' para o formato que seu Apps Script retorna
    const leaders = Object.keys(summary.presencesByLeader || {});
    const presences = Object.values(summary.presencesByLeader || {});

    summaryBarChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: leaders,
            datasets: [{
                label: 'Total de Presenças',
                data: presences,
                backgroundColor: '#3B82F6', // Azul
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

// Função para fazer download do PDF
function downloadPdf() {
    showLoading("Gerando PDF...");
    html2canvas(detailedSummaryContent, {
        scale: 2, // Aumenta a resolução para melhor qualidade no PDF
        useCORS: true // Importante se tiver imagens externas
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('landscape', 'mm', 'a4'); // 'landscape' para paisagem, 'mm' para milímetros, 'a4' para tamanho A4

        const imgWidth = 280; // Largura para A4 paisagem em mm (aprox. 297mm - margens)
        const pageHeight = 210; // Altura para A4 paisagem em mm

        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 5; // Margem superior inicial

        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight); // 5mm de margem em todos os lados
        heightLeft -= pageHeight - 10; // Remove a altura da primeira página (menos as margens)

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
    fetchInitialData();
    // Define a data de hoje como padrão no input de presença
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    presenceDateInput.value = `${year}-${month}-${day}`;
});

logoutBtn.addEventListener('click', logout);

applyFiltersBtn.addEventListener('click', () => {
    currentFilters = {
        name: filterName.value,
        periodo: filterPeriodo.value,
        lider: filterLider.value,
        gape: filterGape.value
    };
    fetchMembers(currentFilters);
    fetchAndDisplaySummary(); // Atualiza o resumo com os novos filtros
});

clearFiltersBtn.addEventListener('click', () => {
    filterName.value = '';
    filterPeriodo.value = '';
    filterLider.value = '';
    filterGape.value = '';
    currentFilters = {};
    fetchMembers(currentFilters);
    fetchAndDisplaySummary(); // Limpa o resumo também
});

toggleDashboardBtn.addEventListener('click', () => {
    if (dashboardContainer.classList.contains('max-h-0')) {
        dashboardContainer.classList.remove('max-h-0', 'opacity-0');
        dashboardContainer.classList.add('max-h-screen', 'opacity-100'); // max-h-screen para transição suave
        dashboardOpenIcon.classList.add('hidden');
        dashboardOpenText.classList.add('hidden');
        dashboardCloseIcon.classList.remove('hidden');
        dashboardCloseText.classList.remove('hidden');
        fetchAndDisplaySummary(); // Garante que o resumo esteja atualizado ao abrir
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
    const { start, end } = getCurrentMonthDateRange(); // Filtro padrão para o modal: mês atual
    summaryStartDateInput.value = start;
    summaryEndDateInput.value = end;
    summaryMemberSelect.value = ''; // Limpa a seleção de membro no modal

    // Prepara os filtros para o modal (pode começar com os filtros da tela principal ou zerar)
    const modalFilters = {
        startDate: summaryStartDateInput.value,
        endDate: summaryEndDateInput.value,
        memberId: summaryMemberSelect.value, // Ou memberName, dependendo do seu backend
        lider: currentFilters.lider || '', // Passa os filtros da tela principal
        gape: currentFilters.gape || ''
    };
    fetchDetailedSummary(modalFilters);
});

closeModalBtn.addEventListener('click', () => {
    detailedSummaryModal.classList.add('hidden');
});

// Listener para aplicar filtros no modal de resumo
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
