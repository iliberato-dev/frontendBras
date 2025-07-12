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
function fetchInitialData() {
    showLoading("Carregando dados iniciais...");
    google.script.run
        .withSuccessHandler(data => {
            hideLoading();
            populateFilterOptions(data.leaders, data.gapes);
            loggedInLeaderName.textContent = `Logado como: ${data.loggedInUser}`; // Supondo que o Apps Script retorne o nome do usuário logado
            fetchMembers(currentFilters); // Carrega os membros após popular os filtros
            fetchAndDisplaySummary(); // Carrega o resumo inicial
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro ao carregar dados iniciais: ${error.message}`, 'error');
            console.error("Erro ao carregar dados iniciais:", error);
        })
        .getInitialData(); // Nome da função no seu Apps Script
}

// Função para buscar membros com base nos filtros
function fetchMembers(filters) {
    showLoading("Buscando membros...");
    google.script.run
        .withSuccessHandler(data => {
            hideLoading();
            membersData = data;
            displayMembers(data);
            populateSummaryMemberSelect(data); // Atualiza a lista de membros no modal de resumo
            if (data.length === 0) {
                showMessage("Nenhum membro encontrado com os filtros aplicados.", "info");
            }
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro ao buscar membros: ${error.message}`, 'error');
            console.error("Erro ao buscar membros:", error);
        })
        .getFilteredMembers(filters); // Nome da função no seu Apps Script
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
function fetchAndDisplaySummary() {
    showLoading("Carregando resumo do dashboard...");
    const { start, end } = getCurrentMonthDateRange();

    // Adapte o objeto filters para o que seu Apps Script espera para o resumo
    const summaryFilters = {
        ...currentFilters, // Inclui os filtros atuais da tela principal
        startDate: start,
        endDate: end
    };

    google.script.run
        .withSuccessHandler(summaryData => {
            hideLoading();
            // Supondo que summaryData.totalPresences e summaryData.totalAbsences (faltas) vêm do Apps Script
            dashboardPresencasMes.textContent = summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0;
            dashboardFaltasMes.textContent = summaryData.totalAbsences !== undefined ? summaryData.totalAbsences : 0; // Exibe as faltas

            // Atualiza os filtros exibidos no dashboard
            dashboardPeriodo.textContent = currentFilters.periodo || 'Todos';
            dashboardLider.textContent = currentFilters.lider || 'Todos';
            dashboardGape.textContent = currentFilters.gape || 'Todos';

            // Atualiza a lista de contagens individuais (ainda exibirá os membros filtrados)
            totalCountsList.innerHTML = '';
            if (summaryData.memberCounts && Object.keys(summaryData.memberCounts).length > 0) {
                // Adiciona os totais gerais primeiro na lista
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-green-300">Total Presenças (Mês): ${summaryData.totalPresences !== undefined ? summaryData.totalPresences : 0}</li>`;
                totalCountsList.innerHTML += `<li class="text-lg font-bold text-red-300">Membros Sem Presença (Mês): ${summaryData.totalAbsences !== undefined ? summaryData.totalAbsences : 0}</li>`;
                
                // Adiciona os detalhes por membro
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
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro ao carregar resumo: ${error.message}`, 'error');
            console.error("Erro ao carregar resumo:", error);
        })
        .getMonthlySummary(summaryFilters); // Nome da função no seu Apps Script, que agora aceita startDate e endDate
}

// Função para buscar dados detalhados para o modal de resumo
function fetchDetailedSummary(filters) {
    showLoading("Gerando resumo detalhado...");
    google.script.run
        .withSuccessHandler(summary => {
            hideLoading();
            updateDetailedSummaryModal(summary);
            detailedSummaryModal.classList.remove('hidden'); // Exibe o modal
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro ao carregar resumo detalhado: ${error.message}`, 'error');
            console.error("Erro ao carregar resumo detalhado:", error);
        })
        .getDetailedSummary(filters); // Nome da função no seu Apps Script
}

// Função para fazer logout
function logout() {
    showLoading("Saindo...");
    google.script.run
        .withSuccessHandler(() => {
            // Após o logout bem-sucedido no Apps Script, redirecionar para a página de login
            window.top.location.href = 'index.html'; // Altere para a sua página de login
        })
        .withFailureHandler(error => {
            hideLoading();
            showMessage(`Erro ao fazer logout: ${error.message}`, 'error');
            console.error("Erro ao fazer logout:", error);
        })
        .doLogout(); // Nome da função no seu Apps Script
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
