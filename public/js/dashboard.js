// ------------------------------------------------------
// Frontend (js/dashboard.js)
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
        message.includes("Registrando presença para ")) {
        return;
    }

    messageArea.textContent = message;
    messageArea.className = "message-box show";

    messageArea.classList.remove("message-success", "message-error", "bg-blue-100", "text-blue-800", "bg-yellow-100", "text-yellow-800");

    if (type === "success") {
        messageArea.classList.add("message-success");
    } else if (type === "error") {
        messageArea.classList.add("message-error");
    } else if (type === "warning") {
        messageArea.classList.add("bg-yellow-100", "text-yellow-800");
    } else {
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
    membersCardsContainer.innerHTML = `
        <div class="col-span-full flex flex-col justify-center items-center py-8 gap-3">
            <svg class="animate-spin h-8 w-8 text-blue-700 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
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

        lastPresencesData = await presencesResponse.json(); // Atribui as presenças carregadas

        if (allMembersData.length === 0) {
            showMessage("Nenhum membro encontrado ou dados vazios.", "info");
        }

        fillSelectOptions();
        applyFilters(); 
    } catch (error) {
        console.error("Erro ao carregar membros ou presenças:", error);
        showMessage(`Erro ao carregar dados: ${error.message}`, "error");
        membersCardsContainer.innerHTML = `<div class="col-span-full text-center py-4 text-red-600">Falha ao carregar dados. Verifique o console.</div>`;
    } finally {
        showGlobalLoading(false);
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

        // Função para atualizar o status da presença no card usando os dados já carregados
        const updatePresenceStatus = () => { 
            infoDiv.classList.remove("text-green-700", "text-red-600", "text-yellow-700", "text-blue-700");
            infoDiv.classList.add("block");

            const presence = lastPresencesData[member.Nome]; 

            if (presence && presence.data && presence.hora) { // Verifica se presence e seus campos são válidos
                infoDiv.textContent = `Últ. presença: ${presence.data} às ${presence.hora}`;
                infoDiv.classList.add("text-green-700");
            } else {
                infoDiv.textContent = `Nenhuma presença registrada ainda.`;
                infoDiv.classList.add("text-gray-500");
            }
            infoDiv.classList.remove("hidden");
        };

        // Atualiza o status ao carregar o card pela primeira vez
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
            infoDiv.classList.remove("hidden", "text-green-700", "text-red-600", "text-yellow-700");
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
                        hora: `${hora}:${min}:${seg}`,
                        sheet: "PRESENCAS",
                    }),
                });

                const responseData = await response.json();

                if (response.ok) {
                    if (!responseData.success && responseData.message && responseData.message.includes("já foi registrada")) {
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

                    } else if (responseData.success) {
                        infoDiv.classList.remove("text-blue-700", "text-yellow-700");
                        infoDiv.classList.add("text-green-700");
                        showMessage("Presença registrada com sucesso!", "success");

                        card.classList.add('animate-pulse-green');
                        setTimeout(() => card.classList.remove('animate-pulse-green'), 1000);

                        lastPresencesData[member.Nome] = { data: `${dia}/${mes}/${ano}`, hora: `${hora}:${min}:${seg}` };
                        updatePresenceStatus();

                    } else {
                        infoDiv.textContent = `Erro: ${responseData.details || responseData.message || "Falha ao registrar"}`;
                        infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                        infoDiv.classList.add("text-red-600");
                        showMessage(`Erro ao registrar presença: ${responseData.details || responseData.message || "Erro desconhecido"}`, "error");

                        card.classList.add('animate-shake-red');
                        setTimeout(() => card.classList.remove('animate-shake-red'), 1000);

                        confirmBtn.disabled = false;
                        checkbox.disabled = false;
                    }
                } else {
                    infoDiv.textContent = `Erro: ${responseData.details || responseData.message || "Falha ao enviar para o servidor."}`;
                    infoDiv.classList.remove("text-blue-700", "text-green-700", "text-yellow-700");
                    infoDiv.classList.add("text-red-600");
                    showMessage(`Erro de rede ou servidor: ${responseData.details || responseData.message || "Erro desconhecido"} (HTTP ${response.status})`, "error");

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
}

function applyFiltersWithMessage() {
    showMessage("Aplicando filtros...", "info");
    applyFilters();
}

// Lógica de toggle dashboard para a sidebar
function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;

    if (isDashboardOpen) {
        // Remove as classes que ocultam e adiciona a altura máxima para animar
        dashboardContainer.classList.remove('max-h-0', 'opacity-0', 'overflow-hidden');
        // Opcional: Adicione uma altura máxima maior se 'max-h-screen' não for suficiente ou causar scroll indesejado
        // Ex: dashboardContainer.classList.add('max-h-[500px]', 'opacity-100'); // Ou max-h-screen
        
        // Ajusta os ícones e textos do botão
        dashboardOpenIcon.classList.add('hidden');
        dashboardCloseIcon.classList.remove('hidden');
        dashboardOpenText.classList.add('hidden');
        dashboardCloseText.classList.remove('hidden');
        
        console.log("Dashboard: Abrindo. Buscando resumo...");
        fetchAndDisplaySummary();
    } else {
        // Adiciona as classes para ocultar e animar o fechamento
        dashboardContainer.classList.add('max-h-0', 'opacity-0', 'overflow-hidden');
        
        // Ajusta os ícones e textos do botão
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
        const responseTotal = await fetch(`${BACKEND_URL}/get-presencas-total`);
        if (!responseTotal.ok) {
            throw new Error(`Erro ao buscar presenças totais: ${responseTotal.statusText}`);
        }
        const dataTotal = await responseTotal.json();

        // --- CONSOLE.LOGS PARA DEPURAR (MANTIDOS TEMPORARIAMENTE) ---
        console.log("Dados brutos de presenças totais (dataTotal):", dataTotal); 
        // --- FIM DOS CONSOLE.LOGS ---

        // Filtra os membros com base nos filtros atuais para o resumo
        const currentLiderFilter = filterLiderInput.value.toLowerCase().trim();
        const currentGapeFilter = filterGapeInput.value.toLowerCase().trim();

        const membersMatchingLiderAndGape = allMembersData.filter(member => {
            const memberLider = String(member.Lider || "").toLowerCase();
            const memberGape = String(member.GAPE || "").toLowerCase();

            const matchesLider = currentLiderFilter === "" || memberLider.includes(currentLiderFilter);
            const matchesGape = currentGapeFilter === "" || memberGape.includes(currentGapeFilter);

            return matchesLider && matchesGape;
        }).map(member => member.Nome); 

        const filteredTotalCounts = {};
        let totalFilteredPresences = 0;

        for (const memberName in dataTotal) {
            // Inclui se não há filtros de líder/GAPE aplicados, ou se o membro corresponde
            if (membersMatchingLiderAndGape.includes(memberName) || (currentLiderFilter === "" && currentGapeFilter === "")) {
                filteredTotalCounts[memberName] = dataTotal[memberName];
                totalFilteredPresences += dataTotal[memberName];
            }
        }

        // --- CONSOLE.LOGS PARA DEPURAR (MANTIDOS TEMPORARIAMENTE) ---
        console.log("Membros filtrados para o resumo:", membersMatchingLiderAndGape);
        console.log("Contagens totais filtradas (filteredTotalCounts):", filteredTotalCounts);
        console.log("Total de presenças filtradas:", totalFilteredPresences);
        // --- FIM DOS CONSOLE.LOGS ---

        if (dashboardPresencasMes) {
            dashboardPresencasMes.textContent = totalFilteredPresences;
        }

        if (totalCountsList) {
            totalCountsList.innerHTML = '';
            const sortedCounts = Object.entries(filteredTotalCounts).sort(([, countA], [, countB]) => countB - countA);

            // --- CONSOLE.LOGS PARA DEPURAR (MANTIDOS TEMPORARIAMENTE) ---
            console.log("Contagens ordenadas para exibição (sortedCounts):", sortedCounts);
            // --- FIM DOS CONSOLE.LOGS ---

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

        // Esta parte abaixo usa `filteredMembers` que já são filtrados pelas entradas do usuário,
        // então faz sentido para Período/Líder/GAPE da *visão filtrada*.
        const uniquePeriods = [...new Set(filteredMembers.map(m => m.Periodo).filter(Boolean))];
        const uniqueLiders = [...new Set(filteredMembers.map(m => m.Lider).filter(Boolean))];
        const uniqueGapes = [...new Set(filteredMembers.map(m => m.GAPE).filter(Boolean))];

        if (dashboardPeriodo) {
            if (uniquePeriods.length === 0) {
                dashboardPeriodo.textContent = "N/A";
            } else if (uniquePeriods.length === 1) {
                dashboardPeriodo.textContent = uniquePeriods[0];
            } else {
                dashboardPeriodo.textContent = "Vários";
            }
        }

        if (dashboardLider) {
            if (uniqueLiders.length === 0) {
                dashboardLider.textContent = "N/A";
            } else if (uniqueLiders.length === 1) {
                dashboardLider.textContent = uniqueLiders[0];
            } else {
                dashboardLider.textContent = "Vários";
            }
        }

        if (dashboardGape) {
            if (uniqueGapes.length === 0) {
                dashboardGape.textContent = "N/A";
            } else if (uniqueGapes.length === 1) {
                dashboardGape.textContent = uniqueGapes[0];
            } else {
                dashboardGape.textContent = "Vários";
            }
        }

    } catch (error) {
        console.error("Erro ao carregar o resumo:", error);
        showMessage(`Erro ao carregar o resumo: ${error.message}`, "error");
    } finally {
        showGlobalLoading(false);
    }
}

// --- Event Listeners ---
applyFiltersBtn.addEventListener("click", applyFiltersWithMessage);
clearFiltersBtn.addEventListener("click", clearFilters);

filterNameInput.addEventListener("input", applyFilters);
filterPeriodoSelect.addEventListener("change", applyFilters);
filterLiderInput.addEventListener("change", applyFilters);
filterGapeInput.addEventListener("change", applyFilters);

if (toggleDashboardBtn) {
    toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
}

// Carrega os membros ao carregar a página
window.addEventListener("load", fetchMembers);
