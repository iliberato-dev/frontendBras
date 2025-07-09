// dashboard.js

// Variáveis globais para armazenar os dados dos membros e presenças
let allMembersData = [];
let lastPresencesData = {}; // Para armazenar a última presença de cada membro

// --- Funções Auxiliares para Ícones ---

/**
 * Retorna o ícone e a cor CSS para o Período.
 * @param {string} periodo O valor do período (Manhã, Tarde, Noite).
 * @returns {Object} Um objeto com 'iconClass' e 'colorClass'.
 */
function getPeriodoIcon(periodo) {
    const normalizedPeriodo = periodo.toLowerCase();
    if (normalizedPeriodo.includes('manhã') || normalizedPeriodo.includes('tarde')) {
        return { iconClass: 'fas fa-sun', colorClass: 'text-yellow-500' };
    } else if (normalizedPeriodo.includes('noite')) {
        return { iconClass: 'fas fa-moon', colorClass: 'text-blue-500' };
    }
    return { iconClass: 'fas fa-clock', colorClass: 'text-gray-500' }; // Padrão
}

/**
 * Retorna o ícone e a cor CSS para o Status.
 * @param {string} status O valor do status (Ativo, Inativo, Suspenso).
 * @returns {Object} Um objeto com 'iconClass' e 'colorClass'.
 */
function getStatusIcon(status) {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('ativo')) {
        return { iconClass: 'fas fa-check-circle', colorClass: 'text-green-500' };
    } else if (normalizedStatus.includes('inativo')) {
        return { iconClass: 'fas fa-times-circle', colorClass: 'text-red-500' };
    } else if (normalizedStatus.includes('suspenso')) {
        return { iconClass: 'fas fa-ban', colorClass: 'text-orange-500' };
    }
    return { iconClass: 'fas fa-question-circle', colorClass: 'text-gray-500' }; // Padrão
}

/**
 * Retorna o ícone e a cor CSS para o Cargo.
 * @param {string} cargo O valor do cargo.
 * @returns {Object} Um objeto com 'iconClass' e 'colorClass'.
 */
function getCargoIcon(cargo) {
    const normalizedCargo = cargo.toLowerCase();
    if (normalizedCargo.includes('pastor') || normalizedCargo.includes('bispo')) {
        return { iconClass: 'fas fa-cross', colorClass: 'text-indigo-600' };
    } else if (normalizedCargo.includes('líder') || normalizedCargo.includes('diácono')) {
        return { iconClass: 'fas fa-user-tie', colorClass: 'text-blue-600' };
    } else if (normalizedCargo.includes('membro')) {
        return { iconClass: 'fas fa-user', colorClass: 'text-gray-700' };
    }
    return { iconClass: 'fas fa-briefcase', colorClass: 'text-gray-500' }; // Padrão
}

/**
 * Retorna o ícone e a cor CSS para o GAPE.
 * @param {string} gape O valor do GAPE.
 * @returns {Object} Um objeto com 'iconClass' e 'colorClass'.
 */
function getGapeIcon(gape) {
    const normalizedGape = gape.toLowerCase();
    if (normalizedGape.includes('sim')) {
        return { iconClass: 'fas fa-users-cog', colorClass: 'text-teal-500' }; // Ícone para GAPE (ajustei para users-cog, pode ser outro)
    } else if (normalizedGape.includes('não')) {
        return { iconClass: 'fas fa-user-slash', colorClass: 'text-gray-400' };
    }
    return { iconClass: 'fas fa-cogs', colorClass: 'text-gray-500' }; // Padrão
}

/**
 * Retorna o ícone e a cor CSS para a Congregação.
 * @param {string} congregacao O valor da congregação.
 * @returns {Object} Um objeto com 'iconClass' e 'colorClass'.
 */
function getCongregacaoIcon(congregacao) {
    const normalizedCongregacao = congregacao.toLowerCase();
    if (normalizedCongregacao.includes('vila solange')) {
        return { iconClass: 'fas fa-church', colorClass: 'text-purple-600' };
    }
    return { iconClass: 'fas fa-map-marker-alt', colorClass: 'text-gray-500' }; // Padrão
}

// Função para exibir mensagens temporárias
function showMessage(message, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    messageArea.textContent = message;
    messageArea.className = 'message-box block text-center py-2 px-4 rounded-lg shadow-md mb-4 transition-all duration-500 ease-in-out';

    if (type === 'success') {
        messageArea.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        messageArea.classList.add('bg-red-100', 'text-red-800');
    } else { // info ou padrão
        messageArea.classList.add('bg-blue-100', 'text-blue-800');
    }

    // Oculta a mensagem após 5 segundos
    setTimeout(() => {
        messageArea.classList.remove('block');
        messageArea.classList.add('hidden');
    }, 5000);
}

// Função para mostrar/ocultar o indicador de carregamento
function showLoading(message = 'Carregando...') {
    const indicator = document.getElementById('globalLoadingIndicator');
    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.textContent = message;
    indicator.classList.remove('opacity-0', 'pointer-events-none');
    indicator.classList.add('opacity-100');
}

function hideLoading() {
    const indicator = document.getElementById('globalLoadingIndicator');
    indicator.classList.remove('opacity-100');
    indicator.classList.add('opacity-0', 'pointer-events-none');
}

// Função para buscar a URL da API Web App (substitua pelo seu Deployment ID)
function getWebAppUrl() {
    // Substitua 'YOUR_DEPLOYMENT_ID' pelo ID do seu Deployment de script no Google Apps Script
    // Ex: "https://script.google.com/macros/s/AKfycbz_YOUR_DEPLOYMENT_ID_HERE/exec"
    return "YOUR_WEB_APP_URL_HERE";
}

// Função para buscar membros
async function fetchMembers() {
    showLoading('Buscando membros...');
    try {
        const response = await fetch(`${getWebAppUrl()}?tipo=getMembros`);
        const data = await response.json();
        if (data.success) {
            allMembersData = data.membros;
            console.log("Membros carregados:", allMembersData);
            return allMembersData;
        } else {
            showMessage(`Erro ao carregar membros: ${data.message}`, 'error');
            console.error("Erro ao carregar membros:", data.message);
            return [];
        }
    } catch (error) {
        showMessage(`Erro na rede ao carregar membros: ${error.message}`, 'error');
        console.error("Erro na rede ao carregar membros:", error);
        return [];
    } finally {
        hideLoading();
    }
}

// Função para buscar a última presença de todos os membros
async function fetchLastPresencesForAllMembers() {
    try {
        const response = await fetch(`${getWebAppUrl()}?tipo=getLastPresencesForAllMembers`);
        const data = await response.json();
        if (data.success) {
            lastPresencesData = data.data;
            console.log("Últimas presenças carregadas:", lastPresencesData);
        } else {
            console.error("Erro ao carregar últimas presenças:", data.message);
        }
    } catch (error) {
        console.error("Erro na rede ao carregar últimas presenças:", error);
    }
}

// Função para atualizar a exibição da última presença em cada card
function updateLastPresencesDisplay() {
    for (const memberName in lastPresencesData) {
        const formattedMemberName = memberName.replace(/\s+/g, '-'); // Sanitiza para ID
        const lastPresenceElement = document.getElementById(`lastPresence-${formattedMemberName}`);
        if (lastPresenceElement) {
            const presence = lastPresencesData[memberName];
            lastPresenceElement.textContent = `Última presença: ${presence.data} às ${presence.hora} (GAPE: ${presence.gape})`;
        }
    }
}


// Função para preencher os selects de filtro (Líder e GAPE)
function populateFilterSelects() {
    const liderSelect = document.getElementById('filterLider');
    const gapeSelect = document.getElementById('filterGape');

    // Sempre limpa e adiciona a opção "Todos"
    liderSelect.innerHTML = '<option value="">Todos</option>';
    gapeSelect.innerHTML = '<option value="">Todos</option>';

    const uniqueLiders = new Set();
    const uniqueGapes = new Set();

    allMembersData.forEach(member => {
        if (member.Lider) uniqueLiders.add(member.Lider);
        if (member.GAPE) uniqueGapes.add(member.GAPE);
    });

    uniqueLiders.forEach(lider => {
        const option = document.createElement('option');
        option.value = lider;
        option.textContent = lider;
        liderSelect.appendChild(option);
    });

    uniqueGapes.forEach(gape => {
        const option = document.createElement('option');
        option.value = gape;
        option.textContent = gape;
        gapeSelect.appendChild(option);
    });
}

// Função para renderizar os cards dos membros
function displayMembers(members) {
    const container = document.getElementById('membersCardsContainer');
    if (!container) {
        console.error("Container 'membersCardsContainer' não encontrado.");
        return;
    }
    container.innerHTML = ''; // Limpa cards existentes

    if (members.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-600 col-span-full">Nenhum membro encontrado com os filtros aplicados.</p>';
        return;
    }

    members.forEach(member => {
        // Obter ícones para cada campo
        const periodoIcon = getPeriodoIcon(member.Periodo);
        const statusIcon = getStatusIcon(member.Status);
        const cargoIcon = getCargoIcon(member.Cargo);
        const gapeIcon = getGapeIcon(member.GAPE);
        const congregacaoIcon = getCongregacaoIcon(member.Congregacao);

        const memberCard = `
            <div class="bg-white p-4 rounded-lg shadow-md flex flex-col space-y-2 fade-in">
                <h3 class="text-lg font-bold text-gray-900">${member.Nome}</h3>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="${statusIcon.iconClass} ${statusIcon.colorClass} mr-2"></i>
                    <span class="font-semibold">Status:</span> ${member.Status}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="${cargoIcon.iconClass} ${cargoIcon.colorClass} mr-2"></i>
                    <span class="font-semibold">Cargo:</span> ${member.Cargo}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="${periodoIcon.iconClass} ${periodoIcon.colorClass} mr-2"></i>
                    <span class="font-semibold">Período:</span> ${member.Periodo}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="fas fa-id-card ${member.RI ? 'text-blue-500' : 'text-gray-400'} mr-2"></i>
                    <span class="font-semibold">RI:</span> ${member.RI || 'N/A'}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="${congregacaoIcon.iconClass} ${congregacaoIcon.colorClass} mr-2"></i>
                    <span class="font-semibold">Congregação:</span> ${member.Congregacao}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="fas fa-users-line ${member.Lider ? 'text-green-600' : 'text-gray-400'} mr-2"></i>
                    <span class="font-semibold">Líder:</span> ${member.Lider || 'N/A'}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="${gapeIcon.iconClass} ${gapeIcon.colorClass} mr-2"></i>
                    <span class="font-semibold">GAPE:</span> ${member.GAPE}
                </p>
                <p class="text-gray-700 text-sm flex items-center">
                    <i class="fas fa-calendar-check text-purple-600 mr-2"></i>
                    <span class="font-semibold">Presenças (Total):</span> ${member.PresencasTotal}
                </p>
                <p id="lastPresence-${member.Nome.replace(/\s+/g, '-')}" class="text-gray-600 text-xs mt-1">Última presença: Carregando...</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', memberCard);
    });
    // Atualiza a exibição da última presença após criar os cards
    updateLastPresencesDisplay();
}

// Função para aplicar os filtros e renderizar os membros
async function applyFilters() {
    showLoading('Aplicando filtros...');
    const filterName = document.getElementById('filterName').value.toLowerCase().trim();
    const filterPeriodo = document.getElementById('filterPeriodo').value.toLowerCase().trim();
    const filterLider = document.getElementById('filterLider').value.toLowerCase().trim();
    const filterGape = document.getElementById('filterGape').value.toLowerCase().trim();

    // Filtra primeiro os membros
    const filteredMembers = allMembersData.filter(member => {
        const matchesName = member.Nome.toLowerCase().includes(filterName);
        const matchesPeriodo = !filterPeriodo || member.Periodo.toLowerCase().includes(filterPeriodo);
        const matchesLider = !filterLider || (member.Lider && member.Lider.toLowerCase().includes(filterLider));
        const matchesGape = !filterGape || member.GAPE.toLowerCase().includes(filterGape);
        return matchesName && matchesPeriodo && matchesLider && matchesGape;
    });

    displayMembers(filteredMembers);
    hideLoading();

    // Recarrega o dashboard com os novos filtros
    await updateDashboard(filterPeriodo, filterLider, filterGape);
}

// Função para limpar os filtros
function clearFilters() {
    document.getElementById('filterName').value = '';
    document.getElementById('filterPeriodo').value = '';
    document.getElementById('filterLider').value = '';
    document.getElementById('filterGape').value = '';
    applyFilters(); // Reaplicar filtros para mostrar todos
}

// Variável global para o Chart.js
let summaryChartInstance = null;
let summaryBarChartInstance = null;

// Função para atualizar o dashboard (presenças e info)
async function updateDashboard(periodo = '', lider = '', gape = '') {
    showLoading('Atualizando dashboard...');
    try {
        const urlParams = new URLSearchParams();
        urlParams.append('tipo', 'presencasTotal');
        if (periodo) urlParams.append('periodo', periodo);
        if (lider) urlParams.append('lider', lider);
        if (gape) urlParams.append('gape', gape);

        const response = await fetch(`${getWebAppUrl()}?${urlParams.toString()}`);
        const data = await response.json();

        if (data.success) {
            const totalCounts = data.data;
            let totalPresencasMes = 0;
            const totalCountsList = document.getElementById('totalCountsList');
            totalCountsList.innerHTML = ''; // Limpa a lista

            const chartLabels = [];
            const chartData = [];
            const chartColors = [];

            if (Object.keys(totalCounts).length > 0) {
                // Ordena os membros por número de presenças (maior para menor)
                const sortedMembers = Object.entries(totalCounts).sort(([, countA], [, countB]) => countB - countA);

                sortedMembers.forEach(([nome, count]) => {
                    totalPresencasMes += count;
                    const listItem = document.createElement('li');
                    listItem.className = 'flex justify-between items-center bg-gray-800 p-2 rounded';
                    listItem.innerHTML = `
                        <span class="font-medium">${nome}</span>
                        <span class="font-bold text-lg text-green-400">${count}</span>
                    `;
                    totalCountsList.appendChild(listItem);

                    chartLabels.push(nome);
                    chartData.push(count);
                    chartColors.push(`hsl(${Math.random() * 360}, 70%, 50%)`); // Cores aleatórias
                });
            } else {
                totalCountsList.innerHTML = '<li class="text-sm text-gray-200 text-center">Nenhuma presença para os filtros aplicados neste mês.</li>';
            }

            document.getElementById('dashboardPresencasMes').textContent = totalPresencasMes;
            document.getElementById('dashboardPeriodo').textContent = periodo ? periodo.charAt(0).toUpperCase() + periodo.slice(1) : 'Todos';
            document.getElementById('dashboardLider').textContent = lider ? lider.charAt(0).toUpperCase() + lider.slice(1) : 'Todos';
            document.getElementById('dashboardGape').textContent = gape ? gape.toUpperCase() : 'Todos';

            // Atualiza o gráfico de pizza (Chart.js)
            const ctx = document.getElementById('summaryChart').getContext('2d');
            if (summaryChartInstance) {
                summaryChartInstance.destroy();
            }
            summaryChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: 'white' // Cor das legendas
                            }
                        },
                        title: {
                            display: true,
                            text: 'Presenças por Membro (Mês Atual)',
                            color: 'white'
                        },
                        datalabels: { // Configuração do plugin datalabels
                            color: '#fff',
                            formatter: (value, ctx) => {
                                let sum = 0;
                                let dataArr = ctx.chart.data.datasets[0].data;
                                dataArr.map(data => {
                                    sum += data;
                                });
                                let percentage = (value * 100 / sum).toFixed(1) + "%";
                                return percentage;
                            },
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels] // Registrar o plugin
            });

            // Atualiza o gráfico de barras horizontais (Chart.js)
            const barCtx = document.getElementById('summaryBarChart').getContext('2d');
            if (summaryBarChartInstance) {
                summaryBarChartInstance.destroy();
            }
            summaryBarChartInstance = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Número de Presenças',
                        data: chartData,
                        backgroundColor: chartColors, // Usar as mesmas cores
                        borderColor: chartColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y', // Tornar o gráfico horizontal
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // Não precisa de legenda para uma única série de barras
                        },
                        title: {
                            display: true,
                            text: 'Presenças por Membro (Comparativo)',
                            color: 'white'
                        },
                        datalabels: {
                            color: '#fff',
                            anchor: 'end',
                            align: 'start',
                            formatter: (value) => value // Exibe o valor numérico diretamente
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: 'white' // Cor dos ticks do eixo X
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // Cor da grade
                            }
                        },
                        y: {
                            ticks: {
                                color: 'white' // Cor dos ticks do eixo Y
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // Cor da grade
                            }
                        }
                    }
                },
                plugins: [ChartDataLabels] // Registrar o plugin
            });


        } else {
            showMessage(`Erro ao carregar dados do dashboard: ${data.message}`, 'error');
            console.error("Erro ao carregar dashboard:", data.message);
        }
    } catch (error) {
        showMessage(`Erro na rede ao carregar dashboard: ${error.message}`, 'error');
        console.error("Erro na rede ao carregar dashboard:", error);
    } finally {
        hideLoading();
    }
}

// --- Funções para o Modal de Resumo Detalhado ---

async function fetchDetailedPresences(startDate, endDate, specificMemberName) {
    showLoading('Gerando resumo detalhado...');
    try {
        const urlParams = new URLSearchParams();
        urlParams.append('tipo', 'presencasTotal'); // Reutilizamos essa função, mas os filtros a deixarão mais específica
        if (startDate) urlParams.append('startDate', startDate);
        if (endDate) urlParams.append('endDate', endDate);
        if (specificMemberName) urlParams.append('nome', specificMemberName); // Assumindo que a API pode filtrar por nome

        const response = await fetch(`${getWebAppUrl()}?${urlParams.toString()}`);
        const data = await response.json();

        if (data.success) {
            return data.data; // Deve retornar um objeto com { "Nome do Membro": contagem }
        } else {
            showMessage(`Erro ao carregar resumo detalhado: ${data.message}`, 'error');
            return {};
        }
    } catch (error) {
        showMessage(`Erro de rede ao buscar resumo detalhado: ${error.message}`, 'error');
        return {};
    } finally {
        hideLoading();
    }
}

function updateDetailedSummaryModal() {
    const detailedSummaryText = document.getElementById('detailedSummaryText');
    const summaryChartCanvas = document.getElementById('summaryChart');
    const summaryBarChartCanvas = document.getElementById('summaryBarChart');
    const reportInfo = document.getElementById('reportInfo');

    // Obter os valores dos filtros do modal
    const startDate = document.getElementById('summaryStartDate').value;
    const endDate = document.getElementById('summaryEndDate').value;
    const specificMemberName = document.getElementById('summaryMemberSelect').value;

    showLoading('Recarregando resumo...');

    fetchDetailedPresences(startDate, endDate, specificMemberName).then(presencesData => {
        let totalCount = 0;
        const memberCounts = []; // Array de objetos { name: "Nome", count: X }
        const memberNames = [];
        const presenceCounts = [];
        const colors = [];

        for (const name in presencesData) {
            const count = presencesData[name];
            totalCount += count;
            memberCounts.push({ name: name, count: count });
        }

        // Ordenar do maior para o menor
        memberCounts.sort((a, b) => b.count - a.count);

        memberCounts.forEach(item => {
            memberNames.push(item.name);
            presenceCounts.push(item.count);
            colors.push(`hsl(${Math.random() * 360}, 70%, 60%)`);
        });

        // Informações do Relatório
        const today = new Date().toLocaleDateString('pt-BR');
        let reportTitle = "Relatório de Presenças";
        let memberFilterInfo = specificMemberName ? `Membro: ${specificMemberName}` : "Membros: Todos (filtrados)";
        let dateFilterInfo = "";

        if (startDate && endDate) {
            reportTitle += ` entre ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} e ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
            dateFilterInfo = `Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
        } else if (startDate) {
             reportTitle += ` a partir de ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
             dateFilterInfo = `A partir de: ${new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
        } else if (endDate) {
            reportTitle += ` até ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
            dateFilterInfo = `Até: ${new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
        } else {
            // Se nenhum filtro de data, use o mês/ano atual como padrão de exibição
            reportTitle += ` (Mês/Ano Atual)`;
            const now = new Date();
            dateFilterInfo = `Mês/Ano: ${now.getMonth() + 1}/${now.getFullYear()}`;
        }


        // Obter informações do líder e GAPE do membro logado (se houver)
        const loggedInLeader = document.getElementById('loggedInLeaderName').textContent.replace('Logado como: ', '');
        const currentGape = allMembersData.find(m => m.Nome === loggedInLeader)?.GAPE || 'N/A';


        reportInfo.innerHTML = `
            <p class="font-bold text-lg mb-2">${reportTitle}</p>
            <p><strong>Data do Relatório:</strong> ${today}</p>
            <p><strong>Usuário Logado:</strong> ${loggedInLeader}</p>
            <p><strong>GAPE do Usuário:</strong> ${currentGape}</p>
            <p>${memberFilterInfo}</p>
            <p>${dateFilterInfo}</p>
        `;

        let detailedListHtml = '';
        if (memberCounts.length > 0) {
            detailedListHtml = `
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Presenças Individuais:</h3>
                <ul class="list-disc list-inside space-y-1">
                    ${memberCounts.map(item => `<li>${item.name}: <strong>${item.count}</strong> presenças</li>`).join('')}
                </ul>
                <p class="mt-4 text-lg font-bold text-gray-800">Total de Presenças Encontradas: ${totalCount}</p>
                <p class="text-sm text-gray-600 mt-2">Este resumo mostra a contagem de presenças para o(s) membro(s) selecionado(s) dentro do período de datas especificado.</p>
            `;
        } else {
            detailedListHtml = '<p class="text-gray-700 text-center">Nenhuma presença encontrada para os filtros selecionados.</p>';
        }
        detailedSummaryText.innerHTML = detailedListHtml;


        // Atualizar o gráfico de pizza no modal
        if (summaryChartInstance) {
            summaryChartInstance.destroy();
        }
        summaryChartInstance = new Chart(summaryChartCanvas, {
            type: 'pie',
            data: {
                labels: memberNames,
                datasets: [{
                    data: presenceCounts,
                    backgroundColor: colors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Distribuição de Presenças',
                    },
                    datalabels: {
                        color: '#fff',
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        },
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

        // Atualizar o gráfico de barras horizontais no modal
        if (summaryBarChartInstance) {
            summaryBarChartInstance.destroy();
        }
        summaryBarChartInstance = new Chart(summaryBarChartCanvas, {
            type: 'bar',
            data: {
                labels: memberNames,
                datasets: [{
                    label: 'Número de Presenças',
                    data: presenceCounts,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Torna o gráfico horizontal
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Presenças por Membro',
                    },
                    datalabels: {
                        color: '#333',
                        anchor: 'end',
                        align: 'start',
                        formatter: (value) => value
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                    }
                }
            },
            plugins: [ChartDataLabels]
        });

    }).catch(error => {
        console.error("Erro ao atualizar modal de resumo:", error);
        showMessage("Erro ao carregar resumo detalhado.", "error");
    }).finally(() => {
        hideLoading();
    });
}

// Função para popular o select de membros no modal
function populateSummaryMemberSelect() {
    const selectElement = document.getElementById('summaryMemberSelect');
    selectElement.innerHTML = '<option value="">Todos os Membros Filtrados</option>'; // Opção padrão
    
    // Obter os membros atualmente exibidos pelos filtros principais
    const filterName = document.getElementById('filterName').value.toLowerCase().trim();
    const filterPeriodo = document.getElementById('filterPeriodo').value.toLowerCase().trim();
    const filterLider = document.getElementById('filterLider').value.toLowerCase().trim();
    const filterGape = document.getElementById('filterGape').value.toLowerCase().trim();

    const filteredMembersForSelect = allMembersData.filter(member => {
        const matchesName = member.Nome.toLowerCase().includes(filterName);
        const matchesPeriodo = !filterPeriodo || member.Periodo.toLowerCase().includes(filterPeriodo);
        const matchesLider = !filterLider || (member.Lider && member.Lider.toLowerCase().includes(filterLider));
        const matchesGape = !filterGape || member.GAPE.toLowerCase().includes(filterGape);
        return matchesName && matchesPeriodo && matchesLider && matchesGape;
    });

    // Adicionar os membros filtrados ao select
    filteredMembersForSelect.sort((a, b) => a.Nome.localeCompare(b.Nome)); // Opcional: ordenar por nome
    filteredMembersForSelect.forEach(member => {
        const option = document.createElement('option');
        option.value = member.Nome;
        option.textContent = member.Nome;
        selectElement.appendChild(option);
    });
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    // Definir o nome do líder logado (exemplo - em um app real, viria de um login)
    document.getElementById('loggedInLeaderName').textContent = 'Logado como: Administrador'; // Nome fictício por enquanto

    // Listener para o botão de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; // Redireciona para a página inicial/login
        });
    }

    // Carregar todos os membros e preencher os filtros
    await fetchMembers();
    populateFilterSelects();
    applyFilters(); // Aplica os filtros iniciais para carregar todos os membros

    // Carrega as últimas presenças de todos os membros
    await fetchLastPresencesForAllMembers();
    // A função updateLastPresencesDisplay é chamada dentro de displayMembers agora

    // Listeners para os botões de filtro
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    document.getElementById('filterName').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            applyFilters();
        }
    });

    // Listener para o botão de alternar dashboard
    const toggleDashboardBtn = document.getElementById('toggleDashboardBtn');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const dashboardOpenIcon = document.getElementById('dashboardOpenIcon');
    const dashboardCloseIcon = document.getElementById('dashboardCloseIcon');
    const dashboardOpenText = document.getElementById('dashboardOpenText');
    const dashboardCloseText = document.getElementById('dashboardCloseText');

    toggleDashboardBtn.addEventListener('click', () => {
        if (dashboardContainer.classList.contains('max-h-0')) {
            dashboardContainer.classList.remove('max-h-0', 'opacity-0');
            dashboardContainer.classList.add('max-h-screen', 'opacity-100'); // max-h-screen para transição
            dashboardOpenIcon.classList.add('hidden');
            dashboardOpenText.classList.add('hidden');
            dashboardCloseIcon.classList.remove('hidden');
            dashboardCloseText.classList.remove('hidden');
            updateDashboard(
                document.getElementById('filterPeriodo').value,
                document.getElementById('filterLider').value,
                document.getElementById('filterGape').value
            );
        } else {
            dashboardContainer.classList.remove('max-h-screen', 'opacity-100');
            dashboardContainer.classList.add('max-h-0', 'opacity-0');
            dashboardOpenIcon.classList.remove('hidden');
            dashboardOpenText.classList.remove('hidden');
            dashboardCloseIcon.classList.add('hidden');
            dashboardCloseText.classList.add('hidden');
        }
    });

    // Listeners para o Modal de Resumo Detalhado
    const detailedSummaryModal = document.getElementById('detailedSummaryModal');
    const showDetailedSummaryBtn = document.getElementById('showDetailedSummaryBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const summaryStartDate = document.getElementById('summaryStartDate');
    const summaryEndDate = document.getElementById('summaryEndDate');
    const summaryMemberSelect = document.getElementById('summaryMemberSelect');

    showDetailedSummaryBtn.addEventListener('click', () => {
        populateSummaryMemberSelect(); // Popula o select de membros no modal
        detailedSummaryModal.classList.remove('hidden');
        updateDetailedSummaryModal(); // Carrega os dados iniciais do resumo
    });

    closeModalBtn.addEventListener('click', () => {
        detailedSummaryModal.classList.add('hidden');
        // Destrói as instâncias dos gráficos para evitar vazamento de memória
        if (summaryChartInstance) {
            summaryChartInstance.destroy();
            summaryChartInstance = null;
        }
        if (summaryBarChartInstance) {
            summaryBarChartInstance.destroy();
            summaryBarChartInstance = null;
        }
    });

    // Adiciona listeners para os filtros do modal
    summaryStartDate.addEventListener('change', updateDetailedSummaryModal);
    summaryEndDate.addEventListener('change', updateDetailedSummaryModal);
    summaryMemberSelect.addEventListener('change', updateDetailedSummaryModal);

    // Botão de Download PDF
    document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
        showLoading('Gerando PDF...');
        const detailedContent = document.getElementById('detailedSummaryContent');
        
        // Temporariamente remove o botão de download e a seção de filtros para impressão
        document.getElementById('downloadPdfBtn').style.display = 'none';
        document.getElementById('summaryFilterSection').style.display = 'none';

        // Usa html2canvas para capturar o conteúdo do modal
        const canvas = await html2canvas(detailedContent, {
            scale: 2, // Aumenta a escala para melhor qualidade no PDF
            useCORS: true, // Importante se tiver imagens de URLs externas
            windowWidth: detailedContent.scrollWidth, // Captura a largura total do conteúdo
            windowHeight: detailedContent.scrollHeight // Captura a altura total do conteúdo
        });

        // Restaura a exibição dos elementos
        document.getElementById('downloadPdfBtn').style.display = 'block';
        document.getElementById('summaryFilterSection').style.display = 'block';

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4'); // Define o PDF como paisagem (landscape) e A4
        const imgWidth = 280; // Largura aproximada para A4 paisagem (297mm - margens)
        const pageHeight = pdf.internal.pageSize.height;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let position = 5; // Margem inicial do topo

        // Se a imagem for muito alta, divide em várias páginas
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const today = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const filename = `Relatorio_Presencas_${today}.pdf`;
        pdf.save(filename);
        hideLoading();
        showMessage('PDF gerado com sucesso!', 'success');
    });

});
