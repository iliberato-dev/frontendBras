// ------------------------------------------------------
// Frontend (js/dashboard.js) - Versão Final com Informações de Relatório no PDF e Faltas
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Variável para armazenar todas as últimas presenças
let allAbsencesData = {}; // NOVO: Variável para armazenar todas as faltas detalhadas
let myChart = null; // Variável para armazenar a instância do Chart.js (Pizza)
let myBarChart = null; // Variável para armazenar a instância do Chart.js (Barras)

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
const dashboardFaltasMes = document.getElementById("dashboardFaltasMes"); // NOVO: Elemento para total de faltas

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
const detailedAbsencesList = document.getElementById("detailedAbsencesList"); // NOVO: Contêiner para a lista de faltas
const absentMembersList = document.getElementById("absentMembersList"); // NOVO: Lista UL para membros ausentes

// Novos elementos de filtro dentro do modal
const summaryStartDateInput = document.getElementById("summaryStartDate");
const summaryEndDateInput = document.getElementById("summaryEndDate");
const summaryMemberSelect = document.getElementById("summaryMemberSelect");
const applySummaryFiltersBtn = document.getElementById("applySummaryFiltersBtn");

// Botão de Download PDF
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// Elemento para exibir informações do relatório no PDF
const reportInfo = document.getElementById("reportInfo");

// Elemento da seção de filtros dentro do modal de resumo
const summaryFilterSection = document.getElementById("summaryFilterSection");


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

    // Lógica para determinar o ícone do período (sol ou lua)
    let periodoIcon = '<i class="fas fa-question text-gray-500"></i>'; // Ícone padrão
    if (member.Periodo) {
        const periodoLower = member.Periodo.toLowerCase();
        if (periodoLower.includes("manhã") || periodoLower.includes("tarde")) {
            periodoIcon = '<i class="fas fa-sun text-yellow-500"></i>'; // Sol amarelo
        } else if (periodoLower.includes("noite")) {
            periodoIcon = '<i class="fas fa-moon text-blue-500"></i>'; // Lua azul
        }
    }

    card.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 flex-shrink-0 group">
                <img src="${member.FotoURL || 'https://png.pngtree.com/png-vector/20191208/ourmid/pngtree-beautiful-create-user-glyph-vector-icon-png-image_2084391.jpg'}"
                     alt="Foto de ${member.Nome || 'Membro'}"
                     class="member-photo w-full h-full object-cover">
                
                <input type="file" class="photo-upload-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" data-member-name="${member.Nome}">
                
                <div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs text-center p-1 z-0">
                    Trocar Foto
                </div>
            </div>
            <div class="font-bold text-lg text-gray-800">${member.Nome || "N/A"}</div>
        </div>
        <div class="text-sm text-gray-600 flex items-center gap-2">
            ${periodoIcon} <b>Período:</b> ${member.Periodo || "N/A"}
        </div>
        <div class="text-sm text-gray-600 flex items-center gap-2">
            <i class="fas fa-star text-yellow-600"></i> <b>Líder:</b> ${member.Lider || "N/A"}
        </div>
        <div class="text-sm text-gray-600 flex items-center gap-2">
            <i class="fas fa-users text-purple-600"></i> <b>GAPE:</b> ${member.GAPE || "N/A"}
        </div>
        <label class="flex items-center gap-2 mt-2">
            <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox" data-member-name="${member.Nome}">
            <span class="text-sm text-gray-700">Presente</span>
        </label>
        <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 flex items-center justify-center gap-2">
            <i class="fas fa-check-circle text-white"></i> Confirmar Presença
        </button>
        <div class="text-xs text-gray-500 mt-1 hidden presence-info flex items-center gap-2">
            <i class="fas fa-info-circle text-gray-400"></i>
        </div>
    `;
    container.appendChild(card);

        const checkbox = card.querySelector(".presence-checkbox");
        const infoDiv = card.querySelector(".presence-info");
        const confirmBtn = card.querySelector(".btn-confirm-presence");
        // Variaveis para foto
        const photoUploadInput = card.querySelector(".photo-upload-input");
        const memberPhoto = card.querySelector(".member-photo");

        // Lógica para pré-visualizar a imagem selecionada
    photoUploadInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                memberPhoto.src = e.target.result;
                // AQUI É ONDE VOCÊ PRECISARÁ IMPLEMENTAR A LÓGICA DE UPLOAD REAL:
                // 1. Enviar 'file' para um serviço de armazenamento (ex: Google Drive, Cloudinary).
                // 2. Após o upload, você receberá uma URL para a imagem salva.
                // 3. Essa URL deve ser salva na sua planilha associada a este membro.
                //    Isso geralmente envolve fazer uma requisição (fetch/axios) para um script de backend
                //    (como Google Apps Script para Google Sheets, ou uma API REST) que irá
                //    atualizar a célula da planilha com a URL da nova foto.
                console.log(`Arquivo selecionado para ${member.Nome}:`, file);
                // Exemplo teórico de como você chamaria uma função para fazer o upload e salvar a URL:
                // uploadAndSavePhotoURL(member.Nome, file);
            };
            reader.readAsDataURL(file); // Lê o arquivo como URL de dados para pré-visualização
        }
    });

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
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)),].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)),].sort();

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
 * Busca e exibe o resumo das presenças totais e faltas no dashboard.
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

        const urlPresencas = `${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`;
        const urlFaltas = `${BACKEND_URL}/get-faltas?${queryParams.toString()}`; // NOVO: URL para faltas

        console.log("URL da API para resumo de presenças:", urlPresencas);
        console.log("URL da API para resumo de faltas:", urlFaltas); // NOVO log

        const [responseTotalPresences, responseTotalAbsences] = await Promise.all([
            fetch(urlPresencas),
            fetch(urlFaltas) // NOVO: Faz a requisição para faltas
        ]);

        if (!responseTotalPresences.ok) {
            throw new Error(`Erro ao buscar presenças totais: ${responseTotalPresences.statusText}`);
        }
        if (!responseTotalAbsences.ok) { // NOVO: Verifica erro na resposta de faltas
            throw new Error(`Erro ao buscar faltas totais: ${responseTotalAbsences.statusText}`);
        }

        const rawDataTotalPresences = await responseTotalPresences.json();
        const dataTotalPresences = rawDataTotalPresences;
        let totalFilteredPresences = Object.values(dataTotalPresences).reduce((sum, count) => sum + count, 0);

        // NOVO: Processa os dados de faltas
        const rawDataTotalAbsences = await responseTotalAbsences.json();
        allAbsencesData = rawDataTotalAbsences.data || {}; // Armazena os dados detalhados de faltas
        let totalFilteredAbsences = 0;
        // Calcula o total de faltas somando 'totalFaltas' de cada membro
        for (const memberName in allAbsencesData) {
            if (allAbsencesData[memberName] && typeof allAbsencesData[memberName].totalFaltas === 'number') {
                totalFilteredAbsences += allAbsencesData[memberName].totalFaltas;
            }
        }
        console.log("DEBUG: totalFilteredAbsences calculado:", totalFilteredAbsences);

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
        } else {
            console.warn("Elemento 'dashboardPresencasMes' não encontrado.");
        }

        // NOVO: Atualiza o elemento de faltas no dashboard
        if (dashboardFaltasMes) {
            dashboardFaltasMes.textContent = totalFilteredAbsences;
        } else {
            console.warn("Elemento 'dashboardFaltasMes' não encontrado.");
        }


        if (totalCountsList) {
            totalCountsList.innerHTML = '';
            const sortedCounts = Object.entries(dataTotalPresences).sort(([, countA], [, countB]) => countB - countA);

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
        if (dashboardFaltasMes) dashboardFaltasMes.textContent = "Erro"; // NOVO: Limpa faltas também
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
function showDetailedSummary() {
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

    // Recalcula e renderiza o gráfico quando o modal é aberto ou filtros aplicados
    updateDetailedSummaryChart();

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
 */
async function updateDetailedSummaryChart() { // Tornada async para buscar faltas
    let membersToAnalyze = filteredMembers;
    const selectedMemberName = summaryMemberSelect ? summaryMemberSelect.value.trim() : '';
    let summaryTitle = "Estatísticas do Grupo Filtrado";
    let reportEntityName = "o grupo filtrado";
    let reportLeader = "N/A";
    let reportGape = "N/A";

    if (selectedMemberName !== "") {
        membersToAnalyze = filteredMembers.filter(member => String(member.Nome || '').trim() === selectedMemberName);
        summaryTitle = `Estatísticas para o Membro: ${selectedMemberName}`;
        reportEntityName = selectedMemberName;
        if (membersToAnalyze.length > 0) {
            reportLeader = membersToAnalyze[0].Lider || "N/A";
            reportGape = membersToAnalyze[0].GAPE || "N/A";
        }
        if (membersToAnalyze.length === 0) {
            if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-lg font-semibold text-gray-800 mb-2">Nenhum dado para o membro selecionado com os filtros atuais.</p>`;
            if (myChart) myChart.destroy();
            if (myBarChart) myBarChart.destroy(); // Destrói o gráfico de barras também
            if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Nenhum dado de membro encontrado para o relatório.</p>`;
            if (absentMembersList) absentMembersList.innerHTML = `<li>Nenhuma falta registrada para os membros filtrados no período.</li>`; // Limpa a lista de faltas
            return;
        }
    } else {
        // Para o caso de "Todos os Membros Filtrados"
        const currentLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : 'Todos';
        const currentGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : 'Todos';
        
        reportLeader = currentLiderFilter !== "" ? currentLiderFilter : "Todos";
        reportGape = currentGapeFilter !== "" ? currentGapeFilter : "Todos";

        if (reportLeader !== "Todos" && reportGape !== "Todos") {
            reportEntityName = `o grupo do líder ${reportLeader} e GAPE ${reportGape}`;
        } else if (reportLeader !== "Todos") {
            reportEntityName = `o grupo do líder ${reportLeader}`;
        } else if (reportGape !== "Todos") {
            reportEntityName = `o grupo GAPE ${reportGape}`;
        } else {
            reportEntityName = `o grupo filtrado`;
        }
    }


    // Obtém os filtros de intervalo de datas
    const startDateStr = summaryStartDateInput ? summaryStartDateInput.value : '';
    const endDateStr = summaryEndDateInput ? summaryEndDateInput.value : '';

    let startDate = null;
    let endDate = null;

    if (startDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0); // Início do dia
    }
    if (endDateStr) {
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999); // Fim do dia
    }

    let membersWithPresenceCount = 0;
    let totalMembersInAnalysis = membersToAnalyze.length; // Este será o denominador para as porcentagens

    if (totalMembersInAnalysis === 0) {
        if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-lg font-semibold text-gray-800 mb-2">Nenhum membro para analisar com os filtros aplicados.</p>`;
        if (myChart) myChart.destroy();
        if (myBarChart) myBarChart.destroy();
        if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Nenhum dado de membro encontrado para o relatório.</p>`;
        if (absentMembersList) absentMembersList.innerHTML = `<li>Nenhuma falta registrada para os membros filtrados no período.</li>`; // Limpa a lista de faltas
        return;
    }

    // Recalcula membersWithPresenceCount com base nos filtros de data do modal
    for (const member of membersToAnalyze) {
        const presence = lastPresencesData[member.Nome];
        if (presence && presence.data) {
            const [day, month, year] = presence.data.split('/').map(Number);
            const lastPresenceDate = new Date(year, month - 1, day);
            lastPresenceDate.setHours(0, 0, 0, 0);

            let dateMatches = true;
            if (startDate && lastPresenceDate < startDate) dateMatches = false;
            if (endDate && lastPresenceDate > endDate) dateMatches = false;

            if (dateMatches) {
                membersWithPresenceCount++;
            }
        }
    }

    const membersWithZeroPresenceCount = totalMembersInAnalysis - membersWithPresenceCount;

    let presencePercentage = 0;
    let absencePercentage = 0;

    if (totalMembersInAnalysis > 0) {
        presencePercentage = (membersWithPresenceCount / totalMembersInAnalysis) * 100;
        absencePercentage = (membersWithZeroPresenceCount / totalMembersInAnalysis) * 100;
    }

    // --- NOVO: Lógica para buscar e exibir faltas detalhadas no modal ---
    let membersWithRecordedAbsences = [];
    let totalRecordedAbsencesInPeriod = 0;

    // Constrói os queryParams para a requisição de faltas no modal
    const queryParamsFaltasModal = new URLSearchParams();
    if (selectedMemberName) queryParamsFaltasModal.append('nome', selectedMemberName); // Se um membro específico foi selecionado
    else { // Se "Todos os Membros Filtrados"
        const currentLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : '';
        const currentGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : '';
        if (currentLiderFilter) queryParamsFaltasModal.append('lider', currentLiderFilter);
        if (currentGapeFilter) queryParamsFaltasModal.append('gape', currentGapeFilter);
    }
    if (startDateStr) queryParamsFaltasModal.append('dataInicio', startDateStr);
    if (endDateStr) queryParamsFaltasModal.append('dataFim', endDateStr);

    try {
        const responseFaltas = await fetch(`${BACKEND_URL}/get-faltas?${queryParamsFaltasModal.toString()}`);
        if (!responseFaltas.ok) {
            throw new Error(`Erro ao buscar faltas para o resumo detalhado: ${responseFaltas.statusText}`);
        }
        const faltasDataRaw = await responseFaltas.json();
        const faltasData = faltasDataRaw.data || {}; // Dados detalhados de faltas

        // Filtra os membros com faltas e calcula o total de faltas no período
        for (const member of membersToAnalyze) {
            const memberAbsence = faltasData[member.Nome];
            if (memberAbsence && memberAbsence.totalFaltas > 0) {
                membersWithRecordedAbsences.push({
                    name: member.Nome,
                    totalFaltas: memberAbsence.totalFaltas,
                    details: memberAbsence.faltas || [] // Detalhes das datas/períodos das faltas
                });
                totalRecordedAbsencesInPeriod += memberAbsence.totalFaltas;
            }
        }

        // Atualiza a lista de membros com faltas no modal
        if (absentMembersList) {
            absentMembersList.innerHTML = ''; // Limpa a lista existente
            if (membersWithRecordedAbsences.length > 0) {
                membersWithRecordedAbsences.sort((a, b) => b.totalFaltas - a.totalFaltas); // Ordena por mais faltas
                membersWithRecordedAbsences.forEach(member => {
                    const listItem = document.createElement('li');
                    let detailsHtml = '';
                    if (member.details.length > 0) {
                        detailsHtml = ` (${member.details.map(d => `${d.data} - ${d.periodo}`).join(', ')})`;
                    }
                    listItem.innerHTML = `<strong>${member.name}</strong>: ${member.totalFaltas} falta(s)${detailsHtml}`;
                    absentMembersList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement('li');
                listItem.textContent = 'Nenhuma falta registrada para os membros filtrados no período.';
                absentMembersList.appendChild(listItem);
            }
        }
        if (detailedAbsencesList) {
            detailedAbsencesList.classList.remove('hidden'); // Garante que a seção de faltas esteja visível
        }

    } catch (error) {
        console.error("Erro ao carregar faltas para o resumo detalhado:", error);
        if (absentMembersList) absentMembersList.innerHTML = `<li>Erro ao carregar faltas: ${error.message}</li>`;
        if (detailedAbsencesList) detailedAbsencesList.classList.remove('hidden');
    }
    // --- FIM: Lógica para buscar e exibir faltas detalhadas no modal ---


    // Formata o intervalo de datas para exibição
    let dateRangeDisplay = "Todo o período disponível";
    if (startDateStr && endDateStr) {
        const formattedStartDate = new Date(startDateStr + 'T00:00:00').toLocaleDateString('pt-BR'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        const formattedEndDate = new Date(endDateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        dateRangeDisplay = `Período: ${formattedStartDate} a ${formattedEndDate}`;
    } else if (startDateStr) {
        const formattedStartDate = new Date(startDateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        dateRangeDisplay = `A partir de: ${formattedStartDate}`;
    } else if (endDateStr) {
        const formattedEndDate = new Date(endDateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        dateRangeDisplay = `Até: ${formattedEndDate}`;
    }

    // Atualiza o contêiner de informações do relatório
    if (reportInfo) {
        const todayFormatted = new Date().toLocaleDateString('pt-BR');
        reportInfo.innerHTML = `
            <p class="text-md font-semibold mb-1">Relatório Gerado em: <span class="font-normal">${todayFormatted}</span></p>
            <p class="text-md font-semibold mb-1">Análise para: <span class="font-normal">${selectedMemberName || 'Grupo de Membros'}</span></p>
            <p class="text-md font-semibold mb-1">Período de Análise: <span class="font-normal">${dateRangeDisplay}</span></p>
            <p class="text-md font-semibold mb-1">Líder: <span class="font-normal">${reportLeader}</span></p>
            <p class="text-md font-semibold">GAPE: <span class="font-normal">${reportGape}</span></p>
        `;
    }

    // Atualiza o texto do resumo detalhado
    if (detailedSummaryText) {
        detailedSummaryText.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${summaryTitle}</h3>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Total de Membros Analisados: <span class="font-bold">${totalMembersInAnalysis}</span></li>
                <li>Membros com Presença (no período): <span class="font-bold">${membersWithPresenceCount} (${presencePercentage.toFixed(1)}%)</span></li>
                <li>Membros Sem Presença (no período): <span class="font-bold">${membersWithZeroPresenceCount} (${absencePercentage.toFixed(1)}%)</span></li>
                <li>Total de Faltas Registradas (no período): <span class="font-bold">${totalRecordedAbsencesInPeriod}</span></li>
            </ul>
            <p class="text-sm text-gray-600 mt-4">As estatísticas e gráficos abaixo ilustram a proporção de membros com e sem presenças registradas no período selecionado. "Presença" significa ter ao menos um registro no período. A seção de "Membros com Faltas Registradas" detalha as faltas específicas.</p>
        `;
    }

    // Destrói a instância anterior do gráfico de pizza se existir
    if (myChart) {
        myChart.destroy();
    }

    // Renderiza o gráfico de pizza
    if (summaryChartCanvas) {
        const ctx = summaryChartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Membros com Presença', 'Membros Sem Presença'],
                datasets: [{
                    data: [presencePercentage.toFixed(1), absencePercentage.toFixed(1)],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)', // Verde para presença
                        'rgba(255, 99, 132, 0.8)'  // Vermelho para ausência
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                animation: { // Adicionado animação para o gráfico de pizza
                    duration: 1000, // 1 segundo
                    easing: 'easeOutQuart' // Função de easing suave
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#333', // Cor do texto da legenda
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed + '%';
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Proporção de Presenças vs. Ausências',
                        color: '#333',
                        font: {
                            size: 16
                        }
                    },
                    datalabels: { // Configuração do plugin datalabels
                        color: '#fff', // Cor do texto dos labels
                        formatter: (value, context) => {
                            // Exibe o valor da porcentagem no slice
                            return value + '%';
                        },
                        font: {
                            weight: 'bold',
                            size: 14
                        }
                    }
                }
            },
            plugins: [ChartDataLabels] // Habilita o plugin para este gráfico
        });
    } else {
        console.error("Elemento 'summaryChartCanvas' não encontrado no DOM.");
    }

    // Destrói a instância anterior do gráfico de barras se existir
    if (myBarChart) {
        myBarChart.destroy();
    }

    // Renderiza o novo gráfico de barras horizontais
    if (summaryBarChartCanvas) {
        const ctxBar = summaryBarChartCanvas.getContext('2d');
        myBarChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Membros com Presença', 'Membros Sem Presença'],
                datasets: [{
                    label: 'Número de Membros',
                    data: [membersWithPresenceCount, membersWithZeroPresenceCount],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)', // Verde para presença
                        'rgba(255, 99, 132, 0.8)'  // Vermelho para ausência
                    ],
                    borderColor: [
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Define o eixo Y como o eixo de categorias (barras horizontais)
                responsive: true,
                animation: { // Adicionado animação para o gráfico de barras
                    duration: 1000, // 1 segundo
                    easing: 'easeOutQuart' // Função de easing suave
                },
                plugins: {
                    legend: {
                        display: false // Não exibe a legenda para este gráfico
                    },
                    title: {
                        display: true,
                        text: 'Contagem de Membros (Valores Absolutos)',
                        color: '#333',
                        font: {
                            size: 16
                        }
                    },
                    datalabels: { // Configuração do plugin datalabels para o gráfico de barras
                        color: '#333', // Cor do texto dos labels
                        anchor: 'end', // Posição do label (no final da barra)
                        align: 'end', // Alinhamento do label
                        formatter: (value, context) => {
                            // Exibe o valor absoluto e a porcentagem
                            const total = membersWithPresenceCount + membersWithZeroPresenceCount;
                            const percentage = (value / total * 100).toFixed(1);
                            return `${value} (${percentage}%)`;
                        },
                        font: {
                            weight: 'bold',
                            size: 12
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Número de Membros',
                            color: '#333'
                        },
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#333'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels] // Habilita o plugin para este gráfico
        });
    } else {
        console.error("Elemento 'summaryBarChartCanvas' não encontrado no DOM.");
    }
}

/**
 * Lida com o download do resumo detalhado como PDF.
 */
async function handleDownloadPdf() {
    if (!detailedSummaryContent || !downloadPdfBtn || !summaryFilterSection || !detailedSummaryModal) {
        showMessage("Erro: Elementos necessários para PDF não encontrados.", "error");
        console.error("Elementos necessários para PDF não encontrados.");
        return;
    }

    showGlobalLoading(true, "Gerando PDF...");

    // Armazena os estilos originais dos elementos
    const originalDetailedSummaryContentMaxHeight = detailedSummaryContent.style.maxHeight;
    const originalDetailedSummaryContentOverflowY = detailedSummaryContent.style.overflowY;
    const originalDetailedSummaryContentPadding = detailedSummaryContent.style.padding;
    const originalDetailedSummaryContentWidth = detailedSummaryContent.style.width;

    const originalDetailedSummaryModalMaxHeight = detailedSummaryModal.style.maxHeight;

    const originalDownloadPdfBtnDisplay = downloadPdfBtn.style.display;
    const originalSummaryFilterSectionDisplay = summaryFilterSection.style.display;


    // Aplica estilos para a captura do PDF: remove restrições de altura/overflow
    detailedSummaryContent.style.maxHeight = 'none';
    detailedSummaryContent.style.overflowY = 'visible';
    detailedSummaryContent.style.padding = '8mm'; // Ajusta o padding para a impressão
    detailedSummaryContent.style.width = '100%'; // Garante que ocupe 100% da largura para captura

    detailedSummaryModal.style.maxHeight = 'none'; // Garante que o modal também não restrinja a altura


    // Oculta o botão de download de PDF e a seção de filtros antes de capturar
    downloadPdfBtn.style.display = 'none';
    summaryFilterSection.style.display = 'none';

    try {
        const canvas = await html2canvas(detailedSummaryContent, {
            scale: 2, // Aumenta a escala para melhor qualidade no PDF
            useCORS: true, // Importante se houver imagens de outras origens
            logging: true, // Ativa o log para depuração
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4'); // 'p' (portrait), 'mm' (unidade), 'a4' (tamanho)
        const imgWidth = 210; // Largura A4 em mm
        const pageHeight = 297; // Altura A4 em mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('resumo_presencas.pdf');
        showMessage("PDF gerado com sucesso!", "success");

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        showMessage(`Erro ao gerar PDF: ${error.message}`, "error");
    } finally {
        // Restaura os estilos originais
        detailedSummaryContent.style.maxHeight = originalDetailedSummaryContentMaxHeight;
        detailedSummaryContent.style.overflowY = originalDetailedSummaryContentOverflowY;
        detailedSummaryContent.style.padding = originalDetailedSummaryContentPadding;
        detailedSummaryContent.style.width = originalDetailedSummaryContentWidth;

        detailedSummaryModal.style.maxHeight = originalDetailedSummaryModalMaxHeight;

        // Reexibe o botão de download de PDF e a seção de filtros
        if (downloadPdfBtn) {
            downloadPdfBtn.style.display = originalDownloadPdfBtnDisplay;
        }
        if (summaryFilterSection) {
            summaryFilterSection.style.display = originalSummaryFilterSectionDisplay;
        }
        showGlobalLoading(false);
    }
}


// --- Event Listeners ---
// Adiciona verificação de existência antes de adicionar event listeners
if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

// Adicionado event listeners para inputs de filtro para que o dashboard se atualize dinamicamente
// É importante chamar fetchAndDisplaySummary APENAS se o dashboard estiver aberto
if (filterNameInput) filterNameInput.addEventListener("input", applyFilters); // Apenas aplica o filtro nos cards
if (filterPeriodoSelect) filterPeriodoSelect.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});
if (filterLiderInput) filterLiderInput.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});
if (filterGapeInput) filterGapeInput.addEventListener("change", () => {
    applyFilters(); // Aplica o filtro nos cards
    if (isDashboardOpen) fetchAndDisplaySummary(); // Se dashboard aberto, atualiza o resumo
});

if (toggleDashboardBtn) {
    toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
}

// Event listener para abrir o modal de resumo detalhado
if (showDetailedSummaryBtn) {
    showDetailedSummaryBtn.addEventListener("click", showDetailedSummary);
}

// Event listener para fechar o modal
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        if (detailedSummaryModal) {
            detailedSummaryModal.classList.add("hidden");
            detailedSummaryModal.classList.remove("flex");
        }
    });
}

// Event listeners para os novos filtros dentro do modal
if (applySummaryFiltersBtn) {
    applySummaryFiltersBtn.addEventListener("click", updateDetailedSummaryChart);
}
if (summaryStartDateInput) {
    summaryStartDateInput.addEventListener("change", updateDetailedSummaryChart);
}
if (summaryEndDateInput) {
    summaryEndDateInput.addEventListener("change", updateDetailedSummaryChart);
}
if (summaryMemberSelect) {
    summaryMemberSelect.addEventListener("change", updateDetailedSummaryChart);
}

// Event listener para o botão de Download PDF
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", handleDownloadPdf);
}


// Carrega os membros ao carregar a página
window.addEventListener("load", fetchMembers);

/**
 * Exibe o nome do líder logado no elemento designado.
 */
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

/**
 * Configura a visualização para líderes, pré-selecionando e desativando filtros.
 */
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
                if (filterLiderInput) filterLiderInput.value = loggedInMember.Lider;
                console.log(`Filtro de Líder pré-selecionado para: ${loggedInMember.Lider}`);
            } else {
                console.warn(`O campo 'Lider' do membro logado '${leaderName}' está vazio.`);
            }

            if (loggedInMember.GAPE) {
                // Pré-seleciona o filtro de GAPE com o valor exato da coluna 'GAPE' do membro logado
                if (filterGapeInput) filterGapeInput.value = loggedInMember.GAPE;
                console.log(`Filtro de GAPE pré-selecionado para: ${loggedInMember.GAPE}`);
            } else {
                console.warn(`O campo 'GAPE' do membro logado '${leaderName}' está vazio.`);
            }
        } else {
            console.warn(`Não foi possível encontrar o membro logado '${leaderName}' para pré-selecionar os filtros.`);
        }

        // Desativa os campos de filtro de líder e GAPE
        if (filterLiderInput) filterLiderInput.disabled = true;
        if (filterGapeInput) filterGapeInput.disabled = true;
        
        // Aplica os filtros imediatamente para mostrar apenas os membros do líder
        applyFilters(); 
        
        // Se o dashboard estiver aberto, atualiza o resumo com os filtros aplicados
        if (isDashboardOpen) {
            fetchAndDisplaySummary();
        }
        
        // Opcional: Você pode querer desativar o botão de limpar filtros também,
        // ou ajustar sua funcionalidade para apenas limpar o filtro de nome.
        // if (clearFiltersBtn) clearFiltersBtn.disabled = true; 
    }
}


// Chama a função para exibir o nome do líder quando o DOM estiver completamente carregado
document.addEventListener("DOMContentLoaded", displayLoggedInLeaderName);

// Chama a função para configurar a visualização do líder após o carregamento dos membros
// Isso garante que as opções de filtro já estejam populadas
// A chamada foi movida para o bloco 'finally' de fetchMembers
// Adiciona um listener para o botão de logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Redireciona o usuário para a página index.html
            window.location.href = 'index.html';
        });
    }
});
