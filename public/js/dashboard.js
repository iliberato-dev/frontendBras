// ------------------------------------------------------
// Frontend (js/dashboard.js) - VERSÃO COMPLETA E FINAL
// ------------------------------------------------------

// Verificação para evitar redeclaração se o script for carregado múltiplas vezes
if (typeof window.dashboardInitialized === "undefined") {
  window.dashboardInitialized = true;

  // Função utilitária para criar nomes de arquivo seguros (igual ao backend)
  function createSafeFileName(name) {
    return name ? name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() : "";
  }

  let allMembersData = [];
  let filteredMembers = [];
  let lastPresencesData = {};
  let allAbsencesData = {};
  let myChart = null;
  let myBarChart = null;

  // Cache para otimização de performance
  let summaryCache = new Map();
  let lastCacheKey = null;
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutos em millisegundos

  // --- Seletores de Elementos Globais ---
  const filterNameInput = document.getElementById("filterName");
  const filterPeriodoSelect = document.getElementById("filterPeriodo");
  const filterLiderInput = document.getElementById("filterLider");
  const filterGapeInput = document.getElementById("filterGape");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const membersCardsContainer = document.getElementById(
    "membersCardsContainer"
  );
  const messageArea = document.getElementById("messageArea");
  const globalLoadingIndicator = document.getElementById(
    "globalLoadingIndicator"
  );
  const loadingMessageSpan = document.getElementById("loadingMessage");

  // Elementos do Dashboard Principal
  const toggleDashboardBtn = document.getElementById("toggleDashboardBtn");
  const dashboardContainer = document.getElementById("dashboardContainer");
  const dashboardOpenIcon = document.getElementById("dashboardOpenIcon");
  const dashboardCloseIcon = document.getElementById("dashboardCloseIcon");
  const dashboardOpenText = document.getElementById("dashboardOpenText");
  const dashboardCloseText = document.getElementById("dashboardCloseText");
  const dashboardPresencasMes = document.getElementById(
    "dashboardPresencasMes"
  );
  const dashboardPeriodo = document.getElementById("dashboardPeriodo");
  const dashboardLider = document.getElementById("dashboardLider");
  const dashboardGape = document.getElementById("dashboardGape");
  const totalCountsList = document.getElementById("totalCountsList");
  const dashboardFaltasMes = document.getElementById("dashboardFaltasMes");

  // Elementos de Login e Usuário
  const loggedInLeaderNameElement =
    document.getElementById("loggedInLeaderName");

  // Elementos do Modal de Resumo Detalhado
  const detailedSummaryModal = document.getElementById("detailedSummaryModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const summaryChartCanvas = document.getElementById("summaryChart");
  const summaryBarChartCanvas = document.getElementById("summaryBarChart");
  const detailedSummaryText = document.getElementById("detailedSummaryText");
  const showDetailedSummaryBtn = document.getElementById(
    "showDetailedSummaryBtn"
  );
  const detailedSummaryContent = document.getElementById(
    "detailedSummaryContent"
  );
  const summaryStartDateInput = document.getElementById("summaryStartDate");
  const summaryEndDateInput = document.getElementById("summaryEndDate");
  const summaryMemberSelect = document.getElementById("summaryMemberSelect");
  const applySummaryFiltersBtn = document.getElementById(
    "applySummaryFiltersBtn"
  );
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const reportInfo = document.getElementById("reportInfo");
  const summaryFilterSection = document.getElementById("summaryFilterSection");

  // Elementos do Modal de Histórico de Presenças
  const historyModal = document.getElementById("historyModal");
  const closeHistoryModalBtn = document.getElementById("closeHistoryModalBtn");
  const historyModalTitle = document.getElementById("historyModalTitle");
  const historyListContainer = document.getElementById(
    "presenceHistoryListContainer"
  );

  // --- Configurações ---
  // Detecta se está rodando localmente ou em produção
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const BACKEND_URL = isLocalhost
    ? "http://localhost:3000"
    : "https://backendbras.onrender.com";
  let isDashboardOpen = false;

  // --- Funções Utilitárias ---

  function generateCacheKey(queryParams) {
    return queryParams.toString() + "|" + Date.now().toString().slice(0, -5); // Arredonda para 10s
  }

  function getCachedData(cacheKey) {
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_TIME) {
      return cached.data;
    }
    return null;
  }

  function setCachedData(cacheKey, data) {
    // Limita o cache a 10 entradas para não consumir muita memória
    if (summaryCache.size >= 10) {
      const firstKey = summaryCache.keys().next().value;
      summaryCache.delete(firstKey);
    }
    summaryCache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
    });
  }

  // Função de debounce para otimizar event listeners
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Indicador de carregamento flutuante
  function showFloatingLoader(message = "Carregando...") {
    // Remove loader anterior se existir
    hideFloatingLoader();

    const loader = document.createElement("div");
    loader.id = "floatingLoader";
    loader.className = "floating-loader";
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <span class="loader-text">${message}</span>
      <button class="loader-close" onclick="hideFloatingLoader()" title="Fechar">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Adiciona estilos CSS inline para garantir que funcione
    loader.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5e7eb;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(10px);
      min-width: 240px;
      max-width: 300px;
    `;

    // Estilos para o spinner
    const spinnerStyle = `
      .loader-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }
      .loader-text {
        color: #374151;
        font-weight: 500;
        font-size: 0.875rem;
        flex: 1;
      }
      .loader-close {
        color: #9ca3af;
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        transition: color 0.2s;
        flex-shrink: 0;
      }
      .loader-close:hover {
        color: #6b7280;
        background: #f3f4f6;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;

    // Adiciona CSS se não existir
    if (!document.getElementById("floatingLoaderCSS")) {
      const style = document.createElement("style");
      style.id = "floatingLoaderCSS";
      style.textContent = spinnerStyle;
      document.head.appendChild(style);
    }

    document.body.appendChild(loader);

    // Anima a entrada
    setTimeout(() => {
      loader.style.opacity = "1";
      loader.style.transform = "translateY(0) scale(1)";
    }, 50);

    return loader;
  }

  function hideFloatingLoader() {
    const loader = document.getElementById("floatingLoader");
    if (loader) {
      loader.style.opacity = "0";
      loader.style.transform = "translateY(-10px) scale(0.95)";
      setTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 300);
    }
  }

  // Torna a função global para poder ser chamada pelo botão
  window.hideFloatingLoader = hideFloatingLoader;

  function showGlobalLoading(show, message = "Carregando...") {
    if (globalLoadingIndicator && loadingMessageSpan) {
      loadingMessageSpan.textContent = message;
      globalLoadingIndicator.style.display = show ? "flex" : "none";
      if (show) {
        setTimeout(() => globalLoadingIndicator.classList.add("show"), 10);
      } else {
        globalLoadingIndicator.classList.remove("show");
      }
    }
  }

  function showMessage(message, type = "info") {
    if (!messageArea) return;
    if (message.includes("Carregando") || !message.trim()) return;

    messageArea.textContent = message;
    messageArea.className = "message-box show";
    messageArea.classList.remove(
      "message-success",
      "message-error",
      "bg-green-100",
      "text-green-800",
      "bg-red-100",
      "text-red-800",
      "bg-yellow-100",
      "text-yellow-800",
      "bg-blue-100",
      "text-blue-800"
    );

    switch (type) {
      case "success":
        messageArea.classList.add(
          "message-success",
          "bg-green-100",
          "text-green-800"
        );
        break;
      case "error":
        messageArea.classList.add(
          "message-error",
          "bg-red-100",
          "text-red-800"
        );
        break;
      case "warning":
        messageArea.classList.add("bg-yellow-100", "text-yellow-800");
        break;
      default:
        messageArea.classList.add("bg-blue-100", "text-blue-800");
    }

    setTimeout(() => {
      messageArea.classList.remove("show");
    }, 4000);
  }

  // --- Funções de Gerenciamento de Fotos de Perfil (Backend) ---

  async function saveMemberPhoto(memberName, base64Photo) {
    try {
      showGlobalLoading(true, "Salvando foto...");

      const response = await fetch(`${BACKEND_URL}/upload-member-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberName: memberName,
          photoBase64: base64Photo,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Foto salva no servidor para ${memberName}`);
        return result.photoUrl;
      } else {
        throw new Error(result.message || "Erro ao salvar foto");
      }
    } catch (error) {
      console.error("❌ Erro ao salvar foto no servidor:", error);
      showMessage("Erro ao salvar foto no servidor", "error");
      throw error;
    } finally {
      showGlobalLoading(false);
    }
  }

  async function getMemberPhoto(memberName) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/member-photo/${encodeURIComponent(memberName)}`
      );

      if (response.ok) {
        const result = await response.json();
        return result.success ? result.photoUrl : null;
      } else if (response.status === 404) {
        return null; // Foto não encontrada, usar padrão
      } else {
        throw new Error("Erro ao buscar foto");
      }
    } catch (error) {
      console.error("❌ Erro ao recuperar foto do servidor:", error);
      return null; // Em caso de erro, usar foto padrão
    }
  }

  async function getAllMemberPhotos() {
    try {
      console.log("🔍 Buscando todas as fotos do servidor...");
      const response = await fetch(`${BACKEND_URL}/member-photos`);

      if (response.ok) {
        const result = await response.json();
        console.log("📸 Resposta do servidor:", result);
        console.log("📊 Fotos recebidas:", result.photos);
        return result.success ? result.photos : {};
      } else {
        throw new Error("Erro ao buscar fotos");
      }
    } catch (error) {
      console.error("❌ Erro ao recuperar fotos do servidor:", error);
      return {};
    }
  }

  async function handlePhotoUpload(file, memberName) {
    if (!file) return;

    // Validações
    if (!file.type.startsWith("image/")) {
      showMessage("Por favor, selecione apenas arquivos de imagem", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limite
      showMessage("A imagem deve ter no máximo 5MB", "error");
      return;
    }

    // Mostra loading durante o processamento
    showGlobalLoading(true, "Processando imagem...");

    const reader = new FileReader();

    reader.onload = async function (e) {
      const img = new Image();

      img.onload = async function () {
        try {
          // Cria canvas para redimensionar a imagem
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Define tamanho máximo (200x200 pixels)
          const maxSize = 200;
          let { width, height } = img;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Desenha a imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Converte para base64 com qualidade comprimida
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);

          // Salva a foto no servidor
          const photoUrl = await saveMemberPhoto(memberName, compressedBase64);

          // Atualiza a foto na interface
          updateMemberPhotoInCard(memberName, photoUrl);

          // Recarrega os membros para ter as URLs atualizadas
          await fetchMembers();

          showGlobalLoading(false);
          showMessage(
            `✅ Foto de ${memberName} atualizada com sucesso!`,
            "success"
          );
        } catch (error) {
          showGlobalLoading(false);
          showMessage("Erro ao salvar foto no servidor", "error");
        }
      };

      img.onerror = function () {
        showGlobalLoading(false);
        showMessage("Erro ao processar a imagem", "error");
      };

      img.src = e.target.result;
    };

    reader.onerror = function () {
      showGlobalLoading(false);
      showMessage("Erro ao ler o arquivo de imagem", "error");
    };

    reader.readAsDataURL(file);
  }

  function updateMemberPhotoInCard(memberName, photoUrl) {
    const photoElements = document.querySelectorAll(
      `img[alt="Foto de ${memberName}"]`
    );
    photoElements.forEach((img) => {
      img.src = photoUrl;
    });
  }

  function initializePhotoUploadListeners() {
    document.addEventListener("change", function (e) {
      if (e.target.classList.contains("photo-upload-input")) {
        const memberName = e.target.getAttribute("data-member-name");
        const file = e.target.files[0];

        if (file && memberName) {
          handlePhotoUpload(file, memberName);
        }

        // Limpa o input para permitir selecionar o mesmo arquivo novamente
        e.target.value = "";
      }
    });

    // Adiciona listener para clique com botão direito (menu de contexto)
    document.addEventListener("contextmenu", function (e) {
      if (e.target.classList.contains("member-photo")) {
        e.preventDefault();
        const memberName = e.target.alt.replace("Foto de ", "");
        showPhotoContextMenu(e, memberName);
      }
    });
  }

  async function removeMemberPhoto(memberName) {
    try {
      showGlobalLoading(true, "Removendo foto...");

      const response = await fetch(
        `${BACKEND_URL}/member-photo/${encodeURIComponent(memberName)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success || response.status === 404) {
        // Atualiza para foto padrão
        const defaultPhoto =
          "https://png.pngtree.com/png-vector/20191208/ourmid/pngtree-beautiful-create-user-glyph-vector-icon-png-image_2084391.jpg";
        updateMemberPhotoInCard(memberName, defaultPhoto);

        // Recarrega os membros para ter as URLs atualizadas
        await fetchMembers();

        showMessage(
          `✅ Foto de ${memberName} removida. Usando foto padrão.`,
          "success"
        );
        console.log(`✅ Foto removida para ${memberName}`);
      } else {
        throw new Error(result.message || "Erro ao remover foto");
      }
    } catch (error) {
      console.error("❌ Erro ao remover foto:", error);
      showMessage("Erro ao remover foto do servidor", "error");
    } finally {
      showGlobalLoading(false);
    }
  }

  async function showPhotoContextMenu(event, memberName) {
    // Remove menu anterior se existir
    const existingMenu = document.getElementById("photoContextMenu");
    if (existingMenu) {
      existingMenu.remove();
    }

    // Verifica se há foto personalizada no servidor
    const savedPhoto = await getMemberPhoto(memberName);
    if (!savedPhoto) return; // Só mostra menu se houver foto personalizada

    const menu = document.createElement("div");
    menu.id = "photoContextMenu";
    menu.className =
      "fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50";
    menu.style.left = event.pageX + "px";
    menu.style.top = event.pageY + "px";

    menu.innerHTML = `
      <button class="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2">
        <i class="fas fa-trash-alt"></i>
        Remover foto personalizada
      </button>
    `;

    document.body.appendChild(menu);

    // Remove menu ao clicar fora
    setTimeout(() => {
      document.addEventListener("click", function removeMenu() {
        menu.remove();
        document.removeEventListener("click", removeMenu);
      });
    }, 100);

    // Adiciona ação ao botão
    menu.querySelector("button").addEventListener("click", () => {
      removeMemberPhoto(memberName);
      menu.remove();
    });
  }

  // --- Funções Principais de Dados e UI ---

  async function fetchMembers() {
    showGlobalLoading(true, "Carregando dados dos membros...");
    if (!membersCardsContainer) {
      showMessage(
        "Erro crítico: Contêiner de membros não encontrado.",
        "error"
      );
      showGlobalLoading(false);
      return;
    }

    try {
      const [membersResponse, presencesResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/get-membros`),
        fetch(`${BACKEND_URL}/get-all-last-presences`),
      ]);

      if (!membersResponse.ok || !presencesResponse.ok) {
        const errorData = await membersResponse.json();
        throw new Error(
          errorData.message || "Falha ao carregar dados do servidor."
        );
      }

      const membersData = await membersResponse.json();
      console.log("📊 Dados dos membros recebidos:", membersData);
      allMembersData = membersData.membros || [];
      console.log("👥 Membros processados:", allMembersData.length);
      console.log("🔍 Primeiro membro:", allMembersData[0]);
      console.log("🖼️ FotoURL do primeiro membro:", allMembersData[0]?.FotoURL);

      // Verificar quantos membros têm FotoURL
      const membersWithPhotos = allMembersData.filter(
        (m) => m.FotoURL && m.FotoURL.includes("/uploads/member-photos/")
      );
      console.log(
        "📸 Membros com fotos personalizadas:",
        membersWithPhotos.length
      );
      if (membersWithPhotos.length > 0) {
        console.log(
          "🎯 Primeiros membros com fotos:",
          membersWithPhotos.slice(0, 3).map((m) => ({
            nome: m.Nome,
            foto: m.FotoURL,
          }))
        );

        // Log detalhado de todos os membros com fotos
        membersWithPhotos.forEach((member, index) => {
          console.log(`📷 ${index + 1}. ${member.Nome} -> ${member.FotoURL}`);
        });
      }

      const lastPresencesRawData = await presencesResponse.json();
      lastPresencesData = lastPresencesRawData.data || {};

      fillSelectOptions();
      applyFilters();

      // Reinicializa o autocomplete após carregar os dados
      setTimeout(() => {
        initializeNameAutocomplete();
      }, 100);
    } catch (error) {
      showMessage(`Erro ao carregar dados: ${error.message}`, "error");
    } finally {
      showGlobalLoading(false);
      setupLeaderView();
    }
  }

  function applyFilters() {
    const filters = {
      name: (filterNameInput?.value || "").toLowerCase().trim(),
      periodo: (filterPeriodoSelect?.value || "").toLowerCase().trim(),
      lider: (filterLiderInput?.value || "").toLowerCase().trim(),
      gape: (filterGapeInput?.value || "").toLowerCase().trim(),
    };

    filteredMembers = allMembersData.filter((member) => {
      const memberName = (member.Nome || "").toLowerCase();
      return (
        (!filters.name || memberName.includes(filters.name)) &&
        (!filters.periodo ||
          (member.Periodo || "").toLowerCase().includes(filters.periodo)) &&
        (!filters.lider ||
          (member.Lider || "").toLowerCase().includes(filters.lider)) &&
        (!filters.gape ||
          (member.GAPE || "").toLowerCase().includes(filters.gape))
      );
    });

    displayMembers(filteredMembers);
  }

  function displayMembers(members) {
    const container = document.getElementById("membersCardsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (members.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-4 text-gray-500">Nenhum membro encontrado.</div>`;
      return;
    }

    members.forEach((member) => {
      const card = document.createElement("div");
      card.className =
        "fade-in-row bg-white rounded-xl shadow-md p-4 flex flex-col gap-2 relative";

      // --- LÓGICA ADICIONADA PARA ESCOLHER O ÍCONE DO PERÍODO ---
      let periodoIcon =
        '<i class="fas fa-question-circle text-gray-400 fa-fw"></i>'; // Ícone padrão
      if (member.Periodo) {
        const periodoLower = member.Periodo.toLowerCase();
        if (periodoLower.includes("manhã") || periodoLower.includes("tarde")) {
          periodoIcon = '<i class="fas fa-sun text-yellow-500 fa-fw"></i>'; // Ícone de sol
        } else if (periodoLower.includes("noite")) {
          periodoIcon = '<i class="fas fa-moon text-blue-500 fa-fw"></i>'; // Ícone de lua
        }
      }

      // Usa a foto que vem do backend ou a padrão
      const photoUrl =
        member.FotoURL ||
        "https://png.pngtree.com/png-vector/20191208/ourmid/pngtree-beautiful-create-user-glyph-vector-icon-png-image_2084391.jpg";

      // Verifica se é uma foto personalizada (do servidor)
      const hasCustomPhoto =
        member.FotoURL && member.FotoURL.includes("/uploads/member-photos/");

      // Log apenas para membros com fotos personalizadas
      if (hasCustomPhoto) {
        console.log(
          `🖼️ Renderizando membro com foto: ${member.Nome} -> ${photoUrl}`
        );
      }

      card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                    <div class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-400 flex-shrink-0 group cursor-pointer">
                        <img src="${photoUrl}" alt="Foto de ${
        member.Nome
      }" class="member-photo w-full h-full object-cover transition-transform duration-200 group-hover:scale-105">
                        <input type="file" class="photo-upload-input absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" accept="image/*" data-member-name="${
                          member.Nome
                        }" title="Clique para trocar a foto">
                        <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 text-white text-xs text-center z-10">
                          <div class="flex flex-col items-center">
                            <i class="fas fa-camera mb-1 text-lg"></i>
                            <span class="font-medium">Trocar</span>
                          </div>
                        </div>
                        ${
                          hasCustomPhoto
                            ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white z-15" title="Foto personalizada"></div>'
                            : ""
                        }
                    </div>
                    <div class="font-bold text-lg text-gray-800">${
                      member.Nome || "N/A"
                    }</div>
                </div>
                <button class="btn-history text-gray-400 hover:text-blue-600 transition" data-member-name="${
                  member.Nome
                }" title="Ver Histórico de Presenças">
                    <i class="fas fa-history fa-lg"></i>
                </button>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                ${periodoIcon}
                <span><b>Período:</b> ${member.Periodo || "N/A"}</span>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                <i class="fas fa-star text-yellow-600 fa-fw"></i>
                <span><b>Líder:</b> ${member.Lider || "N/A"}</span>
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
                <i class="fas fa-users text-purple-600 fa-fw"></i>
                <span><b>GAPE:</b> ${member.GAPE || "N/A"}</span>
            </div>
            <label class="flex items-center gap-2 mt-2">
                <input type="checkbox" class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 presence-checkbox">
                <span class="text-sm text-gray-700">Presente</span>
            </label>
            <div class="presence-date-container mt-2 hidden" style="display: none;">
                <label class="text-sm text-gray-600 font-semibold">Escolha a data da presença (opcional):</label>
                <input type="date" class="presence-date-input mt-1 block w-full rounded-md border-gray-300 shadow-sm">
            </div>
            <button class="btn-confirm-presence w-full mt-2 hidden bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg" style="display: none;">Confirmar Presença</button>
            <div class="text-xs text-gray-500 mt-1 presence-info"></div>
        `;
      container.appendChild(card);

      // O restante da sua função (event listeners, etc.) permanece exatamente o mesmo
      const checkbox = card.querySelector(".presence-checkbox");
      const infoDiv = card.querySelector(".presence-info");
      const confirmBtn = card.querySelector(".btn-confirm-presence");
      const dateContainer = card.querySelector(".presence-date-container");
      const dateInput = card.querySelector(".presence-date-input");
      const historyBtn = card.querySelector(".btn-history");

      // Garantir que os elementos estejam escondidos inicialmente
      confirmBtn.style.display = "none";
      dateContainer.style.display = "none";
      confirmBtn.classList.add("hidden");
      dateContainer.classList.add("hidden");

      const updatePresenceStatus = () => {
        if (!infoDiv) return;
        const presence = lastPresencesData[member.Nome];
        if (presence && presence.data && presence.data !== "N/A") {
          let displayText = `Últ. presença: ${presence.data}`;
          if (
            presence.hora &&
            presence.hora !== "00:00:00" &&
            presence.hora !== "N/A"
          ) {
            displayText += ` às ${presence.hora}`;
          }
          if (presence.diaSemana) {
            const diaFormatado =
              presence.diaSemana.charAt(0).toUpperCase() +
              presence.diaSemana.slice(1);
            displayText += ` (${diaFormatado})`;
          }
          infoDiv.textContent = displayText;
          infoDiv.className = "text-xs text-green-700 mt-1 presence-info";
        } else {
          infoDiv.textContent = `Nenhuma presença registrada.`;
          infoDiv.className = "text-xs text-gray-500 mt-1 presence-info";
        }
      };

      updatePresenceStatus();

      historyBtn.addEventListener("click", () =>
        showPresenceHistory(member.Nome)
      );

      checkbox.addEventListener("change", function () {
        // Usa tanto classes CSS quanto style.display para garantir compatibilidade
        if (this.checked) {
          dateContainer.classList.remove("hidden");
          dateContainer.style.display = "block";
          confirmBtn.classList.remove("hidden");
          confirmBtn.style.display = "block";
          infoDiv.textContent = "Clique em confirmar para registrar.";
          infoDiv.className = "text-xs text-gray-500 mt-1 presence-info";
        } else {
          dateContainer.classList.add("hidden");
          dateContainer.style.display = "none";
          confirmBtn.classList.add("hidden");
          confirmBtn.style.display = "none";
          updatePresenceStatus();
        }
      });

      confirmBtn.addEventListener("click", async () => {
        confirmBtn.disabled = true;
        infoDiv.textContent = `Registrando...`;
        infoDiv.className =
          "text-xs text-blue-700 mt-1 presence-info animate-pulse";

        const selectedDate = dateInput.value;
        let presenceDate, presenceTime;
        if (selectedDate) {
          presenceDate = selectedDate.split("-").reverse().join("/");
          presenceTime = "00:00:00";
        } else {
          const now = new Date();
          presenceDate = now.toLocaleDateString("pt-BR");
          presenceTime = now.toLocaleTimeString("pt-BR");
        }

        try {
          const response = await fetch(`${BACKEND_URL}/presenca`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              nome: member.Nome,
              data: presenceDate,
              hora: presenceTime,
            }),
          });
          const result = await response.json();
          if (!result.success) throw new Error(result.message);

          showMessage("Presença registrada com sucesso!", "success");
          fetchMembers();
        } catch (error) {
          showMessage(`Erro: ${error.message}`, "error");
          updatePresenceStatus();
        } finally {
          checkbox.checked = false;
          confirmBtn.classList.add("hidden");
          confirmBtn.style.display = "none";
          dateContainer.classList.add("hidden");
          dateContainer.style.display = "none";
          confirmBtn.disabled = false;
          infoDiv.classList.remove("animate-pulse");
        }
      });
    });
  }

  // --- Funções de Histórico de Presença ---

  async function showPresenceHistory(memberName) {
    if (!historyModal || !historyModalTitle || !historyListContainer) return;

    historyModalTitle.textContent = `Histórico de Presenças de ${memberName}`;
    historyListContainer.innerHTML = `<p class="text-center text-gray-500">Carregando...</p>`;
    historyModal.classList.remove("hidden");

    try {
      const response = await fetch(
        `${BACKEND_URL}/presences/${encodeURIComponent(memberName)}`
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      const presences = data.presences || [];
      if (presences.length === 0) {
        historyListContainer.innerHTML = `<p class="text-center text-gray-500">Nenhuma presença registrada.</p>`;
        return;
      }

      // --- ALTERAÇÃO AQUI ---
      // Modificamos o HTML para incluir o dia da semana
      historyListContainer.innerHTML = `<ul class="space-y-2" id="history-ul">${presences
        .map((p) => {
          const diaSemanaFormatado = p.diaSemana ? `(${p.diaSemana})` : "";
          const horaFormatada =
            p.hora && p.hora !== "00:00:00" ? `às ${p.hora}` : "";

          return `
            <li class="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                <span>
                    <i class="fas fa-check-circle text-green-500 mr-2"></i>
                    <strong>Data:</strong> ${p.data}
                    <span class="text-gray-600 text-sm ml-2">${diaSemanaFormatado}</span>
                    <span class="text-gray-500 text-xs ml-2">${horaFormatada}</span>
                </span>
                <button class="btn-remove-presence text-red-500 hover:text-red-700 font-bold" data-nome="${memberName}" data-data="${p.data}" title="Remover">&times;</button>
            </li>`;
        })
        .join("")}</ul>`;
    } catch (error) {
      historyListContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
    }
  }

  async function removePresence(nome, data) {
    showGlobalLoading(true, "Removendo presença...");
    try {
      const response = await fetch(`${BACKEND_URL}/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", nome, data }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      showMessage("Presença removida com sucesso!", "success");
      showPresenceHistory(nome);
      fetchMembers();
    } catch (error) {
      showMessage(`Erro ao remover: ${error.message}`, "error");
    } finally {
      showGlobalLoading(false);
    }
  }

  // --- Funções do Dashboard e Relatórios ---

  function toggleDashboardVisibility() {
    isDashboardOpen = !isDashboardOpen;
    if (!dashboardContainer) return;

    dashboardContainer.classList.toggle("max-h-0", !isDashboardOpen);
    dashboardContainer.classList.toggle("opacity-0", !isDashboardOpen);
    dashboardContainer.classList.toggle("overflow-hidden", !isDashboardOpen);
    // dashboardContainer.classList.toggle("max-h-screen", isDashboardOpen);

    // Atualiza os ícones e textos do botão
    if (
      dashboardOpenIcon &&
      dashboardCloseIcon &&
      dashboardOpenText &&
      dashboardCloseText
    ) {
      if (isDashboardOpen) {
        // Dashboard aberto - mostra ícone e texto de fechar
        dashboardOpenIcon.classList.add("hidden");
        dashboardOpenText.classList.add("hidden");
        dashboardCloseIcon.classList.remove("hidden");
        dashboardCloseText.classList.remove("hidden");
      } else {
        // Dashboard fechado - mostra ícone e texto de abrir
        dashboardOpenIcon.classList.remove("hidden");
        dashboardOpenText.classList.remove("hidden");
        dashboardCloseIcon.classList.add("hidden");
        dashboardCloseText.classList.add("hidden");
      }
    }

    if (isDashboardOpen) {
      fetchAndDisplaySummary();
    }
  }

  async function fetchAndDisplaySummary() {
    const totalAbsencesList = document.getElementById("totalAbsencesList");
    if (!totalCountsList || !totalAbsencesList) {
      console.error("Elementos de lista do dashboard não encontrados no HTML.");
      return;
    }

    showGlobalLoading(true, "Carregando resumo...");
    try {
      const queryParams = new URLSearchParams({
        periodo: filterPeriodoSelect.value,
        lider: filterLiderInput.value,
        gape: filterGapeInput.value,
        nome: filterNameInput.value, // ADICIONADO: filtro por nome
      });

      console.log("📊 Buscando resumo com filtros:", {
        periodo: filterPeriodoSelect.value,
        lider: filterLiderInput.value,
        gape: filterGapeInput.value,
        nome: filterNameInput.value, // ADICIONADO: debug do filtro nome
      });

      // --- CHAMADA ÚNICA E OTIMIZADA ---
      // Usamos a mesma rota eficiente do modal detalhado
      const response = await fetch(
        `${BACKEND_URL}/detailed-summary?${queryParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message || "Falha ao carregar resumo do painel."
        );
      }

      const summaryResponse = await response.json();
      if (!summaryResponse.success) {
        throw new Error(summaryResponse.message);
      }

      const summaryData = summaryResponse.data;
      const presencesDetails = summaryData.presences || {};
      const absencesDetails = summaryData.absences || {};

      console.log("📈 Dados recebidos:", {
        presencesCount: Object.keys(presencesDetails).length,
        absencesCount: Object.keys(absencesDetails).length,
        totalMeetingDays: summaryData.totalMeetingDays,
        presencesDetails: presencesDetails,
        absencesDetails: absencesDetails,
      });

      // 🔍 DEBUG DETALHADO - Verificação matemática no frontend
      console.log("🔢 Verificação matemática no frontend:");
      console.log(
        `📅 Total de reuniões encontradas no período: ${summaryData.totalMeetingDays}`
      );
      Object.keys(presencesDetails).forEach((nome) => {
        const presencas = presencesDetails[nome]?.totalPresencas || 0;
        const faltas = absencesDetails[nome]?.totalFaltas || 0;
        const total = presencas + faltas;
        console.log(
          `${nome}: ${presencas} presenças + ${faltas} faltas = ${total} reuniões`
        );

        if (total !== summaryData.totalMeetingDays) {
          console.warn(
            `⚠️ INCONSISTÊNCIA: ${nome} tem total ${total} mas esperado ${summaryData.totalMeetingDays}`
          );
        }
      });

      // Explicação clara da matemática
      console.log(
        "💡 EXPLICAÇÃO: Se houve",
        summaryData.totalMeetingDays,
        "reuniões no período:"
      );
      console.log(
        "   • Cada membro deveria ter: Presenças + Faltas =",
        summaryData.totalMeetingDays
      );
      console.log(
        "   • É normal que membros com poucas presenças tenham muitas faltas!"
      );

      // Processa os dados recebidos para os cards principais
      const totalPresences = Object.values(presencesDetails).reduce(
        (sum, data) => sum + (data.totalPresencas || 0),
        0
      );
      const totalAbsences = Object.values(absencesDetails).reduce(
        (sum, data) => sum + (data.totalFaltas || 0),
        0
      );

      console.log("🔢 Totais calculados:", {
        totalPresences,
        totalAbsences,
        filteredMembersCount: filteredMembers.length,
      });

      dashboardPresencasMes.textContent = totalPresences;
      dashboardFaltasMes.textContent = totalAbsences;

      // Adiciona informação sobre total de reuniões para maior clareza
      const dashboardInfo = document.getElementById("dashboardTotalReunions");
      if (dashboardInfo) {
        dashboardInfo.textContent = summaryData.totalMeetingDays || 0;
      }

      dashboardPeriodo.textContent =
        filterPeriodoSelect.options[filterPeriodoSelect.selectedIndex].text;
      dashboardLider.textContent =
        filterLiderInput.options[filterLiderInput.selectedIndex].text;
      dashboardGape.textContent =
        filterGapeInput.options[filterGapeInput.selectedIndex].text;

      // Atualiza a lista de Ranking de Presenças (em verde)
      const sortedPresences = Object.entries(presencesDetails).sort(
        ([, a], [, b]) => b.totalPresencas - a.totalPresencas
      );

      console.log(
        "🟢 Lista de presenças ordenada:",
        sortedPresences.map(
          ([nome, data]) => `${nome}: ${data.totalPresencas} presenças`
        )
      );

      totalCountsList.innerHTML =
        sortedPresences.length > 0
          ? sortedPresences
              .map(([name, data]) => {
                const percentage =
                  summaryData.totalMeetingDays > 0
                    ? Math.round(
                        (data.totalPresencas / summaryData.totalMeetingDays) *
                          100
                      )
                    : 0;
                return `<div class="text-sm text-green-300 py-1 border-b border-gray-600 last:border-b-0"><span class="font-semibold text-green-100">${name}:</span> ${data.totalPresencas} presenças <span class="text-green-200">(${percentage}%)</span></div>`;
              })
              .join("")
          : '<div class="text-sm text-gray-400 text-center">Nenhuma presença.</div>';

      // Atualiza a lista de Ranking de Faltas (em vermelho)
      const sortedAbsences = Object.entries(absencesDetails).sort(
        ([, a], [, b]) => b.totalFaltas - a.totalFaltas
      );

      console.log(
        "🔴 Lista de faltas ordenada:",
        sortedAbsences.map(
          ([nome, data]) => `${nome}: ${data.totalFaltas} faltas`
        )
      );

      totalAbsencesList.innerHTML =
        sortedAbsences.length > 0
          ? sortedAbsences
              .map(([name, data]) => {
                const percentage =
                  summaryData.totalMeetingDays > 0
                    ? Math.round(
                        (data.totalFaltas / summaryData.totalMeetingDays) * 100
                      )
                    : 0;
                return `<div class="text-sm text-red-300 py-1 border-b border-gray-600 last:border-b-0"><span class="font-semibold text-red-100">${name}:</span> ${data.totalFaltas} faltas <span class="text-red-200">(${percentage}%)</span></div>`;
              })
              .join("")
          : '<div class="text-sm text-gray-400 text-center">Nenhuma falta.</div>';
    } catch (error) {
      console.error("❌ Erro ao carregar resumo:", error);
      showMessage(`Erro ao carregar resumo: ${error.message}`, "error");
      dashboardPresencasMes.textContent = "-";
      dashboardFaltasMes.textContent = "-";
    } finally {
      showGlobalLoading(false);
    }
  }

  function showDetailedSummary() {
    if (!detailedSummaryModal) return;

    // Mostra indicador de carregamento flutuante imediatamente
    showFloatingLoader("Iniciando...");

    // Pequeno delay para garantir que o loader apareça antes de qualquer processamento
    setTimeout(() => {
      // Atualiza status
      updateFloatingLoaderText("Abrindo modal...");

      // Abre o modal imediatamente para dar feedback visual
      detailedSummaryModal.classList.remove("hidden");
      detailedSummaryModal.classList.add("flex");

      // Próxima etapa após o modal aparecer
      setTimeout(() => {
        updateFloatingLoaderText("Preparando campos...");

        // Popula os campos de forma assíncrona
        requestAnimationFrame(() => {
          populateSummaryMemberSelect();
          const today = new Date();
          summaryStartDateInput.value = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          )
            .toISOString()
            .split("T")[0];
          summaryEndDateInput.value = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          )
            .toISOString()
            .split("T")[0];

          // Próxima etapa
          setTimeout(() => {
            updateFloatingLoaderText("Verificando cache...");

            // Pré-carrega dados em background
            preloadSummaryData().then(() => {
              // Carrega os dados após verificar cache
              setTimeout(() => {
                updateDetailedSummaryChart();
              }, 50);
            });
          }, 100);
        });
      }, 100);
    }, 50);
  }

  // Função helper para atualizar texto do loader
  function updateFloatingLoaderText(message) {
    const loader = document.getElementById("floatingLoader");
    if (loader) {
      const textElement = loader.querySelector(".loader-text");
      if (textElement) textElement.textContent = message;
    }
  }

  // Funções auxiliares para estatísticas avançadas
  function calculateCurrentStreak(dates, isPresence = true) {
    if (!dates || dates.length === 0) return 0;

    // Ordena as datas (mais recente primeiro)
    const sortedDates = dates.sort(
      (a, b) =>
        new Date(b.split("/").reverse().join("-")) -
        new Date(a.split("/").reverse().join("-"))
    );

    let streak = 0;
    let lastDate = null;

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr.split("/").reverse().join("-"));

      if (lastDate === null) {
        streak = 1;
        lastDate = currentDate;
      } else {
        // Verifica se as datas são consecutivas (considerando apenas dias úteis)
        const daysDiff = Math.floor(
          (lastDate - currentDate) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 7) {
          // Considera sequência se for até uma semana
          streak++;
          lastDate = currentDate;
        } else {
          break;
        }
      }
    }

    return streak;
  }

  function calculateLongestStreak(dates, isPresence = true) {
    if (!dates || dates.length === 0) return 0;

    const sortedDates = dates.sort(
      (a, b) =>
        new Date(a.split("/").reverse().join("-")) -
        new Date(b.split("/").reverse().join("-"))
    );

    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr.split("/").reverse().join("-"));

      if (lastDate === null) {
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor(
          (currentDate - lastDate) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 7) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }

      lastDate = currentDate;
    }

    return Math.max(maxStreak, currentStreak);
  }

  function generateMonthlyChart(presencesDetails, absencesDetails, canvasId) {
    try {
      console.log("📊 Iniciando generateMonthlyChart com:", {
        presencesDetails,
        absencesDetails,
        canvasId,
      });

      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error("❌ Canvas não encontrado:", canvasId);
        return null;
      }

      // Processa dados por mês
      const monthlyData = {};
      const currentYear = new Date().getFullYear();

      // Inicializa todos os meses do ano
      for (let i = 1; i <= 12; i++) {
        const monthKey = `${currentYear}-${i.toString().padStart(2, "0")}`;
        monthlyData[monthKey] = { presences: 0, absences: 0 };
      }

      // Conta presenças por mês
      Object.values(presencesDetails).forEach((memberData) => {
        (memberData.presencas || []).forEach((dateStr) => {
          const [day, month, year] = dateStr.split("/");
          const monthKey = `${year}-${month}`;
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].presences++;
          }
        });
      });

      // Conta faltas por mês
      Object.values(absencesDetails).forEach((memberData) => {
        (memberData.faltas || []).forEach((dateStr) => {
          const [day, month, year] = dateStr.split("/");
          const monthKey = `${year}-${month}`;
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].absences++;
          }
        });
      });

      const months = Object.keys(monthlyData).sort();
      const monthNames = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];

      const labels = months.map((month) => {
        const monthNum = parseInt(month.split("-")[1]) - 1;
        return monthNames[monthNum];
      });

      const presenceData = months.map((month) => monthlyData[month].presences);
      const absenceData = months.map((month) => monthlyData[month].absences);

      const ctx = canvas.getContext("2d");
      return new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Presenças",
              data: presenceData,
              backgroundColor: "rgba(34, 197, 94, 0.8)",
              borderColor: "rgba(34, 197, 94, 1)",
              borderWidth: 1,
            },
            {
              label: "Faltas",
              data: absenceData,
              backgroundColor: "rgba(239, 68, 68, 0.8)",
              borderColor: "rgba(239, 68, 68, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          animation: {
            duration: 400,
          },
          plugins: {
            title: {
              display: true,
              text: "Evolução Mensal - Presenças vs Faltas",
            },
            legend: {
              display: true,
              position: "top",
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Quantidade",
              },
            },
            x: {
              title: {
                display: true,
                text: "Meses",
              },
            },
          },
        },
      });
    } catch (error) {
      console.error("❌ Erro em generateMonthlyChart:", error);
      return null;
    }
  }

  async function preloadSummaryData() {
    try {
      updateFloatingLoaderText("Montando parâmetros...");

      const queryParams = new URLSearchParams();
      queryParams.append("dataInicio", summaryStartDateInput.value);
      queryParams.append("dataFim", summaryEndDateInput.value);

      // Adiciona filtros ativos
      if (filterLiderInput.value)
        queryParams.append("lider", filterLiderInput.value);
      if (filterGapeInput.value)
        queryParams.append("gape", filterGapeInput.value);
      if (filterPeriodoSelect.value)
        queryParams.append("periodo", filterPeriodoSelect.value);

      const cacheKey = generateCacheKey(queryParams);

      updateFloatingLoaderText("Verificando dados em cache...");

      // Só faz pré-carregamento se não estiver em cache
      if (!getCachedData(cacheKey)) {
        updateFloatingLoaderText("Dados não encontrados em cache");
        await new Promise((resolve) => setTimeout(resolve, 200)); // Pequeno delay para mostrar a mensagem

        updateFloatingLoaderText("Solicitando dados do servidor...");
        const response = await fetch(
          `${BACKEND_URL}/detailed-summary?${queryParams.toString()}`
        );

        if (response.ok) {
          updateFloatingLoaderText("Recebendo dados do servidor...");
          const summaryResponse = await response.json();
          if (summaryResponse.success) {
            updateFloatingLoaderText("Armazenando dados em cache...");
            setCachedData(cacheKey, summaryResponse.data);
            await new Promise((resolve) => setTimeout(resolve, 100)); // Pequeno delay
            updateFloatingLoaderText("Dados preparados ✅");
          }
        }
      } else {
        updateFloatingLoaderText("Dados encontrados em cache ⚡");
        await new Promise((resolve) => setTimeout(resolve, 200)); // Mostra a mensagem por um tempo
      }
    } catch (error) {
      // Silencioso - o pré-carregamento é opcional
      updateFloatingLoaderText("Erro no pré-carregamento (continuando...)");
      console.log("Pré-carregamento falhou (ignorado):", error.message);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  function populateSummaryMemberSelect() {
    if (!summaryMemberSelect) return;
    summaryMemberSelect.innerHTML =
      '<option value="">Todos os Membros Filtrados</option>';
    const membersForSelect = [
      ...new Set(filteredMembers.map((m) => m.Nome).filter(Boolean)),
    ].sort();
    membersForSelect.forEach((name) => {
      summaryMemberSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
  }

  // dashboard.js - Substitua sua função por esta versão

  async function updateDetailedSummaryChart() {
    // Função helper para atualizar status do loader
    const updateLoaderStatus = (message) => {
      updateFloatingLoaderText(message);
    };

    try {
      updateLoaderStatus("Iniciando processamento...");

      // Mostra loading no modal também
      detailedSummaryText.innerHTML = `
        <div class="flex items-center justify-center py-8">
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Preparando dados...</span>
          </div>
        </div>
      `;

      // Etapa 1: Limpar gráficos antigos (não-bloqueante)
      updateLoaderStatus("Limpando gráficos anteriores...");
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          if (myChart) myChart.destroy();
          if (myBarChart) myBarChart.destroy();
          resolve();
        });
      });

      // Etapa 2: Limpar listas
      updateLoaderStatus("Limpando listas...");
      const presentDatesList = document.getElementById("presentDatesList");
      if (presentDatesList) presentDatesList.innerHTML = "";

      // Etapa 3: Preparar parâmetros de busca
      updateLoaderStatus("Preparando parâmetros...");
      await new Promise((resolve) => setTimeout(resolve, 50)); // Permite UI respirar

      const startDateStr = summaryStartDateInput.value;
      const endDateStr = summaryEndDateInput.value;
      const selectedMemberName = summaryMemberSelect.value;

      const queryParams = new URLSearchParams();
      if (startDateStr) queryParams.append("dataInicio", startDateStr);
      if (endDateStr) queryParams.append("dataFim", endDateStr);

      let title = "";
      let membersToAnalyze = [];

      // Etapa 4: Definir escopo da análise
      updateLoaderStatus("Definindo escopo da análise...");
      if (selectedMemberName) {
        title = `Estatísticas para ${selectedMemberName}`;
        membersToAnalyze = allMembersData.filter(
          (m) => m.Nome === selectedMemberName
        );
        queryParams.append("nome", selectedMemberName);
      } else {
        title = "Estatísticas do Grupo Filtrado";
        membersToAnalyze = filteredMembers;
        if (filterLiderInput.value)
          queryParams.append("lider", filterLiderInput.value);
        if (filterGapeInput.value)
          queryParams.append("gape", filterGapeInput.value);
        if (filterPeriodoSelect.value)
          queryParams.append("periodo", filterPeriodoSelect.value);
      }

      if (membersToAnalyze.length === 0) {
        detailedSummaryText.innerHTML = `<p class="text-lg font-semibold">Nenhum membro para analisar.</p>`;
        hideFloatingLoader();
        return;
      }

      // Etapa 5: Buscar dados (cache ou servidor)
      updateLoaderStatus("Verificando cache local...");
      const cacheKey = generateCacheKey(queryParams);
      let summaryData = getCachedData(cacheKey);

      if (!summaryData) {
        updateLoaderStatus("Solicitando dados do servidor...");
        const response = await fetch(
          `${BACKEND_URL}/detailed-summary?${queryParams.toString()}`
        );
        if (!response.ok) throw new Error("Falha ao buscar dados detalhados.");

        updateLoaderStatus("Processando resposta do servidor...");
        const summaryResponse = await response.json();
        if (!summaryResponse.success) throw new Error(summaryResponse.message);

        summaryData = summaryResponse.data;
        updateLoaderStatus("Salvando dados em cache...");
        setCachedData(cacheKey, summaryData);
      } else {
        updateLoaderStatus("Dados carregados do cache ⚡");
      }

      // Pequeno delay para mostrar o feedback
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Etapa 6: Processar estatísticas básicas
      updateLoaderStatus("Calculando estatísticas...");

      let chartRenderData = { presencesDetails: {}, absencesDetails: {} };
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          const presencesDetails = summaryData.presences || {};
          const absencesDetails = summaryData.absences || {};

          const totalPresences = Object.values(presencesDetails).reduce(
            (sum, data) => sum + data.totalPresencas,
            0
          );
          const totalAbsences = Object.values(absencesDetails).reduce(
            (sum, data) => sum + data.totalFaltas,
            0
          );

          let summaryHtml, chartData, chartLabels, chartTitle;

          if (selectedMemberName) {
            // === VISÃO INDIVIDUAL APRIMORADA ===
            const totalMeetingDays =
              summaryData.totalMeetingDays || totalPresences + totalAbsences;
            const presenceRate =
              totalMeetingDays > 0
                ? ((totalPresences / totalMeetingDays) * 100).toFixed(1)
                : 0;
            const absenceRate =
              totalMeetingDays > 0
                ? ((totalAbsences / totalMeetingDays) * 100).toFixed(1)
                : 0;

            // Classificação de assiduidade
            let attendanceLevel = "";
            let attendanceColor = "";
            if (presenceRate >= 90) {
              attendanceLevel = "Excelente";
              attendanceColor = "text-green-600";
            } else if (presenceRate >= 75) {
              attendanceLevel = "Boa";
              attendanceColor = "text-blue-600";
            } else if (presenceRate >= 60) {
              attendanceLevel = "Regular";
              attendanceColor = "text-yellow-600";
            } else {
              attendanceLevel = "Precisa Melhorar";
              attendanceColor = "text-red-600";
            }

            summaryHtml = `
              <h3 class="text-lg font-semibold text-gray-800 mb-4">${title}</h3>
              
              <!-- Métricas Principais -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-blue-600">${totalMeetingDays}</div>
                  <div class="text-sm text-gray-600">Total Reuniões</div>
                </div>
                <div class="bg-green-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-green-600">${totalPresences}</div>
                  <div class="text-sm text-gray-600">Presenças</div>
                </div>
                <div class="bg-red-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-red-600">${totalAbsences}</div>
                  <div class="text-sm text-gray-600">Faltas</div>
                </div>
                <div class="bg-purple-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold ${attendanceColor}">${presenceRate}%</div>
                  <div class="text-sm text-gray-600">Taxa Presença</div>
                </div>
              </div>

              <!-- Análise de Assiduidade -->
              <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 class="font-semibold text-gray-800 mb-2">📊 Análise de Assiduidade</h4>
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-gray-600">Nível de Frequência:</span>
                  <span class="font-bold ${attendanceColor}">${attendanceLevel}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div class="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" 
                       style="width: ${presenceRate}%"></div>
                </div>
                <div class="text-sm text-gray-600">
                  ${
                    presenceRate >= 90
                      ? "🏆 Parabéns! Assiduidade exemplar."
                      : presenceRate >= 75
                      ? "👍 Boa frequência, continue assim!"
                      : presenceRate >= 60
                      ? "⚠️ Frequência regular, pode melhorar."
                      : "❌ Frequência baixa, precisa de atenção."
                  }
                </div>
              </div>

              <!-- Estatísticas Detalhadas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded-lg">
                  <h5 class="font-semibold text-green-800 mb-2">✅ Estatísticas de Presença</h5>
                  <ul class="text-sm space-y-1">
                    <li>• Presenças: <strong>${totalPresences}</strong> (${presenceRate}%)</li>
                    <li>• Sequência atual: ${calculateCurrentStreak(
                      presencesDetails[selectedMemberName]?.presencas || [],
                      true
                    )}</li>
                    <li>• Maior sequência: ${calculateLongestStreak(
                      presencesDetails[selectedMemberName]?.presencas || [],
                      true
                    )}</li>
                  </ul>
                </div>
                <div class="bg-red-50 p-3 rounded-lg">
                  <h5 class="font-semibold text-red-800 mb-2">❌ Estatísticas de Faltas</h5>
                  <ul class="text-sm space-y-1">
                    <li>• Faltas: <strong>${totalAbsences}</strong> (${absenceRate}%)</li>
                    <li>• Faltas consecutivas: ${calculateCurrentStreak(
                      absencesDetails[selectedMemberName]?.faltas || [],
                      false
                    )}</li>
                    <li>• Maior sequência faltas: ${calculateLongestStreak(
                      absencesDetails[selectedMemberName]?.faltas || [],
                      false
                    )}</li>
                  </ul>
                </div>
              </div>`;

            chartData = [totalPresences, totalAbsences];
            chartLabels = ["Presenças", "Faltas"];
            chartTitle = "Proporção Presenças vs Faltas";
          } else {
            // === VISÃO DE GRUPO APRIMORADA ===
            const membersWithPresence = Object.keys(presencesDetails).length;
            const membersWithoutPresence =
              membersToAnalyze.length - membersWithPresence;
            const avgPresenceRate =
              membersToAnalyze.length > 0
                ? (
                    (totalPresences /
                      (membersToAnalyze.length *
                        summaryData.totalMeetingDays)) *
                    100
                  ).toFixed(1)
                : 0;

            // Ranking dos Top 5 mais presentes
            const topMembers = Object.entries(presencesDetails)
              .sort(([, a], [, b]) => b.totalPresencas - a.totalPresencas)
              .slice(0, 5);

            // Membros com mais faltas
            const topAbsentees = Object.entries(absencesDetails)
              .sort(([, a], [, b]) => b.totalFaltas - a.totalFaltas)
              .slice(0, 5);

            summaryHtml = `
              <h3 class="text-lg font-semibold text-gray-800 mb-4">${title}</h3>
              
              <!-- Métricas Principais do Grupo -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-blue-600">${
                    membersToAnalyze.length
                  }</div>
                  <div class="text-sm text-gray-600">Total Membros</div>
                </div>
                <div class="bg-green-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-green-600">${membersWithPresence}</div>
                  <div class="text-sm text-gray-600">Com Presenças</div>
                </div>
                <div class="bg-red-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-red-600">${membersWithoutPresence}</div>
                  <div class="text-sm text-gray-600">Sem Presenças</div>
                </div>
                <div class="bg-purple-50 p-3 rounded-lg text-center">
                  <div class="text-2xl font-bold text-purple-600">${avgPresenceRate}%</div>
                  <div class="text-sm text-gray-600">Média Grupo</div>
                </div>
              </div>

              <!-- Rankings -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <!-- Top Presenças -->
                <div class="bg-green-50 p-4 rounded-lg">
                  <h4 class="font-semibold text-green-800 mb-3 flex items-center">
                    🏆 Top 5 Mais Presentes
                  </h4>
                  <div class="space-y-2">
                    ${topMembers
                      .map(([name, data], index) => {
                        const rate =
                          summaryData.totalMeetingDays > 0
                            ? (
                                (data.totalPresencas /
                                  summaryData.totalMeetingDays) *
                                100
                              ).toFixed(1)
                            : 0;
                        const medal =
                          index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : `${index + 1}º`;
                        return `
                        <div class="flex justify-between items-center bg-white p-2 rounded">
                          <span class="font-medium">${medal} ${name}</span>
                          <span class="text-green-600 font-bold">${data.totalPresencas} (${rate}%)</span>
                        </div>`;
                      })
                      .join("")}
                  </div>
                </div>

                <!-- Top Faltas -->
                <div class="bg-red-50 p-4 rounded-lg">
                  <h4 class="font-semibold text-red-800 mb-3 flex items-center">
                    ⚠️ Top 5 Mais Faltas
                  </h4>
                  <div class="space-y-2">
                    ${topAbsentees
                      .map(([name, data], index) => {
                        const rate =
                          summaryData.totalMeetingDays > 0
                            ? (
                                (data.totalFaltas /
                                  summaryData.totalMeetingDays) *
                                100
                              ).toFixed(1)
                            : 0;
                        return `
                        <div class="flex justify-between items-center bg-white p-2 rounded">
                          <span class="font-medium">${index + 1}º ${name}</span>
                          <span class="text-red-600 font-bold">${
                            data.totalFaltas
                          } (${rate}%)</span>
                        </div>`;
                      })
                      .join("")}
                  </div>
                </div>
              </div>

              <!-- Estatísticas do Grupo -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-3">📈 Estatísticas Gerais do Grupo</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span class="text-gray-600">Taxa de Presença Média:</span>
                    <span class="font-bold text-blue-600 ml-2">${avgPresenceRate}%</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Total de Presenças:</span>
                    <span class="font-bold text-green-600 ml-2">${totalPresences}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Total de Faltas:</span>
                    <span class="font-bold text-red-600 ml-2">${totalAbsences}</span>
                  </div>
                </div>
              </div>`;

            chartData = [membersWithPresence, membersWithoutPresence];
            chartLabels = ["Membros com Presença", "Membros Sem Presença"];
            chartTitle = "Proporção de Membros com/sem Presença";
          }

          chartRenderData = {
            chartData,
            chartLabels,
            chartTitle,
            presencesDetails,
            absencesDetails,
            selectedMemberName,
          };

          // Mostra os dados básicos imediatamente
          detailedSummaryText.innerHTML = summaryHtml;

          // Adiciona insights imediatamente após definir os dados
          setTimeout(() => {
            console.log("🔍 Adicionando insights com dados:", {
              chartRenderData,
              selectedMemberName,
            });
            addInsightsSection(
              chartRenderData,
              selectedMemberName,
              summaryData
            );
          }, 100);

          resolve();
        });
      });

      // Etapa 7: Processar listas detalhadas
      updateLoaderStatus("Montando listas detalhadas...");
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          // Desestruturação segura dos dados para listas
          const presencesDetails = chartRenderData?.presencesDetails || {};
          const absencesDetails = chartRenderData?.absencesDetails || {};
          const selectedMemberName = chartRenderData?.selectedMemberName || "";

          console.log("📋 Montando listas com dados:", {
            presencesDetails,
            absencesDetails,
            selectedMemberName,
          });

          let presencesHtml = Object.entries(presencesDetails)
            .map(
              ([name, data]) =>
                (selectedMemberName
                  ? ""
                  : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) +
                (data.presencas || [])
                  .map(
                    (date) => `<li class="text-sm text-gray-800">${date}</li>`
                  )
                  .join("")
            )
            .join("");
          let absencesHtml = Object.entries(absencesDetails)
            .map(
              ([name, data]) =>
                (selectedMemberName
                  ? ""
                  : `<h5 class="font-semibold mt-2 text-gray-700">${name}</h5>`) +
                (data.faltas || [])
                  .map(
                    (date) => `<li class="text-sm text-gray-800">${date}</li>`
                  )
                  .join("")
            )
            .join("");

          if (presentDatesList)
            presentDatesList.innerHTML =
              presencesHtml || "<li>Nenhuma presença no período.</li>";
          // Removido: Lista de faltas não é mais exibida

          resolve();
        });
      });

      // Etapa 8: Renderizar gráficos
      updateLoaderStatus("Criando gráficos...");
      await new Promise((resolve) => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            // Desestruturação segura dos dados do gráfico
            const chartData = chartRenderData?.chartData || [];
            const chartLabels = chartRenderData?.chartLabels || [];
            const chartTitle = chartRenderData?.chartTitle || "Gráfico";
            const presencesDetails = chartRenderData?.presencesDetails || {};
            const absencesDetails = chartRenderData?.absencesDetails || {};

            console.log("📊 Dados para gráfico:", {
              chartData,
              chartLabels,
              chartTitle,
            });

            try {
              // Gráfico de Pizza Principal
              const pieCtx = summaryChartCanvas.getContext("2d");
              myChart = new Chart(pieCtx, {
                type: "pie",
                data: {
                  labels: chartLabels,
                  datasets: [
                    {
                      data: chartData,
                      backgroundColor: [
                        "rgba(34, 197, 94, 0.8)",
                        "rgba(239, 68, 68, 0.8)",
                      ],
                      borderColor: [
                        "rgba(34, 197, 94, 1)",
                        "rgba(239, 68, 68, 1)",
                      ],
                      borderWidth: 2,
                    },
                  ],
                },
                options: {
                  responsive: true,
                  animation: {
                    duration: 400,
                    easing: "easeOutQuart",
                  },
                  plugins: {
                    title: { display: true, text: chartTitle },
                    datalabels: {
                      formatter: (value, context) => {
                        const total =
                          context.chart.data.datasets[0].data.reduce(
                            (a, b) => a + b,
                            0
                          );
                        if (total === 0 || value === 0) return "";
                        return ((value / total) * 100).toFixed(1) + "%";
                      },
                      color: "#fff",
                      font: { weight: "bold", size: 14 },
                    },
                    legend: {
                      position: "bottom",
                      labels: {
                        padding: 20,
                        usePointStyle: true,
                      },
                    },
                  },
                },
                plugins: [ChartDataLabels],
              });

              console.log("✅ Gráfico de pizza criado com sucesso!");
            } catch (error) {
              console.error("❌ Erro ao criar gráfico de pizza:", error);
            }

            resolve();
          });
        }, 100);
      });

      // Etapa 9: Renderizar gráfico de barras mensal (se tiver dados suficientes)
      if (
        Object.keys(chartRenderData?.presencesDetails || {}).length > 0 ||
        Object.keys(chartRenderData?.absencesDetails || {}).length > 0
      ) {
        updateLoaderStatus("Criando gráfico mensal...");
        await new Promise((resolve) => {
          setTimeout(() => {
            requestAnimationFrame(() => {
              try {
                myBarChart = generateMonthlyChart(
                  chartRenderData?.presencesDetails || {},
                  chartRenderData?.absencesDetails || {},
                  "summaryBarChart"
                );
                console.log("✅ Gráfico mensal criado com sucesso!");
              } catch (error) {
                console.error("❌ Erro ao criar gráfico mensal:", error);
              }
              resolve();
            });
          }, 200);
        });
      }

      // Etapa final: Concluído
      updateLoaderStatus("Concluído! 🎉");
      setTimeout(() => {
        hideFloatingLoader();
      }, 800);
    } catch (error) {
      console.error("❌ Erro completo em updateDetailedSummaryChart:", error);
      console.error("❌ Stack trace:", error.stack);
      updateLoaderStatus("Erro encontrado!");
      setTimeout(() => {
        hideFloatingLoader();
      }, 1000);
      showMessage(`Erro ao atualizar resumo: ${error.message}`, "error");
      detailedSummaryText.innerHTML = `<p class="text-red-500">Falha ao carregar dados: ${error.message}</p>`;
    }
  }

  async function handleDownloadPdf() {
    try {
      console.log("📄 Iniciando geração de PDF...");

      // Mostra loading
      showGlobalLoading(true, "Gerando PDF...");

      const container = document.getElementById("detailedSummaryContent");
      if (!container) {
        throw new Error("Container do resumo detalhado não encontrado");
      }

      // Captura as estatísticas atuais do resumo detalhado
      const getStatisticsFromSummary = () => {
        console.log("🔍 Iniciando captura de estatísticas do resumo...");
        console.log(
          "📄 HTML do container:",
          container.innerHTML.substring(0, 500) + "..."
        );

        let totalReunions = 0;
        let totalPresences = 0;
        let totalAbsences = 0;
        let presenceRate = 0;
        let membersCount = 0;

        // Abordagem mais direta: procurar pelo texto específico no HTML
        const htmlContent = container.innerHTML;
        const textContent = container.textContent;

        console.log(
          "📝 Texto do container:",
          textContent.substring(0, 300) + "..."
        );

        // Busca por padrões específicos no texto
        // Para presenças: "1 presenças", "5 presenças", etc.
        const presencePatterns = [
          /(\d+)\s+presenças?/gi,
          /presenças?[:\s]+(\d+)/gi,
          /Total[:\s]+(\d+)[:\s]+presenças?/gi,
          /<span[^>]*text-green-600[^>]*>(\d+)<\/span>/gi,
        ];

        for (const pattern of presencePatterns) {
          const matches = [...textContent.matchAll(pattern)];
          if (matches.length > 0) {
            // Pega o menor valor (mais provável de ser o correto)
            const values = matches
              .map((m) => parseInt(m[1]))
              .filter((v) => v >= 0);
            if (values.length > 0) {
              totalPresences = Math.min(...values);
              console.log(
                `✅ Presenças encontradas (padrão ${pattern}):`,
                values,
                "→ Selecionado:",
                totalPresences
              );
              break;
            }
          }
        }

        // Para faltas
        const absencePatterns = [
          /(\d+)\s+faltas?/gi,
          /faltas?[:\s]+(\d+)/gi,
          /Total[:\s]+(\d+)[:\s]+faltas?/gi,
          /<span[^>]*text-red-600[^>]*>(\d+)<\/span>/gi,
        ];

        for (const pattern of absencePatterns) {
          const matches = [...textContent.matchAll(pattern)];
          if (matches.length > 0) {
            const values = matches
              .map((m) => parseInt(m[1]))
              .filter((v) => v >= 0);
            if (values.length > 0) {
              totalAbsences = Math.min(...values);
              console.log(
                `✅ Faltas encontradas (padrão ${pattern}):`,
                values,
                "→ Selecionado:",
                totalAbsences
              );
              break;
            }
          }
        }

        // Para reuniões
        const meetingPatterns = [
          /(\d+)\s+reuniões?/gi,
          /Total\s+Reuniões[:\s]+(\d+)/gi,
          /reuniões?[:\s]+(\d+)/gi,
        ];

        for (const pattern of meetingPatterns) {
          const matches = [...textContent.matchAll(pattern)];
          if (matches.length > 0) {
            const values = matches
              .map((m) => parseInt(m[1]))
              .filter((v) => v > 0);
            if (values.length > 0) {
              totalReunions = Math.max(...values);
              console.log(
                `✅ Reuniões encontradas (padrão ${pattern}):`,
                values,
                "→ Selecionado:",
                totalReunions
              );
              break;
            }
          }
        }

        // Para membros
        const memberPatterns = [
          /(\d+)\s+membros?/gi,
          /Total\s+Membros[:\s]+(\d+)/gi,
          /membros?[:\s]+(\d+)/gi,
        ];

        for (const pattern of memberPatterns) {
          const matches = [...textContent.matchAll(pattern)];
          if (matches.length > 0) {
            const values = matches
              .map((m) => parseInt(m[1]))
              .filter((v) => v > 0);
            if (values.length > 0) {
              membersCount = Math.max(...values);
              console.log(
                `✅ Membros encontrados (padrão ${pattern}):`,
                values,
                "→ Selecionado:",
                membersCount
              );
              break;
            }
          }
        }

        // Para taxa de presença
        const ratePatterns = [
          /(\d+(?:\.\d+)?)%/g,
          /taxa[^:]*:\s*(\d+(?:\.\d+)?)%/gi,
        ];

        for (const pattern of ratePatterns) {
          const matches = [...textContent.matchAll(pattern)];
          if (matches.length > 0) {
            const values = matches
              .map((m) => parseFloat(m[1]))
              .filter((v) => v >= 0 && v <= 100);
            if (values.length > 0) {
              presenceRate = values[0]; // Pega o primeiro percentual encontrado
              console.log(
                `✅ Taxa encontrada (padrão ${pattern}):`,
                values,
                "→ Selecionado:",
                presenceRate
              );
              break;
            }
          }
        }

        // Se ainda não encontrou dados, tenta buscar nas métricas visuais
        if (totalPresences === 0 && totalAbsences === 0) {
          console.log("🔍 Buscando nas métricas visuais...");

          const metricCards = container.querySelectorAll(
            ".text-2xl, .font-bold"
          );
          metricCards.forEach((card, index) => {
            const value = parseInt(card.textContent) || 0;
            const parentText =
              card.parentElement?.textContent?.toLowerCase() || "";

            console.log(
              `� Card ${index}: valor=${value}, contexto="${parentText}"`
            );

            if (value > 0 && value < 1000) {
              // Filtro para valores razoáveis
              if (parentText.includes("presença") && totalPresences === 0) {
                totalPresences = value;
                console.log(`✅ Presenças da métrica visual: ${value}`);
              } else if (parentText.includes("falta") && totalAbsences === 0) {
                totalAbsences = value;
                console.log(`✅ Faltas da métrica visual: ${value}`);
              } else if (
                parentText.includes("reunião") &&
                totalReunions === 0
              ) {
                totalReunions = value;
                console.log(`✅ Reuniões da métrica visual: ${value}`);
              }
            }
          });
        }

        const result = {
          totalReunions,
          totalPresences,
          totalAbsences,
          presenceRate,
          membersCount,
        };

        console.log("📊 Resultado final da captura:", result);
        return result;
      };

      const statistics = getStatisticsFromSummary();

      // Temporarily hide the download button during PDF generation
      const downloadBtn = document.getElementById("downloadPdfBtn");
      const originalDisplay = downloadBtn ? downloadBtn.style.display : "";
      if (downloadBtn) downloadBtn.style.display = "none";

      console.log("📸 Capturando conteúdo...");

      // Configurações otimizadas para captura mais compacta
      const canvas = await html2canvas(container, {
        scale: 1.5, // Reduzido de 2 para 1.5 para economizar espaço
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        height: container.scrollHeight, // Captura altura real do conteúdo
        width: container.scrollWidth, // Captura largura real do conteúdo
        scrollX: 0,
        scrollY: 0,
      });

      // Restore the download button
      if (downloadBtn) downloadBtn.style.display = originalDisplay;

      console.log("📄 Criando documento PDF...");

      // Usa a versão global do jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");

      // Obter informações dos filtros atuais
      const grupoInfo =
        filterGapeInput.options[filterGapeInput.selectedIndex]?.text ||
        "Todos os Grupos";
      const liderInfo =
        filterLiderInput.options[filterLiderInput.selectedIndex]?.text ||
        "Todos os Líderes";
      const periodoInfo =
        filterPeriodoSelect.options[filterPeriodoSelect.selectedIndex]?.text ||
        "Todos os Períodos";
      const dataInicio = summaryStartDateInput?.value || "Não especificado";
      const dataFim = summaryEndDateInput?.value || "Não especificado";
      const membroSelecionado =
        summaryMemberSelect?.options[summaryMemberSelect.selectedIndex]?.text ||
        "Todos os Membros";

      // Configurações responsivas e otimizadas para layout compacto
      const isMobile = window.innerWidth < 768;
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = isMobile ? 8 : 10; // Margem ainda menor para mobile
      const contentWidth = pageWidth - margin * 2;
      let currentY = margin;

      // Função para adicionar nova página se necessário
      const checkPageBreak = (neededHeight) => {
        if (currentY + neededHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // CABEÇALHO DO RELATÓRIO - Compacto
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(
        "RELATÓRIO DE PRESENÇAS - AD BRAS - VILA SOLANGE",
        margin,
        currentY
      );
      currentY += 3.5;

      doc.setFontSize(6);
      doc.setFont(undefined, "normal");
      const dataGeracao = new Date();
      doc.text(
        `Gerado em: ${dataGeracao.toLocaleDateString(
          "pt-BR"
        )} às ${dataGeracao.toLocaleTimeString("pt-BR")}`,
        margin,
        currentY
      );
      currentY += 4;

      // INFORMAÇÕES DO FILTRO - Compacto
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("INFORMAÇÕES DO RELATÓRIO", margin, currentY);
      currentY += 2.5;

      doc.setFontSize(6);
      doc.setFont(undefined, "normal");

      const infoLines = [
        `Grupo (GAPE): ${grupoInfo}`,
        `Líder: ${liderInfo}`,
        `Período: ${periodoInfo}`,
        `Data Início: ${dataInicio}`,
        `Data Fim: ${dataFim}`,
        `Membro Selecionado: ${membroSelecionado}`,
      ];

      infoLines.forEach((line) => {
        checkPageBreak(5);
        doc.text(line, margin, currentY);
        currentY += 2;
      });

      currentY += 3;

      // ESTATÍSTICAS GERAIS - Layout compacto
      checkPageBreak(35);
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("ESTATÍSTICAS GERAIS", margin, currentY);
      currentY += 2.5;

      doc.setFontSize(6);
      doc.setFont(undefined, "normal");

      console.log("📊 Estatísticas capturadas:", statistics);

      const statsLines = [];

      if (statistics.totalReunions > 0) {
        statsLines.push(
          `Total de Reuniões no Período: ${statistics.totalReunions}`
        );
      }
      if (statistics.membersCount > 0) {
        statsLines.push(
          `Total de Membros Analisados: ${statistics.membersCount}`
        );
      }
      if (statistics.totalPresences > 0) {
        statsLines.push(
          `Total de Presenças Registradas: ${statistics.totalPresences}`
        );
      }
      if (statistics.totalAbsences > 0) {
        statsLines.push(
          `Total de Faltas Registradas: ${statistics.totalAbsences}`
        );
      }
      if (statistics.presenceRate > 0) {
        statsLines.push(`Taxa de Presença Média: ${statistics.presenceRate}%`);
      }

      // Calcula estatísticas adicionais se possível
      if (statistics.totalPresences > 0 && statistics.totalAbsences > 0) {
        const totalEvents =
          statistics.totalPresences + statistics.totalAbsences;
        const calculatedPresenceRate = (
          (statistics.totalPresences / totalEvents) *
          100
        ).toFixed(1);
        if (!statistics.presenceRate || statistics.presenceRate === 0) {
          statsLines.push(
            `Taxa de Presença Calculada: ${calculatedPresenceRate}%`
          );
        }
      }

      if (statsLines.length === 0) {
        statsLines.push(
          "Estatísticas não disponíveis para o período/filtro selecionado"
        );
      }

      statsLines.forEach((line) => {
        checkPageBreak(5);
        doc.text(line, margin, currentY);
        currentY += 2.5;
      });

      currentY += 3;

      // CONTEÚDO DETALHADO - Seção mais compacta
      checkPageBreak(50);
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("DETALHAMENTO COMPLETO", margin, currentY);
      currentY += 3;

      // Otimização de dimensões da imagem para máximo aproveitamento
      const imgData = canvas.toDataURL("image/png");
      const maxImgWidth = contentWidth;
      const maxImgHeight = pageHeight - currentY - margin - 10; // Reserva espaço mínimo para rodapé

      // Calcula dimensões mantendo proporção
      let imgWidth = maxImgWidth;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Se a imagem for muito alta, redimensiona baseado na altura disponível
      if (imgHeight > maxImgHeight) {
        imgHeight = maxImgHeight;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      // Verifica se a imagem cabe na página atual
      if (currentY + imgHeight > pageHeight - margin - 8) {
        doc.addPage();
        currentY = margin;
        // Recalcula para nova página
        const newMaxHeight = pageHeight - currentY - margin - 8;
        if (imgHeight > newMaxHeight) {
          imgHeight = newMaxHeight;
          imgWidth = (canvas.width * imgHeight) / canvas.height;
        }
      }

      // Renderização otimizada da imagem
      let heightLeft = imgHeight;
      let position = currentY;

      // Adiciona a primeira parte da imagem
      doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position - margin - 8;

      // Adiciona páginas extras apenas se necessário e com aproveitamento máximo
      while (heightLeft > 0) {
        doc.addPage();
        position = heightLeft - imgHeight + margin;

        // Calcula altura disponível na nova página
        const availableHeight = pageHeight - margin - 8;
        const renderHeight = Math.min(imgHeight, availableHeight);

        doc.addImage(imgData, "PNG", margin, position, imgWidth, renderHeight);
        heightLeft -= availableHeight;
      }

      // RODAPÉ COMPACTO EM TODAS AS PÁGINAS
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setFont(undefined, "normal");
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin - 18,
          pageHeight - 5
        );
        doc.text(
          "Sistema de Controle de Presenças BRAS",
          margin,
          pageHeight - 5
        );
      }

      // Gera o nome do arquivo com informações relevantes
      const now = new Date();
      const timestamp = `${now.getFullYear()}_${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}_${now.getDate().toString().padStart(2, "0")}_${now
        .getHours()
        .toString()
        .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
      const grupoFileName = grupoInfo
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 10);
      const fileName = `relatorio_${grupoFileName}_${timestamp}.pdf`;

      console.log("💾 Salvando PDF:", fileName);

      // Salva o arquivo
      doc.save(fileName);

      showMessage("✅ PDF gerado com sucesso!", "success");
      console.log("✅ PDF gerado e baixado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao gerar PDF:", error);
      showMessage(`Erro ao gerar PDF: ${error.message}`, "error");
    } finally {
      showGlobalLoading(false);
    }
  }

  function fillSelectOptions() {
    const lideres = [
      ...new Set(allMembersData.map((m) => m.Lider).filter(Boolean)),
    ].sort();
    const gapes = [
      ...new Set(allMembersData.map((m) => m.GAPE).filter(Boolean)),
    ].sort();

    if (filterLiderInput) {
      filterLiderInput.innerHTML =
        '<option value="">Todos</option>' +
        lideres.map((l) => `<option value="${l}">${l}</option>`).join("");
    }
    if (filterGapeInput) {
      filterGapeInput.innerHTML =
        '<option value="">Todos</option>' +
        gapes.map((g) => `<option value="${g}">${g}</option>`).join("");
    }
  }

  // --- Funções de Autenticação e Visão de Líder ---

  function displayLoggedInLeaderName() {
    const leaderName = localStorage.getItem("loggedInLeaderName");
    if (loggedInLeaderNameElement) {
      loggedInLeaderNameElement.innerHTML = leaderName
        ? `Logado como: <span class="text-blue-600 font-bold">${leaderName}</span>`
        : `Logado como: Não identificado`;
    }
  }

  function setupLeaderView() {
    const leaderName = localStorage.getItem("loggedInLeaderName");
    if (leaderName && leaderName !== "admin") {
      const loggedInMember = allMembersData.find(
        (member) =>
          (member.Nome || "").toLowerCase().trim() ===
          leaderName.toLowerCase().trim()
      );
      if (loggedInMember) {
        if (filterLiderInput) filterLiderInput.value = loggedInMember.Lider;
        if (filterGapeInput) filterGapeInput.value = loggedInMember.GAPE;
      }
      if (filterLiderInput) filterLiderInput.disabled = true;
      if (filterGapeInput) filterGapeInput.disabled = true;
      applyFilters();
      if (isDashboardOpen) fetchAndDisplaySummary();
    }
  }

  // --- Funcionalidade de Autocomplete para Nome ---
  let nameAutocompleteContainer = null;

  function initializeNameAutocomplete() {
    nameAutocompleteContainer = document.getElementById("nameAutocomplete");
    if (!filterNameInput || !nameAutocompleteContainer) return;

    // Event listener para input do campo nome
    filterNameInput.addEventListener("input", handleNameInput);

    // Event listener para detectar cliques fora do autocomplete
    document.addEventListener("click", (e) => {
      if (
        !filterNameInput.contains(e.target) &&
        !nameAutocompleteContainer.contains(e.target)
      ) {
        hideNameAutocomplete();
      }
    });

    // Event listener para navegação com teclado
    filterNameInput.addEventListener("keydown", handleNameKeyNavigation);
  }

  function handleNameInput(event) {
    const query = event.target.value.toLowerCase().trim();

    if (query.length === 0) {
      hideNameAutocomplete();
      handleNameClear(query);
      return;
    }

    if (query.length < 2) {
      // Só mostra sugestões com pelo menos 2 caracteres
      hideNameAutocomplete();
      return;
    }

    // Filtra nomes que contenham a query
    const matchingNames = allMembersData
      .map((member) => member.Nome)
      .filter((name) => name && name.toLowerCase().includes(query))
      .sort()
      .slice(0, 8); // Limita a 8 sugestões

    if (matchingNames.length === 0) {
      showNoResultsMessage(query);
      return;
    }

    showNameSuggestions(matchingNames, query);
  }

  function showNameSuggestions(names, query) {
    if (!nameAutocompleteContainer) return;

    nameAutocompleteContainer.innerHTML = "";

    names.forEach((name, index) => {
      // Busca dados do membro para mostrar informações extras
      const memberData = allMembersData.find(
        (member) =>
          member.Nome && member.Nome.toLowerCase() === name.toLowerCase()
      );

      const suggestionItem = document.createElement("div");
      suggestionItem.className =
        "px-3 py-2 cursor-pointer hover:bg-blue-100 transition-colors duration-150 autocomplete-item border-l-4 border-transparent hover:border-blue-400";
      suggestionItem.setAttribute("data-index", index);

      // Destaca a parte que corresponde à busca
      const highlightedName = highlightMatch(name, query);

      // Adiciona informações extras do membro se disponíveis
      let extraInfo = "";
      if (memberData) {
        const periodo = memberData.Periodo
          ? `<span class="text-xs text-gray-500">• ${memberData.Periodo}</span>`
          : "";
        const lider = memberData.Lider
          ? `<span class="text-xs text-gray-500">• ${memberData.Lider}</span>`
          : "";
        const gape = memberData.GAPE
          ? `<span class="text-xs text-gray-500">• ${memberData.GAPE}</span>`
          : "";

        if (periodo || lider || gape) {
          extraInfo = `<div class="mt-1 flex gap-2 flex-wrap">${periodo}${lider}${gape}</div>`;
        }
      }

      suggestionItem.innerHTML = `
      <div class="font-medium">${highlightedName}</div>
      ${extraInfo}
    `;

      // Event listener para clique na sugestão
      suggestionItem.addEventListener("click", () => {
        selectNameSuggestion(name);
      });

      nameAutocompleteContainer.appendChild(suggestionItem);
    });

    nameAutocompleteContainer.classList.remove("hidden");
  }

  function highlightMatch(text, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    return text.replace(
      regex,
      '<span class="bg-yellow-200 font-semibold">$1</span>'
    );
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function selectNameSuggestion(selectedName) {
    if (filterNameInput) {
      filterNameInput.value = selectedName;
      hideNameAutocomplete();

      // Busca os dados do membro selecionado
      const selectedMember = allMembersData.find(
        (member) =>
          member.Nome &&
          member.Nome.toLowerCase() === selectedName.toLowerCase()
      );

      if (selectedMember) {
        // Preenche automaticamente os outros filtros com os dados do membro
        if (filterPeriodoSelect && selectedMember.Periodo) {
          filterPeriodoSelect.value = selectedMember.Periodo;
        }

        if (filterLiderInput && selectedMember.Lider) {
          filterLiderInput.value = selectedMember.Lider;
        }

        if (filterGapeInput && selectedMember.GAPE) {
          filterGapeInput.value = selectedMember.GAPE;
        }

        // Destaca visualmente os campos sincronizados
        setTimeout(() => {
          highlightSyncedFilters();
        }, 100);

        // Aplica filtros automaticamente após seleção
        applyFilters();

        // Atualiza o dashboard se estiver aberto
        if (isDashboardOpen) {
          fetchAndDisplaySummary();
        }

        // Mostra feedback visual com detalhes do membro
        showMessage(
          `✅ Filtros sincronizados para: ${selectedName} - ${
            selectedMember.Periodo || "N/A"
          } - ${selectedMember.Lider || "N/A"}`,
          "success"
        );
      } else {
        // Caso não encontre o membro, aplica apenas o filtro de nome
        applyFilters();
        showMessage(`✅ Filtro aplicado para: ${selectedName}`, "success");
      }
    }
  }

  function hideNameAutocomplete() {
    if (nameAutocompleteContainer) {
      nameAutocompleteContainer.classList.add("hidden");
    }
  }

  function handleNameKeyNavigation(event) {
    if (
      !nameAutocompleteContainer ||
      nameAutocompleteContainer.classList.contains("hidden")
    ) {
      return;
    }

    const items =
      nameAutocompleteContainer.querySelectorAll(".autocomplete-item");
    const currentSelected = nameAutocompleteContainer.querySelector(
      ".autocomplete-item.bg-blue-200"
    );
    let selectedIndex = currentSelected
      ? parseInt(currentSelected.getAttribute("data-index"))
      : -1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelectedItem(items, selectedIndex);
        break;

      case "ArrowUp":
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelectedItem(items, selectedIndex);
        break;

      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          const selectedName = items[selectedIndex].textContent;
          selectNameSuggestion(selectedName);
        }
        break;

      case "Escape":
        hideNameAutocomplete();
        break;
    }
  }

  function updateSelectedItem(items, selectedIndex) {
    // Remove seleção anterior
    items.forEach((item) => item.classList.remove("bg-blue-200"));

    // Adiciona seleção no item atual
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].classList.add("bg-blue-200");
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  // Função para mostrar mensagem quando não há resultados
  function showNoResultsMessage(query) {
    if (!nameAutocompleteContainer) return;

    nameAutocompleteContainer.innerHTML = `
    <div class="px-3 py-2 text-gray-500 text-sm italic">
      <i class="fas fa-search mr-2"></i>
      Nenhum membro encontrado com "${query}"
    </div>
  `;

    nameAutocompleteContainer.classList.remove("hidden");

    // Esconde automaticamente após 2 segundos
    setTimeout(() => {
      hideNameAutocomplete();
    }, 2000);
  }

  // --- Funções para Limpar Filtros Relacionados ---

  function clearRelatedFilters() {
    // Limpa os filtros relacionados ao membro quando o nome é removido
    if (filterPeriodoSelect) filterPeriodoSelect.value = "";
    if (filterLiderInput && !filterLiderInput.disabled)
      filterLiderInput.value = "";
    if (filterGapeInput && !filterGapeInput.disabled)
      filterGapeInput.value = "";
  }

  function handleNameClear(query) {
    // Se o campo de nome foi completamente limpo, limpa os filtros relacionados
    if (query.length === 0) {
      clearRelatedFilters();
      applyFilters();

      // Atualiza o dashboard se estiver aberto
      if (isDashboardOpen) {
        fetchAndDisplaySummary();
      }

      showMessage("🔄 Filtros limpos", "info");
    }
  }

  // --- Event Listeners ---
  document.addEventListener("DOMContentLoaded", () => {
    fetchMembers();
    displayLoggedInLeaderName();

    // Inicializa os listeners de upload de foto
    initializePhotoUploadListeners();

    // Inicializa o autocomplete após um pequeno delay para garantir que os elementos estejam prontos
    setTimeout(() => {
      initializeNameAutocomplete();
    }, 100);

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedInLeaderName");
        window.location.href = "index.html"; // Caminho relativo correto
      });
    }

    if (applyFiltersBtn)
      applyFiltersBtn.addEventListener("click", () => {
        applyFilters();
        if (isDashboardOpen) fetchAndDisplaySummary();
      });
    if (clearFiltersBtn)
      clearFiltersBtn.addEventListener("click", () => {
        if (filterNameInput) filterNameInput.value = "";
        if (filterPeriodoSelect) filterPeriodoSelect.value = "";
        if (!filterLiderInput?.disabled) filterLiderInput.value = "";
        if (!filterGapeInput?.disabled) filterGapeInput.value = "";
        hideNameAutocomplete(); // Esconde autocomplete se estiver aberto
        applyFilters();
        if (isDashboardOpen) fetchAndDisplaySummary();
        showMessage("🔄 Todos os filtros foram limpos", "info");
      });

    if (toggleDashboardBtn)
      toggleDashboardBtn.addEventListener("click", toggleDashboardVisibility);
    if (showDetailedSummaryBtn)
      showDetailedSummaryBtn.addEventListener("click", showDetailedSummary);
    if (closeModalBtn)
      closeModalBtn.addEventListener("click", () => {
        detailedSummaryModal.classList.add("hidden");
        hideFloatingLoader(); // Esconde o loader se o modal for fechado
      });
    if (closeHistoryModalBtn)
      closeHistoryModalBtn.addEventListener("click", () =>
        historyModal.classList.add("hidden")
      );

    if (historyListContainer) {
      historyListContainer.addEventListener("click", (e) => {
        const button = e.target.closest(".btn-remove-presence");
        if (button) {
          const { nome, data } = button.dataset;
          if (
            confirm(
              `Tem certeza que deseja remover a presença de ${nome} do dia ${data}?`
            )
          ) {
            removePresence(nome, data);
          }
        }
      });
    }

    // Listeners para filtros do modal de resumo com debounce para melhor performance
    const debouncedUpdateChart = debounce(() => {
      showFloatingLoader("Atualizando resumo...");
      updateDetailedSummaryChart();
    }, 300);

    if (applySummaryFiltersBtn)
      applySummaryFiltersBtn.addEventListener("click", () => {
        showFloatingLoader("Aplicando filtros...");
        updateDetailedSummaryChart();
      });
    if (summaryStartDateInput)
      summaryStartDateInput.addEventListener("change", debouncedUpdateChart);
    if (summaryEndDateInput)
      summaryEndDateInput.addEventListener("change", debouncedUpdateChart);
    if (summaryMemberSelect)
      summaryMemberSelect.addEventListener("change", debouncedUpdateChart);
    if (downloadPdfBtn)
      downloadPdfBtn.addEventListener("click", handleDownloadPdf);

    // Event listeners para sincronizar filtros quando alterados manualmente
    if (filterPeriodoSelect) {
      filterPeriodoSelect.addEventListener("change", () => {
        if (isDashboardOpen) fetchAndDisplaySummary();
      });
    }

    if (filterLiderInput) {
      filterLiderInput.addEventListener("change", () => {
        if (isDashboardOpen) fetchAndDisplaySummary();
      });
    }

    if (filterGapeInput) {
      filterGapeInput.addEventListener("change", () => {
        if (isDashboardOpen) fetchAndDisplaySummary();
      });
    }
  });

  function highlightSyncedFilters() {
    // Adiciona um efeito visual temporário nos campos que foram sincronizados
    const fieldsToHighlight = [
      filterPeriodoSelect,
      filterLiderInput,
      filterGapeInput,
    ].filter((field) => field && !field.disabled);

    fieldsToHighlight.forEach((field) => {
      if (field.value) {
        field.style.transition = "all 0.3s ease";
        field.style.backgroundColor = "#dcfce7"; // Verde claro
        field.style.borderColor = "#22c55e"; // Verde
        setTimeout(() => {
          field.style.backgroundColor = "";
          field.style.borderColor = "";
        }, 2000);
      }
    });
  }

  // Função para gerar insights automáticos
  function addInsightsSection(
    chartRenderData,
    selectedMemberName,
    summaryData
  ) {
    try {
      console.log("🎯 Iniciando geração de insights...");
      console.log("📊 chartRenderData recebido:", chartRenderData);

      // Verificação defensiva dos dados
      if (!chartRenderData) {
        console.warn(
          "❌ chartRenderData não fornecido para addInsightsSection"
        );
        return;
      }

      const presencesDetails = chartRenderData.presencesDetails || {};
      const absencesDetails = chartRenderData.absencesDetails || {};

      console.log("✅ Dados extraídos:", { presencesDetails, absencesDetails });

      let insights = [];
      let recommendations = [];

      if (selectedMemberName) {
        console.log(
          "🔍 Processando insights para membro individual:",
          selectedMemberName
        );
        // Insights para membro individual
        const memberPresences =
          presencesDetails[selectedMemberName]?.totalPresencas || 0;
        const memberAbsences =
          absencesDetails[selectedMemberName]?.totalFaltas || 0;
        const totalMeetings = summaryData?.totalMeetingDays || 0;
        const presenceRate =
          totalMeetings > 0 ? (memberPresences / totalMeetings) * 100 : 0;

        // Análise de tendência
        const recentPresences = (
          presencesDetails[selectedMemberName]?.presencas || []
        ).slice(-5);
        const recentAbsences = (
          absencesDetails[selectedMemberName]?.faltas || []
        ).slice(-5);

        if (presenceRate >= 90) {
          insights.push(
            "🌟 Excelente assiduidade! Está entre os membros mais presentes."
          );
          recommendations.push("Continue mantendo essa consistência exemplar.");
        } else if (presenceRate >= 75) {
          insights.push("👍 Boa frequência, acima da média esperada.");
          recommendations.push(
            "Tente manter a consistência para atingir excelência (90%+)."
          );
        } else if (presenceRate >= 60) {
          insights.push("⚠️ Frequência regular, há espaço para melhoria.");
          recommendations.push(
            "Procure identificar os motivos das faltas e criar estratégias para melhorar."
          );
        } else {
          insights.push("❌ Frequência baixa, precisa de atenção urgente.");
          recommendations.push(
            "É importante conversar para entender os desafios e criar um plano de melhoria."
          );
        }

        // Análise de padrão
        if (recentPresences.length > recentAbsences.length) {
          insights.push(
            "📈 Tendência positiva: mais presenças recentes que faltas."
          );
        } else if (recentAbsences.length > recentPresences.length) {
          insights.push(
            "📉 Atenção: mais faltas recentes, pode indicar dificuldades."
          );
          recommendations.push(
            "Verificar se há algum problema que está impedindo a participação."
          );
        }
      } else {
        console.log("🔍 Processando insights para grupo completo");
        // Insights para grupo
        const totalMembers =
          Object.keys(presencesDetails).length +
          Object.keys(absencesDetails).length;
        console.log("📊 Total de membros:", totalMembers);

        const avgPresenceRate =
          totalMembers > 0
            ? (Object.values(presencesDetails).reduce(
                (sum, data) => sum + data.totalPresencas,
                0
              ) /
                (totalMembers * summaryData.totalMeetingDays)) *
              100
            : 0;

        console.log("📈 Taxa média de presença do grupo:", avgPresenceRate);

        // Análise do grupo
        if (avgPresenceRate >= 80) {
          insights.push(
            "🎉 Grupo muito engajado! Taxa de presença acima de 80%."
          );
          recommendations.push(
            "Manter as estratégias atuais que estão funcionando bem."
          );
        } else if (avgPresenceRate >= 65) {
          insights.push("👥 Grupo com engajamento moderado.");
          recommendations.push(
            "Identificar membros com baixa frequência para apoio individual."
          );
        } else {
          insights.push("⚠️ Grupo com baixo engajamento geral.");
          recommendations.push(
            "Revisar formato das reuniões e estratégias de engajamento."
          );
        }

        // Análise de distribuição
        const membersWithGoodAttendance = Object.entries(
          presencesDetails
        ).filter(
          ([name, data]) =>
            data.totalPresencas / summaryData.totalMeetingDays >= 0.8
        ).length;

        if (membersWithGoodAttendance / totalMembers >= 0.7) {
          insights.push("✅ 70%+ dos membros têm boa assiduidade.");
        } else {
          insights.push("📊 Menos de 70% dos membros têm boa assiduidade.");
          recommendations.push(
            "Focar em estratégias para aumentar o engajamento geral."
          );
        }
      }

      console.log("🎯 Insights gerados:", insights);
      console.log("💡 Recomendações geradas:", recommendations);

      // Adiciona a seção de insights ao HTML
      const insightsHtml = `
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Insights -->
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-semibold text-blue-800 mb-3 flex items-center">
            🔍 Insights Automáticos
          </h4>
          <div class="space-y-2">
            ${insights
              .map(
                (insight) => `
              <div class="text-sm text-blue-700 bg-white p-2 rounded">
                ${insight}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        
        <!-- Recomendações -->
        <div class="bg-amber-50 p-4 rounded-lg">
          <h4 class="font-semibold text-amber-800 mb-3 flex items-center">
            💡 Recomendações
          </h4>
          <div class="space-y-2">
            ${recommendations
              .map(
                (rec) => `
              <div class="text-sm text-amber-700 bg-white p-2 rounded">
                ${rec}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

      // Adiciona ao final do conteúdo existente
      detailedSummaryText.innerHTML += insightsHtml;
      console.log("✅ Insights adicionados ao DOM com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar insights:", error);
      // Adiciona uma mensagem de fallback em caso de erro
      const fallbackHtml = `
        <div class="mt-6 bg-yellow-50 p-4 rounded-lg">
          <h4 class="font-semibold text-yellow-800 mb-2">
            ⚠️ Insights Temporariamente Indisponíveis
          </h4>
          <p class="text-sm text-yellow-700">
            Não foi possível gerar insights automáticos no momento. Os dados principais estão disponíveis acima.
          </p>
        </div>
      `;
      detailedSummaryText.innerHTML += fallbackHtml;
    }
  }
} // Fim da verificação dashboardInitialized

/*
=== FUNCIONALIDADE DE FOTOS DE PERFIL (BACKEND SINCRONIZADO) ===

Esta implementação permite aos usuários:

1. 📸 TROCAR FOTOS:
   - Clique na foto de qualquer membro para selecionar uma nova imagem
   - Aceita formatos: JPG, PNG, GIF, WebP
   - Limite de tamanho: 5MB por imagem

2. 💾 ARMAZENAMENTO NO SERVIDOR:
   - Fotos são salvas no servidor backend (não mais localStorage)
   - Persistem entre dispositivos e usuários
   - Sincronização automática para todos os usuários
   - Compressão automática para otimizar espaço

3. 🌐 COMPARTILHAMENTO GLOBAL:
   - Fotos aparecem para TODOS os usuários do aplicativo
   - Sincronização em tempo real entre dispositivos
   - URLs públicas servidas pelo backend

4. 🎨 MELHORIAS VISUAIS:
   - Overlay com ícone de câmera ao passar o mouse
   - Indicador verde para fotos personalizadas
   - Redimensionamento automático para 200x200px
   - Feedback visual durante upload

5. 🗑️ GERENCIAMENTO:
   - Clique direito na foto para remover (volta ao padrão)
   - Validação de tipos de arquivo e tamanho
   - Remoção automática de fotos antigas ao atualizar

6. 🔄 ENDPOINTS DO BACKEND:
   - POST /upload-member-photo - Upload de foto
   - GET /member-photo/:name - Buscar foto específica
   - GET /member-photos - Listar todas as fotos
   - DELETE /member-photo/:name - Remover foto
   - GET /uploads/member-photos/* - Servir arquivos estáticos

Como usar:
- Clique na foto do membro → Selecione nova imagem → Upload automático
- Clique direito na foto → "Remover foto personalizada" (se houver)
- Fotos aparecem instantaneamente para todos os usuários

Arquitetura:
- Frontend: Processa e comprime imagens localmente
- Backend: Armazena arquivos físicos e URLs
- Sincronização: GET /get-membros retorna URLs atualizadas
*/
