// ------------------------------------------------------
// Frontend (js/dashboard.js) - Versão Atualizada para Filtros no Dashboard
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Variável para armazenar todas as últimas presenças

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

// !!! IMPORTANTE: Substitua pela URL PÚBLICA do seu backend no Render !!!
// Deve ser a mesma URL definida na variável de ambiente FRONTEND_URL no seu backend Render
const BACKEND_URL = 'https://backendbras.onrender.com';

// --- NOVA VARIÁVEL DE CONTROLE DE ESTADO DO DASHBOARD ---
let isDashboardOpen = false;

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

function showMessage(message, type = "info") {
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
    membersCardsContainer.innerHTML = `
        <div class="col-span-full flex flex-col justify-center items-center py-8 gap-3">
            <svg class="animate-spin h-8 w-8 text-blue-700 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 0 00-4 4H4z"></path>
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
        membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-red-600">Falha ao carregar dados. Verifique o console.</div>`;
    } finally {
        showGlobalLoading(false);
        setupLeaderView(); // NOVO: Chama a função para configurar a visualização do líder
    }
}

function applyFilters() {
    const nameFilter = filterNameInput.value.toLowerCase().trim();
    const periodoFilter = filterPeriodoSelect.value.toLowerCase().trim();
    const liderFilter = filterLiderInput.value.toLowerCase().trim();
    const gapeFilter = filterGapeInput.value.toLowerCase().trim();

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

function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");
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
                card.classList.remove('animate-pulse-green', 'animate-shake-red');
            }
        });

        confirmBtn.addEventListener("click", async function () {
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
                        hora: `${min}:${seg}`, // Corrigido para min:seg
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

function fillSelectOptions() {
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)),].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)),].sort();

    filterLiderInput.innerHTML = '<option value="">Todos</option>' + lideres.map((l) => `<option value="${l}">${l}</option>`).join("");
    filterGapeInput.innerHTML = '<option value="">Todos</option>' + gapes.map((g) => `<option value="${g}">${g}</option>`).join("");
}

function clearFilters() {
    showMessage("Limpando filtros...", "info");
    filterNameInput.value = "";
    filterPeriodoSelect.value = "";
    filterLiderInput.value = "";
    filterGapeInput.value = "";
    applyFilters();
    // Atualiza o resumo do dashboard após limpar os filtros
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

function applyFiltersWithMessage() {
    showMessage("Aplicando filtros...", "info");
    applyFilters();
    // Atualiza o resumo do dashboard após aplicar os filtros
    if (isDashboardOpen) {
        fetchAndDisplaySummary();
    }
}

function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;

    if (isDashboardOpen) {
        dashboardContainer.classList.remove('max-h-0', 'opacity-0', 'overflow-hidden');
        dashboardContainer.classList.add('max-h-screen');

        dashboardOpenIcon.classList.add('hidden');
        dashboardCloseIcon.classList.remove('hidden');
        dashboardOpenText.classList.add('hidden');
        dashboardCloseText.classList.remove('hidden');

        console.log("Dashboard: Abrindo. Buscando resumo...");
        fetchAndDisplaySummary();
    } else {
        dashboardContainer.classList.remove('max-h-screen');
        dashboardContainer.classList.add('max-h-0', 'opacity-0', 'overflow-hidden');

        dashboardOpenIcon.classList.remove('hidden');
        dashboardCloseIcon.classList.add('hidden');
        dashboardOpenText.classList.remove('hidden');
        dashboardCloseText.classList.add('hidden');

        console.log("Dashboard: Fechando.");
    }
}

async function fetchAndDisplaySummary() {
    showGlobalLoading(true, "Carregando resumo do dashboard...");
    try {
        const periodoFilter = filterPeriodoSelect.value.trim();
        const liderFilter = filterLiderInput.value.trim();
        const gapeFilter = filterGapeInput.value.trim();

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
        // CORRIGIDO: O backend já está enviando os dados de contagem diretamente, sem a propriedade 'data'
        const dataTotal = rawDataTotal || {}; 

        console.log("Dados brutos de presenças totais (rawDataTotal):", rawDataTotal);
        console.log("Dados de presenças totais (dataTotal):", dataTotal);

        const filteredTotalCounts = dataTotal; // O backend já enviará os dados filtrados
        let totalFilteredPresences = Object.values(dataTotal).reduce((sum, count) => sum + count, 0);

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
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
        }

        // Os campos do dashboard (Periodo, Lider, GAPE) devem refletir os filtros ATUAIS
        // do formulário, e não serem derivados dos membros filtrados da lista.
        // Isso porque a lista de membros já está filtrada por TODOS os campos,
        // mas o resumo de presenças totais só será filtrado por Periodo, Lider, GAPE (se o backend aceitar).
        dashboardPeriodo.textContent = periodoFilter || "Todos";
        dashboardLider.textContent = liderFilter || "Todos";
        dashboardGape.textContent = gapeFilter || "Todos";


    } catch (error) {
        console.error("Erro ao carregar o resumo:", error);
        showMessage(`Erro ao carregar o resumo: ${error.message}`, "error");
        // Limpar os campos do dashboard em caso de erro
        dashboardPresencasMes.textContent = "Erro";
        dashboardPeriodo.textContent = "Erro";
        dashboardLider.textContent = "Erro";
        dashboardGape.textContent = "Erro";
        totalCountsList.innerHTML = `<li class="text-sm text-red-300 text-center">Falha ao carregar o resumo.</li>`;
    } finally {
        showGlobalLoading(false);
    }
}

// --- Event Listeners ---
applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
clearFiltersBtn.addEventListener("click", clearFilters);

// Adicionado event listeners para inputs de filtro para que o dashboard se atualize dinamicamente
// É importante chamar fetchAndDisplaySummary APENAS se o dashboard estiver aberto
filterNameInput.addEventListener("input", applyFilters); // Apenas aplica o filtro nos cards
filterPeriodoSelect.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});
filterLiderInput.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});
filterGapeInput.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});

if (toggleDashboardBtn) {
    toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
}

// Carrega os membros ao carregar a página
window.addEventListener("load", fetchMembers);

// Função para exibir o nome do líder logado
function displayLoggedInLeaderName() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (loggedInLeaderNameElement) {
        if (leaderName) {
            loggedInLeaderNameElement.innerHTML = `Logado como: <span class="text-blue-600 font-bold">${leaderName}</span>`; // Adicionado span para destaque
        } else {
            loggedInLeaderNameElement.textContent = `Logado como: Não identificado`;
            // Redirecionar para a tela de login se não houver líder logado
            // window.location.href = "/index.html"; // Descomente se quiser forçar o login
        }
    }
}

// NOVO: Função para configurar a visualização para líderes
function setupLeaderView() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (leaderName && leaderName !== 'admin') { // Aplica restrições apenas se for um líder e não o admin
        // Encontra o objeto do membro logado para obter o valor exato da coluna 'Lider' e 'GAPE'
        const loggedInMember = allMembersData.find(member => 
            String(member.Nome || '').toLowerCase().trim() === leaderName.toLowerCase().trim()
        );

        if (loggedInMember) { // Verifica se o membro logado foi encontrado
            if (loggedInMember.Lider) {
                // Pré-seleciona o filtro de líder com o valor exato da coluna 'Lider' do membro logado
                filterLiderInput.value = loggedInMember.Lider;
                console.log(`Filtro de Líder pré-selecionado para: ${loggedInMember.Lider}`);
            } else {
                console.warn(`O campo 'Lider' do membro logado '${leaderName}' está vazio.`);
            }

            if (loggedInMember.GAPE) {
                // Pré-seleciona o filtro de GAPE com o valor exato da coluna 'GAPE' do membro logado
                filterGapeInput.value = loggedInMember.GAPE;
                console.log(`Filtro de GAPE pré-selecionado para: ${loggedInMember.GAPE}`);
            } else {
                console.warn(`O campo 'GAPE' do membro logado '${leaderName}' está vazio.`);
            }
        } else {
            console.warn(`Não foi possível encontrar o membro logado '${leaderName}' para pré-selecionar os filtros.`);
        }

        // Desativa os campos de filtro de líder e GAPE
        filterLiderInput.disabled = true;
        filterGapeInput.disabled = true;
        
        // Aplica os filtros imediatamente para mostrar apenas os membros do líder
        applyFilters(); 
        
        // Se o dashboard estiver aberto, atualiza o resumo com os filtros aplicados
        if (isDashboardOpen) {
            fetchAndDisplaySummary();
        }
        
        // Opcional: Você pode querer desativar o botão de limpar filtros também,
        // ou ajustar sua funcionalidade para apenas limpar o filtro de nome.
        // clearFiltersBtn.disabled = true; 
    }
}


// Chama a função para exibir o nome do líder quando o DOM estiver completamente carregado
document.addEventListener("DOMContentLoaded", displayLoggedInLeaderName);

// Chama a função para configurar a visualização do líder após o carregamento dos membros
// Isso garante que as opções de filtro já estejam populadas
// A chamada foi movida para o bloco 'finally' de fetchMembers
