// ------------------------------------------------------
// Frontend (js/dashboard.js) - VERSÃO COMPLETA E FINAL
// ------------------------------------------------------

// Configuração global do BACKEND_URL (fora do escopo de inicialização)
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const BACKEND_URL = isLocalhost
  ? "http://localhost:3000"
  : "https://backendbras.onrender.com";

// Verificação para evitar redeclaração se o script for carregado múltiplas vezes
if (typeof window.dashboardInitialized === "undefined") {
  window.dashboardInitialized = true;

  // Função utilitária para criar nomes de arquivo seguros (igual ao backend)
  function createSafeFileName(name) {
    return name ? name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase() : "";
  }

  // Função para normalizar strings removendo acentos e convertendo para minúsculas
  // Permite busca insensível a acentos: "Jose" encontra "José" e vice-versa
  // Exemplos: "José" → "jose", "María" → "maria", "João" → "joao"
  function normalizeString(str) {
    if (!str || typeof str !== "string") return "";
    const normalized = str
      .toLowerCase()
      .normalize("NFD") // Decompõe caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // Remove os acentos (diacríticos)
      .trim();

    // Log de debug para verificar normalização (remover em produção)

    return normalized;
  }

  let allMembersData = [];
  let filteredMembers = [];
  let lastPresencesData = {};
  let allAbsencesData = {};
  let myChart = null;
  let myBarChart = null;

  // Variável global para armazenar dados reais do último resumo gerado
  let lastRealSummaryData = null;

  // Cache para otimização de performance
  let summaryCache = new Map();
  let lastCacheKey = null;
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutos em millisegundos

  // --- Função auxiliar para verificar restrições de grupo ---
  // Esta função implementa a segurança de acesso por grupo:
  // - Admin: pode ver e gerenciar todos os membros
  // - Líder/Usuário comum: só pode ver e gerenciar membros do seu próprio grupo (GAPE)
  function getUserGroupRestriction() {
    const leaderName = localStorage.getItem("loggedInLeaderName");
    const isAdmin = !leaderName || leaderName === "admin";

    if (isAdmin) {
      console.log("🔓 Usuário admin detectado - sem restrições de grupo");
      return { isAdmin: true, userGroup: null };
    }

    const loggedInMember = allMembersData.find(
      (member) =>
        normalizeString(member.Nome || "") === normalizeString(leaderName)
    );

    const userGroup = loggedInMember ? loggedInMember.GAPE : null;
    console.log(`🔒 Usuário "${leaderName}" restrito ao grupo: "${userGroup}"`);

    return {
      isAdmin: false,
      userGroup: userGroup,
    };
  }

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
  const dashboardTitle = document.getElementById("dashboardTitle");
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

  // Elementos do Dashboard Principal
  const openDashboardBtn = document.getElementById("openDashboardBtn");
  const mainDashboardOverlay = document.getElementById("mainDashboardOverlay");
  const closeDashboard = document.getElementById("closeDashboard");
  const dashboardMesFilter = document.getElementById("dashboardMesFilter");
  const dashboardGrupoFilter = document.getElementById("dashboardGrupoFilter");
  const limparFiltrosDashboard = document.getElementById(
    "limparFiltrosDashboard"
  );

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
    console.log("🎯 handlePhotoUpload chamada:", {
      file: file?.name,
      memberName,
    });
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

    console.log("✅ Arquivo validado, abrindo editor de fotos...");
    // Abre o editor de fotos diretamente
    showPhotoEditor(file, memberName);
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
    console.log("🔧 Inicializando listeners de foto...");

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

    // Adiciona listener para clique simples nas fotos (menu de opções)
    document.addEventListener("click", function (e) {
      console.log(
        "🖱️ Clique detectado em:",
        e.target.tagName,
        e.target.className
      );

      // Verifica se é uma imagem de membro ou um elemento dentro da área da foto
      let photoElement = null;
      let memberName = null;

      if (e.target.classList.contains("member-photo")) {
        // Clique direto na imagem
        photoElement = e.target;
        memberName = e.target.alt.replace("Foto de ", "");
      } else {
        // Verifica se o clique foi em um elemento dentro da área da foto
        const photoContainer = e.target.closest(
          ".relative.w-16.h-16.rounded-full"
        );
        if (photoContainer) {
          photoElement = photoContainer.querySelector(".member-photo");
          if (photoElement) {
            memberName = photoElement.alt.replace("Foto de ", "");
          }
        }
      }

      if (photoElement && memberName) {
        console.log("📸 Clique em foto de membro detectado!");
        e.preventDefault();
        e.stopPropagation();

        console.log("👤 Nome do membro:", memberName);

        showPhotoOptionsMenu(e, memberName);
      }
    });

    // Adiciona listener para clique com botão direito (menu de contexto)
    document.addEventListener("contextmenu", function (e) {
      let photoElement = null;
      let memberName = null;

      if (e.target.classList.contains("member-photo")) {
        // Clique direto na imagem
        photoElement = e.target;
        memberName = e.target.alt.replace("Foto de ", "");
      } else {
        // Verifica se o clique foi em um elemento dentro da área da foto
        const photoContainer = e.target.closest(
          ".relative.w-16.h-16.rounded-full"
        );
        if (photoContainer) {
          photoElement = photoContainer.querySelector(".member-photo");
          if (photoElement) {
            memberName = photoElement.alt.replace("Foto de ", "");
          }
        }
      }

      if (photoElement && memberName) {
        e.preventDefault();
        showPhotoContextMenu(e, memberName);
      }
    });

    console.log("✅ Listeners de foto inicializados!");
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

  // Função para capturar foto da câmera
  // Função para abrir editor de fotos com recorte
  async function openPhotoEditor(memberName) {
    console.log("🖼️ Abrindo editor de fotos para:", memberName);

    // Cria input de arquivo temporário
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        showPhotoEditor(file, memberName);
      }
    };

    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  // Editor de fotos com recorte e redimensionamento
  function showPhotoEditor(file, memberName) {
    console.log("✂️ Mostrando editor de fotos para:", memberName);

    const reader = new FileReader();

    reader.onload = (e) => {
      // Cria modal do editor
      const editorModal = document.createElement("div");
      editorModal.className =
        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
      editorModal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
          <h3 class="text-lg font-semibold mb-4 text-center">Editor de Foto - ${memberName}</h3>
          
          <!-- Área do editor -->
          <div class="relative mb-4">
            <canvas id="photoCanvas" class="border border-gray-300 rounded-lg max-w-full"></canvas>
          </div>
          
          <!-- Controles -->
          <div class="space-y-4">
            <!-- Controles de recorte -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Posição X:</label>
                <input type="range" id="cropX" min="0" max="100" value="0" class="w-full">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Posição Y:</label>
                <input type="range" id="cropY" min="0" max="100" value="0" class="w-full">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Largura:</label>
                <input type="range" id="cropWidth" min="20" max="100" value="100" class="w-full">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Altura:</label>
                <input type="range" id="cropHeight" min="20" max="100" value="100" class="w-full">
              </div>
            </div>
            
            <!-- Botões de ação -->
            <div class="flex gap-3">
              <button id="resetCrop" class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                <i class="fas fa-undo mr-2"></i>Resetar
              </button>
              <button id="centerCrop" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                <i class="fas fa-crosshairs mr-2"></i>Centralizar
              </button>
              <button id="squareCrop" class="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors">
                <i class="fas fa-square mr-2"></i>Quadrado
              </button>
            </div>
            
            <!-- Botões principais -->
            <div class="flex gap-3">
              <button id="savePhoto" class="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-save mr-2"></i>Salvar Foto
              </button>
              <button id="cancelEdit" class="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Cancelar
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(editorModal);

      // Inicializa o editor
      initializePhotoEditor(e.target.result, memberName, editorModal);
    };

    reader.readAsDataURL(file);
  }

  function initializePhotoEditor(imageSrc, memberName, modal) {
    const canvas = document.getElementById("photoCanvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    let originalWidth, originalHeight;
    let cropX = 0,
      cropY = 0,
      cropWidth = 100,
      cropHeight = 100;

    img.onload = () => {
      originalWidth = img.width;
      originalHeight = img.height;

      // Define tamanho do canvas (máximo 500px para facilitar edição)
      const maxSize = 500;
      const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight);
      canvas.width = originalWidth * scale;
      canvas.height = originalHeight * scale;

      // Desenha a imagem inicial
      redrawCanvas();

      // Configura event listeners
      setupEditorControls();
    };

    function redrawCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Desenha a imagem original
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Desenha overlay de recorte
      const cropXPx = (cropX / 100) * canvas.width;
      const cropYPx = (cropY / 100) * canvas.height;
      const cropWidthPx = (cropWidth / 100) * canvas.width;
      const cropHeightPx = (cropHeight / 100) * canvas.height;

      // Overlay escuro
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Área de recorte (transparente)
      ctx.clearRect(cropXPx, cropYPx, cropWidthPx, cropHeightPx);
      ctx.drawImage(
        img,
        (cropX / 100) * originalWidth,
        (cropY / 100) * originalHeight,
        (cropWidth / 100) * originalWidth,
        (cropHeight / 100) * originalHeight,
        cropXPx,
        cropYPx,
        cropWidthPx,
        cropHeightPx
      );

      // Borda da seleção
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(cropXPx, cropYPx, cropWidthPx, cropHeightPx);
    }

    function setupEditorControls() {
      const cropXSlider = document.getElementById("cropX");
      const cropYSlider = document.getElementById("cropY");
      const cropWidthSlider = document.getElementById("cropWidth");
      const cropHeightSlider = document.getElementById("cropHeight");

      // Event listeners para sliders
      [cropXSlider, cropYSlider, cropWidthSlider, cropHeightSlider].forEach(
        (slider) => {
          slider.addEventListener("input", () => {
            cropX = parseInt(cropXSlider.value);
            cropY = parseInt(cropYSlider.value);
            cropWidth = parseInt(cropWidthSlider.value);
            cropHeight = parseInt(cropHeightSlider.value);

            // Ajusta limites
            cropXSlider.max = 100 - cropWidth;
            cropYSlider.max = 100 - cropHeight;

            if (cropX > 100 - cropWidth) cropX = 100 - cropWidth;
            if (cropY > 100 - cropHeight) cropY = 100 - cropHeight;

            cropXSlider.value = cropX;
            cropYSlider.value = cropY;

            redrawCanvas();
          });
        }
      );

      // Botão resetar
      document.getElementById("resetCrop").onclick = () => {
        cropX = 0;
        cropY = 0;
        cropWidth = 100;
        cropHeight = 100;
        cropXSlider.value = 0;
        cropYSlider.value = 0;
        cropWidthSlider.value = 100;
        cropHeightSlider.value = 100;
        redrawCanvas();
      };

      // Botão centralizar
      document.getElementById("centerCrop").onclick = () => {
        cropX = (100 - cropWidth) / 2;
        cropY = (100 - cropHeight) / 2;
        cropXSlider.value = cropX;
        cropYSlider.value = cropY;
        redrawCanvas();
      };

      // Botão quadrado
      document.getElementById("squareCrop").onclick = () => {
        const size = Math.min(cropWidth, cropHeight);
        cropWidth = size;
        cropHeight = size;
        cropWidthSlider.value = size;
        cropHeightSlider.value = size;
        redrawCanvas();
      };

      // Botão salvar
      document.getElementById("savePhoto").onclick = async () => {
        try {
          showGlobalLoading(true, "Processando foto...");

          // Cria canvas para o resultado final
          const resultCanvas = document.createElement("canvas");
          const resultCtx = resultCanvas.getContext("2d");

          // Define tamanho final (200x200 para perfil)
          resultCanvas.width = 200;
          resultCanvas.height = 200;

          // Calcula área de recorte na imagem original
          const srcX = (cropX / 100) * originalWidth;
          const srcY = (cropY / 100) * originalHeight;
          const srcWidth = (cropWidth / 100) * originalWidth;
          const srcHeight = (cropHeight / 100) * originalHeight;

          // Desenha a área recortada redimensionada
          resultCtx.drawImage(
            img,
            srcX,
            srcY,
            srcWidth,
            srcHeight,
            0,
            0,
            200,
            200
          );

          // Converte para base64
          const photoBase64 = resultCanvas.toDataURL("image/jpeg", 0.8);

          // Salva no servidor
          const photoUrl = await saveMemberPhoto(memberName, photoBase64);

          if (photoUrl) {
            updateMemberPhotoInCard(memberName, photoUrl);
            await fetchMembers();
            showMessage(
              `✅ Foto de ${memberName} salva com sucesso!`,
              "success"
            );
          }

          modal.remove();
        } catch (error) {
          console.error("Erro ao salvar foto:", error);
          showMessage("Erro ao salvar foto", "error");
        } finally {
          showGlobalLoading(false);
        }
      };

      // Botão cancelar
      document.getElementById("cancelEdit").onclick = () => {
        modal.remove();
      };
    }

    img.src = imageSrc;
  }

  // Função para capturar foto da câmera
  async function capturePhotoFromCamera(memberName) {
    console.log("📸 capturePhotoFromCamera chamada para:", memberName);
    try {
      // Verifica se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("❌ getUserMedia não suportado");
        showMessage("Câmera não suportada neste navegador", "error");
        return;
      }

      console.log("🎥 Solicitando acesso à câmera...");
      showGlobalLoading(true, "Acessando câmera...");

      // Solicita acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Câmera frontal por padrão
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      // Cria elementos do modal de captura
      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50";
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4 text-center">Capturar Foto - ${memberName}</h3>
          <div class="relative">
            <video id="cameraVideo" autoplay class="w-full rounded-lg bg-black"></video>
            <canvas id="captureCanvas" class="hidden"></canvas>
          </div>
          <div class="flex gap-3 mt-4">
            <button id="switchCamera" class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
              <i class="fas fa-sync-alt mr-2"></i>Trocar Câmera
            </button>
            <button id="capturePhoto" class="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
              <i class="fas fa-camera mr-2"></i>Capturar
            </button>
            <button id="cancelCapture" class="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
              <i class="fas fa-times mr-2"></i>Cancelar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const video = document.getElementById("cameraVideo");
      const canvas = document.getElementById("captureCanvas");
      const ctx = canvas.getContext("2d");

      video.srcObject = stream;
      showGlobalLoading(false);

      let currentFacingMode = "user";

      // Função para trocar câmera
      document.getElementById("switchCamera").onclick = async () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
          currentFacingMode =
            currentFacingMode === "user" ? "environment" : "user";

          const newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: currentFacingMode,
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          });

          video.srcObject = newStream;
        } catch (error) {
          console.warn("Não foi possível trocar a câmera:", error);
          showMessage("Não foi possível trocar a câmera", "warning");
        }
      };

      // Função para capturar foto
      document.getElementById("capturePhoto").onclick = () => {
        // Define tamanho do canvas igual ao vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Desenha o frame atual do vídeo no canvas
        ctx.drawImage(video, 0, 0);

        // Converte para base64
        const photoBase64 = canvas.toDataURL("image/jpeg", 0.8);

        // Para o stream
        stream.getTracks().forEach((track) => track.stop());
        modal.remove();

        // Processa e envia a foto
        handleCapturedPhoto(photoBase64, memberName);
      };

      // Função para cancelar
      document.getElementById("cancelCapture").onclick = () => {
        stream.getTracks().forEach((track) => track.stop());
        modal.remove();
      };
    } catch (error) {
      showGlobalLoading(false);
      console.error("Erro ao acessar câmera:", error);

      if (error.name === "NotAllowedError") {
        showMessage(
          "Acesso à câmera foi negado. Verifique as permissões do navegador.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        showMessage("Nenhuma câmera encontrada no dispositivo.", "error");
      } else {
        showMessage("Erro ao acessar câmera: " + error.message, "error");
      }
    }
  }

  // Função para processar foto capturada da câmera
  async function handleCapturedPhoto(photoBase64, memberName) {
    try {
      showGlobalLoading(true, "Processando foto capturada...");

      // Cria uma imagem para redimensionar
      const img = new Image();

      img.onload = async function () {
        // Cria canvas para redimensionar
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

        // Converte para base64 comprimido
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);

        // Envia para o servidor
        const photoUrl = await saveMemberPhoto(memberName, compressedBase64);

        if (photoUrl) {
          // Atualiza a foto no cartão imediatamente
          const photoElements = document.querySelectorAll(
            `img[alt="Foto de ${memberName}"]`
          );
          photoElements.forEach((img) => {
            img.src = photoUrl;
          });

          showMessage(
            `✅ Foto capturada e salva para ${memberName}!`,
            "success"
          );
        }
      };

      img.src = photoBase64;
    } catch (error) {
      console.error("Erro ao processar foto capturada:", error);
      showMessage("Erro ao processar foto capturada", "error");
    } finally {
      showGlobalLoading(false);
    }
  }

  // Menu de opções para escolher arquivo ou câmera
  async function showPhotoOptionsMenu(event, memberName) {
    console.log("🎯 showPhotoOptionsMenu chamada para:", memberName);
    event.stopPropagation();

    // Remove menu anterior se existir
    const existingMenu = document.getElementById("photoOptionsMenu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const menu = document.createElement("div");
    menu.id = "photoOptionsMenu";
    menu.className =
      "fixed bg-white border border-gray-300 rounded-lg shadow-lg py-2 z-50";

    // Posiciona o menu próximo ao clique
    const rect = event.target.getBoundingClientRect();
    menu.style.left = rect.right + 10 + "px";
    menu.style.top = rect.top + "px";

    console.log("📍 Posicionando menu em:", {
      left: rect.right + 10,
      top: rect.top,
    });

    // Verifica se há foto personalizada
    const savedPhoto = await getMemberPhoto(memberName);
    const hasCustomPhoto =
      savedPhoto && savedPhoto.includes("/uploads/member-photos/");

    menu.innerHTML = `
      <div class="px-3 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
        📸 Opções de Foto - ${memberName}
      </div>
      <button id="selectFile" class="w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-600 flex items-center gap-2">
        <i class="fas fa-folder-open"></i>
        Selecionar da galeria
      </button>
      <button id="editPhoto" class="w-full px-4 py-2 text-left hover:bg-purple-50 text-purple-600 flex items-center gap-2">
        <i class="fas fa-edit"></i>
        Editor com recorte
      </button>
      <button id="useCamera" class="w-full px-4 py-2 text-left hover:bg-green-50 text-green-600 flex items-center gap-2">
        <i class="fas fa-camera"></i>
        Tirar foto (câmera)
      </button>
      ${
        hasCustomPhoto
          ? `
        <hr class="my-1 border-gray-200">
        <button id="removePhoto" class="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2">
          <i class="fas fa-trash-alt"></i>
          Remover foto personalizada
        </button>
      `
          : ""
      }
    `;

    document.body.appendChild(menu);

    // Event listeners para as opções
    document.getElementById("selectFile").onclick = () => {
      console.log("📁 Botão 'Selecionar da galeria' clicado para:", memberName);
      menu.remove();

      // Cria input de arquivo temporário para seleção da galeria
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        console.log("📄 Arquivo selecionado:", file ? file.name : "nenhum");
        if (file) {
          handlePhotoUpload(file, memberName);
        }
        // Remove o input após o uso
        if (fileInput.parentNode) {
          fileInput.parentNode.removeChild(fileInput);
        }
      };

      // Adiciona evento para limpar caso o usuário cancele
      fileInput.oncancel = () => {
        console.log("❌ Seleção de arquivo cancelada");
        if (fileInput.parentNode) {
          fileInput.parentNode.removeChild(fileInput);
        }
      };

      document.body.appendChild(fileInput);
      fileInput.click();

      // Fallback para remover após 30 segundos se não foi usado
      setTimeout(() => {
        if (fileInput.parentNode) {
          fileInput.parentNode.removeChild(fileInput);
        }
      }, 30000);
    };

    document.getElementById("editPhoto").onclick = () => {
      menu.remove();
      openPhotoEditor(memberName);
    };

    document.getElementById("useCamera").onclick = () => {
      menu.remove();
      capturePhotoFromCamera(memberName);
    };

    if (hasCustomPhoto) {
      document.getElementById("removePhoto").onclick = () => {
        menu.remove();
        removeMemberPhoto(memberName);
      };
    }

    // Remove menu ao clicar fora
    setTimeout(() => {
      document.addEventListener("click", function removeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", removeMenu);
        }
      });
    }, 100);
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
      name: normalizeString(filterNameInput?.value || ""),
      periodo: (filterPeriodoSelect?.value || "").toLowerCase().trim(),
      lider: (filterLiderInput?.value || "").toLowerCase().trim(),
      gape: (filterGapeInput?.value || "").toLowerCase().trim(),
    };

    // Obtém as restrições de grupo do usuário logado
    const { isAdmin, userGroup } = getUserGroupRestriction();

    filteredMembers = allMembersData.filter((member) => {
      const memberName = normalizeString(member.Nome || "");

      // Restrição por grupo: se não for admin, só mostra membros do mesmo grupo
      const groupRestriction =
        isAdmin || !userGroup || member.GAPE === userGroup;

      return (
        groupRestriction &&
        (!filters.name || memberName.includes(filters.name)) &&
        (!filters.periodo ||
          (member.Periodo || "").toLowerCase().includes(filters.periodo)) &&
        (!filters.lider ||
          (member.Lider || "").toLowerCase().includes(filters.lider)) &&
        (!filters.gape ||
          (member.GAPE || "").toLowerCase().includes(filters.gape))
      );
    });

    console.log(
      `📋 Filtros aplicados: ${filteredMembers.length} de ${allMembersData.length} membros`
    );
    if (!isAdmin && userGroup) {
      const membersInUserGroup = allMembersData.filter(
        (m) => m.GAPE === userGroup
      ).length;
      console.log(`👥 Membros no grupo "${userGroup}": ${membersInUserGroup}`);
    }

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
      }" class="member-photo w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-105" title="Clique para trocar a foto" style="object-position: center center;">
                        <input type="file" class="photo-upload-input hidden" accept="image/*" data-member-name="${
                          member.Nome
                        }">
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
                    <div>
                      <div class="font-bold text-lg text-gray-800">${
                        member.Nome || "N/A"
                      }</div>
                      ${
                        member.RI
                          ? `<div class="text-sm text-blue-600 font-mono">RI - ${member.RI}</div>`
                          : ""
                      }
                    </div>
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
        showPresenceHistory(member.Nome, member)
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
              grupo: member.GAPE, // Incluir grupo
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

  async function showPresenceHistory(memberName, memberObj = null) {
    if (!historyModal || !historyModalTitle || !historyListContainer) return;

    // Armazenar o objeto membro para uso posterior
    window.currentMemberForHistory = memberObj;

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
      // Tentar obter o grupo do membro atual
      const grupo = window.currentMemberForHistory
        ? window.currentMemberForHistory.GAPE
        : null;

      const response = await fetch(`${BACKEND_URL}/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          nome,
          data,
          grupo: grupo,
        }),
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

      // Calcula estatísticas melhoradas conforme solicitado
      const totalPeopleInGroup = filteredMembers.length;

      // CORREÇÃO: Calcular porcentagem baseada nos membros com/sem presença
      // Contar membros com presença registrada usando presencesDetails
      const membersWithPresenceCount = Object.keys(presencesDetails).filter(
        (memberName) => {
          const memberData = presencesDetails[memberName];
          return memberData && memberData.totalPresencas > 0;
        }
      ).length;

      console.log("🔍 DEBUG presencesDetails:", Object.keys(presencesDetails));
      console.log(
        "🔍 Membros com presença:",
        Object.keys(presencesDetails).filter((memberName) => {
          const memberData = presencesDetails[memberName];
          return memberData && memberData.totalPresencas > 0;
        })
      );

      const membersWithoutPresenceCount =
        totalPeopleInGroup - membersWithPresenceCount;

      const generalPresencePercentage =
        totalPeopleInGroup > 0
          ? Math.round((membersWithPresenceCount / totalPeopleInGroup) * 100)
          : 0;
      const absencePercentage =
        totalPeopleInGroup > 0
          ? Math.round((membersWithoutPresenceCount / totalPeopleInGroup) * 100)
          : 0;

      console.log("🔢 Totais calculados (CORRIGIDO - baseado em membros):", {
        totalPeopleInGroup,
        membersWithPresenceCount,
        membersWithoutPresenceCount,
        generalPresencePercentage,
        absencePercentage,
      });

      // Atualiza com porcentagem geral do grupo em vez do total absoluto
      dashboardPresencasMes.textContent = `${generalPresencePercentage}%`;
      // Atualiza com porcentagem de faltas em vez do total absoluto
      dashboardFaltasMes.textContent = `${absencePercentage}%`;

      // Adiciona informação sobre total de pessoas do grupo
      const dashboardInfo = document.getElementById("dashboardTotalReunions");
      if (dashboardInfo) {
        dashboardInfo.textContent = totalPeopleInGroup;
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
      dashboardPresencasMes.textContent = "0%";
      dashboardFaltasMes.textContent = "0%";
      const dashboardInfo = document.getElementById("dashboardTotalReunions");
      if (dashboardInfo) {
        dashboardInfo.textContent = "0";
      }
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
          maintainAspectRatio: false,
          aspectRatio: 2,
          layout: {
            padding: {
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            },
          },
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

          // Armazenar dados reais para uso no PDF
          lastRealSummaryData = {
            presencesDetails,
            absencesDetails,
            totalPresences,
            totalAbsences,
            totalMeetingDays: summaryData.totalMeetingDays,
            selectedMemberName,
            membersToAnalyze,
            filters: {
              startDate: document.getElementById("summaryStartDate")?.value,
              endDate: document.getElementById("summaryEndDate")?.value,
              period: filterPeriodoSelect?.value,
              leader: filterLiderInput?.value,
              gape: filterGapeInput?.value,
            },
          };

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

            // CORREÇÃO: Cálculo correto da média de presença baseada em membros
            // Fórmula: (Membros com Presença / Total de Membros) x 100
            const avgPresenceRate =
              membersToAnalyze.length > 0
                ? (
                    (membersWithPresence / membersToAnalyze.length) *
                    100
                  ).toFixed(1)
                : 0;

            console.log(`📊 Cálculo da média de presença por membros:
              - Membros com presença: ${membersWithPresence}
              - Total de membros: ${membersToAnalyze.length}
              - Membros sem presença: ${membersWithoutPresence}
              - Taxa calculada: ${avgPresenceRate}%`);

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
              summaryData,
              membersToAnalyze
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
                  maintainAspectRatio: false,
                  aspectRatio: 2,
                  layout: {
                    padding: {
                      top: 10,
                      bottom: 10,
                      left: 10,
                      right: 10,
                    },
                  },
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
      console.log("📄 Iniciando geração de PDF com dados reais...");

      // Mostra loading
      showGlobalLoading(true, "Gerando PDF...");

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

      // Função para calcular estatísticas se não tiver dados reais armazenados
      function calculateStatisticsFromFilteredData() {
        const membersToAnalyze = filteredMembers || [];

        if (!presencesDetails || Object.keys(presencesDetails).length === 0) {
          return {
            totalPresences: 0,
            totalAbsences: 0,
            totalMeetingDays,
            membersCount: membersToAnalyze.length,
            presenceRate: 0,
          };
        }

        let totalPresences = 0;
        let totalAbsences = 0;

        // Contar presenças e faltas dos membros filtrados
        Object.values(presencesDetails).forEach((memberData) => {
          if (memberData.presenceCount !== undefined) {
            totalPresences += memberData.presenceCount;
          }
          if (memberData.absenceCount !== undefined) {
            totalAbsences += memberData.absenceCount;
          }
        });

        return {
          totalPresences,
          totalAbsences,
          totalMeetingDays,
          membersCount: membersToAnalyze.length,
          presenceRate:
            totalPresences + totalAbsences > 0
              ? (
                  (totalPresences / (totalPresences + totalAbsences)) *
                  100
                ).toFixed(1)
              : 0,
        };
      }

      // Usar dados reais armazenados ou calcular a partir dos dados atuais
      let statistics;
      if (lastRealSummaryData) {
        console.log("📊 Usando dados reais armazenados:", lastRealSummaryData);

        const totalMembers = lastRealSummaryData.membersToAnalyze?.length || 0;
        const totalPresences = lastRealSummaryData.totalPresences || 0;
        const totalAbsences = totalMembers - totalPresences; // Calcular ausentes corretamente

        statistics = {
          totalPresences: totalPresences,
          totalAbsences: totalAbsences,
          totalMeetingDays: lastRealSummaryData.totalMeetingDays || 0,
          membersCount: totalMembers,
          presenceRate:
            totalMembers > 0
              ? ((totalPresences / totalMembers) * 100).toFixed(1)
              : 0,
        };
      } else {
        console.log("📊 Calculando estatísticas dos dados filtrados atuais");
        statistics = calculateStatisticsFromFilteredData();
      }

      console.log("� Estatísticas para PDF:", statistics);

      // Usa a versão global do jsPDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF("p", "mm", "a4");

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

      // =================== CABEÇALHO PRINCIPAL PROFISSIONAL ===================
      doc.setFillColor(52, 73, 93); // Azul escuro profissional
      doc.rect(0, 0, pageWidth, 25, "F");

      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("RELATÓRIO ANALÍTICO DE PRESENÇAS", margin, 12);

      doc.setFontSize(11);
      doc.setFont(undefined, "normal");
      doc.text("Assembleia de Deus BRAS - Vila Solange/SP", margin, 18);

      // Data e hora no canto direito
      const dataGeracao = new Date();
      const dateTimeStr = `${dataGeracao.toLocaleDateString(
        "pt-BR"
      )} - ${dataGeracao.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      doc.setFontSize(8);
      doc.text(`Gerado: ${dateTimeStr}`, pageWidth - margin - 35, 15);

      currentY = 32;
      doc.setTextColor(0, 0, 0);

      // =================== SEÇÃO DE FILTROS E PERÍODO ===================
      doc.setFillColor(240, 248, 255); // Azul muito claro
      doc.rect(margin, currentY, contentWidth, 18, "F");

      // Barra de título da seção
      doc.setFillColor(70, 130, 180);
      doc.rect(margin, currentY, contentWidth, 4, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("PARÂMETROS E CRITÉRIOS DE ANÁLISE", margin + 2, currentY + 2.8);

      currentY += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");

      // Organizar informações em duas colunas
      const col1X = margin + 3;
      const col2X = margin + contentWidth / 2 + 5;

      doc.text(`Grupo/GAPE: ${grupoInfo}`, col1X, currentY);
      doc.text(`Período: ${periodoInfo}`, col2X, currentY);
      currentY += 3.5;

      doc.text(`Lider: ${liderInfo}`, col1X, currentY);
      doc.text(`Membro: ${membroSelecionado}`, col2X, currentY);
      currentY += 3.5;

      doc.text(`Data Inicio: ${dataInicio}`, col1X, currentY);
      doc.text(`Data Fim: ${dataFim}`, col2X, currentY);

      currentY += 8;

      // Função melhorada para quebra de página com cabeçalho
      function checkPageBreakWithHeader(neededHeight) {
        if (currentY + neededHeight > pageHeight - margin - 15) {
          addPageHeader();
          return true;
        }
        return false;
      }

      // Função para adicionar cabeçalho em novas páginas
      function addPageHeader() {
        doc.addPage();
        currentY = margin;

        // Cabeçalho simplificado para páginas subsequentes
        doc.setFillColor(52, 73, 93);
        doc.rect(0, 0, pageWidth, 12, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("RELATÓRIO DE PRESENÇAS - BRAS", margin, 8);

        doc.setTextColor(0, 0, 0);
        currentY = 18;
      }

      // Função para calcular estatísticas se não tiver dados reais armazenados
      function calculateStatisticsFromFilteredData() {
        const membersToAnalyze = filteredMembers || [];

        if (!presencesDetails || Object.keys(presencesDetails).length === 0) {
          return {
            totalPresences: 0,
            totalAbsences: 0,
            totalMeetingDays,
            membersCount: membersToAnalyze.length,
            presenceRate: 0,
          };
        }

        let totalPresences = 0;
        let totalAbsences = 0;

        // Contar presenças e faltas dos membros filtrados
        Object.values(presencesDetails).forEach((memberData) => {
          if (memberData.presenceCount !== undefined) {
            totalPresences += memberData.presenceCount;
          }
          if (memberData.absenceCount !== undefined) {
            totalAbsences += memberData.absenceCount;
          }
        });

        return {
          totalPresences,
          totalAbsences,
          totalMeetingDays,
          membersCount: membersToAnalyze.length,
          presenceRate:
            totalPresences + totalAbsences > 0
              ? (
                  (totalPresences / (totalPresences + totalAbsences)) *
                  100
                ).toFixed(1)
              : 0,
        };
      }

      // Coletar informações detalhadas dos membros para o PDF
      function collectMembersDetailForPdf() {
        let membersToUse = [];
        let presenceDataToUse = {};
        let totalMeetings = 1; // Default

        if (lastRealSummaryData && lastRealSummaryData.membersToAnalyze) {
          membersToUse = lastRealSummaryData.membersToAnalyze;
          presenceDataToUse = lastRealSummaryData.presencesDetails || {};
          totalMeetings = lastRealSummaryData.totalMeetingDays || 1;

          console.log(
            "🔍 Debug: Dados de presença disponíveis:",
            Object.keys(presenceDataToUse)
          );
          console.log(
            "🔍 Debug: Primeiro membro com dados:",
            presenceDataToUse[Object.keys(presenceDataToUse)[0]]
          );
          console.log(
            "🔍 Debug: Estrutura completa do primeiro membro:",
            JSON.stringify(
              presenceDataToUse[Object.keys(presenceDataToUse)[0]],
              null,
              2
            )
          );
        } else if (filteredMembers && filteredMembers.length > 0) {
          membersToUse = filteredMembers;
          presenceDataToUse = presencesDetails || {};
          totalMeetings = totalMeetingDays || 1;
        }

        if (membersToUse.length === 0) {
          return [];
        }

        const membersDetail = [];

        membersToUse.forEach((member) => {
          const memberPresenceData = presenceDataToUse[member.Nome] || {};

          // Debug para verificar os dados de cada membro
          if (memberPresenceData.presenceCount > 0) {
            console.log(
              `🎯 Membro com presença: ${member.Nome}`,
              memberPresenceData
            );
          }

          // Obter dados de presença real - usar a propriedade correta
          let presencas = 0;
          if (memberPresenceData.totalPresencas !== undefined) {
            presencas = memberPresenceData.totalPresencas;
          } else if (memberPresenceData.presenceCount !== undefined) {
            presencas = memberPresenceData.presenceCount;
          } else if (memberPresenceData.presences !== undefined) {
            presencas = memberPresenceData.presences;
          }

          const faltas = totalMeetings - presencas;
          const taxa =
            totalMeetings > 0
              ? ((presencas / totalMeetings) * 100).toFixed(1)
              : 0;

          const detail = {
            nome: member.Nome || "N/A",
            gape: member.GAPE || "N/A",
            lider: member.Lider || "N/A",
            periodo: member.Periodo || "N/A",
            presencas: presencas,
            faltas: faltas,
            taxa: parseFloat(taxa),
            status: parseFloat(taxa) >= 80 ? "Ativo" : "Irregular",
          };

          membersDetail.push(detail);
        });

        // Ordenar por taxa de presença (maior para menor) e depois por nome
        return membersDetail.sort((a, b) => {
          if (b.taxa !== a.taxa) {
            return b.taxa - a.taxa; // Taxa decrescente
          }
          return a.nome.localeCompare(b.nome); // Nome crescente
        });
      }

      const membersDetail = collectMembersDetailForPdf();
      console.log(
        "👥 Detalhes dos membros coletados:",
        membersDetail.length,
        "membros"
      );
      console.log(
        "📊 Primeiros 3 membros com dados:",
        membersDetail.slice(0, 3)
      );

      // =================== ESTATÍSTICAS GERAIS ===================
      checkPageBreakWithHeader(40);

      // Cabeçalho da seção de estatísticas
      doc.setFillColor(34, 139, 34); // Verde para estatísticas
      doc.rect(margin, currentY, contentWidth, 6, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text(
        "INDICADORES E ESTATÍSTICAS DE FREQUÊNCIA",
        margin + 2,
        currentY + 4
      );
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      console.log("📊 Estatísticas processadas:", statistics);

      // Layout em cards para as estatísticas principais
      const cardWidth = (contentWidth - 9) / 4; // 4 colunas com espaços
      const cardHeight = 12;

      // Card 1: Membros
      doc.setFillColor(240, 248, 255);
      doc.rect(margin, currentY, cardWidth, cardHeight, "F");
      doc.setDrawColor(70, 130, 180);
      doc.rect(margin, currentY, cardWidth, cardHeight);

      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(70, 130, 180);
      doc.text("MEMBROS", margin + 2, currentY + 3);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const membersText = statistics.membersCount?.toString() || "0";
      doc.text(membersText, margin + 2, currentY + 8);

      // Card 2: Presenças
      const card2X = margin + cardWidth + 3;
      doc.setFillColor(240, 255, 240);
      doc.rect(card2X, currentY, cardWidth, cardHeight, "F");
      doc.setDrawColor(34, 139, 34);
      doc.rect(card2X, currentY, cardWidth, cardHeight);

      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(34, 139, 34);
      doc.text("PRESENTES", card2X + 2, currentY + 3);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const presencesText = statistics.totalPresences?.toString() || "0";
      doc.text(presencesText, card2X + 2, currentY + 8);

      // Card 3: Ausentes
      const card3X = margin + (cardWidth + 3) * 2;
      doc.setFillColor(255, 240, 240);
      doc.rect(card3X, currentY, cardWidth, cardHeight, "F");
      doc.setDrawColor(220, 20, 60);
      doc.rect(card3X, currentY, cardWidth, cardHeight);

      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(220, 20, 60);
      doc.text("AUSENTES", card3X + 2, currentY + 3);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const absencesText = statistics.totalAbsences?.toString() || "0";
      doc.text(absencesText, card3X + 2, currentY + 8);

      // Card 4: Taxa de Presença
      const card4X = margin + (cardWidth + 3) * 3;
      doc.setFillColor(255, 248, 240);
      doc.rect(card4X, currentY, cardWidth, cardHeight, "F");
      doc.setDrawColor(255, 140, 0);
      doc.rect(card4X, currentY, cardWidth, cardHeight);

      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 140, 0);
      doc.text("TAXA", card4X + 2, currentY + 3);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const rateText = statistics.presenceRate
        ? `${statistics.presenceRate}%`
        : "0%";
      doc.text(rateText, card4X + 2, currentY + 8);

      currentY += cardHeight + 5;

      // Estatísticas detalhadas em lista
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.setTextColor(60, 60, 60);

      const detailStats = [];

      if (statistics.totalMeetingDays > 0) {
        detailStats.push(
          `- Total de Eventos/Reuniões Analisados: ${statistics.totalMeetingDays}`
        );
      }

      if (statistics.membersCount > 0) {
        const participacao =
          statistics.totalPresences > 0
            ? `${(
                (statistics.totalPresences / statistics.membersCount) *
                100
              ).toFixed(1)}%`
            : "0%";
        detailStats.push(
          `- Índice Geral de Participação: ${participacao} dos membros estiveram presentes`
        );
      }

      // Mostrar breakdown por status se tiver dados dos membros
      if (membersDetail.length > 0) {
        const ativos = membersDetail.filter((m) => m.taxa >= 80).length;
        const irregulares = membersDetail.filter(
          (m) => m.taxa < 80 && m.taxa > 0
        ).length;
        const ausentes = membersDetail.filter((m) => m.taxa === 0).length;

        // Calcular porcentagens baseadas no total real de membros analisados
        const totalMembros = membersDetail.length;
        const percAtivos =
          totalMembros > 0 ? ((ativos / totalMembros) * 100).toFixed(1) : 0;
        const percIrregulares =
          totalMembros > 0
            ? ((irregulares / totalMembros) * 100).toFixed(1)
            : 0;
        const percAusentes =
          totalMembros > 0 ? ((ausentes / totalMembros) * 100).toFixed(1) : 0;

        if (ativos > 0)
          detailStats.push(
            `- Membros com Frequência Ativa (>=80%): ${ativos} pessoas (${percAtivos}%)`
          );
        if (irregulares > 0)
          detailStats.push(
            `- Membros com Frequência Irregular (<80%): ${irregulares} pessoas (${percIrregulares}%)`
          );
        if (ausentes > 0)
          detailStats.push(
            `- Membros Ausentes no Período (0%): ${ausentes} pessoas (${percAusentes}%)`
          );
      }

      // Adicionar linha informativa com total de membros analisados
      if (membersDetail.length > 0) {
        detailStats.push(
          `- Total de Membros Analisados: ${membersDetail.length} pessoas`
        );
      }

      if (detailStats.length === 0) {
        detailStats.push(
          "- Não foram encontrados dados suficientes para análise estatística"
        );
      }

      detailStats.forEach((stat) => {
        checkPageBreakWithHeader(4);
        doc.text(stat, margin + 2, currentY);
        currentY += 3;
      });

      currentY += 4;

      // =================== TABELA DE MEMBROS ===================
      if (membersDetail.length > 0) {
        checkPageBreakWithHeader(30);

        // Cabeçalho da seção de membros
        doc.setFillColor(128, 0, 128); // Roxo para membros
        doc.rect(margin, currentY, contentWidth, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.text(
          `DETALHAMENTO POR MEMBRO (${membersDetail.length} analisados)`,
          margin + 2,
          currentY + 4
        );

        currentY += 8;
        doc.setTextColor(0, 0, 0);

        // Verificar se deve mostrar colunas completas (quando filtro for "todos")
        const isShowingAllMembers =
          grupoInfo.includes("Todos") &&
          liderInfo.includes("Todos") &&
          periodoInfo.includes("Todos");

        let colWidths, headers;
        if (isShowingAllMembers) {
          // Configuração completa da tabela (7 colunas)
          colWidths = [55, 25, 20, 20, 20, 20, 25]; // Nome, GAPE, Líder, Período, Presenças, Faltas, Taxa
          headers = [
            "Nome do Membro",
            "GAPE",
            "Líder",
            "Período",
            "Presenças",
            "Faltas",
            "Taxa %",
          ];
        } else {
          // Configuração simplificada da tabela (4 colunas)
          colWidths = [80, 25, 25, 25]; // Nome, Presenças, Faltas, Taxa
          headers = ["Nome do Membro", "Presenças", "Faltas", "Taxa %"];
        }

        const tableStartY = currentY;
        const rowHeight = 4;

        // Cabeçalho da tabela com fundo colorido
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, currentY, contentWidth, rowHeight + 1, "F");

        doc.setDrawColor(100, 100, 100);
        doc.rect(margin, currentY, contentWidth, rowHeight + 1);

        doc.setFontSize(7);
        doc.setFont(undefined, "bold");
        doc.setTextColor(50, 50, 50);

        let xPos = margin + 1;
        headers.forEach((header, i) => {
          doc.text(header, xPos, currentY + 3);
          // Linhas verticais
          if (i < headers.length - 1) {
            doc.line(
              xPos + colWidths[i] - 1,
              currentY,
              xPos + colWidths[i] - 1,
              currentY + rowHeight + 1
            );
          }
          xPos += colWidths[i];
        });

        currentY += rowHeight + 1;

        // Mostrar todos os membros analisados (sem limite de 20)
        const membersToShow = membersDetail;
        let rowIndex = 0;

        membersToShow.forEach((member) => {
          checkPageBreakWithHeader(rowHeight + 2);

          // Alternância de cores nas linhas
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(margin, currentY, contentWidth, rowHeight, "F");
          }

          // Borda da linha
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, currentY, contentWidth, rowHeight);

          xPos = margin + 1;
          doc.setFontSize(6);
          doc.setFont(undefined, "normal");
          doc.setTextColor(0, 0, 0);

          let rowData;
          if (isShowingAllMembers) {
            // Dados completos com 7 colunas
            rowData = [
              member.nome.substring(0, 30), // Nome mais curto para caber
              (member.gape || "N/A").substring(0, 15),
              (member.lider || "N/A").substring(0, 12),
              (member.periodo || "N/A").substring(0, 12),
              member.presencas?.toString() || "0",
              member.faltas?.toString() || "0",
              member.taxa ? `${member.taxa}%` : "0%",
            ];
          } else {
            // Dados simplificados com 4 colunas
            rowData = [
              member.nome.substring(0, 40), // Nome com mais espaço
              member.presencas?.toString() || "0",
              member.faltas?.toString() || "0",
              member.taxa ? `${member.taxa}%` : "0%",
            ];
          }

          rowData.forEach((data, i) => {
            // Cor especial para taxa baseada no valor (última coluna)
            const taxaColumnIndex = isShowingAllMembers ? 6 : 3; // 7ª coluna (índice 6) ou 4ª coluna (índice 3)
            if (i === taxaColumnIndex) {
              const taxa = parseFloat(member.taxa) || 0;
              if (taxa >= 80) {
                doc.setTextColor(0, 128, 0); // Verde para boa frequência
              } else if (taxa >= 60) {
                doc.setTextColor(255, 140, 0); // Laranja para frequência regular
              } else {
                doc.setTextColor(220, 20, 60); // Vermelho para baixa frequência
              }
            } else {
              doc.setTextColor(0, 0, 0);
            }

            doc.text(data, xPos, currentY + 2.8);

            // Linhas verticais
            if (i < rowData.length - 1) {
              doc.setDrawColor(200, 200, 200);
              doc.line(
                xPos + colWidths[i] - 1,
                currentY,
                xPos + colWidths[i] - 1,
                currentY + rowHeight
              );
            }

            xPos += colWidths[i];
          });

          currentY += rowHeight;
          rowIndex++;
        });

        // Rodapé da tabela se houver mais membros
        // Resumo por status com porcentagens
        currentY += 4;
        const ativos = membersDetail.filter((m) => (m.taxa || 0) >= 80).length;
        const irregulares = membersDetail.length - ativos;
        const totalMembros = membersDetail.length;
        const percAtivos =
          totalMembros > 0 ? ((ativos / totalMembros) * 100).toFixed(1) : 0;
        const percIrregulares =
          totalMembros > 0
            ? ((irregulares / totalMembros) * 100).toFixed(1)
            : 0;

        doc.setFontSize(7);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(
          `CONSOLIDADO: ${ativos} com frequência ativa (${percAtivos}%) | ${irregulares} com frequência irregular (${percIrregulares}%) | Total: ${totalMembros} membros`,
          margin,
          currentY
        );

        currentY += 6;
      }

      // =================== INFORMAÇÕES FINAIS ===================
      checkPageBreakWithHeader(15);

      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY, contentWidth, 12, "F");
      doc.setDrawColor(150, 150, 150);
      doc.rect(margin, currentY, contentWidth, 12);

      doc.setFontSize(7);
      doc.setFont(undefined, "bold");
      doc.setTextColor(70, 70, 70);
      doc.text("OBSERVAÇÕES E METODOLOGIA", margin + 2, currentY + 3);

      doc.setFontSize(6);
      doc.setFont(undefined, "normal");
      doc.text(
        "- Este relatório foi gerado automaticamente pelo Sistema de Gestão BRAS",
        margin + 2,
        currentY + 6
      );
      doc.text(
        "- Análise baseada nos registros de presença do período especificado nos filtros",
        margin + 2,
        currentY + 8.5
      );
      doc.text(
        "- Classificação: Ativo (>=80%), Irregular (<80%), Ausente (0%)",
        margin + 2,
        currentY + 11
      );
      doc.text(
        "- Para esclarecimentos ou correções, contate a liderança responsável",
        margin + 2,
        currentY + 13.5
      );

      // =================== RODAPÉ PROFISSIONAL ===================
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Linha superior do rodapé
        doc.setDrawColor(52, 73, 93);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        // Informações do sistema
        doc.setFontSize(6);
        doc.setFont(undefined, "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(
          "Sistema de Controle de Presenças - AD BRAS Vila Solange",
          margin,
          pageHeight - 8
        );

        // Data de geração
        doc.text(`Gerado em: ${dateTimeStr}`, margin, pageHeight - 5);

        // Paginação
        doc.setFont(undefined, "bold");
        doc.setTextColor(52, 73, 93);
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin - 20,
          pageHeight - 6.5
        );

        // Logo/marca (simulado com texto)
        doc.setFontSize(8);
        doc.setFont(undefined, "bold");
        doc.setTextColor(52, 73, 93);
        doc.text("BRAS", pageWidth - margin - 20, pageHeight - 3);
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
    const periodos = [
      ...new Set(allMembersData.map((m) => m.Periodo).filter(Boolean)),
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
    if (filterPeriodoSelect) {
      filterPeriodoSelect.innerHTML =
        '<option value="">Todos</option>' +
        periodos.map((p) => `<option value="${p}">${p}</option>`).join("");
    }
  }

  // Função para atualizar filtros dinamicamente baseado nas seleções
  function updateFiltersBasedOnSelection() {
    const currentLider = filterLiderInput?.value;
    const currentGape = filterGapeInput?.value;
    const currentPeriodo = filterPeriodoSelect?.value;

    // Verifica se é admin
    const leaderName = localStorage.getItem("loggedInLeaderName");
    const isAdmin = !leaderName || leaderName === "admin";

    console.log("🔄 Atualizando filtros dinamicamente:", {
      lider: currentLider,
      gape: currentGape,
      periodo: currentPeriodo,
      isAdmin: isAdmin,
    });

    // Para admin: auto-seleção e correspondência de filtros
    if (isAdmin) {
      if (currentLider && currentLider !== "") {
        // Quando seleciona um líder, preenche automaticamente GAPE e período
        const membrosDoLider = allMembersData.filter(
          (m) => m.Lider === currentLider
        );

        // Pega os GAPEs únicos deste líder
        const gapesDoLider = [
          ...new Set(membrosDoLider.map((m) => m.GAPE).filter(Boolean)),
        ];
        // Pega os períodos únicos deste líder
        const periodosDoLider = [
          ...new Set(membrosDoLider.map((m) => m.Periodo).filter(Boolean)),
        ];

        console.log(`👨‍💼 Líder "${currentLider}" selecionado:`, {
          gapes: gapesDoLider,
          periodos: periodosDoLider,
          totalMembros: membrosDoLider.length,
        });

        // Atualiza e seleciona automaticamente o GAPE (se houver apenas um)
        if (filterGapeInput) {
          filterGapeInput.innerHTML =
            '<option value="">Todos</option>' +
            gapesDoLider
              .map((g) => `<option value="${g}">${g}</option>`)
              .join("");

          if (gapesDoLider.length === 1) {
            filterGapeInput.value = gapesDoLider[0];
            console.log(
              `🎯 GAPE "${gapesDoLider[0]}" selecionado automaticamente`
            );
          } else if (gapesDoLider.length > 1) {
            // Se há múltiplos GAPEs, seleciona o primeiro por padrão
            filterGapeInput.value = gapesDoLider[0];
            console.log(
              `🎯 GAPE "${gapesDoLider[0]}" selecionado (primeiro da lista)`
            );
          }
        }

        // Atualiza e seleciona automaticamente o período (se houver apenas um)
        if (filterPeriodoSelect) {
          filterPeriodoSelect.innerHTML =
            '<option value="">Todos</option>' +
            periodosDoLider
              .map((p) => `<option value="${p}">${p}</option>`)
              .join("");

          if (periodosDoLider.length === 1) {
            filterPeriodoSelect.value = periodosDoLider[0];
            console.log(
              `📅 Período "${periodosDoLider[0]}" selecionado automaticamente`
            );
          } else if (periodosDoLider.length > 1) {
            // Se há múltiplos períodos, seleciona o primeiro por padrão
            filterPeriodoSelect.value = periodosDoLider[0];
            console.log(
              `📅 Período "${periodosDoLider[0]}" selecionado (primeiro da lista)`
            );
          }
        }

        return; // Sai da função para não executar a lógica padrão
      }

      if (currentGape && currentGape !== "") {
        // Quando seleciona um GAPE, preenche automaticamente líder e período
        const membrosDoGape = allMembersData.filter(
          (m) => m.GAPE === currentGape
        );

        // Pega os líderes únicos deste GAPE
        const lideresDoGape = [
          ...new Set(membrosDoGape.map((m) => m.Lider).filter(Boolean)),
        ];
        // Pega os períodos únicos deste GAPE
        const periodosDoGape = [
          ...new Set(membrosDoGape.map((m) => m.Periodo).filter(Boolean)),
        ];

        console.log(`👥 GAPE "${currentGape}" selecionado:`, {
          lideres: lideresDoGape,
          periodos: periodosDoGape,
          totalMembros: membrosDoGape.length,
        });

        // Atualiza e seleciona automaticamente o líder (se houver apenas um)
        if (filterLiderInput) {
          filterLiderInput.innerHTML =
            '<option value="">Todos</option>' +
            lideresDoGape
              .map((l) => `<option value="${l}">${l}</option>`)
              .join("");

          if (lideresDoGape.length === 1) {
            filterLiderInput.value = lideresDoGape[0];
            console.log(
              `🎯 Líder "${lideresDoGape[0]}" selecionado automaticamente`
            );
          } else if (lideresDoGape.length > 1) {
            // Se há múltiplos líderes, seleciona o primeiro por padrão
            filterLiderInput.value = lideresDoGape[0];
            console.log(
              `🎯 Líder "${lideresDoGape[0]}" selecionado (primeiro da lista)`
            );
          }
        }

        // Atualiza e seleciona automaticamente o período (se houver apenas um)
        if (filterPeriodoSelect) {
          filterPeriodoSelect.innerHTML =
            '<option value="">Todos</option>' +
            periodosDoGape
              .map((p) => `<option value="${p}">${p}</option>`)
              .join("");

          if (periodosDoGape.length === 1) {
            filterPeriodoSelect.value = periodosDoGape[0];
            console.log(
              `📅 Período "${periodosDoGape[0]}" selecionado automaticamente`
            );
          } else if (periodosDoGape.length > 1) {
            // Se há múltiplos períodos, seleciona o primeiro por padrão
            filterPeriodoSelect.value = periodosDoGape[0];
            console.log(
              `📅 Período "${periodosDoGape[0]}" selecionado (primeiro da lista)`
            );
          }
        }

        return; // Sai da função para não executar a lógica padrão
      }
    }

    // Lógica padrão para não-admin ou quando não há seleção específica
    let filteredData = allMembersData;

    if (currentLider) {
      filteredData = filteredData.filter((m) => m.Lider === currentLider);
    }

    if (currentGape) {
      filteredData = filteredData.filter((m) => m.GAPE === currentGape);
    }

    // Atualiza as opções de período baseado nos membros filtrados
    if (filterPeriodoSelect && (currentLider || currentGape)) {
      const availablePeriodos = [
        ...new Set(filteredData.map((m) => m.Periodo).filter(Boolean)),
      ].sort();

      console.log("📅 Períodos disponíveis após filtro:", availablePeriodos);

      const currentSelected = filterPeriodoSelect.value;

      filterPeriodoSelect.innerHTML =
        '<option value="">Todos</option>' +
        availablePeriodos
          .map((p) => `<option value="${p}">${p}</option>`)
          .join("");

      // Mantém a seleção se ainda estiver disponível
      if (availablePeriodos.includes(currentSelected)) {
        filterPeriodoSelect.value = currentSelected;
      }
    }

    // Atualiza as opções de líder baseado nas seleções
    if (filterLiderInput && currentGape && !isAdmin) {
      // Só para não-admin
      const availableLideres = [
        ...new Set(filteredData.map((m) => m.Lider).filter(Boolean)),
      ].sort();

      console.log("👨‍💼 Líderes disponíveis após filtro:", availableLideres);

      const currentSelected = filterLiderInput.value;

      filterLiderInput.innerHTML =
        '<option value="">Todos</option>' +
        availableLideres
          .map((l) => `<option value="${l}">${l}</option>`)
          .join("");

      // Mantém a seleção se ainda estiver disponível
      if (availableLideres.includes(currentSelected)) {
        filterLiderInput.value = currentSelected;
      }
    }

    // Atualiza as opções de GAPE baseado nas seleções
    if (filterGapeInput && currentLider && !isAdmin) {
      // Só para não-admin
      const availableGapes = [
        ...new Set(filteredData.map((m) => m.GAPE).filter(Boolean)),
      ].sort();

      console.log("👥 GAPEs disponíveis após filtro:", availableGapes);

      const currentSelected = filterGapeInput.value;

      filterGapeInput.innerHTML =
        '<option value="">Todos</option>' +
        availableGapes
          .map((g) => `<option value="${g}">${g}</option>`)
          .join("");

      // Mantém a seleção se ainda estiver disponível
      if (availableGapes.includes(currentSelected)) {
        filterGapeInput.value = currentSelected;
      }
    }
  }

  // --- Funções de Autenticação e Visão de Líder ---

  function displayLoggedInLeaderName() {
    const leaderName = localStorage.getItem("loggedInLeaderName");
    if (loggedInLeaderNameElement) {
      if (leaderName === "admin") {
        // Destaque especial para admin com fundo dourado e coroas
        loggedInLeaderNameElement.innerHTML = `
          <span class="text-gray-700">Logado como:</span> 
          <span class="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-bold text-sm shadow-lg border-2 border-yellow-300">
            <i class="fas fa-crown mr-1 text-yellow-800"></i>
            ADMINISTRADOR
            <i class="fas fa-crown ml-1 text-yellow-800"></i>
          </span>
        `;

        // Abrir automaticamente o dashboard principal para admin
        setTimeout(() => {
          if (
            mainDashboardOverlay &&
            mainDashboardOverlay.classList.contains("hidden")
          ) {
            abrirDashboard();
          }
        }, 1000); // Aguarda 1 segundo para garantir que todos os elementos estejam carregados
      } else if (leaderName) {
        // Destaque normal para outros usuários
        loggedInLeaderNameElement.innerHTML = `Logado como: <span class="text-blue-600 font-bold">${leaderName}</span>`;
      } else {
        loggedInLeaderNameElement.innerHTML = `Logado como: Não identificado`;
      }
    }
  }

  function setupLeaderView() {
    const leaderName = localStorage.getItem("loggedInLeaderName");
    if (leaderName && leaderName !== "admin") {
      const loggedInMember = allMembersData.find(
        (member) =>
          normalizeString(member.Nome || "") === normalizeString(leaderName)
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
    const originalQuery = event.target.value.trim();
    const query = normalizeString(originalQuery);

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

    // Obtém as restrições de grupo do usuário logado
    const { isAdmin, userGroup } = getUserGroupRestriction();

    // Filtra nomes que contenham a query, restringindo por grupo se necessário
    const matchingNames = allMembersData
      .filter((member) => {
        // Restrição por grupo: se não for admin, só mostra membros do mesmo grupo
        const groupRestriction =
          isAdmin || !userGroup || member.GAPE === userGroup;
        return (
          groupRestriction &&
          member.Nome &&
          normalizeString(member.Nome).includes(query)
        );
      })
      .map((member) => member.Nome)
      .sort()
      .slice(0, 8); // Limita a 8 sugestões

    if (matchingNames.length === 0) {
      showNoResultsMessage(originalQuery);
      return;
    }

    showNameSuggestions(matchingNames, originalQuery);
  }

  function showNameSuggestions(names, query) {
    if (!nameAutocompleteContainer) return;

    nameAutocompleteContainer.innerHTML = "";

    names.forEach((name, index) => {
      // Busca dados do membro para mostrar informações extras
      const memberData = allMembersData.find(
        (member) =>
          member.Nome && normalizeString(member.Nome) === normalizeString(name)
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
    if (!text || !query) return text;

    // Normaliza o texto e a query para comparação
    const normalizedText = normalizeString(text);
    const normalizedQuery = normalizeString(query);

    // Encontra todas as ocorrências da query no texto normalizado
    let result = text;
    let searchIndex = 0;
    let offset = 0;

    while (true) {
      const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex);
      if (matchIndex === -1) break;

      // Calcula as posições no texto original considerando o offset das tags HTML já inseridas
      const realMatchStart = matchIndex + offset;
      const realMatchEnd = realMatchStart + normalizedQuery.length;

      // Extrai a parte original do texto que corresponde à match
      const originalMatch = result.substring(realMatchStart, realMatchEnd);

      // Substitui no texto com destaque
      const highlighted = `<span class="bg-yellow-200 font-semibold">${originalMatch}</span>`;
      result =
        result.substring(0, realMatchStart) +
        highlighted +
        result.substring(realMatchEnd);

      // Atualiza o offset devido às tags HTML inseridas
      offset += highlighted.length - originalMatch.length;

      // Move para a próxima posição de busca
      searchIndex = matchIndex + normalizedQuery.length;
    }

    return result;
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
          normalizeString(member.Nome) === normalizeString(selectedName)
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

        // Restaura todas as opções dos filtros
        fillSelectOptions();

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
        updateFiltersBasedOnSelection();
        applyFilters();
        if (isDashboardOpen) fetchAndDisplaySummary();
      });
    }

    if (filterGapeInput) {
      filterGapeInput.addEventListener("change", () => {
        updateFiltersBasedOnSelection();
        applyFilters();
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
    summaryData,
    membersToAnalyze = []
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
        // Calcular total de membros no escopo atual usando membersToAnalyze
        const membersWithPresence = Object.keys(presencesDetails).length;
        const totalMembers = membersToAnalyze.length || membersWithPresence;
        console.log("📊 Total de membros:", totalMembers);

        // CORREÇÃO: Cálculo correto da média de presença baseado em membros
        const avgPresenceRate =
          totalMembers > 0
            ? ((membersWithPresence / totalMembers) * 100).toFixed(1)
            : 0;

        console.log(`📊 Cálculo da média de presença do grupo (por membros):
          - Membros com presença: ${membersWithPresence}
          - Total de membros: ${totalMembers}
          - Taxa calculada: ${avgPresenceRate}%`);

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

// --- FUNÇÕES DO DASHBOARD PRINCIPAL ---

// Definição da URL do backend para o dashboard
const DASHBOARD_BACKEND_URL = (function () {
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return isLocalhost
    ? "http://localhost:3000"
    : "https://backendbras.onrender.com";
})();

let presencaPorGrupoChart = null;
let evolucaoSemanalChart = null;

// Função para carregar dados do dashboard
async function carregarDadosDashboard(mes = "", grupo = "") {
  try {
    console.log("🎯 Carregando dados do dashboard...", { mes, grupo });

    // Mostrar indicador de carregamento
    mostrarCarregandoDashboard();

    const params = new URLSearchParams();
    if (mes) params.append("mes", mes);
    if (grupo) params.append("grupo", grupo);

    console.log(
      "📡 Fazendo requisição para:",
      `${DASHBOARD_BACKEND_URL}/dashboard-stats?${params}`
    );

    const response = await fetch(
      `${DASHBOARD_BACKEND_URL}/dashboard-stats?${params}`
    );

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log("✅ Dados do dashboard carregados:", result.data);

      // Verificar se os dados são simulados e mostrar aviso
      if (result.data.isSimulated) {
        console.log("⚠️ Usando dados simulados como fallback");
        mostrarAvisoSimulacao();
      } else {
        console.log("✅ Usando dados reais do Google Sheets");
        esconderAvisoSimulacao();
      }

      // Esconder indicador de carregamento
      esconderCarregandoDashboard();

      atualizarInterfaceDashboard(result.data);
      return result.data;
    } else {
      throw new Error(result.message || "Erro ao carregar dados");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar dados do dashboard:", error);

    // Esconder indicador de carregamento em caso de erro
    esconderCarregandoDashboard();

    // Mostrar erro para o usuário
    mostrarErroCarregamento(error.message);

    // Dados simulados para fallback local
    const dadosSimulados = {
      totalPessoas: 235,
      totalGrupos: 12,
      presencaMedia: 87,
      melhorGrupo: { nome: "Grupo A", percentual: 95 },
      piorGrupo: { nome: "Grupo F", percentual: 65 },
      grupos: [
        { nome: "Grupo A", totalMembros: 25, presencaPercentual: 95 },
        { nome: "Grupo B", totalMembros: 22, presencaPercentual: 88 },
        { nome: "Grupo C", totalMembros: 20, presencaPercentual: 82 },
        { nome: "Grupo D", totalMembros: 18, presencaPercentual: 76 },
        { nome: "Grupo E", totalMembros: 15, presencaPercentual: 70 },
        { nome: "Grupo F", totalMembros: 12, presencaPercentual: 65 },
      ],
      ultimosRegistros: [
        {
          dataHora: "22/07 08:10",
          grupo: "Grupo B",
          pessoa: "João Silva",
          status: "Presente",
        },
        {
          dataHora: "22/07 08:12",
          grupo: "Grupo A",
          pessoa: "Maria Costa",
          status: "Presente",
        },
        {
          dataHora: "22/07 08:15",
          grupo: "Grupo C",
          pessoa: "Pedro Santos",
          status: "Presente",
        },
        {
          dataHora: "22/07 08:18",
          grupo: "Grupo D",
          pessoa: "Ana Oliveira",
          status: "Presente",
        },
        {
          dataHora: "22/07 08:20",
          grupo: "Grupo E",
          pessoa: "Carlos Lima",
          status: "Presente",
        },
      ],
      isSimulated: true,
    };

    console.log("🔄 Usando dados simulados locais como fallback final");
    mostrarAvisoSimulacao();
    atualizarInterfaceDashboard(dadosSimulados);
    return dadosSimulados;
  }
}

// Função para mostrar aviso de simulação
function mostrarAvisoSimulacao() {
  const avisoId = "avisoSimulacao";
  let aviso = document.getElementById(avisoId);

  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = avisoId;
    aviso.className =
      "fixed top-4 right-4 z-50 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg shadow-lg max-w-md";
    aviso.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-yellow-500"></i>
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-bold">Dados Simulados</h4>
            <p class="text-xs mt-1">Os dados reais não puderam ser carregados. Exibindo dados simulados para demonstração.</p>
          </div>
          <button onclick="document.getElementById('${avisoId}').remove()" class="ml-auto text-yellow-500 hover:text-yellow-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;

    document.body.appendChild(aviso);

    // Auto remover após 8 segundos
    setTimeout(() => {
      if (document.getElementById(avisoId)) {
        document.getElementById(avisoId).remove();
      }
    }, 8000);
  }
}

// Função para esconder aviso de simulação
function esconderAvisoSimulacao() {
  const aviso = document.getElementById("avisoSimulacao");
  if (aviso) {
    aviso.remove();
  }
}

// Função para mostrar erro de carregamento
function mostrarErroCarregamento(mensagem) {
  const erroId = "erroCarregamento";
  let erro = document.getElementById(erroId);

  if (!erro) {
    erro = document.createElement("div");
    erro.id = erroId;
    erro.className =
      "fixed top-4 right-4 z-50 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow-lg max-w-md";
    erro.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-circle text-red-500"></i>
          </div>
          <div class="ml-3">
            <h4 class="text-sm font-bold">Erro no Carregamento</h4>
            <p class="text-xs mt-1">${mensagem}</p>
            <p class="text-xs mt-1 font-semibold">Usando dados simulados temporariamente.</p>
          </div>
          <button onclick="document.getElementById('${erroId}').remove()" class="ml-auto text-red-500 hover:text-red-700">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;

    document.body.appendChild(erro);

    // Auto remover após 10 segundos
    setTimeout(() => {
      if (document.getElementById(erroId)) {
        document.getElementById(erroId).remove();
      }
    }, 10000);
  }
}

// Função para mostrar indicador de carregamento no dashboard
function mostrarCarregandoDashboard() {
  // Adicionar overlay de loading sobre o dashboard
  const dashboard = document.getElementById("mainDashboardOverlay");
  if (!dashboard) return;

  // Remove loading anterior se existir
  const existingLoading = document.getElementById("dashboardLoading");
  if (existingLoading) {
    existingLoading.remove();
  }

  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "dashboardLoading";
  loadingOverlay.className =
    "absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg";
  loadingOverlay.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="text-gray-700 font-medium">Atualizando dados...</span>
    </div>
  `;

  dashboard.appendChild(loadingOverlay);
}

// Função para esconder indicador de carregamento no dashboard
function esconderCarregandoDashboard() {
  const loadingOverlay = document.getElementById("dashboardLoading");
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Função para atualizar a interface do dashboard
function atualizarInterfaceDashboard(dados) {
  // Atualizar título do dashboard principal
  if (dashboardTitle) {
    if (
      dados.filtros &&
      dados.filtros.grupoNome &&
      dados.filtros.grupoEspecifico
    ) {
      // Título com grupo selecionado destacado
      dashboardTitle.innerHTML = `DASHBOARD DE PRESENÇA - <span class="text-yellow-300 font-bold">${dados.filtros.grupoNome}</span>`;
    } else {
      // Título normal
      dashboardTitle.textContent = "DASHBOARD DE PRESENÇA";
    }
  }

  // Atualizar cards de estatísticas
  document.getElementById("totalPessoas").textContent = dados.totalPessoas || 0;
  document.getElementById("totalGrupos").textContent = dados.totalGrupos || 0;
  document.getElementById("presencaMediaGeral").textContent = `${
    dados.presencaMedia || 0
  }%`;

  // Atualizar títulos e dados dos cards baseado no contexto
  const melhorTitulo = document.getElementById("melhorGrupoTitulo");
  const piorTitulo = document.getElementById("piorGrupoTitulo");

  if (dados.filtros && dados.filtros.grupoEspecifico) {
    // Contexto de grupo específico - mostrar estatísticas de membros
    if (melhorTitulo) melhorTitulo.innerHTML = "MELHOR EM<br />PRESENÇAS";
    if (piorTitulo) piorTitulo.innerHTML = "MEMBRO COM<br />MAIS FALTAS";
  } else {
    // Contexto geral - mostrar estatísticas de grupos
    if (melhorTitulo) melhorTitulo.innerHTML = "MELHOR<br />GRUPO<br />(MÊS)";
    if (piorTitulo) piorTitulo.innerHTML = "PIOR<br />GRUPO<br />(MÊS)";
  }

  document.getElementById("melhorGrupoNome").textContent =
    dados.melhorGrupo?.nome || "N/A";
  document.getElementById("melhorGrupoPercentual").textContent = `${
    dados.melhorGrupo?.percentual || 0
  }%`;

  document.getElementById("piorGrupoNome").textContent =
    dados.piorGrupo?.nome || "N/A";
  document.getElementById("piorGrupoPercentual").textContent = `${
    dados.piorGrupo?.percentual || 0
  }%`;

  // Adicionar indicador de tipo de dados e filtros no cabeçalho
  const titulo = document.querySelector("#mainDashboardOverlay h2");
  if (titulo) {
    const indicador = dados.isSimulated
      ? '<span class="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full ml-2">DADOS SIMULADOS</span>'
      : '<span class="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full ml-2">DADOS REAIS</span>';

    // Mostrar filtros aplicados
    let filtrosTexto = "";
    if (dados.filtros) {
      const filtrosAtivos = [];
      if (dados.filtros.mes && dados.filtros.mes !== "todos") {
        const meses = [
          "",
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
        filtrosAtivos.push(
          `Mês: ${meses[parseInt(dados.filtros.mes)] || dados.filtros.mes}`
        );
      }
      if (dados.filtros.grupo && dados.filtros.grupo !== "todos") {
        filtrosAtivos.push(`Grupo: ${dados.filtros.grupo}`);
      }

      if (filtrosAtivos.length > 0) {
        filtrosTexto = `<div class="text-xs text-blue-600 mt-1">📊 Filtros: ${filtrosAtivos.join(
          " | "
        )}</div>`;
      }
    }

    titulo.innerHTML = `Dashboard Administrativo ${indicador}${filtrosTexto}`;
  }

  // Atualizar tabela de últimos registros
  console.log("🔄 Carregando últimos registros com paginação...");
  // Sempre usar a nova API de paginação
  carregarUltimosRegistros(true);

  // Atualizar gráficos
  atualizarGraficoPresencaPorGrupo(dados.grupos || []);
  atualizarGraficoEvolucaoSemanal(dados.grupos || []);

  // Atualizar filtro de grupos
  atualizarFiltroGrupos(dados.grupos || []);

  // Log para debug
  console.log("📊 Interface do dashboard atualizada:", {
    totalPessoas: dados.totalPessoas,
    totalGrupos: dados.totalGrupos,
    presencaMedia: dados.presencaMedia,
    isSimulated: dados.isSimulated || false,
  });
}

// Variáveis para controle de paginação dos registros
let registrosPaginacao = {
  offset: 0,
  limit: 5,
  total: 0,
  carregando: false,
  grupoAtual: null,
};

// Função para atualizar tabela de últimos registros (versão básica para compatibilidade)
function atualizarTabelaUltimosRegistros(registros) {
  const tabela = document.getElementById("ultimosRegistrosTable");
  if (!tabela) {
    console.log("❌ Tabela ultimosRegistrosTable não encontrada");
    return;
  }

  console.log(
    "📊 atualizarTabelaUltimosRegistros chamada - sempre usando paginação"
  );

  // Sempre buscar registros via API com paginação
  carregarUltimosRegistros(true);
}

// Função principal para carregar registros via API
async function carregarUltimosRegistros(resetar = false) {
  if (registrosPaginacao.carregando) {
    console.log("⏳ Já está carregando registros, ignorando");
    return;
  }

  const tabela = document.getElementById("ultimosRegistrosTable");
  if (!tabela) {
    console.log(
      "❌ Tabela ultimosRegistrosTable não encontrada em carregarUltimosRegistros"
    );
    return;
  }

  console.log("🔄 carregarUltimosRegistros chamada, resetar:", resetar);

  if (resetar) {
    registrosPaginacao.offset = 0;
    tabela.innerHTML = "";
    console.log("🔄 Resetando paginação e limpando tabela");
  }

  registrosPaginacao.carregando = true;

  try {
    const grupoFiltro = document.getElementById("groupFilter")?.value || "";
    registrosPaginacao.grupoAtual = grupoFiltro;

    const params = new URLSearchParams({
      offset: registrosPaginacao.offset,
      limit: registrosPaginacao.limit,
    });

    if (grupoFiltro && grupoFiltro !== "todos") {
      params.append("grupo", grupoFiltro);
    }

    const response = await fetch(`${BACKEND_URL}/ultimos-registros?${params}`);
    const data = await response.json();

    if (data.success) {
      registrosPaginacao.total = data.total;

      console.log("📊 Dados recebidos:", {
        registros: data.registros.length,
        total: data.total,
        offset: data.offset,
        hasMore: data.hasMore,
        offsetAtual: registrosPaginacao.offset,
      });

      if (resetar) {
        exibirRegistrosNaTabela(data.registros, data.hasMore);
      } else {
        adicionarRegistrosNaTabela(data.registros, data.hasMore);
      }

      registrosPaginacao.offset += data.registros.length;
    } else {
      console.error("Erro ao carregar registros:", data.message);
    }
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    if (resetar) {
      tabela.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-4 text-center text-red-500">
            Erro ao carregar registros
          </td>
        </tr>
      `;
    }
  } finally {
    registrosPaginacao.carregando = false;
  }
}

// Função para exibir registros na tabela (primeira carga)
function exibirRegistrosNaTabela(registros, hasMore) {
  const tabela = document.getElementById("ultimosRegistrosTable");
  if (!tabela) {
    console.log(
      "❌ Tabela ultimosRegistrosTable não encontrada em exibirRegistrosNaTabela"
    );
    return;
  }

  console.log(
    "📋 exibirRegistrosNaTabela chamada com:",
    registros.length,
    "registros, hasMore:",
    hasMore
  );

  if (registros.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4" class="px-6 py-4 text-center text-gray-500">
          Nenhum registro encontrado
        </td>
      </tr>
    `;
    return;
  }

  // Limpar tabela
  tabela.innerHTML = "";

  // Adicionar registros
  registros.forEach((registro, index) => {
    console.log(`📝 Adicionando registro ${index + 1}:`, registro);
    adicionarLinhaRegistro(tabela, registro);
  });

  // Sempre verificar se deve mostrar o botão "Ver Mais"
  // Mostrar se hasMore for true OU se há mais registros no total
  const totalCarregado = registrosPaginacao.offset + registros.length;
  const temMaisRegistros = hasMore || registrosPaginacao.total > totalCarregado;

  if (temMaisRegistros) {
    console.log(
      "➕ Adicionando botão Ver Mais (hasMore:",
      hasMore,
      "total:",
      registrosPaginacao.total,
      "carregado:",
      totalCarregado,
      ")"
    );
    adicionarBotaoVerMais(tabela);
  } else {
    console.log("✅ Não há mais registros para carregar");
  }
}

// Função para adicionar mais registros na tabela (carregamento adicional)
function adicionarRegistrosNaTabela(registros, hasMore) {
  const tabela = document.getElementById("ultimosRegistrosTable");
  if (!tabela) return;

  // Remover botão "Ver Mais" anterior se existir
  const botaoAnterior = tabela.querySelector(".btn-ver-mais-row");
  if (botaoAnterior) {
    botaoAnterior.remove();
  }

  // Adicionar novos registros
  registros.forEach((registro) => {
    adicionarLinhaRegistro(tabela, registro);
  });

  // Sempre verificar se deve mostrar o botão "Ver Mais"
  // Mostrar se hasMore for true OU se há mais registros no total
  const totalCarregado = registrosPaginacao.offset + registros.length;
  const temMaisRegistros = hasMore || registrosPaginacao.total > totalCarregado;

  if (temMaisRegistros) {
    console.log(
      "➕ Adicionando novo botão Ver Mais após carregar mais registros"
    );
    adicionarBotaoVerMais(tabela);
  } else {
    console.log("✅ Todos os registros foram carregados");
  }
}

// Função para adicionar uma linha de registro
function adicionarLinhaRegistro(tabela, registro) {
  let statusClass, statusIcon;

  switch (registro.status) {
    case "Presente":
      statusClass = "text-green-600";
      statusIcon = "fa-check-circle";
      break;
    case "Presença Removida":
      statusClass = "text-orange-600";
      statusIcon = "fa-minus-circle";
      break;
    case "Ausente":
      statusClass = "text-red-600";
      statusIcon = "fa-times-circle";
      break;
    default:
      statusClass = "text-gray-600";
      statusIcon = "fa-question-circle";
  }

  const linha = document.createElement("tr");
  linha.className =
    "border-b border-gray-200 hover:bg-gray-50 transition-colors";
  linha.innerHTML = `
    <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-900">${
      registro.dataHora
    }</td>
    <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-900">${
      registro.grupo || "N/A"
    }</td>
    <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-900">${
      registro.pessoa
    }</td>
    <td class="px-6 py-3 whitespace-nowrap text-sm ${statusClass}">
      <i class="fas ${statusIcon} mr-2"></i>${registro.status}
    </td>
  `;
  tabela.appendChild(linha);
}

// Função para adicionar botão "Ver Mais"
function adicionarBotaoVerMais(tabela) {
  const linhaBotao = document.createElement("tr");
  linhaBotao.className = "btn-ver-mais-row";
  linhaBotao.innerHTML = `
    <td colspan="4" class="px-6 py-4 text-center">
      <button 
        class="btn-ver-mais inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors duration-200"
        onclick="carregarMaisRegistros()"
      >
        <i class="fas fa-chevron-down mr-2"></i>
        Ver mais 10 registros
      </button>
    </td>
  `;
  tabela.appendChild(linhaBotao);
}

// Função para carregar mais registros (chamada pelo botão)
async function carregarMaisRegistros() {
  const botao = document.querySelector(".btn-ver-mais");
  if (!botao || registrosPaginacao.carregando) return;

  // Mostrar loading no botão
  const textoOriginal = botao.innerHTML;
  botao.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Carregando...';
  botao.disabled = true;

  // Aumentar limite para carregar mais registros
  registrosPaginacao.limit = 10;

  try {
    await carregarUltimosRegistros(false);
  } finally {
    // Restaurar botão
    botao.innerHTML = textoOriginal;
    botao.disabled = false;
  }
}

// Função simplificada para limpar registros (usa apenas GET)
async function limparRegistrosSimples() {
  if (
    !confirm(
      "Tem certeza que deseja limpar todos os registros? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  try {
    console.log("🧹 Limpando registros via GET...");

    const response = await fetch(`${BACKEND_URL}/limpar-registros-agora`);

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      console.log("✅ Registros limpos:", data.message);

      // Limpar tabela visualmente
      const tabela = document.getElementById("ultimosRegistrosTable");
      if (tabela) {
        tabela.innerHTML = `
          <tr>
            <td colspan="4" class="px-6 py-4 text-center text-gray-500">
              Nenhum registro encontrado
            </td>
          </tr>
        `;
      }

      // Resetar controle de paginação
      registrosPaginacao.offset = 0;
      registrosPaginacao.total = 0;

      alert(`✅ ${data.totalRemovidos} registros foram limpos com sucesso!`);
    } else {
      alert("Erro: " + (data.message || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    alert(`Erro ao limpar registros: ${error.message}`);
  }
}

// Função para limpar todos os registros
async function limparRegistros() {
  if (
    !confirm(
      "Tem certeza que deseja limpar todos os registros? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  try {
    console.log("🧹 Limpando registros...");

    // Tentar DELETE, depois POST, depois GET como fallback
    let response;
    let metodoUsado = "";

    try {
      response = await fetch(`${BACKEND_URL}/ultimos-registros`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      metodoUsado = "DELETE";

      // Verificar se a resposta é válida
      if (!response.ok) {
        throw new Error(`DELETE falhou com status ${response.status}`);
      }
    } catch (deleteError) {
      console.log("⚠️ DELETE falhou, tentando POST:", deleteError.message);
      try {
        response = await fetch(`${BACKEND_URL}/limpar-registros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        metodoUsado = "POST";

        // Verificar se a resposta é válida
        if (!response.ok) {
          throw new Error(`POST falhou com status ${response.status}`);
        }
      } catch (postError) {
        console.log("⚠️ POST falhou, tentando GET:", postError.message);
        response = await fetch(`${BACKEND_URL}/limpar-registros-agora`);
        metodoUsado = "GET";
      }
    }

    // Verificar se temos uma resposta válida
    if (!response.ok) {
      throw new Error(
        `Todas as tentativas falharam. Último status: ${response.status}`
      );
    }

    // Verificar se é JSON válido
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("⚠️ Resposta não é JSON, tentando como texto");
      const text = await response.text();
      console.log("📄 Resposta recebida:", text);
      throw new Error("Servidor retornou resposta inválida (não JSON)");
    }

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Registros limpos via ${metodoUsado}:`, data.message);

      // Limpar tabela visualmente
      const tabela = document.getElementById("ultimosRegistrosTable");
      if (tabela) {
        tabela.innerHTML = `
          <tr>
            <td colspan="4" class="px-6 py-4 text-center text-gray-500">
              Nenhum registro encontrado
            </td>
          </tr>
        `;
      }

      // Resetar controle de paginação
      registrosPaginacao.offset = 0;
      registrosPaginacao.total = 0;

      // Mostrar mensagem de sucesso
      alert(`✅ ${data.totalRemovidos} registros foram limpos com sucesso!`);
    } else {
      console.error("❌ Erro ao limpar registros:", data.message);
      alert("Erro ao limpar registros: " + data.message);
    }
  } catch (error) {
    console.error("❌ Erro ao limpar registros:", error);
    alert(
      `Erro ao limpar registros: ${error.message}\n\nVerifique se o servidor está rodando.`
    );
  }
}

// Função para atualizar gráfico de presença por grupo
function atualizarGraficoPresencaPorGrupo(grupos) {
  const canvas = document.getElementById("presencaPorGrupoChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Destruir gráfico anterior se existir
  if (presencaPorGrupoChart) {
    presencaPorGrupoChart.destroy();
  }

  const labels = grupos.map((g) => g.nome);
  const data = grupos.map((g) => g.presencaPercentual);

  presencaPorGrupoChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Presença (%)",
          data: data,
          backgroundColor: [
            "#10B981",
            "#3B82F6",
            "#8B5CF6",
            "#F59E0B",
            "#EF4444",
            "#6B7280",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      layout: {
        padding: 10,
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + "%";
            },
          },
        },
      },
    },
  });
}

// Função para atualizar gráfico de evolução semanal
function atualizarGraficoEvolucaoSemanal(grupos = []) {
  const canvas = document.getElementById("evolucaoSemanalChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Destruir gráfico anterior se existir
  if (evolucaoSemanalChart) {
    evolucaoSemanalChart.destroy();
  }

  // Calcular dados de evolução baseados nos grupos
  const labels = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];
  let data = [];

  if (grupos.length > 0) {
    // Usar dados dos grupos para calcular evolução
    const presencaMedia =
      grupos.reduce((acc, g) => acc + g.presencaPercentual, 0) / grupos.length;

    // Simular uma evolução baseada na presença média atual
    data = [
      Math.max(presencaMedia - 5, 50), // Semana 1
      Math.max(presencaMedia - 2, 55), // Semana 2
      Math.max(presencaMedia + 1, 60), // Semana 3
      presencaMedia, // Semana 4 (atual)
    ];
  } else {
    // Dados de fallback
    data = [82, 85, 88, 87];
  }

  evolucaoSemanalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Presença Média (%)",
          data: data,
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#3B82F6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      layout: {
        padding: 10,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Presença: ${Math.round(context.parsed.y)}%`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + "%";
            },
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
      },
      elements: {
        line: {
          borderWidth: 3,
        },
      },
    },
  });
}

// Função para atualizar filtro de grupos
function atualizarFiltroGrupos(grupos) {
  const select = document.getElementById("dashboardGrupoFilter");
  if (!select) return;

  // Armazenar valor selecionado atual
  const valorAtual = select.value;

  // Limpar opções existentes (exceto a primeira - "Todos os grupos")
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Adicionar opções dos grupos
  grupos.forEach((grupo) => {
    const option = document.createElement("option");
    option.value = grupo.nome;
    option.textContent = grupo.nome;
    select.appendChild(option);
  });

  // Restaurar seleção anterior se ainda existir
  if (valorAtual) {
    const opcaoExiste = Array.from(select.options).some(
      (option) => option.value === valorAtual
    );
    if (opcaoExiste) {
      select.value = valorAtual;
    } else {
      select.value = ""; // Reset para "Todos os grupos" se a opção não existir mais
    }
  }
}

// Função para resetar filtros do dashboard
function resetarFiltrosDashboard() {
  if (dashboardMesFilter) {
    dashboardMesFilter.value = "";
  }
  if (dashboardGrupoFilter) {
    dashboardGrupoFilter.value = "";
    // Remover destaque visual
    dashboardGrupoFilter.classList.remove(
      "ring-2",
      "ring-yellow-400",
      "border-yellow-400"
    );
  }
}

// Função para abrir o dashboard
function abrirDashboard() {
  if (mainDashboardOverlay) {
    mainDashboardOverlay.classList.remove("hidden");
    // Carregar dashboard com filtros atuais (mantém seleção se houver)
    const mes = dashboardMesFilter ? dashboardMesFilter.value : "";
    const grupo = dashboardGrupoFilter ? dashboardGrupoFilter.value : "";
    carregarDadosDashboard(mes, grupo);
  }
}

// Função para fechar o dashboard
function fecharDashboard() {
  if (mainDashboardOverlay) {
    mainDashboardOverlay.classList.add("hidden");
  }
}

// Event listeners para o dashboard
if (openDashboardBtn) {
  openDashboardBtn.addEventListener("click", abrirDashboard);
}

if (closeDashboard) {
  closeDashboard.addEventListener("click", fecharDashboard);
}

// Event listeners para filtros do dashboard
if (dashboardMesFilter) {
  dashboardMesFilter.addEventListener("change", () => {
    const mes = dashboardMesFilter.value;
    const grupo = dashboardGrupoFilter ? dashboardGrupoFilter.value : "";

    console.log("📅 Filtro de mês alterado:", mes);

    // Mostrar feedback visual imediato
    if (mes) {
      const mesNome =
        dashboardMesFilter.options[dashboardMesFilter.selectedIndex].text;
      console.log(`🎯 Aplicando filtro: ${mesNome}`);
    } else {
      console.log("🎯 Removendo filtro de mês - mostrando todos os meses");
    }

    carregarDadosDashboard(mes, grupo);
  });
}

if (dashboardGrupoFilter) {
  dashboardGrupoFilter.addEventListener("change", () => {
    const mes = dashboardMesFilter ? dashboardMesFilter.value : "";
    const grupo = dashboardGrupoFilter.value;

    console.log("👥 Filtro de grupo alterado:", grupo || "TODOS");

    // Mostrar feedback visual imediato
    if (grupo && grupo.trim() !== "") {
      console.log(`🎯 Aplicando filtro: ${grupo}`);
      // Destacar visualmente o select quando um grupo específico está selecionado
      dashboardGrupoFilter.classList.add(
        "ring-2",
        "ring-yellow-400",
        "border-yellow-400"
      );
    } else {
      console.log("🎯 Removendo filtro de grupo - mostrando todos os grupos");
      // Remover destaque visual quando voltamos para "Todos os grupos"
      dashboardGrupoFilter.classList.remove(
        "ring-2",
        "ring-yellow-400",
        "border-yellow-400"
      );
    }

    carregarDadosDashboard(mes, grupo);

    // Recarregar registros com o novo filtro de grupo
    carregarUltimosRegistros(true);
  });
}

// Event listener para o botão de limpar filtros
if (limparFiltrosDashboard) {
  limparFiltrosDashboard.addEventListener("click", () => {
    console.log("🧹 Limpando todos os filtros do dashboard");

    // Resetar filtros
    resetarFiltrosDashboard();

    // Recarregar dashboard sem filtros
    carregarDadosDashboard("", "");

    console.log("✅ Filtros limpos - mostrando dados gerais");
  });
}

// Função para verificar se o usuário é admin e mostrar botão do dashboard
function verificarPermissoesDashboard() {
  const loggedUser = sessionStorage.getItem("loggedInUser");
  const loggedRI = sessionStorage.getItem("loggedInRI");

  if (loggedUser === "admin" || loggedRI === "admin") {
    if (openDashboardBtn) {
      openDashboardBtn.classList.remove("hidden");
    }
  } else {
    if (openDashboardBtn) {
      openDashboardBtn.classList.add("hidden");
    }
  }
}

// Chamar verificação de permissões quando a página carregar
document.addEventListener("DOMContentLoaded", verificarPermissoesDashboard);

// Event listeners para botões de ação do dashboard
document.addEventListener("click", (e) => {
  if (e.target.id === "baixarRelatorio") {
    alert("Funcionalidade de relatório em desenvolvimento");
  } else if (e.target.id === "configurarGrupos") {
    alert("Funcionalidade de configuração de grupos em desenvolvimento");
  } else if (e.target.id === "gerenciarPessoas") {
    fecharDashboard();
    // O painel principal já está aberto
  }
});

// Fim da verificação dashboardInitialized
