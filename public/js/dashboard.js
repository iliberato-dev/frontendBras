// ------------------------------------------------------
// Frontend (js/dashboard.js) - Versão Completa com Melhoria Visual
// ------------------------------------------------------
let allMembersData = [];
let filteredMembers = [];
let lastPresencesData = {}; // Variável para armazenar todas as últimas presenças
let allAbsencesData = {}; // Variável para armazenar todas as faltas detalhadas
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
const dashboardFaltasMes = document.getElementById("dashboardFaltasMes");

// Referência ao elemento onde o nome do líder será exibido
const loggedInLeaderNameElement = document.getElementById("loggedInLeaderName");

// Elementos do novo modal de resumo detalhado
const detailedSummaryModal = document.getElementById("detailedSummaryModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const summaryChartCanvas = document.getElementById("summaryChart");
const summaryBarChartCanvas = document.getElementById("summaryBarChart");
const detailedSummaryText = document.getElementById("detailedSummaryText");
const showDetailedSummaryBtn = document.getElementById("showDetailedSummaryBtn");
const detailedSummaryContent = document.getElementById("detailedSummaryContent");
const detailedAbsencesList = document.getElementById("detailedAbsencesList");
const absentMembersList = document.getElementById("absentMembersList");

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
    if (!messageArea) {
        console.error("Erro: Elemento 'messageArea' não encontrado no DOM. Não foi possível exibir a mensagem:", message);
        return;
    }

    if (message.includes("Carregando dados dos membros...") ||
        message.includes("Carregando resumo do dashboard...") ||
        message.includes("Registrando presença para ") ||
        !message.trim()) {
        return;
    }

    messageArea.textContent = message;
    messageArea.className = "message-box show";

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
        setTimeout(() => messageArea.classList.add("hidden"), 500);
    }, 4000);
}

/**
 * Busca os dados dos membros e todas as últimas presenças do backend.
 */
async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");

    if (!membersCardsContainer) {
        console.error("Erro: Elemento 'membersCardsContainer' não encontrado no DOM. Verifique seu HTML.");
        showMessage("Erro: Contêiner de membros não encontrado. Verifique a estrutura da página.", "error");
        showGlobalLoading(false);
        return;
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
        lastPresencesData = lastPresencesRawData.data || lastPresencesRawData || {};

        if (allMembersData.length === 0) {
            showMessage("Nenhum membro encontrado ou dados vazios.", "info");
        }

        fillSelectOptions();
        applyFilters();
        if (isDashboardOpen) {
            fetchAndDisplaySummary();
        }
    } catch (error) {
        console.error("Erro ao carregar membros ou presenças:", error);
        showMessage(`Erro ao carregar dados: ${error.message}`, "error");
        if (membersCardsContainer) {
            membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-red-600">Falha ao carregar dados. Verifique o console.</div>`;
        }
    } finally {
        showGlobalLoading(false);
        setupLeaderView();
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
}

/**
 * Exibe os cards dos membros no contêiner.
 * @param {Array<Object>} members - A lista de membros a serem exibidos.
 */
function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");

    if (!container) {
        console.error("Erro: Elemento 'membersCardsContainer' não encontrado no DOM.");
        return;
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

        let periodoIcon = '<i class="fas fa-question text-gray-500"></i>';
        if (member.Periodo) {
            const periodoLower = member.Periodo.toLowerCase();
            if (periodoLower.includes("manhã") || periodoLower.includes("tarde")) {
                periodoIcon = '<i class="fas fa-sun text-yellow-500"></i>';
            } else if (periodoLower.includes("noite")) {
                periodoIcon = '<i class="fas fa-moon text-blue-500"></i>';
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
            <div class="presence-date-container mt-2 hidden">
                <label for="presence-date-${idx}" class="text-sm text-gray-600 font-semibold">Escolha a data da presença (opcional):</label>
                <input type="date" id="presence-date-${idx}" class="presence-date-input mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm">
            </div>
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
        const dateContainer = card.querySelector(".presence-date-container");
        const dateInput = card.querySelector(".presence-date-input");
        const photoUploadInput = card.querySelector(".photo-upload-input");
        const memberPhoto = card.querySelector(".member-photo");

        photoUploadInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    memberPhoto.src = e.target.result;
                    console.log(`Arquivo selecionado para ${member.Nome}:`, file);
                };
                reader.readAsDataURL(file);
            }
        });

        const updatePresenceStatus = () => {
            if (!infoDiv) return;
            infoDiv.classList.remove("text-green-700", "text-red-600", "text-yellow-700", "text-blue-700", "text-gray-500");
            infoDiv.classList.add("block");

            const presence = lastPresencesData[member.Nome];
            if (presence && presence.data) {
                let displayText = `Últ. presença: ${presence.data}`;
                if (presence.hora && presence.hora !== '00:00:00') {
                    displayText += ` às ${presence.hora}`;
                }
                infoDiv.textContent = displayText;
                infoDiv.classList.add("text-green-700");
            } else {
                infoDiv.textContent = `Nenhuma presença registrada ainda.`;
                infoDiv.classList.add("text-gray-500");
            }
            infoDiv.classList.remove("hidden");
        };

        updatePresenceStatus();

        checkbox.addEventListener("change", function() {
            if (!confirmBtn || !infoDiv || !dateContainer) return;
            if (this.checked) {
                confirmBtn.classList.remove("hidden");
                dateContainer.classList.remove("hidden");
                infoDiv.textContent = "Clique em confirmar para registrar.";
                infoDiv.classList.remove("hidden", "text-green-700", "text-red-600", "text-yellow-700");
                infoDiv.classList.add("text-gray-500");
            } else {
                confirmBtn.classList.add("hidden");
                dateContainer.classList.add("hidden");
                updatePresenceStatus();
                confirmBtn.disabled = false;
                checkbox.disabled = false;
                if (card) card.classList.remove('animate-pulse-green', 'animate-shake-red');
            }
        });

        confirmBtn.addEventListener("click", async function() {
            if (!infoDiv || !confirmBtn || !checkbox || !card || !dateInput) return;
            const selectedDate = dateInput.value;
            let presenceDate;
            let presenceTime;

            if (selectedDate && selectedDate !== "") {
                presenceDate = selectedDate.split('-').reverse().join('/');
                presenceTime = "00:00:00";
            } else {
                const now = new Date();
                presenceDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
                presenceTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            }

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
                        data: presenceDate,
                        hora: presenceTime,
                        sheet: "PRESENCAS",
                    }),
                });

                const responseData = await response.json();

                if (response.ok && responseData.success === true) {
                    const newPresence = responseData.lastPresence || { data: presenceDate, hora: presenceTime };
                    
                    let successText = `Presença de ${member.Nome} registrada com sucesso em ${newPresence.data}`;
                    if (newPresence.hora && newPresence.hora !== '00:00:00') {
                        successText += ` às ${newPresence.hora}`;
                    }
                    infoDiv.textContent = successText + ".";
                    
                    infoDiv.classList.remove("text-blue-700", "text-yellow-700");
                    infoDiv.classList.add("text-green-700");
                    showMessage("Presença registrada com sucesso!", "success");
                    card.classList.add('animate-pulse-green');
                    setTimeout(() => card.classList.remove('animate-pulse-green'), 1000);
                    lastPresencesData[member.Nome] = newPresence;
                    if (isDashboardOpen) {
                        fetchAndDisplaySummary();
                    }
                } else if (responseData.success === false && responseData.message && responseData.message.includes("já foi registrada")) {
                    infoDiv.textContent = `Presença de ${member.Nome} já registrada nesta data.`;
                    infoDiv.classList.remove("text-blue-700", "text-green-700");
                    infoDiv.classList.add("text-yellow-700");
                    showMessage(`Presença de ${member.Nome} já foi registrada nesta data.`, "warning");
                    card.classList.add('animate-shake-red');
                    setTimeout(() => card.classList.remove('animate-shake-red'), 1000);
                    if (responseData.lastPresence) {
                        lastPresencesData[member.Nome] = responseData.lastPresence;
                    }
                } else {
                    throw new Error(responseData.message || "Falha ao registrar");
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
                if (dateContainer) dateContainer.classList.add("hidden");
                checkbox.checked = false;
                setTimeout(updatePresenceStatus, 100); 
            }
        });
    });
}


/**
 * Preenche as opções dos selects de filtro de Líder e GAPE.
 */
function fillSelectOptions() {
    const lideres = [...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)), ].sort();
    const gapes = [...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)), ].sort();

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

        const queryParams = new URLSearchParams();
        if (periodoFilter) queryParams.append('periodo', periodoFilter);
        if (liderFilter) queryParams.append('lider', liderFilter);
        if (gapeFilter) queryParams.append('gape', gapeFilter);

        const urlPresencas = `${BACKEND_URL}/get-presencas-total?${queryParams.toString()}`;
        const urlFaltas = `${BACKEND_URL}/get-faltas?${queryParams.toString()}`;

        const [responseTotalPresences, responseTotalAbsences] = await Promise.all([
            fetch(urlPresencas),
            fetch(urlFaltas)
        ]);

        if (!responseTotalPresences.ok) {
            throw new Error(`Erro ao buscar presenças totais: ${responseTotalPresences.statusText}`);
        }
        if (!responseTotalAbsences.ok) {
            throw new Error(`Erro ao buscar faltas totais: ${responseTotalAbsences.statusText}`);
        }

        const rawDataTotalPresences = await responseTotalPresences.json();
        const dataTotalPresences = rawDataTotalPresences;
        let totalFilteredPresences = Object.values(dataTotalPresences).reduce((sum, count) => sum + count, 0);

        const rawDataTotalAbsences = await responseTotalAbsences.json();
        allAbsencesData = rawDataTotalAbsences.data || {};
        let totalFilteredAbsences = 0;
        for (const memberName in allAbsencesData) {
            if (allAbsencesData[memberName] && typeof allAbsencesData[memberName].totalFaltas === 'number') {
                totalFilteredAbsences += allAbsencesData[memberName].totalFaltas;
            }
        }

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
        }
        if (dashboardFaltasMes) {
            dashboardFaltasMes.textContent = totalFilteredAbsences;
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
        }

        if (dashboardPeriodo) dashboardPeriodo.textContent = periodoFilter || "Todos";
        if (dashboardLider) dashboardLider.textContent = liderFilter || "Todos";
        if (dashboardGape) dashboardGape.textContent = gapeFilter || "Todos";

    } catch (error) {
        console.error("Erro ao carregar o resumo:", error);
        showMessage(`Erro ao carregar o resumo: ${error.message}`, "error");
        if (dashboardPresencasMes) dashboardPresencasMes.textContent = "Erro";
        if (dashboardFaltasMes) dashboardFaltasMes.textContent = "Erro";
        if (dashboardPeriodo) dashboardPeriodo.textContent = "Erro";
        if (dashboardLider) dashboardLider.textContent = "Erro";
        if (dashboardGape) dashboardGape.textContent = "Erro";
        if (totalCountsList) totalCountsList.innerHTML = `<li class="text-sm text-red-300 text-center">Falha ao carregar o resumo.</li>`;
    } finally {
        showGlobalLoading(false);
    }
}

/**
 * Exibe o resumo detalhado em um modal.
 */
function showDetailedSummary() {
    if (!detailedSummaryModal) {
        console.error("Elemento detailedSummaryModal não encontrado.");
        showMessage("Erro: Elemento de modal de resumo detalhado não encontrado.", "error");
        return;
    }

    populateSummaryMemberSelect();

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    if (summaryStartDateInput) summaryStartDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    if (summaryEndDateInput) summaryEndDateInput.value = lastDayOfMonth.toISOString().split('T')[0];

    updateDetailedSummaryChart();

    detailedSummaryModal.classList.remove("hidden");
    detailedSummaryModal.classList.add("flex");
}

/**
 * Popula o select de membros no modal de resumo.
 */
function populateSummaryMemberSelect() {
    if (!summaryMemberSelect) {
        console.error("Erro: Elemento 'summaryMemberSelect' não encontrado no DOM.");
        return;
    }

    summaryMemberSelect.innerHTML = '<option value="">Todos os Membros Filtrados</option>';
    const membersForSummarySelect = [...new Set(filteredMembers.map(m => m.Nome).filter(Boolean))].sort();
    membersForSummarySelect.forEach(memberName => {
        const option = document.createElement('option');
        option.value = memberName;
        option.textContent = memberName;
        summaryMemberSelect.appendChild(option);
    });
}

/**
 * Atualiza os gráficos e texto do resumo detalhado.
 */
async function updateDetailedSummaryChart() {
    let membersToAnalyze = filteredMembers;
    const selectedMemberName = summaryMemberSelect ? summaryMemberSelect.value.trim() : '';
    let summaryTitle = "Estatísticas do Grupo Filtrado";
    let reportLeader = "N/A";
    let reportGape = "N/A";

    if (selectedMemberName !== "") {
        membersToAnalyze = filteredMembers.filter(member => String(member.Nome || '').trim() === selectedMemberName);
        summaryTitle = `Estatísticas para o Membro: ${selectedMemberName}`;
        if (membersToAnalyze.length > 0) {
            reportLeader = membersToAnalyze[0].Lider || "N/A";
            reportGape = membersToAnalyze[0].GAPE || "N/A";
        }
        if (membersToAnalyze.length === 0) {
            if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-lg font-semibold text-gray-800 mb-2">Nenhum dado para o membro selecionado com os filtros atuais.</p>`;
            if (myChart) myChart.destroy();
            if (myBarChart) myBarChart.destroy();
            if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Nenhum dado de membro encontrado para o relatório.</p>`;
            if (absentMembersList) absentMembersList.innerHTML = `<li>Nenhuma falta registrada.</li>`;
            return;
        }
    } else {
        const currentLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : 'Todos';
        const currentGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : 'Todos';
        reportLeader = currentLiderFilter !== "" ? currentLiderFilter : "Todos";
        reportGape = currentGapeFilter !== "" ? currentGapeFilter : "Todos";
    }

    const startDateStr = summaryStartDateInput ? summaryStartDateInput.value : '';
    const endDateStr = summaryEndDateInput ? summaryEndDateInput.value : '';

    let startDate = null;
    let endDate = null;
    if (startDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
    }

    let membersWithPresenceCount = 0;
    const totalMembersInAnalysis = membersToAnalyze.length;

    if (totalMembersInAnalysis === 0) {
        if (detailedSummaryText) detailedSummaryText.innerHTML = `<p class="text-lg font-semibold text-gray-800 mb-2">Nenhum membro para analisar.</p>`;
        if (myChart) myChart.destroy();
        if (myBarChart) myBarChart.destroy();
        if (reportInfo) reportInfo.innerHTML = `<p class="text-red-600">Nenhum dado para o relatório.</p>`;
        if (absentMembersList) absentMembersList.innerHTML = `<li>Nenhuma falta registrada.</li>`;
        return;
    }

    for (const member of membersToAnalyze) {
        const presence = lastPresencesData[member.Nome];
        if (presence && presence.data) {
            const [day, month, year] = presence.data.split('/').map(Number);
            const lastPresenceDate = new Date(year, month - 1, day);
            let dateMatches = true;
            if (startDate && lastPresenceDate < startDate) dateMatches = false;
            if (endDate && lastPresenceDate > endDate) dateMatches = false;
            if (dateMatches) {
                membersWithPresenceCount++;
            }
        }
    }

    const membersWithZeroPresenceCount = totalMembersInAnalysis - membersWithPresenceCount;
    const presencePercentage = totalMembersInAnalysis > 0 ? (membersWithPresenceCount / totalMembersInAnalysis) * 100 : 0;
    const absencePercentage = totalMembersInAnalysis > 0 ? (membersWithZeroPresenceCount / totalMembersInAnalysis) * 100 : 0;

    let membersWithRecordedAbsences = [];
    let totalRecordedAbsencesInPeriod = 0;
    const queryParamsFaltasModal = new URLSearchParams();
    if (selectedMemberName) {
        queryParamsFaltasModal.append('nome', selectedMemberName);
    } else {
        const currentLiderFilter = filterLiderInput ? filterLiderInput.value.trim() : '';
        const currentGapeFilter = filterGapeInput ? filterGapeInput.value.trim() : '';
        if (currentLiderFilter) queryParamsFaltasModal.append('lider', currentLiderFilter);
        if (currentGapeFilter) queryParamsFaltasModal.append('gape', currentGapeFilter);
    }
    if (startDateStr) queryParamsFaltasModal.append('dataInicio', startDateStr);
    if (endDateStr) queryParamsFaltasModal.append('dataFim', endDateStr);

    try {
        const responseFaltas = await fetch(`${BACKEND_URL}/get-faltas?${queryParamsFaltasModal.toString()}`);
        if (!responseFaltas.ok) throw new Error(`Erro ao buscar faltas: ${responseFaltas.statusText}`);
        const faltasData = (await responseFaltas.json()).data || {};

        for (const member of membersToAnalyze) {
            const memberAbsence = faltasData[member.Nome];
            if (memberAbsence && memberAbsence.totalFaltas > 0) {
                membersWithRecordedAbsences.push({
                    name: member.Nome,
                    totalFaltas: memberAbsence.totalFaltas,
                    details: memberAbsence.faltas || []
                });
                totalRecordedAbsencesInPeriod += memberAbsence.totalFaltas;
            }
        }

        if (absentMembersList) {
            absentMembersList.innerHTML = '';
            if (membersWithRecordedAbsences.length > 0) {
                membersWithRecordedAbsences.sort((a, b) => b.totalFaltas - a.totalFaltas);
                membersWithRecordedAbsences.forEach(member => {
                    const listItem = document.createElement('li');
                    let detailsHtml = member.details.length > 0 ? ` (${member.details.map(d => `${d.data} - ${d.periodo}`).join(', ')})` : '';
                    listItem.innerHTML = `<strong>${member.name}</strong>: ${member.totalFaltas} falta(s)${detailsHtml}`;
                    absentMembersList.appendChild(listItem);
                });
            } else {
                absentMembersList.innerHTML = '<li>Nenhuma falta registrada para os membros filtrados no período.</li>';
            }
        }
        if (detailedAbsencesList) detailedAbsencesList.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao carregar faltas para o resumo:", error);
        if (absentMembersList) absentMembersList.innerHTML = `<li>Erro ao carregar faltas: ${error.message}</li>`;
    }

    let dateRangeDisplay = "Todo o período disponível";
    if (startDateStr && endDateStr) {
        const formattedStartDate = new Date(startDateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        const formattedEndDate = new Date(endDateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        dateRangeDisplay = `Período: ${formattedStartDate} a ${formattedEndDate}`;
    }

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

    if (detailedSummaryText) {
        detailedSummaryText.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${summaryTitle}</h3>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
                <li>Total de Membros Analisados: <span class="font-bold">${totalMembersInAnalysis}</span></li>
                <li>Membros com Presença (no período): <span class="font-bold">${membersWithPresenceCount} (${presencePercentage.toFixed(1)}%)</span></li>
                <li>Membros Sem Presença (no período): <span class="font-bold">${membersWithZeroPresenceCount} (${absencePercentage.toFixed(1)}%)</span></li>
                <li>Total de Faltas Registradas (no período): <span class="font-bold">${totalRecordedAbsencesInPeriod}</span></li>
            </ul>
            <p class="text-sm text-gray-600 mt-4">"Presença" significa ter ao menos um registro no período. A seção de "Faltas" detalha as ausências específicas.</p>
        `;
    }

    if (myChart) myChart.destroy();
    if (summaryChartCanvas) {
        const ctx = summaryChartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Membros com Presença', 'Membros Sem Presença'],
                datasets: [{
                    data: [presencePercentage, absencePercentage],
                    backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Proporção de Presenças vs. Ausências' },
                    tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed.toFixed(1)}%` } },
                    datalabels: {
                        color: '#fff',
                        formatter: (value) => (value > 0 ? `${value.toFixed(1)}%` : ''),
                        font: { weight: 'bold', size: 14 }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    if (myBarChart) myBarChart.destroy();
    if (summaryBarChartCanvas) {
        const ctxBar = summaryBarChartCanvas.getContext('2d');
        myBarChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Membros com Presença', 'Membros Sem Presença'],
                datasets: [{
                    label: 'Número de Membros',
                    data: [membersWithPresenceCount, membersWithZeroPresenceCount],
                    backgroundColor: ['rgba(75, 192, 192, 0.8)', 'rgba(255, 99, 132, 0.8)'],
                    borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Contagem Absoluta de Membros' },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => {
                            const total = totalMembersInAnalysis;
                            if (total === 0) return '0';
                            const percentage = (value / total * 100).toFixed(1);
                            return `${value} (${percentage}%)`;
                        },
                        font: { weight: 'bold' }
                    }
                },
                scales: { x: { beginAtZero: true } }
            },
            plugins: [ChartDataLabels]
        });
    }
}

/**
 * Lida com o download do resumo detalhado como PDF.
 */
async function handleDownloadPdf() {
    if (!detailedSummaryContent || !downloadPdfBtn || !summaryFilterSection || !detailedSummaryModal) {
        showMessage("Erro: Elementos para PDF não encontrados.", "error");
        return;
    }

    showGlobalLoading(true, "Gerando PDF...");

    const originalStyles = {
        maxHeight: detailedSummaryContent.style.maxHeight,
        overflowY: detailedSummaryContent.style.overflowY,
        padding: detailedSummaryContent.style.padding,
        width: detailedSummaryContent.style.width,
        modalMaxHeight: detailedSummaryModal.style.maxHeight,
        btnDisplay: downloadPdfBtn.style.display,
        filterDisplay: summaryFilterSection.style.display
    };

    detailedSummaryContent.style.maxHeight = 'none';
    detailedSummaryContent.style.overflowY = 'visible';
    detailedSummaryContent.style.padding = '8mm';
    detailedSummaryContent.style.width = '100%';
    detailedSummaryModal.style.maxHeight = 'none';
    downloadPdfBtn.style.display = 'none';
    summaryFilterSection.style.display = 'none';

    try {
        const canvas = await html2canvas(detailedSummaryContent, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
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
        detailedSummaryContent.style.maxHeight = originalStyles.maxHeight;
        detailedSummaryContent.style.overflowY = originalStyles.overflowY;
        detailedSummaryContent.style.padding = originalStyles.padding;
        detailedSummaryContent.style.width = originalStyles.width;
        detailedSummaryModal.style.maxHeight = originalStyles.modalMaxHeight;
        if (downloadPdfBtn) downloadPdfBtn.style.display = originalStyles.btnDisplay;
        if (summaryFilterSection) summaryFilterSection.style.display = originalStyles.filterDisplay;
        showGlobalLoading(false);
    }
}


// --- Event Listeners ---
if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);

if (filterNameInput) filterNameInput.addEventListener("input", applyFilters);
if (filterPeriodoSelect) filterPeriodoSelect.addEventListener("change", () => {
    applyFilters();
    if (isDashboardOpen) fetchAndDisplaySummary();
});
if (filterLiderInput) filterLiderInput.addEventListener("change", () => {
    applyFilters();
    if (isDashboardOpen) fetchAndDisplaySummary();
});
if (filterGapeInput) filterGapeInput.addEventListener("change", () => {
    applyFilters();
    if (isDashboardOpen) fetchAndDisplaySummary();
});

if (toggleDashboardBtn) toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
if (showDetailedSummaryBtn) showDetailedSummaryBtn.addEventListener("click", showDetailedSummary);
if (closeModalBtn) closeModalBtn.addEventListener("click", () => {
    if (detailedSummaryModal) {
        detailedSummaryModal.classList.add("hidden");
        detailedSummaryModal.classList.remove("flex");
    }
});

if (applySummaryFiltersBtn) applySummaryFiltersBtn.addEventListener("click", updateDetailedSummaryChart);
if (summaryStartDateInput) summaryStartDateInput.addEventListener("change", updateDetailedSummaryChart);
if (summaryEndDateInput) summaryEndDateInput.addEventListener("change", updateDetailedSummaryChart);
if (summaryMemberSelect) summaryMemberSelect.addEventListener("change", updateDetailedSummaryChart);
if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", handleDownloadPdf);

window.addEventListener("load", fetchMembers);

/**
 * Exibe o nome do líder logado.
 */
function displayLoggedInLeaderName() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (loggedInLeaderNameElement) {
        if (leaderName) {
            loggedInLeaderNameElement.innerHTML = `Logado como: <span class="text-blue-600 font-bold">${leaderName}</span>`;
        } else {
            loggedInLeaderNameElement.textContent = `Logado como: Não identificado`;
            // window.location.href = "/index.html";
        }
    }
}

/**
 * Configura a visualização para líderes.
 */
function setupLeaderView() {
    const leaderName = localStorage.getItem('loggedInLeaderName');
    if (leaderName && leaderName !== 'admin') {
        const loggedInMember = allMembersData.find(member =>
            String(member.Nome || '').toLowerCase().trim() === leaderName.toLowerCase().trim()
        );

        if (loggedInMember) {
            if (loggedInMember.Lider && filterLiderInput) {
                filterLiderInput.value = loggedInMember.Lider;
            }
            if (loggedInMember.GAPE && filterGapeInput) {
                filterGapeInput.value = loggedInMember.GAPE;
            }
        } else {
            console.warn(`Membro logado '${leaderName}' não encontrado para pré-selecionar filtros.`);
        }

        if (filterLiderInput) filterLiderInput.disabled = true;
        if (filterGapeInput) filterGapeInput.disabled = true;

        applyFilters();

        if (isDashboardOpen) {
            fetchAndDisplaySummary();
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    displayLoggedInLeaderName();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('loggedInLeaderName');
            window.location.href = 'index.html';
        });
    }
});
