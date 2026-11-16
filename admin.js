// ========================================================
// NISSA ADMIN - LÓGICA DE CONTROL DE CATÁLOGO Y PRECIOS
// 100% Compatible con GitHub Pages (Costo $0)
// ========================================================

const DEFAULT_PASS = "nissa2026";

// Limpieza automática única del token anterior para permitir ingresar uno nuevo limpio
(function checkAndPurgeOldTokenOnce() {
  const CLEANUP_KEY = "nissa_gh_token_clean_v3";
  if (!localStorage.getItem(CLEANUP_KEY)) {
    localStorage.removeItem("gh_token");
    localStorage.setItem(CLEANUP_KEY, "true");
  }
})();

// Normalizador seguro de tokens de GitHub (elimina espacios, comillas accidentales y prefijos)
function sanitizeGithubToken(rawToken) {
  if (!rawToken) return "";
  let t = String(rawToken).trim();
  t = t.replace(/^["'`]|["'`]$/g, "").trim();
  t = t.replace(/^(token|Bearer)\s+/i, "").trim();
  return t;
}

let currentProducts = [];
let originalProductsBackup = [];
let editingProductId = null;
let activeSearchTerm = "";
let activeCategoryFilter = "todos";
let activeSortFilter = "default";

// Estado del Presupuestador de Reparaciones
let currentCotizador = null;
let originalCotizadorBackup = null;
let activeAdminSection = "products";
let activeCotizadorCategory = "celulares";
let activeCelularBrand = "todos"; // Por defecto mostrar todos los modelos
let cotizadorSearchTerm = "";
let autoSaveCotizadorTimeout = null;

// Estado de Estética y Diseño de la Tienda
let currentSiteConfig = null;
let originalSiteConfigBackup = null;
let activeEsteticaSubtab = "orden";
let pendingBannerFileState = { dataUrl: "", filename: "" };

// ========================================================
// Runtime authentication state (in-memory only).
// Resets to false on every page visit, reload, or link navigation.
// This strictly enforces the password prompt whenever the admin URL is opened.
let isSessionAuthenticated = false;

function getStoredPassword() {
  return localStorage.getItem("nissa_admin_pass") || DEFAULT_PASS;
}

function isAuthenticated() {
  return isSessionAuthenticated;
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("admin-pass");
  const errorMsg = document.getElementById("login-error");
  if (!input) return;

  const entered = input.value.trim();
  const correct = getStoredPassword();

  if (entered === correct) {
    isSessionAuthenticated = true;
    // Clear any previous persistent session flag so a reload always re-prompts
    sessionStorage.removeItem("nissa_admin_auth");
    if (errorMsg) errorMsg.style.display = "none";
    input.value = ""; // Clear password from DOM
    showAdminApp();
  } else {
    isSessionAuthenticated = false;
    if (errorMsg) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "⚠️ Contraseña incorrecta. Por favor volvé a intentarlo.";
    }
    input.value = "";
    input.focus();
  }
}

function handleLogout() {
  if (confirm("¿Estás seguro de que deseás cerrar la sesión del panel?")) {
    isSessionAuthenticated = false;
    sessionStorage.removeItem("nissa_admin_auth");
    const input = document.getElementById("admin-pass");
    if (input) input.value = "";
    showLoginScreen();
  }
}

function togglePassVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === "password" ? "text" : "password";
}

function openPassChangeModal() {
  const modal = document.getElementById("pass-modal");
  const err = document.getElementById("pass-error");
  if (err) err.style.display = "none";
  if (modal) modal.style.display = "flex";
}

function closePassModal() {
  const modal = document.getElementById("pass-modal");
  if (modal) modal.style.display = "none";
}

function saveNewPass(e) {
  if (e) e.preventDefault();
  const newPass = document.getElementById("new-pass").value;
  const confirmPass = document.getElementById("confirm-pass").value;
  const err = document.getElementById("pass-error");

  if (!newPass || newPass.length < 4) {
    if (err) {
      err.style.display = "block";
      err.textContent = "La contraseña debe tener al menos 4 caracteres.";
    }
    return;
  }
  if (newPass !== confirmPass) {
    if (err) {
      err.style.display = "block";
      err.textContent = "Las contraseñas no coinciden.";
    }
    return;
  }

  localStorage.setItem("nissa_admin_pass", newPass);
  closePassModal();
  showAlert("✓ Contraseña actualizada correctamente.");
}

// ========================================================
// 2. INICIALIZACIÓN DE LA APLICACIÓN
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
  // Asegurar siempre cierre de cualquier sesión previa y exigir contraseña obligatoria
  sessionStorage.removeItem("nissa_admin_auth");
  isSessionAuthenticated = false;
  showLoginScreen();

  const input = document.getElementById("admin-pass");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 120);
  }
});

function showLoginScreen() {
  const login = document.getElementById("login-screen");
  const app = document.getElementById("admin-app");
  if (login) login.style.display = "flex";
  if (app) app.style.display = "none";
}

function showAdminApp() {
  if (!isSessionAuthenticated) {
    showLoginScreen();
    return;
  }
  const login = document.getElementById("login-screen");
  const app = document.getElementById("admin-app");
  if (login) login.style.display = "none";
  if (app) app.style.display = "flex";

  loadInitialProducts();
  loadAllCachedImages();
  loadInitialCotizador();
  loadInitialSiteConfig();
  renderCategoryFilter();
  renderProductsList();
  renderCotizadorDynamicActions();
  checkDraftStatus();
  updateCountsBadge();
  setupDropzoneAndPasteEvents();
}

function loadInitialProducts() {
  // Tomar copia de respaldo de los productos originales cargados desde products.js
  if (typeof window.products !== "undefined" && Array.isArray(window.products)) {
    originalProductsBackup = JSON.parse(JSON.stringify(window.products));
  }

  // Verificar si hay borrador local
  const draft = localStorage.getItem("nissa_catalog_draft");
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      if (Array.isArray(parsed) && parsed.length > 0) {
        currentProducts = parsed;
        return;
      }
    } catch (e) {
      console.error("Error al cargar borrador:", e);
    }
  }

  currentProducts = JSON.parse(JSON.stringify(originalProductsBackup));
}

function checkDraftStatus() {
  const catDraft = localStorage.getItem("nissa_catalog_draft");
  const cotDraft = localStorage.getItem("nissa_cotizador_draft");
  const siteDraft = localStorage.getItem("nissa_site_config_draft");
  const badge = document.getElementById("draft-indicator");
  if (badge) {
    if (catDraft || cotDraft || siteDraft) {
      badge.style.display = "inline-block";
      badge.textContent = "Cambios sin guardar";
    } else {
      badge.style.display = "none";
    }
  }
}

function updateCountsBadge() {
  const badge = document.getElementById("product-count-badge");
  if (badge) {
    const prodCount = currentProducts ? currentProducts.length : 0;
    const repCount = getCotizadorTotalRepairsCount();
    badge.textContent = `${prodCount} Productos · ${repCount} Tarifas Cotizador`;
  }
}

function saveDraft() {
  try {
    localStorage.setItem("nissa_catalog_draft", JSON.stringify(currentProducts));
  } catch (err) {
    console.warn("No se pudo guardar en localStorage (cuota de almacenamiento excedida?):", err);
  }
  checkDraftStatus();
  updateCountsBadge();
}

function applyAndSaveCatalogChanges() {
  saveDraft();
  if (typeof window !== "undefined") {
    window.products = currentProducts;
  }
  renderProductsList();
  renderCategoryFilter();

  const cfg = getGithubConfig();
  if (!cfg.token) {
    alert("⚠️ Para guardar y publicar los cambios en la tienda en línea, necesitás configurar tu clave de conexión.\n\nPresioná Aceptar para ingresarla ahora.");
    openGithubModal();
    return;
  }

  // Guardar y publicar inmediatamente en la tienda en línea
  publishDirectlyToGithub();
}

function resetToOriginalCatalog() {
  if (confirm("¿Deseás restaurar el catálogo al archivo products.js original y descartar todos los borradores no publicados?")) {
    localStorage.removeItem("nissa_catalog_draft");
    loadInitialProducts();
    renderCategoryFilter();
    renderProductsList();
    checkDraftStatus();
    showAlert("✓ Catálogo restaurado a la versión original de products.js.");
  }
}

// ========================================================
// ALMACENAMIENTO PERSISTENTE DE IMÁGENES (IndexedDB + Memoria)
// Evita cuotas de 5MB en localStorage y asegura que las fotos cargadas se vean siempre
// ========================================================
window.NISSA_IMAGE_CACHE = window.NISSA_IMAGE_CACHE || {};

const NISSA_IDB_NAME = "nissa_images_db";
const NISSA_IDB_STORE = "product_images";

function openNissaImageDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) return resolve(null);
    try {
      const req = indexedDB.open(NISSA_IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(NISSA_IDB_STORE)) {
          db.createObjectStore(NISSA_IDB_STORE, { keyPath: "filename" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
}

async function persistImageInDB(filename, dataUrl) {
  if (!filename || !dataUrl) return;
  window.NISSA_IMAGE_CACHE[filename] = dataUrl;
  try {
    const db = await openNissaImageDB();
    if (!db) return;
    const tx = db.transaction(NISSA_IDB_STORE, "readwrite");
    tx.objectStore(NISSA_IDB_STORE).put({
      filename: filename,
      dataUrl: dataUrl,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn("No se pudo guardar imagen en IndexedDB:", e);
  }
}

async function loadAllCachedImages() {
  try {
    const db = await openNissaImageDB();
    if (!db) return;
    const tx = db.transaction(NISSA_IDB_STORE, "readonly");
    const req = tx.objectStore(NISSA_IDB_STORE).getAll();
    req.onsuccess = () => {
      if (Array.isArray(req.result)) {
        req.result.forEach(item => {
          if (item && item.filename && item.dataUrl) {
            window.NISSA_IMAGE_CACHE[item.filename] = item.dataUrl;
            if (typeof customUploadedPhotos !== "undefined" && !customUploadedPhotos.some(p => p.filename === item.filename)) {
              customUploadedPhotos.unshift({
                filename: item.filename,
                dataUrl: item.dataUrl,
                source: "Almacén local"
              });
            }
          }
        });
        if (typeof renderProductsList === "function") {
          renderProductsList();
        }
      }
    };
  } catch (e) {
    console.warn("No se pudo cargar imágenes de IndexedDB:", e);
  }
}

// ========================================================
// 3. RENDERIZADO DEL CATÁLOGO DE PRODUCTOS
// ========================================================
function formatPrice(num) {
  return "$" + Number(num || 0).toLocaleString("es-AR");
}

function resolveAdminPhoto(img, prod) {
  if (!img) return "";
  let clean = String(img).trim();
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:") || clean.startsWith("//")) {
    return clean;
  }
  // Limpiar cualquier prefijo de ruta para no duplicar fotos/
  clean = clean.replace(/^(\.\/|\/)+/, "");
  while (clean.startsWith("fotos/")) {
    clean = clean.substring("fotos/".length);
  }

  // 1. Verificar si está en memoria o caché persistente de IndexedDB
  if (window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[clean]) {
    return window.NISSA_IMAGE_CACHE[clean];
  }
  const custom = (typeof customUploadedPhotos !== "undefined" && Array.isArray(customUploadedPhotos))
    ? customUploadedPhotos.find(p => p.filename === clean)
    : null;
  if (custom && custom.dataUrl) {
    return custom.dataUrl;
  }

  return "./fotos/" + clean;
}

function updateProductCount() {
  const badge = document.getElementById("product-count-badge");
  if (badge) {
    badge.textContent = `${currentProducts.length} productos en catálogo`;
  }
}

function renderCategoryFilter() {
  const select = document.getElementById("category-filter");
  if (!select) return;

  const cats = new Set();
  currentProducts.forEach(p => {
    if (p.category) cats.add(p.category);
  });

  const currentVal = select.value || "todos";
  select.innerHTML = '<option value="todos">Todas las categorías</option>';
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c.toUpperCase();
    select.appendChild(opt);
  });
  select.value = currentVal;
}

function handleAdminCardImgError(img, origImg) {
  if (!img) return;
  const rawSrc = origImg || img.getAttribute("src") || "";
  let clean = rawSrc.replace(/^(\.\/|\/)+/, "");
  while (clean.startsWith("fotos/")) {
    clean = clean.substring("fotos/".length);
  }
  const filename = clean.split("/").pop() || "";

  // 1. Revisar caché persistente de IndexedDB o memoria
  if (filename && window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[filename]) {
    img.onerror = null;
    img.src = window.NISSA_IMAGE_CACHE[filename];
    img.style.display = "block";
    if (img.nextElementSibling) img.nextElementSibling.style.display = "none";
    return;
  }

  // 2. Intentar cargar desde GitHub raw si el archivo fue subido pero GitHub Pages aún no actualizó
  const cfg = typeof getGithubConfig === "function" ? getGithubConfig() : null;
  if (cfg && cfg.owner && cfg.repo && filename && !img.dataset.triedGithubRaw) {
    img.dataset.triedGithubRaw = "1";
    img.src = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/fotos/${filename}`;
    return;
  }

  // Fallback final a emoji
  img.onerror = null;
  img.src = "";
  img.style.display = "none";
  if (img.nextElementSibling) {
    img.nextElementSibling.style.display = "block";
  }
}

function renderProductsList() {
  const container = document.getElementById("admin-products-list");
  const emptyMsg = document.getElementById("no-products-msg");
  if (!container) return;

  updateProductCount();

  let list = [...currentProducts];

  // Filtro por búsqueda
  if (activeSearchTerm) {
    const term = activeSearchTerm.toLowerCase();
    list = list.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term)) ||
      (p.id && String(p.id).includes(term)) ||
      (p.tag && p.tag.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }

  // Filtro por categoría
  if (activeCategoryFilter !== "todos") {
    list = list.filter(p => p.category === activeCategoryFilter);
  }

  // Ordenamiento
  if (activeSortFilter === "price-asc") {
    list.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (activeSortFilter === "price-desc") {
    list.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (activeSortFilter === "name-asc") {
    list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  if (list.length === 0) {
    container.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";
  container.innerHTML = "";

  list.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "admin-product-card";
    card.id = `prod-card-${p.id}`;

    const mainImg = resolveAdminPhoto(p.image, p);
    const photosCount = Array.isArray(p.images) ? p.images.length : (p.image ? 1 : 0);
    const featuresCount = Array.isArray(p.features) ? p.features.length : 0;

    const disc3 = p.price && p.price3 ? Math.round(((p.price - p.price3) / p.price) * 100) : 0;
    const disc5 = p.price && p.price5 ? Math.round(((p.price - p.price5) / p.price) * 100) : 0;
    const disc20 = p.price && p.price20 ? Math.round(((p.price - p.price20) / p.price) * 100) : 0;

    card.innerHTML = `
      <div class="card-top-image">
        ${p.tag ? `<span class="card-tag-badge">${escapeHtml(p.tag)}</span>` : ""}
        <span class="card-id-badge">#${p.id}</span>
        ${mainImg ? `
          <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(p.name)}" class="card-thumb-img" onerror="handleAdminCardImgError(this, '${escapeHtml(p.image || '')}')">
          <span style="display:none; font-size:42px;">📦</span>
        ` : `<span style="font-size:42px;">📦</span>`}
      </div>

      <div class="card-body">
        <div class="card-category-row">
          <span class="card-category">${escapeHtml(p.category || "General")}</span>
          <span class="card-photos-count">📷 ${photosCount} ${photosCount === 1 ? 'foto' : 'fotos'}</span>
        </div>

        <h3 class="card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>

        <div class="card-price-matrix">
          <div class="c-price-item">
            <span class="c-price-label">1 u. (Lista)</span>
            <span class="c-price-val main">${formatPrice(p.price)}</span>
          </div>
          <div class="c-price-item">
            <span class="c-price-label">Desde 3 u.</span>
            <span class="c-price-val">${formatPrice(p.price3 || p.price)} ${disc3 > 0 ? `<small style="color:var(--primary);">(-${disc3}%)</small>` : ''}</span>
          </div>
          <div class="c-price-item">
            <span class="c-price-label">Desde 5 u.</span>
            <span class="c-price-val">${formatPrice(p.price5 || p.price)} ${disc5 > 0 ? `<small style="color:var(--primary);">(-${disc5}%)</small>` : ''}</span>
          </div>
          <div class="c-price-item">
            <span class="c-price-label">+20 Mayor</span>
            <span class="c-price-val wholesale">${formatPrice(p.price20 || p.price)} ${disc20 > 0 ? `<small style="color:var(--success);">(-${disc20}%)</small>` : ''}</span>
          </div>
        </div>

        <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:12px;">
          ✨ ${featuresCount} características · 🛡️ ${escapeHtml((p.specs && p.specs["Garantía"]) || "Garantía estándar")}
        </div>

        <div class="card-footer-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="editProduct(${p.id})">
            ✏️ Editar
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="duplicateProduct(${p.id})" title="Crear copia">
            📑
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="moveProductOrder(${p.id}, -1)" title="Subir posición">
            ⬆️
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="moveProductOrder(${p.id}, 1)" title="Bajar posición">
            ⬇️
          </button>
          <button type="button" class="btn btn-danger-ghost btn-sm" onclick="deleteProduct(${p.id})" title="Eliminar producto">
            🗑️
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function handleSearch(val) {
  activeSearchTerm = (val || "").trim();
  const clearBtn = document.getElementById("clear-search-btn");
  if (clearBtn) clearBtn.style.display = activeSearchTerm ? "block" : "none";
  renderProductsList();
}

function clearSearch() {
  const input = document.getElementById("admin-search-input");
  if (input) input.value = "";
  handleSearch("");
}

function handleCategoryFilter(val) {
  activeCategoryFilter = val || "todos";
  renderProductsList();
}

function handleSort(val) {
  activeSortFilter = val || "default";
  renderProductsList();
}

// ========================================================
// 4. MODAL DE EDICIÓN Y CREACIÓN DE PRODUCTOS
// ========================================================
function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById("product-modal");
  const title = document.getElementById("modal-product-title");
  const form = document.getElementById("product-form");
  if (!modal || !form) return;

  form.reset();
  switchProductTab("tab-general");

  const galleryList = document.getElementById("gallery-inputs-list");
  const featuresList = document.getElementById("features-inputs-list");
  const specsList = document.getElementById("specs-inputs-list");
  if (galleryList) galleryList.innerHTML = "";
  if (featuresList) featuresList.innerHTML = "";
  if (specsList) specsList.innerHTML = "";

  if (productId) {
    const p = currentProducts.find(item => Number(item.id) === Number(productId));
    if (!p) return;
    if (title) title.textContent = `Editar Producto #${p.id}`;

    document.getElementById("prod-id").value = p.id;
    document.getElementById("prod-name").value = p.name || "";
    document.getElementById("prod-category").value = p.category || "";
    document.getElementById("prod-tag").value = p.tag || "";
    document.getElementById("prod-price").value = p.price || "";
    document.getElementById("prod-price3").value = p.price3 || "";
    document.getElementById("prod-price5").value = p.price5 || "";
    document.getElementById("prod-price20").value = p.price20 || "";

    document.getElementById("prod-main-image").value = p.image || "";
    initMainImageState(p.image || "");

    const descVal = p.description || "";
    const descEl1 = document.getElementById("prod-desc");
    if (descEl1) descEl1.value = descVal;
    const descEl3 = document.getElementById("prod-desc-tab3");
    if (descEl3) descEl3.value = descVal;

    // Garantía y stock desde specs
    if (p.specs) {
      document.getElementById("prod-spec-garantia").value = p.specs["Garantía"] || "";
      document.getElementById("prod-spec-stock").value = p.specs["Disponibilidad"] || "";
    }

    // Galería adicional para el carrusel (excluyendo la portada para no duplicarla)
    if (Array.isArray(p.images)) {
      const extraImages = p.images.filter(img => img && img !== p.image);
      extraImages.forEach(img => addGalleryImageInput(img));
    }

    // Características
    if (Array.isArray(p.features)) {
      p.features.forEach(f => addFeatureInput(f));
    }

    // Especificaciones
    if (p.specs && typeof p.specs === "object") {
      Object.entries(p.specs).forEach(([k, v]) => {
        if (k !== "Garantía" && k !== "Disponibilidad") {
          addSpecInput(k, v);
        }
      });
    }

  } else {
    if (title) title.textContent = "Agregar Nuevo Producto";
    document.getElementById("prod-id").value = "";
    const descEl1 = document.getElementById("prod-desc");
    if (descEl1) descEl1.value = "";
    const descEl3 = document.getElementById("prod-desc-tab3");
    if (descEl3) descEl3.value = "";
    document.getElementById("prod-spec-garantia").value = "90 días oficial escrita NISSA";
    document.getElementById("prod-spec-stock").value = "Stock inmediato para entrega o retiro";
    addGalleryImageInput();
    addFeatureInput();
    initMainImageState("");
  }

  calculateDiscounts();
  modal.style.display = "flex";
}

function syncDescToTab3(val) {
  const el = document.getElementById("prod-desc-tab3");
  if (el && el.value !== val) el.value = val;
}

function syncDescFromTab3(val) {
  const el = document.getElementById("prod-desc");
  if (el && el.value !== val) el.value = val;
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (modal) modal.style.display = "none";
  editingProductId = null;
}

function switchProductTab(tabId) {
  document.querySelectorAll(".modal-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });
}

function calculateDiscounts() {
  const price = Number(document.getElementById("prod-price").value) || 0;
  const price3 = Number(document.getElementById("prod-price3").value) || 0;
  const price5 = Number(document.getElementById("prod-price5").value) || 0;
  const price20 = Number(document.getElementById("prod-price20").value) || 0;

  const tag3 = document.getElementById("disc-tag-3");
  const tag5 = document.getElementById("disc-tag-5");
  const tag20 = document.getElementById("disc-tag-20");

  if (tag3) {
    const d3 = price > 0 && price3 > 0 ? Math.round(((price - price3) / price) * 100) : 0;
    tag3.textContent = d3 > 0 ? `-${d3}% de ahorro` : "Sin descuento";
  }
  if (tag5) {
    const d5 = price > 0 && price5 > 0 ? Math.round(((price - price5) / price) * 100) : 0;
    tag5.textContent = d5 > 0 ? `-${d5}% de ahorro` : "Sin descuento";
  }
  if (tag20) {
    const d20 = price > 0 && price20 > 0 ? Math.round(((price - price20) / price) * 100) : 0;
    tag20.textContent = d20 > 0 ? `-${d20}% mayorista` : "Sin descuento";
  }
}

// ========================================================
// GESTIÓN AVANZADA DE IMÁGENES: CARGA, COMPRESIÓN, GALERÍA Y SELECCIÓN
// ========================================================
const KNOWN_FOTOS = [
  "pack-apple-original-certificado-20w.jpg",
  "pack-apple-caja.jpg",
  "pack-apple-cable-detalle.jpg",
  "pack-apple.jpg",
  "pack-apple-original-certificado-20w.png",
  "cargador-rapido-usb-c-25w-samsung-super-fast.jpg",
  "cargador-samsung-detalle.jpg",
  "cargador-samsung.jpg",
  "cable-usb-c-a-lightning-1m-trenzado-reforzado.jpg",
  "cable-iphone-conectores.jpg",
  "cable-iphone.jpg",
  "vidrio-templado-9d-full-cover-antigolpe.jpg",
  "vidrio-templado-aplicado.jpg",
  "vidrio-templado.jpg",
  "funda-case-magnetica-silicona-suave-magsafe.jpg",
  "funda-magsafe-interior.jpg",
  "funda-magsafe.jpg",
  "auriculares-bluetooth-in-ear-true-wireless-hifi.jpg",
  "auriculares-bluetooth-detalle.jpg",
  "auriculares-bluetooth.jpg",
  "mando-dualsense-ps5-inalambrico-original.jpg",
  "mando-ps5-gatillos.jpg",
  "mando-ps5.jpg",
  "mando-dualshock-4-ps4-inalambrico.jpg",
  "mando-ps4-trasera.jpg",
  "mando-ps4.jpg"
];

let currentMainImageState = {
  dataUrl: "",
  filename: "",
  mode: "base64", // "base64" | "fotos" | "url"
  width: 0,
  height: 0,
  sizeKb: 0
};

let galleryModalTarget = "main"; // 'main' o 'gallery'
let activeGalleryCategory = "todos";
let activeGallerySearch = "";
let customUploadedPhotos = []; // Fotos subidas en esta sesión para la biblioteca

// Optimización client-side con Canvas (reduce fotos pesadas de celulares a JPEG ligero y nítido para catálogo web)
function processImageFile(file, maxWidth = 650, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No se seleccionó ningún archivo"));
    }
    const isImage = (file.type && file.type.startsWith("image/")) || /\.(jpe?g|png|webp|gif|bmp|svg|avif|heic)$/i.test(file.name || "");
    if (!isImage) {
      return reject(new Error("El archivo seleccionado no es una imagen válida"));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const head = "data:image/jpeg;base64,";
        const base64Len = dataUrl.length - head.length;
        const sizeKb = Math.round((base64Len * 3 / 4) / 1024);

        let cleanName = (file.name || "producto.jpg")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9.]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!/\.(jpe?g|png|webp)$/i.test(cleanName)) {
          cleanName += ".jpg";
        }

        resolve({
          dataUrl,
          width,
          height,
          sizeKb,
          filename: cleanName,
          originalName: file.name
        });
      };
      img.onerror = () => reject(new Error("No se pudo interpretar el archivo como imagen"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Error al abrir archivo"));
    reader.readAsDataURL(file);
  });
}

function initMainImageState(val = "") {
  const dropzone = document.getElementById("main-image-dropzone");
  const previewCard = document.getElementById("main-image-preview-card");
  const input = document.getElementById("prod-main-image");

  if (!val) {
    currentMainImageState = { dataUrl: "", filename: "", mode: "base64", width: 0, height: 0, sizeKb: 0 };
    if (input) input.value = "";
    if (previewCard) previewCard.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
    return;
  }

  const isData = val.startsWith("data:");
  const isUrl = val.startsWith("http://") || val.startsWith("https://");

  currentMainImageState = {
    dataUrl: isData ? val : "",
    filename: (!isData && !isUrl) ? val.replace(/^\.\/fotos\//, "").replace(/^\/fotos\//, "") : "producto.jpg",
    mode: isData ? "base64" : (isUrl ? "url" : "fotos"),
    width: 0,
    height: 0,
    sizeKb: 0
  };

  if (input) input.value = val;
  updateMainImagePreviewUI(val);
}

function updateMainImagePreviewUI(overrideSrc = null) {
  const dropzone = document.getElementById("main-image-dropzone");
  const previewCard = document.getElementById("main-image-preview-card");
  const imgEl = document.getElementById("main-image-preview");
  const placeholder = document.getElementById("main-image-placeholder");
  const badge = document.getElementById("main-image-badge");
  const stats = document.getElementById("main-image-stats");
  const title = document.getElementById("main-image-display-name");
  const btnBase64 = document.getElementById("btn-mode-base64");
  const btnFotos = document.getElementById("btn-mode-fotos");
  const fileOptions = document.getElementById("file-storage-options");
  const fnInput = document.getElementById("prod-filename-input");

  const quickImg = document.getElementById("quick-image-preview");
  const quickPlaceholder = document.getElementById("quick-image-placeholder");
  const quickBadge = document.getElementById("quick-image-badge");
  const quickName = document.getElementById("quick-image-name");
  const quickHint = document.getElementById("quick-image-hint");

  const inputVal = (document.getElementById("prod-main-image") || {}).value || "";
  const rawTarget = overrideSrc || currentMainImageState.dataUrl || inputVal;
  const displaySrc = resolveAdminPhoto(rawTarget);

  if (!displaySrc) {
    if (previewCard) previewCard.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
    if (quickImg) {
      quickImg.style.display = "none";
      quickImg.src = "";
    }
    if (quickPlaceholder) quickPlaceholder.style.display = "flex";
    if (quickBadge) {
      quickBadge.className = "img-type-badge";
      quickBadge.textContent = "Sin imagen";
    }
    if (quickName) quickName.textContent = "Ninguna foto asignada";
    if (quickHint) quickHint.textContent = "Hacé clic en \"📁 Importar Imagen\" para elegir una foto de tu PC o celular (JPG, PNG, WebP).";
    return;
  }

  if (previewCard) previewCard.style.display = "flex";
  if (dropzone) dropzone.style.display = "none";
  if (imgEl) {
    imgEl.src = displaySrc;
    imgEl.style.display = "block";
  }
  if (placeholder) placeholder.style.display = "none";

  if (quickImg) {
    quickImg.src = displaySrc;
    quickImg.style.display = "block";
  }
  if (quickPlaceholder) quickPlaceholder.style.display = "none";

  // Badges y datos
  if (currentMainImageState.mode === "base64") {
    if (badge) {
      badge.className = "img-type-badge import-badge";
      badge.textContent = "✨ Imagen importada (nueva)";
    }
    if (btnBase64) btnBase64.classList.add("active");
    if (btnFotos) btnFotos.classList.remove("active");
    if (fileOptions) fileOptions.style.display = "none";
    if (title) title.textContent = currentMainImageState.filename || "Imagen importada";
    if (quickBadge) {
      quickBadge.className = "img-type-badge import-badge";
      quickBadge.textContent = "✨ Imagen importada (nueva)";
    }
    if (quickName) quickName.textContent = currentMainImageState.filename || "nueva-imagen.jpg";
    if (quickHint) quickHint.textContent = "✓ Foto importada y optimizada. Al presionar '💾 Guardar cambios', se subirá y publicará en la tienda.";
  } else if (currentMainImageState.mode === "fotos") {
    if (badge) {
      badge.className = "img-type-badge fotos-badge";
      badge.textContent = `📁 Archivo en fotos/`;
    }
    if (btnBase64) btnBase64.classList.remove("active");
    if (btnFotos) btnFotos.classList.add("active");
    if (fileOptions) fileOptions.style.display = "flex";
    if (fnInput) fnInput.value = currentMainImageState.filename;
    if (title) title.textContent = `fotos/${currentMainImageState.filename}`;
    if (quickBadge) {
      quickBadge.className = "img-type-badge fotos-badge";
      quickBadge.textContent = "📁 fotos/";
    }
    if (quickName) quickName.textContent = currentMainImageState.filename;
    if (quickHint) quickHint.textContent = `Foto asignada desde fotos/${currentMainImageState.filename}. Podés reemplazarla importando una nueva.`;
  } else {
    if (badge) {
      badge.className = "img-type-badge url-badge";
      badge.textContent = "🌐 Enlace Web";
    }
    if (btnBase64) btnBase64.classList.remove("active");
    if (btnFotos) btnFotos.classList.remove("active");
    if (fileOptions) fileOptions.style.display = "none";
    if (title) title.textContent = inputVal;
    if (quickBadge) {
      quickBadge.className = "img-type-badge url-badge";
      quickBadge.textContent = "🌐 Enlace Web";
    }
    if (quickName) quickName.textContent = inputVal.substring(0, 32) + "...";
    if (quickHint) quickHint.textContent = "Foto cargada desde enlace web externo.";
  }

  if (stats) {
    if (currentMainImageState.width && currentMainImageState.height) {
      stats.textContent = `${currentMainImageState.width} × ${currentMainImageState.height} px · ~${currentMainImageState.sizeKb} KB`;
    } else {
      stats.textContent = "Listo para publicar";
    }
  }
}

function setMainImageStorageMode(mode) {
  currentMainImageState.mode = mode;
  const mainInput = document.getElementById("prod-main-image");
  if (!mainInput) return;

  if (mode === "base64") {
    if (currentMainImageState.dataUrl) {
      mainInput.value = currentMainImageState.dataUrl;
    }
  } else if (mode === "fotos") {
    const filename = currentMainImageState.filename || "producto.jpg";
    mainInput.value = filename;
  }
  updateMainImagePreviewUI();
}

function updateFilenameFromInput(val) {
  const clean = val.trim();
  if (clean) {
    currentMainImageState.filename = clean;
    if (currentMainImageState.mode === "fotos") {
      const mainInput = document.getElementById("prod-main-image");
      if (mainInput) mainInput.value = clean;
    }
  }
}

function triggerMainImageUpload() {
  const quickInput = document.getElementById("quick-image-file-input");
  const mainInput = document.getElementById("main-image-file-input");
  const fileInput = quickInput || mainInput;
  if (fileInput) {
    fileInput.value = "";
    fileInput.click();
  }
}

async function handleMainFileInput(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  try {
    const processed = await processImageFile(file);
    applyProcessedMainImage(processed);
    showAlert(`✓ Imagen "${processed.filename}" cargada y optimizada (${processed.width}×${processed.height}px, ${processed.sizeKb} KB).`);
  } catch (err) {
    console.error("Error al cargar la imagen:", err);
    alert("Error al cargar la imagen: " + (err.message || err));
  }
}

function applyProcessedMainImage(processed) {
  currentMainImageState = {
    dataUrl: processed.dataUrl,
    filename: processed.filename,
    mode: "base64",
    width: processed.width,
    height: processed.height,
    sizeKb: processed.sizeKb
  };

  // Guardar inmediatamente en caché global de memoria e IndexedDB
  window.NISSA_IMAGE_CACHE = window.NISSA_IMAGE_CACHE || {};
  window.NISSA_IMAGE_CACHE[processed.filename] = processed.dataUrl;
  persistImageInDB(processed.filename, processed.dataUrl);

  // Guardar en fotos de sesión para biblioteca
  if (!customUploadedPhotos.some(p => p.filename === processed.filename)) {
    customUploadedPhotos.unshift({
      filename: processed.filename,
      dataUrl: processed.dataUrl,
      source: "Subida reciente"
    });
  }

  const mainInput = document.getElementById("prod-main-image");
  if (mainInput) mainInput.value = processed.dataUrl;

  const fnInput = document.getElementById("prod-filename-input");
  if (fnInput) fnInput.value = processed.filename;

  updateMainImagePreviewUI(processed.dataUrl);
}

function removeMainImage() {
  initMainImageState("");
  showAlert("Foto de portada removida.");
}

function toggleAdvancedImageField() {
  const row = document.getElementById("advanced-image-row");
  if (row) {
    row.style.display = row.style.display === "none" ? "block" : "none";
  }
}

function handleManualImageInput(val) {
  const trimmed = (val || "").trim();
  if (trimmed) {
    initMainImageState(trimmed);
  } else {
    initMainImageState("");
  }
}

function downloadMainImageFile() {
  const src = currentMainImageState.dataUrl || resolveAdminPhoto(currentMainImageState.filename);
  if (!src) {
    alert("No hay imagen disponible para descargar.");
    return;
  }
  const filename = currentMainImageState.filename || "producto.jpg";

  const a = document.createElement("a");
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showAlert(`✓ Imagen descargada como "${filename}". Ya podés moverla a tu carpeta 'fotos/' en GitHub.`);
}

async function uploadMainImageToGithub() {
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    if (confirm("Para subir imágenes directo a GitHub necesitás configurar tu Usuario, Repositorio y Token en el panel. ¿Deseás configurarlo ahora?")) {
      openGithubModal();
    }
    return;
  }

  const filename = currentMainImageState.filename || "producto.jpg";
  const dataUrl = currentMainImageState.dataUrl;

  if (!dataUrl || !dataUrl.startsWith("data:")) {
    alert("Esta opción requiere una imagen cargada desde tu equipo. Hacé clic en 'Subir desde mi equipo'.");
    return;
  }

  const btn = document.getElementById("btn-upload-github-main");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Subiendo a GitHub...";
  }

  try {
    const base64Data = dataUrl.split(",")[1];
    const filePath = `fotos/${filename}`;
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}&t=${Date.now()}`;

    // Obtener SHA si ya existe usando callGithubApi unificado
    let sha = null;
    const checkRes = await callGithubApi(url, { token: cfg.token });
    if (checkRes.ok && checkRes.data && checkRes.data.sha) {
      sha = checkRes.data.sha;
    }

    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`;
    const putRes = await callGithubApi(putUrl, {
      method: "PUT",
      token: cfg.token,
      body: {
        message: `Subir imagen de producto ${filePath} desde Admin NISSA`,
        content: base64Data,
        branch: cfg.branch,
        sha: sha || undefined
      }
    });

    if (putRes.ok) {
      showAlert(`✓ ¡Éxito! La imagen fotos/${filename} se subió directamente a tu GitHub en la rama ${cfg.branch}.`);
    } else {
      const err = putRes.data?.message || putRes.statusText || "Error al subir imagen";
      alert("Error al subir a GitHub: " + err);
    }
  } catch (err) {
    alert("Error de conexión con GitHub: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "🚀 Subir a fotos/ en GitHub";
    }
  }
}

// --------------------------------------------------------
// GESTIÓN DE FOTOS ADICIONALES (CARRUSEL)
// --------------------------------------------------------
function triggerGalleryMultiUpload() {
  const input = document.getElementById("gallery-multi-file-input");
  if (input) {
    input.value = "";
    input.click();
  }
}

async function handleGalleryMultiFileInput(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const files = Array.from(input.files);
  let count = 0;

  for (const file of files) {
    try {
      const processed = await processImageFile(file);
      addGalleryImageInput(processed.dataUrl, processed.filename);
      count++;
    } catch (e) {
      console.error("Error al procesar foto de carrusel:", e);
    }
  }

  showAlert(`✓ ${count} foto(s) agregada(s) a la galería del carrusel.`);
}

function addGalleryImageInput(val = "", suggestedName = "") {
  const container = document.getElementById("gallery-inputs-list");
  if (!container) return;

  const isData = val.startsWith("data:");
  const isUrl = val.startsWith("http://") || val.startsWith("https://");
  const typeLabel = isData ? "Embebida (Base64)" : (isUrl ? "URL Web" : "fotos/");
  const badgeClass = isData ? "" : (isUrl ? "url-badge" : "fotos-badge");
  const resolved = resolveAdminPhoto(val);

  const row = document.createElement("div");
  row.className = "gallery-card-row";
  row.innerHTML = `
    <div class="gallery-card-thumb-wrap">
      ${resolved ? `
        <img src="${escapeHtml(resolved)}" alt="Preview" onerror="this.onerror=null; this.src=''; this.style.display='none'; this.nextElementSibling.style.display='block';">
        <span style="display:none; font-size:20px;">📦</span>
      ` : `<span style="font-size:20px;">📷</span>`}
    </div>
    <div class="gallery-card-input-wrap">
      <div class="gallery-card-badge-row">
        <span class="img-type-badge ${badgeClass}">${typeLabel}</span>
        ${suggestedName ? `<span style="font-size:11px; color:var(--text-muted);">${escapeHtml(suggestedName)}</span>` : ""}
      </div>
      <input type="text" class="gallery-input" placeholder="Nombre en fotos/ (ej: caja-detalle.jpg) o URL..." value="${escapeHtml(val)}" oninput="handleGalleryItemInputChange(this)">
    </div>
    <div class="gallery-card-actions">
      <button type="button" class="btn-icon-action" onclick="moveGalleryItem(this, -1)" title="Subir orden">⬆️</button>
      <button type="button" class="btn-icon-action" onclick="moveGalleryItem(this, 1)" title="Bajar orden">⬇️</button>
      <button type="button" class="btn-icon-action danger" onclick="removeGalleryItem(this)" title="Eliminar foto">✕</button>
    </div>
  `;
  container.appendChild(row);
}

function handleGalleryItemInputChange(input) {
  const row = input.closest(".gallery-card-row");
  if (!row) return;
  const val = input.value.trim();
  const imgEl = row.querySelector(".gallery-card-thumb-wrap img");
  const badge = row.querySelector(".img-type-badge");

  const resolved = resolveAdminPhoto(val);
  if (imgEl && resolved) {
    imgEl.src = resolved;
    imgEl.style.display = "block";
  }

  if (badge) {
    if (val.startsWith("data:")) {
      badge.className = "img-type-badge";
      badge.textContent = "Embebida (Base64)";
    } else if (val.startsWith("http")) {
      badge.className = "img-type-badge url-badge";
      badge.textContent = "URL Web";
    } else {
      badge.className = "img-type-badge fotos-badge";
      badge.textContent = "fotos/";
    }
  }
}

function moveGalleryItem(btn, direction) {
  const row = btn.closest(".gallery-card-row");
  if (!row) return;
  if (direction === -1 && row.previousElementSibling) {
    row.parentElement.insertBefore(row, row.previousElementSibling);
  } else if (direction === 1 && row.nextElementSibling) {
    row.parentElement.insertBefore(row.nextElementSibling, row);
  }
}

function removeGalleryItem(btn) {
  const row = btn.closest(".gallery-card-row");
  if (row) row.remove();
}

// --------------------------------------------------------
// MODAL DE BIBLIOTECA DE FOTOS (fotos/ Y CATÁLOGO)
// --------------------------------------------------------
function openImageGalleryModal(target = "main") {
  galleryModalTarget = target;
  const modal = document.getElementById("modal-image-gallery");
  const hint = document.getElementById("gallery-target-hint");
  if (hint) {
    hint.textContent = target === "main" ? "🎯 Seleccionando imagen para Portada del producto" : "🎯 Seleccionando para agregar a la galería del carrusel";
  }
  activeGalleryCategory = "todos";
  activeGallerySearch = "";

  const searchInput = document.getElementById("gallery-search-input");
  if (searchInput) searchInput.value = "";

  document.querySelectorAll(".gallery-cat-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.cat === "todos");
  });

  renderImageGalleryGrid();
  if (modal) modal.style.display = "flex";
}

function closeImageGalleryModal() {
  const modal = document.getElementById("modal-image-gallery");
  if (modal) modal.style.display = "none";
}

function setGalleryFilter(cat) {
  activeGalleryCategory = cat;
  document.querySelectorAll(".gallery-cat-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.cat === cat);
  });
  renderImageGalleryGrid();
}

function filterImageGallery(query) {
  activeGallerySearch = (query || "").toLowerCase().trim();
  const clearBtn = document.getElementById("clear-gallery-search");
  if (clearBtn) clearBtn.style.display = activeGallerySearch ? "block" : "none";
  renderImageGalleryGrid();
}

function clearGallerySearch() {
  const input = document.getElementById("gallery-search-input");
  if (input) input.value = "";
  filterImageGallery("");
}

function getAllAvailableImages() {
  const map = new Map();

  // 1. Fotos subidas durante la sesión
  customUploadedPhotos.forEach(p => {
    map.set(p.filename, {
      filename: p.filename,
      src: p.dataUrl,
      source: "Subida reciente",
      isDataUrl: true,
      dataUrl: p.dataUrl
    });
  });

  // 2. Fotos conocidas de la carpeta fotos/
  KNOWN_FOTOS.forEach(name => {
    if (!map.has(name)) {
      map.set(name, {
        filename: name,
        src: `./fotos/${name}`,
        source: "fotos/",
        isDataUrl: false,
        dataUrl: ""
      });
    }
  });

  // 3. Fotos usadas en el catálogo actual
  currentProducts.forEach(p => {
    if (p.image && !map.has(p.image)) {
      map.set(p.image, {
        filename: p.image.startsWith("data:") ? `Foto producto #${p.id}` : p.image,
        src: resolveAdminPhoto(p.image),
        source: `Producto: ${p.name.substring(0, 24)}...`,
        isDataUrl: p.image.startsWith("data:"),
        dataUrl: p.image.startsWith("data:") ? p.image : ""
      });
    }
    if (Array.isArray(p.images)) {
      p.images.forEach(img => {
        if (img && !map.has(img)) {
          map.set(img, {
            filename: img.startsWith("data:") ? `Foto carrusel #${p.id}` : img,
            src: resolveAdminPhoto(img),
            source: `Carrusel: ${p.name.substring(0, 24)}...`,
            isDataUrl: img.startsWith("data:"),
            dataUrl: img.startsWith("data:") ? img : ""
          });
        }
      });
    }
  });

  return Array.from(map.values());
}

let currentGalleryModalItems = [];

function renderImageGalleryGrid() {
  const grid = document.getElementById("gallery-modal-grid");
  const empty = document.getElementById("gallery-modal-empty");
  if (!grid) return;

  let items = getAllAvailableImages();

  // Filtrado por categoría
  if (activeGalleryCategory !== "todos") {
    items = items.filter(item => {
      const lower = item.filename.toLowerCase();
      if (activeGalleryCategory === "apple") return lower.includes("apple") || lower.includes("iphone");
      if (activeGalleryCategory === "samsung") return lower.includes("samsung");
      if (activeGalleryCategory === "mando") return lower.includes("mando") || lower.includes("ps4") || lower.includes("ps5");
      if (activeGalleryCategory === "cable") return lower.includes("cable") || lower.includes("cargador");
      if (activeGalleryCategory === "funda") return lower.includes("funda") || lower.includes("vidrio") || lower.includes("magsafe");
      return true;
    });
  }

  // Filtrado por búsqueda
  if (activeGallerySearch) {
    items = items.filter(item => item.filename.toLowerCase().includes(activeGallerySearch));
  }

  currentGalleryModalItems = items;

  if (items.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";
  grid.innerHTML = "";

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "gallery-modal-item";
    card.innerHTML = `
      <div class="gallery-modal-thumb">
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.filename)}" onerror="this.onerror=null; this.src=''; this.style.display='none'; this.nextElementSibling.style.display='block';">
        <span style="display:none; font-size:32px;">📦</span>
      </div>
      <div class="gallery-modal-info">
        <span class="gallery-modal-filename" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</span>
        <span class="gallery-modal-source">${escapeHtml(item.source)}</span>
      </div>
      <button type="button" class="btn-select-gallery-item" data-idx="${idx}">
        ${galleryModalTarget === "main" ? "✓ Elegir como Portada" : "➕ Agregar al carrusel"}
      </button>
    `;

    const btn = card.querySelector(".btn-select-gallery-item");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectGalleryItemByIndex(idx);
      });
    }

    card.addEventListener("click", () => {
      selectGalleryItemByIndex(idx);
    });

    grid.appendChild(card);
  });
}

function selectGalleryItemByIndex(idx) {
  const item = currentGalleryModalItems[idx];
  if (!item) return;

  if (galleryModalTarget === "main") {
    if (item.isDataUrl && item.dataUrl) {
      applyProcessedMainImage({
        dataUrl: item.dataUrl,
        filename: item.filename.endsWith(".jpg") ? item.filename : (item.filename + ".jpg"),
        width: 0,
        height: 0,
        sizeKb: Math.round((item.dataUrl.length * 3 / 4) / 1024)
      });
    } else {
      initMainImageState(item.filename);
    }
    showAlert(`✓ Foto de portada seleccionada: ${item.filename}`);
  } else {
    addGalleryImageInput(item.isDataUrl && item.dataUrl ? item.dataUrl : item.filename, item.filename);
    showAlert(`✓ Foto agregada al carrusel: ${item.filename}`);
  }
  closeImageGalleryModal();
}

function selectImageFromGallery(filename, isDataUrl = false, dataUrl = "") {
  const idx = currentGalleryModalItems.findIndex(i => i.filename === filename);
  if (idx !== -1) {
    selectGalleryItemByIndex(idx);
  }
}

function triggerGalleryModalUpload() {
  const input = document.getElementById("gallery-modal-file-input");
  if (input) {
    input.value = "";
    input.click();
  }
}

async function handleGalleryModalUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  try {
    const processed = await processImageFile(file);
    customUploadedPhotos.unshift({
      filename: processed.filename,
      dataUrl: processed.dataUrl,
      source: "Subida a biblioteca"
    });
    renderImageGalleryGrid();
    showAlert(`✓ Imagen "${processed.filename}" agregada a la biblioteca de fotos.`);
  } catch (err) {
    alert("Error al subir foto: " + err.message);
  }
}

// --------------------------------------------------------
// EVENTOS DE DRAG & DROP Y CLIPBOARD PASTE (CTRL+V)
// --------------------------------------------------------
function setupDropzoneAndPasteEvents() {
  const dropzones = [
    document.getElementById("main-image-dropzone"),
    document.getElementById("quick-image-card"),
    document.getElementById("quick-image-drop-area")
  ].filter(Boolean);

  dropzones.forEach(dz => {
    ["dragenter", "dragover"].forEach(eventName => {
      dz.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.add("dragover");
      }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
      dz.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove("dragover");
      }, false);
    });

    dz.addEventListener("drop", async (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        try {
          const processed = await processImageFile(dt.files[0]);
          applyProcessedMainImage(processed);
          showAlert(`✓ Imagen "${processed.filename}" arrastrada y optimizada (${processed.width}×${processed.height}px, ${processed.sizeKb} KB).`);
        } catch (err) {
          console.error("Error al procesar archivo arrastrado:", err);
          alert("Error al procesar archivo: " + (err.message || err));
        }
      }
    });
  });

  // Pegar con Ctrl+V en cualquier momento cuando el modal esté abierto (en cualquier pestaña)
  window.addEventListener("paste", async (e) => {
    const modal = document.getElementById("product-modal");
    if (!modal || modal.style.display !== "flex") return;

    // Ignorar si el usuario está escribiendo texto en un textarea o input de texto
    const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (targetTag === "textarea" || (targetTag === "input" && e.target.type === "text" && e.target.id !== "prod-main-image")) {
      const text = e.clipboardData?.getData("text");
      if (text) return;
    }

    const items = (e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData))?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const processed = await processImageFile(file);
            applyProcessedMainImage(processed);
            showAlert(`✓ Imagen pegada desde el portapapeles y optimizada (${processed.width}×${processed.height}px, ${processed.sizeKb} KB).`);
          } catch (err) {
            console.error("Error al procesar imagen pegada:", err);
            alert("Error al procesar imagen pegada: " + (err.message || err));
          }
          break;
        }
      }
    }
  });
}

function previewMainImage(val) {
  initMainImageState(val);
}

function handlePreviewError(img) {
  if (!img) return;
  const rawSrc = img.getAttribute("src") || "";
  let clean = rawSrc.replace(/^(\.\/|\/)+/, "");
  while (clean.startsWith("fotos/")) {
    clean = clean.substring("fotos/".length);
  }
  const filename = clean.split("/").pop() || "";

  // 1. Revisar caché persistente de IndexedDB o memoria
  if (filename && window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[filename]) {
    img.src = window.NISSA_IMAGE_CACHE[filename];
    img.style.display = "block";
    const qp = document.getElementById("quick-image-placeholder");
    if (qp) qp.style.display = "none";
    const mp = document.getElementById("main-image-placeholder");
    if (mp) mp.style.display = "none";
    return;
  }

  // 2. Intentar cargar desde GitHub raw si el archivo fue subido pero GitHub Pages aún no actualizó
  const cfg = typeof getGithubConfig === "function" ? getGithubConfig() : null;
  if (cfg && cfg.owner && cfg.repo && filename && !img.dataset.triedGithubRaw) {
    img.dataset.triedGithubRaw = "1";
    img.src = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/fotos/${filename}`;
    return;
  }

  img.style.display = "none";
  if (img.id === "quick-image-preview") {
    const qp = document.getElementById("quick-image-placeholder");
    if (qp) {
      qp.style.display = "flex";
      qp.innerHTML = `<span style="font-size:32px;">📸</span><span style="font-size:10px; color:var(--text-muted); margin-top:4px;">Elegir foto</span>`;
    }
  } else {
    const placeholder = document.getElementById("main-image-placeholder");
    if (placeholder) {
      placeholder.style.display = "block";
      placeholder.textContent = "⚠️ Imagen no encontrada";
    }
  }
}

function chooseImageSuggestion() {
  openImageGalleryModal("main");
}

// GESTIÓN DINÁMICA DE CARACTERÍSTICAS
function addFeatureInput(val = "") {
  const container = document.getElementById("features-inputs-list");
  if (!container) return;

  const item = document.createElement("div");
  item.className = "feature-input-item";
  item.innerHTML = `
    <input type="text" class="feature-input" placeholder="Ej: Carga ultrarrápida 20W Power Delivery real..." value="${escapeHtml(val)}">
    <button type="button" class="btn-remove-item" onclick="this.parentElement.remove()" title="Eliminar viñeta">✕</button>
  `;
  container.appendChild(item);
}

// GESTIÓN DINÁMICA DE SPECS
function addSpecInput(k = "", v = "") {
  const container = document.getElementById("specs-inputs-list");
  if (!container) return;

  const item = document.createElement("div");
  item.className = "spec-input-item";
  item.innerHTML = `
    <input type="text" class="spec-key-input" style="flex:1;" placeholder="Ej: Compatibilidad" value="${escapeHtml(k)}">
    <input type="text" class="spec-val-input" style="flex:2;" placeholder="Ej: iPhone 8 hasta iPhone 14 Pro Max" value="${escapeHtml(v)}">
    <button type="button" class="btn-remove-item" onclick="this.parentElement.remove()" title="Eliminar spec">✕</button>
  `;
  container.appendChild(item);
}

// ========================================================
// 5. GUARDAR PRODUCTO EN EL CATÁLOGO LOCAL
// ========================================================
// SINCRONIZACIÓN LOCAL Y SERVIDOR (DISCO + MEMORIA + INDEXEDDB)
// ========================================================

// Guardar mapa rápido en localStorage para sincronización síncrona inmediata con script.js
function saveRecentImageInLocalStorage(filename, dataUrl) {
  try {
    if (!filename || !dataUrl) return;
    let map = {};
    const existing = localStorage.getItem("nissa_image_map");
    if (existing) {
      try { map = JSON.parse(existing) || {}; } catch (e) {}
    }
    if (dataUrl.length < 2500000) {
      map[filename] = dataUrl;
      const keys = Object.keys(map);
      if (keys.length > 12) {
        delete map[keys[0]];
      }
      localStorage.setItem("nissa_image_map", JSON.stringify(map));
    }
  } catch (err) {
    console.warn("No se pudo guardar en nissa_image_map de localStorage:", err);
  }
}

// Guardar archivo físico en fotos/ del servidor local
async function saveImageFileToServer(filename, dataUrl) {
  if (!filename || !dataUrl) return;
  try {
    const res = await fetch("/api/save-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, dataUrl })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("Servidor no disponible para /api/save-image:", err);
  }
}

// Guardar archivo products.js en el disco del servidor
async function saveProductsFileToServer(code) {
  if (!code) return;
  try {
    await fetch("/api/save-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
  } catch (err) {
    console.warn("Servidor no disponible para /api/save-products:", err);
  }
}

// Guardar archivo cotizador-data.js en el disco del servidor
async function saveCotizadorFileToServer(code) {
  if (!code) return;
  try {
    await fetch("/api/save-cotizador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
  } catch (err) {
    console.warn("Servidor no disponible para /api/save-cotizador:", err);
  }
}

// Wrapper universal para llamadas a la API de GitHub
async function callGithubApi(url, { method = "GET", token = "", body = null } = {}) {
  const cleanToken = sanitizeGithubToken(token);

  // 1. Si estamos en desarrollo local o servidor con Node/Vite, probar el proxy
  const isLocalServer = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.endsWith(".run.app"));
  if (isLocalServer) {
    try {
      const proxyRes = await fetch("/api/github-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          headers: {
            "Authorization": `Bearer ${cleanToken}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          },
          body
        })
      });
      if (proxyRes.ok) {
        const resJson = await proxyRes.json();
        return resJson;
      }
    } catch (proxyErr) {
      console.warn("Proxy local /api/github-proxy no disponible, intentando fetch directo:", proxyErr);
    }
  }

  // 2. Llamada directa a GitHub API (funciona 100% en GitHub Pages vía CORS oficial de GitHub)
  const directHeaders = {
    "Authorization": `Bearer ${cleanToken}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const directOptions = {
    method,
    headers: directHeaders
  };
  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    directHeaders["Content-Type"] = "application/json";
    directOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const directRes = await fetch(url, directOptions);
  const data = await directRes.json().catch(() => ({}));
  return {
    ok: directRes.ok,
    status: directRes.status,
    statusText: directRes.statusText,
    data
  };
}

// ========================================================
// SUBIDA DE FOTO DIRECTA A LA CARPETA fotos/ EN GITHUB
// ========================================================
async function uploadSinglePhotoToGithub(filename, dataUrl, cfg) {
  if (!filename || !dataUrl || !dataUrl.startsWith("data:")) {
    return { ok: false, error: "Datos de imagen vacíos o inválidos" };
  }
  let clean = filename.replace(/^(\.\/|\/)+/, "").replace(/^fotos\//, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!/\.(jpe?g|png|webp|gif)$/i.test(clean)) {
    clean += ".jpg";
  }

  const base64Data = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim();
  // Se guarda en la carpeta fotos/ del repositorio de GitHub
  const filePath = `fotos/${clean}`;
  const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}&t=${Date.now()}`;

  let sha = null;
  const checkRes = await callGithubApi(getUrl, { token: cfg.token });
  if (!checkRes.ok && checkRes.status === 401) {
    return checkRes;
  }
  if (checkRes.ok && checkRes.data && checkRes.data.sha) {
    sha = checkRes.data.sha;
  }

  const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`;
  let putRes = await callGithubApi(putUrl, {
    method: "PUT",
    token: cfg.token,
    body: {
      message: `Subir imagen ${filePath} al catálogo NISSA`,
      content: base64Data,
      branch: cfg.branch,
      sha: sha || undefined
    }
  });

  // Si hubo conflicto de SHA (409), reintentar con el SHA fresco del servidor
  if (putRes.status === 409) {
    const reCheck = await callGithubApi(getUrl, { token: cfg.token });
    if (reCheck.ok && reCheck.data && reCheck.data.sha) {
      putRes = await callGithubApi(putUrl, {
        method: "PUT",
        token: cfg.token,
        body: {
          message: `Actualizar imagen ${filePath} al catálogo NISSA`,
          content: base64Data,
          branch: cfg.branch,
          sha: reCheck.data.sha
        }
      });
    }
  }

  return putRes;
}

// ========================================================
// 5. GUARDAR Y PUBLICAR PRODUCTO EN EL CATÁLOGO
// ========================================================
function saveProduct(e) {
  // Siempre publica directamente en GitHub para que toda persona del mundo vea los cambios
  return saveAndPublishProductToGithub(e);
}

// ========================================================
// 5.1 GUARDAR Y PUBLICAR PRODUCTO DIRECTO A GITHUB (1 CLIC)
// ========================================================
async function saveAndPublishProductToGithub(e) {
  if (e) e.preventDefault();

  const idVal = document.getElementById("prod-id").value;
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value.trim().toLowerCase();
  const tag = document.getElementById("prod-tag").value.trim();

  const price = Number(document.getElementById("prod-price").value) || 0;
  const price3 = Number(document.getElementById("prod-price3").value) || price;
  const price5 = Number(document.getElementById("prod-price5").value) || price;
  const price20 = Number(document.getElementById("prod-price20").value) || price;

  if (!name) {
    switchProductTab("tab-general");
    document.getElementById("prod-name")?.focus();
    alert("Por favor ingresá el nombre del producto.");
    return;
  }
  if (price <= 0) {
    switchProductTab("tab-general");
    document.getElementById("prod-price")?.focus();
    alert("Por favor ingresá un precio válido para el producto.");
    return;
  }

  // Verificar si el usuario configuró conexión y Token
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("⚠️ Para guardar y publicar tus cambios en la tienda en línea, necesitás ingresar tu clave de conexión.\n\nPresioná Aceptar para configurarla.");
    openGithubModal();
    return;
  }

  const publishBtn = document.getElementById("btn-save-and-publish-github");
  const originalBtnHtml = publishBtn ? publishBtn.innerHTML : "";
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = "⏳ Guardando cambios...";
  }

  try {
    let finalMainImage = (document.getElementById("prod-main-image")?.value || "").trim();
    let dataUrlToUpload = currentMainImageState.dataUrl || "";
    let imgFilename = currentMainImageState.filename || "";

    if (!dataUrlToUpload && imgFilename && window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[imgFilename] && window.NISSA_IMAGE_CACHE[imgFilename].startsWith("data:")) {
      dataUrlToUpload = window.NISSA_IMAGE_CACHE[imgFilename];
    }
    if (!dataUrlToUpload && finalMainImage && window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[finalMainImage] && window.NISSA_IMAGE_CACHE[finalMainImage].startsWith("data:")) {
      dataUrlToUpload = window.NISSA_IMAGE_CACHE[finalMainImage];
      if (!imgFilename) imgFilename = finalMainImage;
    }

    // Si hay una foto cargada desde el equipo (Data URL Base64), subirla a la carpeta fotos/ de GitHub
    if (dataUrlToUpload && dataUrlToUpload.startsWith("data:")) {
      let cleanFilename = imgFilename || "producto.jpg";
      cleanFilename = cleanFilename.replace(/^(\.\/|\/)+/, "").replace(/^fotos\//, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!cleanFilename || cleanFilename === "producto.jpg" || /^(image|img|foto|screenshot|captura|whatsapp|descarga)/i.test(cleanFilename)) {
        const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        cleanFilename = `${slug || "producto"}.jpg`;
      }
      if (!/\.(jpe?g|png|webp|gif)$/i.test(cleanFilename)) {
        cleanFilename += ".jpg";
      }

      if (publishBtn) {
        publishBtn.innerHTML = `⏳ Subiendo foto (${cleanFilename})...`;
      }

      // Subir archivo a la carpeta fotos/
      const photoRes = await uploadSinglePhotoToGithub(cleanFilename, dataUrlToUpload, cfg);
      if (!photoRes.ok) {
        const errMsg = photoRes.data?.message || photoRes.statusText || photoRes.error || "";
        if (photoRes.status === 401 || errMsg.includes("Bad credentials")) {
          alert("⚠️ La clave de conexión expiró o no es válida. Por favor actualizala en ⚙️ Conexión.");
          openGithubModal();
          return;
        } else {
          console.warn("Aviso al subir imagen:", errMsg);
        }
      }

      finalMainImage = cleanFilename;
      currentMainImageState.filename = cleanFilename;

      window.NISSA_IMAGE_CACHE = window.NISSA_IMAGE_CACHE || {};
      window.NISSA_IMAGE_CACHE[cleanFilename] = dataUrlToUpload;
      persistImageInDB(cleanFilename, dataUrlToUpload);
      saveRecentImageInLocalStorage(cleanFilename, dataUrlToUpload);
      saveImageFileToServer(cleanFilename, dataUrlToUpload);
    } else if (finalMainImage) {
      // Normalizar nombre de archivo si se ingresó con prefijos de ruta
      finalMainImage = finalMainImage.replace(/^(\.\/|\/)+/, "").replace(/^fotos\//, "");
    }

    // Recopilar datos completos del producto
    const descInput = document.getElementById("prod-desc") || document.getElementById("prod-desc-tab3");
    const description = descInput ? descInput.value.trim() : "";

    const galleryInputs = document.querySelectorAll(".gallery-input");
    const images = [];
    if (finalMainImage) images.push(finalMainImage);
    galleryInputs.forEach(inp => {
      let v = inp.value.trim().replace(/^(\.\/|\/)+/, "").replace(/^fotos\//, "");
      if (v && !images.includes(v)) images.push(v);
    });

    const featureInputs = document.querySelectorAll(".feature-input");
    const features = [];
    featureInputs.forEach(inp => {
      const v = inp.value.trim();
      if (v) features.push(v);
    });

    const specs = {};
    const garantia = document.getElementById("prod-spec-garantia")?.value.trim() || "";
    const stock = document.getElementById("prod-spec-stock")?.value.trim() || "";
    if (garantia) specs["Garantía"] = garantia;
    if (stock) specs["Disponibilidad"] = stock;

    const specKeyInputs = document.querySelectorAll(".spec-key-input");
    const specValInputs = document.querySelectorAll(".spec-val-input");
    for (let i = 0; i < specKeyInputs.length; i++) {
      const k = specKeyInputs[i].value.trim();
      const v = specValInputs[i].value.trim();
      if (k && v) specs[k] = v;
    }

    let finalId;
    if (idVal) {
      finalId = Number(idVal);
      const existingIndex = currentProducts.findIndex(item => Number(item.id) === finalId);
      if (existingIndex !== -1) {
        currentProducts[existingIndex] = {
          id: finalId,
          name,
          category,
          tag: tag || undefined,
          price,
          price3,
          price5,
          price20,
          image: finalMainImage,
          images: images.length > 0 ? images : [finalMainImage],
          description,
          features,
          specs
        };
      }
    } else {
      const maxId = currentProducts.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
      finalId = maxId + 1;
      currentProducts.push({
        id: finalId,
        name,
        category,
        tag: tag || undefined,
        price,
        price3,
        price5,
        price20,
        image: finalMainImage,
        images: images.length > 0 ? images : [finalMainImage],
        description,
        features,
        specs
      });
    }

    if (typeof window !== "undefined") {
      window.products = currentProducts;
    }

    // Publicar catálogo products.js
    if (publishBtn) {
      publishBtn.innerHTML = "⏳ Guardando cambios...";
    }
    const productsJsCode = generateProductsJsCode();
    saveProductsFileToServer(productsJsCode);

    const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}&t=${Date.now()}`;
    let currentSha = null;
    const getRes = await callGithubApi(getUrl, { token: cfg.token });
    if (getRes.ok && getRes.data && getRes.data.sha) {
      currentSha = getRes.data.sha;
    }

    const base64Content = utf8ToBase64(productsJsCode);
    let putRes = await callGithubApi(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
      method: "PUT",
      token: cfg.token,
      body: {
        message: `Actualizar producto "${name}" (#${finalId}) y catálogo [Admin NISSA]`,
        content: base64Content,
        branch: cfg.branch,
        sha: currentSha || undefined
      }
    });

    if (putRes.status === 409) {
      const freshGet = await callGithubApi(getUrl, { token: cfg.token });
      if (freshGet.ok && freshGet.data && freshGet.data.sha) {
        putRes = await callGithubApi(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`, {
          method: "PUT",
          token: cfg.token,
          body: {
            message: `Actualizar producto "${name}" (#${finalId}) y catálogo [Admin NISSA]`,
            content: base64Content,
            branch: cfg.branch,
            sha: freshGet.data.sha
          }
        });
      }
    }

    if (putRes.ok) {
      // Limpiar borrador local para mantener sincronía pura con la tienda pública
      localStorage.removeItem("nissa_catalog_draft");
      checkDraftStatus();
      closeProductModal();
      renderCategoryFilter();
      renderProductsList();
      showAlert(`✓ ¡Cambios guardados! El producto "${escapeHtml(name)}" ya se publicó y se actualizará en la tienda en unos instantes.`, true);
    } else {
      const ghMsg = putRes.data?.message || putRes.statusText || "";
      if (putRes.status === 401 || ghMsg.includes("Bad credentials")) {
        alert("⚠️ La clave de conexión expiró o no es válida. Por favor actualizala en ⚙️ Conexión.");
        openGithubModal();
      } else {
        alert(`No se pudieron guardar los cambios (${putRes.status}): ${ghMsg}`);
      }
    }

  } catch (err) {
    console.error("Error al guardar producto:", err);
    alert("Error de conexión al guardar cambios: " + (err.message || err));
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.innerHTML = originalBtnHtml;
    }
  }
}

function editProduct(id) {
  openProductModal(id);
}

function duplicateProduct(id) {
  const p = currentProducts.find(item => Number(item.id) === Number(id));
  if (!p) return;

  const maxId = currentProducts.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const cloned = JSON.parse(JSON.stringify(p));
  cloned.id = maxId + 1;
  cloned.name = `${cloned.name} (Copia)`;

  currentProducts.push(cloned);
  saveDraft();
  renderProductsList();
  showAlert(`<span>✓ Producto duplicado (#${cloned.id}).</span> <button type="button" class="btn btn-sm btn-save-action" style="margin-left:10px;" onclick="applyAndSaveCatalogChanges()">💾 Guardar cambios</button>`, true);
}

function moveProductOrder(id, direction) {
  const index = currentProducts.findIndex(item => Number(item.id) === Number(id));
  if (index === -1) return;

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= currentProducts.length) return;

  const temp = currentProducts[index];
  currentProducts[index] = currentProducts[targetIndex];
  currentProducts[targetIndex] = temp;

  saveDraft();
  renderProductsList();
  showAlert(`<span>✓ Orden actualizado.</span> <button type="button" class="btn btn-sm btn-save-action" style="margin-left:10px;" onclick="applyAndSaveCatalogChanges()">💾 Guardar cambios</button>`, true);
}

function deleteProduct(id) {
  const p = currentProducts.find(item => Number(item.id) === Number(id));
  if (!p) return;

  if (confirm(`¿Estás seguro de que deseás eliminar el producto "${p.name}" (#${p.id}) de la tienda?`)) {
    currentProducts = currentProducts.filter(item => Number(item.id) !== Number(id));
    renderCategoryFilter();
    renderProductsList();
    const cfg = getGithubConfig();
    if (cfg && cfg.token) {
      publishDirectlyToGithub();
    } else {
      saveDraft();
      showAlert(`✓ Producto #${id} eliminado. Configurá la conexión para publicar el cambio en la tienda.`);
      openGithubModal();
    }
  }
}

// ========================================================
// 6. GENERACIÓN DE CÓDIGO JS Y DESCARGA DE PRODUCTS.JS
// ========================================================
function generateProductsJsCode() {
  const dateStr = new Date().toLocaleString("es-AR");
  const productsJson = JSON.stringify(currentProducts, null, 2);

  return `// Catálogo oficial de productos NISSA
// Generado automáticamente desde el Panel de Administración NISSA
// Actualizado: ${dateStr}
// 100% Compatible con GitHub Pages (Costo $0)

let products = ${productsJson};

// Exponer en window para compatibilidad global
if (typeof window !== "undefined") {
  window.products = products;
}
`;
}

function downloadProductsJs() {
  const code = generateProductsJsCode();
  const blob = new Blob([code], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAlert("✓ Archivo products.js descargado. Ya podés reemplazarlo en tu repositorio de GitHub para que GitHub Pages se actualice gratis.");
}

function openCodePreviewModal() {
  const modal = document.getElementById("code-modal");
  const textarea = document.getElementById("code-output");
  if (!modal || !textarea) return;

  textarea.value = generateProductsJsCode();
  modal.style.display = "flex";
}

function closeCodeModal() {
  const modal = document.getElementById("code-modal");
  if (modal) modal.style.display = "none";
}

function copyGeneratedCode() {
  const code = generateProductsJsCode();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      showAlert("✓ Código copiado al portapapeles. Ya podés pegarlo en GitHub.");
      closeCodeModal();
    });
  } else {
    const textarea = document.getElementById("code-output");
    if (textarea) {
      textarea.select();
      document.execCommand("copy");
      showAlert("✓ Código copiado al portapapeles.");
      closeCodeModal();
    }
  }
}

// ========================================================
// 7. PUBLICACIÓN DIRECTA A GITHUB (API GRATUITA GITHUB REST)
// ========================================================
const DEFAULT_GH_CONFIG = {
  owner: "nissa-21",
  repo: "store",
  branch: "main",
  path: "products.js",
  token: ""
};

function cleanRepoName(rawRepo) {
  if (!rawRepo) return DEFAULT_GH_CONFIG.repo;
  let r = String(rawRepo).trim();
  // Limpiar si el usuario pegó la URL de GitHub Pages (ej: nissa-21.github.io/store) o la URL de github.com (github.com/nissa-21/store)
  r = r.replace(/^(https?:\/\/)?(github\.com|[\w-]+\.github\.io)\/?/i, "");
  r = r.replace(/\/+$/, "");
  if (r.includes("/")) {
    r = r.split("/").pop();
  }
  return r || DEFAULT_GH_CONFIG.repo;
}

function cleanOwnerName(rawOwner) {
  if (!rawOwner) return DEFAULT_GH_CONFIG.owner;
  let o = String(rawOwner).trim();
  o = o.replace(/^(https?:\/\/)?github\.com\/?/i, "");
  o = o.replace(/\.github\.io.*$/i, "");
  if (o.includes("/")) {
    o = o.split("/")[0];
  }
  return o || DEFAULT_GH_CONFIG.owner;
}

function getGithubConfig() {
  const storedOwner = localStorage.getItem("gh_owner");
  const storedRepo = localStorage.getItem("gh_repo");
  const storedToken = sanitizeGithubToken(localStorage.getItem("gh_token") || "");

  const owner = cleanOwnerName(storedOwner) || DEFAULT_GH_CONFIG.owner;
  const repo = cleanRepoName(storedRepo) || DEFAULT_GH_CONFIG.repo;
  const branch = (localStorage.getItem("gh_branch") || DEFAULT_GH_CONFIG.branch).trim();
  const path = (localStorage.getItem("gh_path") || DEFAULT_GH_CONFIG.path).trim();

  // Guardar siempre valores canónicos y normalizados
  localStorage.setItem("gh_owner", owner);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_branch", branch);
  localStorage.setItem("gh_path", path);

  return {
    owner,
    repo,
    branch,
    path,
    token: storedToken
  };
}

function updateGithubTokenIndicator() {
  const statusEl = document.getElementById("gh-token-stored-status");
  if (!statusEl) return;
  const stored = sanitizeGithubToken(localStorage.getItem("gh_token") || "");
  if (stored) {
    const masked = stored.length > 8 ? (stored.substring(0, 4) + "••••••••" + stored.substring(stored.length - 4)) : "••••••••";
    statusEl.style.color = "#059669";
    statusEl.innerHTML = `✓ <strong>Token activo en este navegador:</strong> <code>${escapeHtml(masked)}</code>. Si querés cambiarlo, pegá el nuevo abajo.`;
  } else {
    statusEl.style.color = "#d97706";
    statusEl.innerHTML = "⚠️ <strong>Sin token guardado:</strong> Pegá tu Personal Access Token (PAT) abajo y presioná <em>\"💾 Guardar Configuración\"</em>.";
  }
}

function clearStoredToken() {
  localStorage.removeItem("gh_token");
  const tokenInput = document.getElementById("gh-token");
  if (tokenInput) tokenInput.value = "";
  const status = document.getElementById("gh-test-status");
  if (status) {
    status.className = "status-msg";
    status.style.display = "block";
    status.textContent = "Token eliminado de este navegador. Podés pegar uno nuevo cuando quieras.";
  }
  updateGithubTokenIndicator();
  showAlert("Token de GitHub eliminado de este navegador.");
}

function openGithubModal() {
  const modal = document.getElementById("github-modal");
  const status = document.getElementById("gh-test-status");
  if (status) status.style.display = "none";

  const cfg = getGithubConfig();
  document.getElementById("gh-owner").value = cfg.owner;
  document.getElementById("gh-repo").value = cfg.repo;
  document.getElementById("gh-branch").value = cfg.branch;
  document.getElementById("gh-path").value = cfg.path;
  
  // El campo del token SIEMPRE se presenta limpio y vacío para pegar el nuevo sin auto-completados viejos
  const tokenInput = document.getElementById("gh-token");
  if (tokenInput) {
    tokenInput.value = "";
    tokenInput.placeholder = cfg.token ? "Pegá tu nuevo token aquí si deseás cambiarlo..." : "Pegá tu nuevo token (ghp_... o github_pat_...)";
  }

  updateGithubTokenIndicator();

  if (modal) modal.style.display = "flex";
}

function closeGithubModal() {
  const modal = document.getElementById("github-modal");
  if (modal) modal.style.display = "none";
}

function saveGithubConfig(e) {
  if (e) e.preventDefault();
  const owner = cleanOwnerName(document.getElementById("gh-owner").value);
  const repo = cleanRepoName(document.getElementById("gh-repo").value);
  const branch = (document.getElementById("gh-branch").value || "").trim() || DEFAULT_GH_CONFIG.branch;
  const path = (document.getElementById("gh-path").value || "").trim() || DEFAULT_GH_CONFIG.path;
  
  const tokenInput = document.getElementById("gh-token");
  const enteredToken = sanitizeGithubToken(tokenInput ? tokenInput.value : "");

  localStorage.setItem("gh_owner", owner);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_branch", branch);
  localStorage.setItem("gh_path", path);

  if (enteredToken) {
    localStorage.setItem("gh_token", enteredToken);
    showAlert("✓ Configuración y nuevo Token de GitHub guardados correctamente en este navegador.");
  } else if (!localStorage.getItem("gh_token")) {
    showAlert("✓ Configuración de repositorio guardada. Recordá ingresar tu Token para publicar cambios.");
  } else {
    showAlert("✓ Configuración guardada (se conserva el token ya almacenado).");
  }

  closeGithubModal();
}

async function testGithubConnection() {
  const owner = cleanOwnerName(document.getElementById("gh-owner").value);
  const repo = cleanRepoName(document.getElementById("gh-repo").value);
  const branch = (document.getElementById("gh-branch").value || "").trim() || DEFAULT_GH_CONFIG.branch;
  const path = (document.getElementById("gh-path").value || "").trim() || DEFAULT_GH_CONFIG.path;
  
  const tokenInput = document.getElementById("gh-token");
  const enteredToken = sanitizeGithubToken(tokenInput ? tokenInput.value : "");
  const token = enteredToken || sanitizeGithubToken(localStorage.getItem("gh_token") || "");
  const status = document.getElementById("gh-test-status");

  // Corregir de inmediato los campos en la vista por si tenían URLs
  document.getElementById("gh-owner").value = owner;
  document.getElementById("gh-repo").value = repo;

  if (status) {
    status.className = "status-msg";
    status.style.display = "block";
    status.textContent = `Probando conexión con GitHub (${owner}/${repo})...`;
  }

  if (!token) {
    if (status) {
      status.className = "status-msg error";
      status.textContent = "⚠️ Ingresá tu Personal Access Token en el campo de arriba para probar la conexión.";
    }
    return;
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}&t=${Date.now()}`;
    const res = await callGithubApi(url, { token });

    if (res.ok) {
      if (enteredToken) {
        localStorage.setItem("gh_token", enteredToken);
        updateGithubTokenIndicator();
      }
      status.className = "status-msg success";
      status.innerHTML = `✓ <strong>¡Conexión 100% exitosa con GitHub!</strong> El repositorio "${escapeHtml(owner)}/${escapeHtml(repo)}" y el token tienen permisos válidos.`;
    } else if (res.status === 404) {
      if (enteredToken) {
        localStorage.setItem("gh_token", enteredToken);
        updateGithubTokenIndicator();
      }
      status.className = "status-msg success";
      status.innerHTML = `✓ <strong>Conexión con el repositorio "${escapeHtml(owner)}/${escapeHtml(repo)}" correcta.</strong> El archivo ${escapeHtml(path)} será creado en el primer guardado.`;
    } else if (res.status === 401 || (res.data && res.data.message && res.data.message.includes("Bad credentials"))) {
      status.className = "status-msg error";
      status.innerHTML = `⚠️ <strong>Error 401 (Bad credentials):</strong> El token no fue aceptado por GitHub. Asegurate de que no haya vencido y tenga tildado el permiso <strong>repo</strong>.`;
    } else if (res.status === 403) {
      status.className = "status-msg error";
      status.textContent = `⚠️ Error 403: Permisos insuficientes o límite de peticiones de GitHub: ${res.data?.message || res.statusText}`;
    } else {
      const msg = res.data?.message || res.statusText || "Verificá el token y el nombre del repositorio.";
      status.className = "status-msg error";
      status.textContent = `Error (${res.status}): ${msg}`;
    }
  } catch (err) {
    if (status) {
      status.className = "status-msg error";
      status.textContent = "Error de conexión: " + (err.message || err);
    }
  }
}

// Convertir texto UTF-8 a Base64 de forma segura
function utf8ToBase64(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    const len = bytes.byteLength;
    const chunk = 8192;
    for (let i = 0; i < len; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)));
    }
    return window.btoa(binary);
  } catch (e) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }
}

async function publishDirectlyToGithub() {
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("⚠️ Para guardar y publicar los cambios en la tienda en línea, primero ingresá tu clave de conexión.\n\nPresioná Aceptar para configurarla.");
    openGithubModal();
    return;
  }

  const publishBtn = document.getElementById("btn-publish-github");
  const originalBtnText = publishBtn ? publishBtn.innerHTML : "";
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = "⏳ Guardando cambios...";
  }

  try {
    // 1. Revisar si hay imágenes pendientes de subir a fotos/
    let photosUploaded = 0;
    for (let i = 0; i < currentProducts.length; i++) {
      const p = currentProducts[i];
      let img = p.image ? String(p.image).trim() : "";

      if (img.startsWith("data:")) {
        const slug = (p.name || `producto-${p.id}`).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const cleanFilename = `${slug || `producto-${p.id}`}.jpg`;
        if (publishBtn) {
          publishBtn.innerHTML = `⏳ Subiendo foto (${cleanFilename})...`;
        }
        const upRes = await uploadSinglePhotoToGithub(cleanFilename, img, cfg);
        if (upRes.ok) {
          p.image = cleanFilename;
          if (Array.isArray(p.images)) {
            p.images = p.images.map(item => item === img ? cleanFilename : item);
          }
          photosUploaded++;
        }
      } else if (img && window.NISSA_IMAGE_CACHE && window.NISSA_IMAGE_CACHE[img] && window.NISSA_IMAGE_CACHE[img].startsWith("data:")) {
        const dataUrl = window.NISSA_IMAGE_CACHE[img];
        const cleanFilename = img.replace(/^(\.\/|\/)+/, "").replace(/^fotos\//, "");
        if (publishBtn) {
          publishBtn.innerHTML = `⏳ Guardando foto (${cleanFilename})...`;
        }
        const upRes = await uploadSinglePhotoToGithub(cleanFilename, dataUrl, cfg);
        if (upRes.ok) {
          photosUploaded++;
        }
      }
    }

    // 2. Guardar archivo products.js en el disco del servidor local si está disponible
    const newContent = generateProductsJsCode();
    saveProductsFileToServer(newContent);

    if (publishBtn) {
      publishBtn.innerHTML = "⏳ Guardando cambios...";
    }

    // 3. Obtener el SHA actual del archivo (si existe)
    const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}&t=${Date.now()}`;
    let currentSha = null;
    const getRes = await callGithubApi(getUrl, { token: cfg.token });
    if (getRes.ok && getRes.data && getRes.data.sha) {
      currentSha = getRes.data.sha;
    }

    // 4. Guardar actualización mediante PUT
    const base64Content = utf8ToBase64(newContent);
    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const payload = {
      message: `Actualización de catálogo NISSA (${currentProducts.length} productos) [Admin Panel]`,
      content: base64Content,
      branch: cfg.branch
    };
    if (currentSha) {
      payload.sha = currentSha;
    }

    let putRes = await callGithubApi(putUrl, {
      method: "PUT",
      token: cfg.token,
      body: payload
    });

    if (putRes.status === 409) {
      const freshGet = await callGithubApi(getUrl, { token: cfg.token });
      if (freshGet.ok && freshGet.data && freshGet.data.sha) {
        payload.sha = freshGet.data.sha;
        putRes = await callGithubApi(putUrl, {
          method: "PUT",
          token: cfg.token,
          body: payload
        });
      }
    }

    if (putRes.ok) {
      localStorage.removeItem("nissa_catalog_draft");
      checkDraftStatus();
      renderProductsList();

      const photoMsg = photosUploaded > 0 ? ` (${photosUploaded} foto(s) actualizada(s))` : "";
      showAlert(`✓ ¡Cambios guardados y publicados correctamente${photoMsg}! La tienda se actualizará en línea en unos instantes.`, true);
    } else {
      const msg = putRes.data?.message || putRes.statusText || "";
      if (putRes.status === 401 || msg.includes("Bad credentials")) {
        alert("⚠️ La clave de conexión expiró o no es válida. Por favor ingresala nuevamente en ⚙️ Conexión.");
        openGithubModal();
      } else {
        alert(`No se pudieron guardar los cambios (${putRes.status}): ${msg}`);
      }
    }

  } catch (err) {
    alert("Error de conexión al guardar cambios: " + (err.message || err));
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.innerHTML = originalBtnText;
    }
  }
}

// ========================================================
// 8. ALERTAS Y UTILIDADES
// ========================================================
let alertTimer = null;
function showAlert(msg, isHtml = false) {
  const el = document.getElementById("admin-alert");
  const txt = document.getElementById("admin-alert-text");
  if (!el || !txt) return;

  if (isHtml) {
    txt.innerHTML = msg;
  } else {
    txt.textContent = msg;
  }
  el.style.display = "flex";

  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => {
    el.style.display = "none";
  }, 10000);
}

function closeAdminAlert() {
  const el = document.getElementById("admin-alert");
  if (el) el.style.display = "none";
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========================================================
// 9. GESTOR COMPLETO DEL PRESUPUESTADOR DE REPARACIONES
// ========================================================

function loadInitialCotizador() {
  if (typeof window.PRECIOS_WIDGET !== "undefined" && typeof window.PRECIOS_WIDGET === "object") {
    originalCotizadorBackup = JSON.parse(JSON.stringify(window.PRECIOS_WIDGET));
  }

  const draft = localStorage.getItem("nissa_cotizador_draft");
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      // Si el borrador previo contenía modelos agrupados con barra (/), descartarlo para usar la nueva lista individualizada
      const hasOldSharedModels = Array.isArray(parsed?.celulares) && parsed.celulares.some(b => 
        (b.brand === "Samsung" || b.brand === "Motorola") && (b.models || []).some(m => m.name && m.name.includes(" / "))
      );
      if (hasOldSharedModels) {
        localStorage.removeItem("nissa_cotizador_draft");
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed?.celulares) && parsed.celulares.length > 0) {
        currentCotizador = parsed;
        return;
      }
    } catch (e) {
      console.error("Error al cargar borrador de cotizador:", e);
    }
  }

  if (originalCotizadorBackup && originalCotizadorBackup.celulares && originalCotizadorBackup.celulares.length > 0) {
    currentCotizador = JSON.parse(JSON.stringify(originalCotizadorBackup));
  } else if (typeof window.PRECIOS_WIDGET !== "undefined" && window.PRECIOS_WIDGET.celulares) {
    currentCotizador = JSON.parse(JSON.stringify(window.PRECIOS_WIDGET));
    originalCotizadorBackup = JSON.parse(JSON.stringify(window.PRECIOS_WIDGET));
  } else {
    currentCotizador = {
      whatsapp: "5491136620653",
      businessName: "NISSA",
      showTerms: true,
      termsText: "Los valores informados son de referencia y están sujetos a revisión técnica final en el local.",
      warrantyAdjustments: { basic: -20, estandar: 0, ultra: 30 },
      celulares: [],
      consolas: [],
      joysticks: [],
      computadoras: []
    };
  }
  if (!currentCotizador.warrantyAdjustments) {
    currentCotizador.warrantyAdjustments = { basic: -20, estandar: 0, ultra: 30 };
  }
}

function saveCotizadorDraft() {
  if (!currentCotizador) return;
  try {
    localStorage.setItem("nissa_cotizador_draft", JSON.stringify(currentCotizador));
  } catch (e) {
    console.warn("Error al guardar borrador de cotizador:", e);
  }
  if (typeof window !== "undefined") {
    window.PRECIOS_WIDGET = currentCotizador;
  }
  checkDraftStatus();
  updateCountsBadge();
}

function applyAndSaveCotizadorChanges() {
  saveCotizadorDraft();
  if (typeof window !== "undefined") {
    window.PRECIOS_WIDGET = currentCotizador;
  }
  renderCotizador();
  publishCotizadorDirectlyToGithub();
}

function debouncedAutoSaveCotizador() {
  if (autoSaveCotizadorTimeout) clearTimeout(autoSaveCotizadorTimeout);
  autoSaveCotizadorTimeout = setTimeout(() => {
    saveCotizadorDraft();
  }, 400);
}

function getCotizadorTotalRepairsCount() {
  if (!currentCotizador) return 0;
  let count = 0;
  if (Array.isArray(currentCotizador.celulares)) {
    currentCotizador.celulares.forEach(b => {
      if (Array.isArray(b.models)) {
        b.models.forEach(m => {
          if (Array.isArray(m.repairs)) count += m.repairs.length;
        });
      }
    });
  }
  if (Array.isArray(currentCotizador.consolas)) {
    currentCotizador.consolas.forEach(c => {
      if (Array.isArray(c.repairs)) count += c.repairs.length;
    });
  }
  if (Array.isArray(currentCotizador.joysticks)) {
    currentCotizador.joysticks.forEach(j => {
      if (Array.isArray(j.repairs)) count += j.repairs.length;
    });
  }
  if (Array.isArray(currentCotizador.computadoras)) {
    count += currentCotizador.computadoras.length;
  }
  return count;
}

function switchAdminSection(section) {
  activeAdminSection = section;
  const btnProducts = document.getElementById("btn-nav-products");
  const btnCotizador = document.getElementById("btn-nav-cotizador");
  const btnEstetica = document.getElementById("btn-nav-estetica");
  const secProducts = document.getElementById("section-products");
  const secCotizador = document.getElementById("section-cotizador");
  const secEstetica = document.getElementById("section-estetica");

  if (btnProducts) btnProducts.classList.toggle("active", section === "products");
  if (btnCotizador) btnCotizador.classList.toggle("active", section === "cotizador");
  if (btnEstetica) btnEstetica.classList.toggle("active", section === "estetica");

  if (secProducts) secProducts.style.display = section === "products" ? "block" : "none";
  if (secCotizador) secCotizador.style.display = section === "cotizador" ? "block" : "none";
  if (secEstetica) secEstetica.style.display = section === "estetica" ? "block" : "none";

  if (section === "products") {
    renderProductsList();
  } else if (section === "cotizador") {
    renderCotizador();
  } else if (section === "estetica") {
    renderEstetica();
  }
}

function switchCotizadorSubtab(subtab) {
  activeCotizadorCategory = subtab;
  const subtabs = ["celulares", "consolas", "joysticks", "computadoras", "garantias", "general"];
  subtabs.forEach(s => {
    const btn = document.getElementById(`subtab-${s}`);
    if (btn) {
      if (s === subtab) btn.classList.add("active");
      else btn.classList.remove("active");
    }
  });

  const brandPillsWrap = document.getElementById("cotizador-brand-pills-wrap");
  if (brandPillsWrap) {
    brandPillsWrap.style.display = subtab === "celulares" ? "flex" : "none";
  }

  renderCotizadorDynamicActions();
  renderCotizador();
}

function renderCotizadorDynamicActions() {
  const container = document.getElementById("cotizador-action-buttons");
  if (!container) return;

  if (activeCotizadorCategory === "celulares") {
    container.innerHTML = `
      <button type="button" class="btn btn-success btn-sm" onclick="openAddCelularModelModal()">
        ➕ Agregar Equipo / Modelo
      </button>
      <button type="button" class="btn btn-secondary btn-sm" onclick="openNewBrandModal()">
        ➕ Nueva Marca
      </button>
      <button type="button" class="btn btn-warning btn-sm" onclick="openMassAdjustModal()">
        ⚡ Ajuste Masivo (%)
      </button>
      <button type="button" class="btn btn-danger-ghost btn-sm" onclick="deleteCelularBrand()" title="Eliminar marca actual">
        🗑️ Quitar Marca
      </button>
    `;
  } else if (activeCotizadorCategory === "consolas") {
    container.innerHTML = `
      <button type="button" class="btn btn-success btn-sm" onclick="openNewDeviceModal('consolas')">
        ➕ Nueva Consola
      </button>
      <button type="button" class="btn btn-warning btn-sm" onclick="openMassAdjustModal()">
        ⚡ Ajuste Masivo (%)
      </button>
    `;
  } else if (activeCotizadorCategory === "joysticks") {
    container.innerHTML = `
      <button type="button" class="btn btn-success btn-sm" onclick="openNewDeviceModal('joysticks')">
        ➕ Nuevo Joystick
      </button>
      <button type="button" class="btn btn-warning btn-sm" onclick="openMassAdjustModal()">
        ⚡ Ajuste Masivo (%)
      </button>
    `;
  } else if (activeCotizadorCategory === "computadoras") {
    container.innerHTML = `
      <button type="button" class="btn btn-success btn-sm" onclick="openAddRepairModal('computadoras')">
        ➕ Nuevo Servicio PC
      </button>
    `;
  } else if (activeCotizadorCategory === "garantias") {
    container.innerHTML = `
      <button type="button" class="btn btn-primary btn-sm" onclick="saveWarrantyAdjustmentsSettings()">
        💾 Aplicar Porcentajes
      </button>
    `;
  } else if (activeCotizadorCategory === "general") {
    container.innerHTML = `
      <button type="button" class="btn btn-primary btn-sm" onclick="saveGeneralSettings()">
        💾 Guardar Ajustes
      </button>
    `;
  }
}

function renderCotizador() {
  renderCotizadorDynamicActions();
  if (activeCotizadorCategory === "celulares") {
    renderBrandPills();
    renderCelularesSection();
  } else if (activeCotizadorCategory === "consolas") {
    renderConsolasSection();
  } else if (activeCotizadorCategory === "joysticks") {
    renderJoysticksSection();
  } else if (activeCotizadorCategory === "computadoras") {
    renderComputadorasSection();
  } else if (activeCotizadorCategory === "garantias") {
    renderGarantiasSettingsSection();
  } else if (activeCotizadorCategory === "general") {
    renderGeneralSettingsSection();
  }
}

// --------------------------------------------------------
// 9.1 CELULARES Y MODELOS
// --------------------------------------------------------
function renderBrandPills() {
  const container = document.getElementById("cotizador-brand-pills-wrap");
  if (!container || !currentCotizador || !currentCotizador.celulares) return;

  const brands = currentCotizador.celulares;
  if (brands.length === 0) {
    container.innerHTML = "<span style='font-size:13px; color:#64748b;'>No hay marcas cargadas. Presioná '➕ Nueva Marca' para comenzar.</span>";
    return;
  }

  let totalModels = 0;
  brands.forEach(b => {
    if (Array.isArray(b.models)) totalModels += b.models.length;
  });

  const isAll = activeCelularBrand === "todos";
  let html = `
    <button type="button" class="brand-pill ${isAll ? "active" : ""}" onclick="selectCelularBrand('todos')">
      <span>🌟 Todos los Equipos</span>
      <span class="brand-pill-count">${totalModels}</span>
    </button>
  `;

  html += brands.map(b => {
    const isActive = !isAll && b.brand.toLowerCase() === activeCelularBrand.toLowerCase();
    const count = (b.models || []).length;
    let icon = "📱";
    if (b.brand.toLowerCase().includes("apple") || b.brand.toLowerCase().includes("iphone")) icon = "🍏";
    else if (b.brand.toLowerCase().includes("samsung")) icon = "📱";
    else if (b.brand.toLowerCase().includes("motorola")) icon = "⚡";
    else if (b.brand.toLowerCase().includes("xiaomi")) icon = "🟠";

    return `
      <button type="button" class="brand-pill ${isActive ? "active" : ""}" onclick="selectCelularBrand('${escapeHtml(b.brand)}')">
        <span>${icon} ${escapeHtml(b.brand)}</span>
        <span class="brand-pill-count">${count}</span>
      </button>
    `;
  }).join("");

  container.innerHTML = html;
}

function selectCelularBrand(brandName) {
  activeCelularBrand = brandName;
  renderBrandPills();
  renderCelularesSection();
}

function getAdminWarrantyAdjustments() {
  const custom = (currentCotizador && currentCotizador.warrantyAdjustments) || {};
  const toNum = (v, def) => {
    const n = Number(v);
    return isNaN(n) ? def : n;
  };
  return {
    basic: toNum(custom.basic, -20),
    estandar: toNum(custom.estandar, 0),
    ultra: toNum(custom.ultra, 30)
  };
}

function formatAdminPctTag(pct) {
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function formatAdminWarrantyBreakdown(rawPrice) {
  if (rawPrice === undefined || rawPrice === null) {
    return '<span class="w-pill w-muted">Sin precio numérico</span>';
  }
  const str = String(rawPrice).trim();
  const lower = str.toLowerCase();
  if (!str || lower.includes("consultar") || lower.includes("no realizamos") || lower === "no") {
    return '<span class="w-pill w-muted">Sin cálculo automático</span>';
  }

  let isUsd = false;
  let num = 0;
  if (lower.includes("usd")) {
    isUsd = true;
    num = parseFloat(str.replace(/[^0-9.,]/g, "").replace(",", "."));
  } else {
    num = Number(str.replace(/\$/g, "").replace(/\./g, "").replace(/,/g, "").trim());
  }

  if (isNaN(num) || num <= 0) {
    return '<span class="w-pill w-muted">Sin cálculo automático</span>';
  }

  const adj = getAdminWarrantyAdjustments();
  const pSin = Math.round(num * Math.max(0, 1 + adj.basic / 100));
  const p30 = Math.round(num * Math.max(0, 1 + adj.estandar / 100));
  const p90 = Math.round(num * Math.max(0, 1 + adj.ultra / 100));

  const fmt = (val) => isUsd ? `${val} USD` : `$${val.toLocaleString("es-AR")}`;
  return `
    <span class="w-pill w-none" title="Sin garantía (${formatAdminPctTag(adj.basic)})">⚡ Sin gar. (${formatAdminPctTag(adj.basic)}): <strong>${fmt(pSin)}</strong></span>
    <span class="w-pill w-std" title="Garantía 30 días (${formatAdminPctTag(adj.estandar)})">🛡️ 30d${adj.estandar !== 0 ? ` (${formatAdminPctTag(adj.estandar)})` : ""}: <strong>${fmt(p30)}</strong></span>
    <span class="w-pill w-ext" title="Garantía 90 días (${formatAdminPctTag(adj.ultra)})">👑 90d (${formatAdminPctTag(adj.ultra)}): <strong>${fmt(p90)}</strong></span>
  `;
}

function updateWarrantyPreviewCell(inputEl) {
  if (!inputEl || !inputEl.parentElement) return;
  const previewEl = inputEl.parentElement.querySelector(".warranty-preview-line");
  if (previewEl) {
    previewEl.innerHTML = formatAdminWarrantyBreakdown(inputEl.value);
  }
}

function renderCelularesSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador || !currentCotizador.celulares) return;

  // Recopilar todos los modelos según el filtro de marca activo
  let items = [];
  currentCotizador.celulares.forEach((b, bIdx) => {
    if (activeCelularBrand !== "todos" && b.brand.toLowerCase() !== activeCelularBrand.toLowerCase()) {
      return;
    }
    (b.models || []).forEach((m, mIdx) => {
      items.push({
        brand: b.brand,
        brandIndex: bIdx,
        model: m,
        modelIndex: mIdx
      });
    });
  });

  if (cotizadorSearchTerm) {
    const q = cotizadorSearchTerm.toLowerCase();
    items = items.filter(it => {
      const matchBrand = it.brand.toLowerCase().includes(q);
      const matchName = it.model.name && it.model.name.toLowerCase().includes(q);
      const matchRepair = it.model.repairs && it.model.repairs.some(r => 
        (r.name && r.name.toLowerCase().includes(q)) || 
        (r.note && r.note.toLowerCase().includes(q)) ||
        (String(r.price).toLowerCase().includes(q))
      );
      return matchBrand || matchName || matchRepair;
    });
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 40px 20px;">
        <div class="empty-icon">📱</div>
        <h3>No se encontraron equipos</h3>
        <p>${cotizadorSearchTerm ? `No hay resultados para "${escapeHtml(cotizadorSearchTerm)}".` : "No hay modelos en esta marca o categoría."}</p>
        <button type="button" class="btn btn-primary" onclick="openAddCelularModelModal()">
          ➕ Agregar Nuevo Equipo / Modelo
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const bIdx = item.brandIndex;
    const mIdx = item.modelIndex;
    const model = item.model;
    const repairs = model.repairs || [];

    const rowsHtml = repairs.map((r, rIdx) => {
      return `
        <tr>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.name)}" 
              placeholder="Nombre del servicio"
              onchange="updateCelularRepairName(${bIdx}, ${mIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input repair-price-input" value="${escapeHtml(r.price)}" 
              placeholder="Precio ej: 80000 o 70 USD"
              onchange="updateCelularRepairPrice(${bIdx}, ${mIdx}, ${rIdx}, this.value); updateWarrantyPreviewCell(this)"
              oninput="debouncedAutoSaveCotizador(); updateWarrantyPreviewCell(this)">
            <div class="warranty-preview-line">${formatAdminWarrantyBreakdown(r.price)}</div>
          </td>
          <td style="width: 32%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.note || '')}" 
              placeholder="Aclaración, garantía o detalle..."
              onchange="updateCelularRepairNote(${bIdx}, ${mIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 8%; text-align: center;">
            <button type="button" class="repair-del-btn" onclick="deleteCelularRepair(${bIdx}, ${mIdx}, ${rIdx})" title="Eliminar tarifa">
              ✕
            </button>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="model-card" id="card-model-${bIdx}-${mIdx}">
        <div class="model-card-header">
          <div class="model-title-wrap">
            <span class="model-brand-pill ${item.brand.toLowerCase()}">${escapeHtml(item.brand)}</span>
            <span class="model-name-text">${escapeHtml(model.name)}</span>
            <span class="model-count-pill">${repairs.length} reparaciones</span>
          </div>
          <div class="model-actions">
            <button type="button" class="btn btn-sm btn-outline" onclick="renameCelularModel(${bIdx}, ${mIdx})">
              ✏️ Renombrar
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="duplicateCelularModel(${bIdx}, ${mIdx})" title="Duplicar este equipo con todas sus tarifas">
              📑 Duplicar
            </button>
            <button type="button" class="btn btn-sm btn-success" onclick="openAddRepairModal('celulares', '${escapeHtml(item.brand)}', ${mIdx})">
              ➕ Agregar Reparación
            </button>
            <button type="button" class="btn btn-sm btn-danger-ghost" onclick="deleteCelularModel(${bIdx}, ${mIdx})">
              🗑️ Quitar Equipo
            </button>
          </div>
        </div>

        <div class="table-responsive-wrap">
          <table class="model-repairs-table">
            <thead>
              <tr>
                <th>Reparación / Servicio</th>
                <th>Tarifa / Precio</th>
                <th>Aclaración / Garantía</th>
                <th style="text-align: center;">Borrar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="model-card-footer">
          <span class="quick-save-indicator">✓ Los cambios se guardan automáticamente</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="openAddRepairModal('celulares', '${escapeHtml(item.brand)}', ${mIdx})">
            ➕ Agregar otra reparación a este modelo
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function duplicateCelularModel(bIdx, mIdx) {
  const model = currentCotizador.celulares[bIdx]?.models[mIdx];
  if (!model) return;

  const newName = prompt(`Nombre para el nuevo equipo duplicado a partir de "${model.name}":`, `${model.name} (Copia)`);
  if (!newName || !newName.trim()) return;

  const clonedRepairs = JSON.parse(JSON.stringify(model.repairs || []));
  clonedRepairs.forEach(r => {
    r.id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  });

  const duplicatedModel = {
    name: newName.trim(),
    repairs: clonedRepairs
  };

  currentCotizador.celulares[bIdx].models.splice(mIdx + 1, 0, duplicatedModel);
  saveCotizadorDraft();
  renderBrandPills();
  renderCelularesSection();
  showAlert(`✓ Equipo "${duplicatedModel.name}" duplicado con éxito.`);
}

// Actualizaciones de celdas inline para Celulares
function updateCelularRepairPrice(bIdx, mIdx, rIdx, val) {
  if (!currentCotizador.celulares[bIdx] || !currentCotizador.celulares[bIdx].models[mIdx]) return;
  const rep = currentCotizador.celulares[bIdx].models[mIdx].repairs[rIdx];
  if (!rep) return;

  const trimmed = String(val).trim();
  // Si es un número puro, guardarlo como número
  const num = Number(trimmed.replace(/\$/g, "").replace(/\./g, "").trim());
  if (!isNaN(num) && trimmed !== "" && !trimmed.toLowerCase().includes("usd") && !trimmed.toLowerCase().includes("consultar") && !trimmed.toLowerCase().includes("no")) {
    rep.price = num;
  } else {
    rep.price = trimmed;
  }
  saveCotizadorDraft();
}

function updateCelularRepairNote(bIdx, mIdx, rIdx, val) {
  if (!currentCotizador.celulares[bIdx] || !currentCotizador.celulares[bIdx].models[mIdx]) return;
  const rep = currentCotizador.celulares[bIdx].models[mIdx].repairs[rIdx];
  if (rep) {
    rep.note = String(val).trim();
    saveCotizadorDraft();
  }
}

function updateCelularRepairName(bIdx, mIdx, rIdx, val) {
  if (!currentCotizador.celulares[bIdx] || !currentCotizador.celulares[bIdx].models[mIdx]) return;
  const rep = currentCotizador.celulares[bIdx].models[mIdx].repairs[rIdx];
  if (rep) {
    rep.name = String(val).trim();
    saveCotizadorDraft();
  }
}

function deleteCelularRepair(bIdx, mIdx, rIdx) {
  const model = currentCotizador.celulares[bIdx]?.models[mIdx];
  if (!model || !model.repairs[rIdx]) return;
  const repName = model.repairs[rIdx].name;

  if (confirm(`¿Eliminar la tarifa "${repName}" de ${model.name}?`)) {
    model.repairs.splice(rIdx, 1);
    saveCotizadorDraft();
    renderCelularesSection();
  }
}

function renameCelularModel(bIdx, mIdx) {
  const model = currentCotizador.celulares[bIdx]?.models[mIdx];
  if (!model) return;

  const newName = prompt(`Renombrar modelo "${model.name}":`, model.name);
  if (newName && newName.trim() && newName.trim() !== model.name) {
    model.name = newName.trim();
    saveCotizadorDraft();
    renderCelularesSection();
    showAlert(`✓ Modelo renombrado a "${model.name}".`);
  }
}

function deleteCelularModel(bIdx, mIdx) {
  const model = currentCotizador.celulares[bIdx]?.models[mIdx];
  if (!model) return;

  if (confirm(`¿Estás seguro de que deseás eliminar el modelo "${model.name}" con todas sus reparaciones?`)) {
    currentCotizador.celulares[bIdx].models.splice(mIdx, 1);
    saveCotizadorDraft();
    renderBrandPills();
    renderCelularesSection();
    showAlert(`✓ Modelo "${model.name}" eliminado del presupuestador.`);
  }
}

// --------------------------------------------------------
// 9.2 CONSOLAS
// --------------------------------------------------------
function renderConsolasSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador || !currentCotizador.consolas) return;

  let consolas = currentCotizador.consolas;
  if (cotizadorSearchTerm) {
    const q = cotizadorSearchTerm.toLowerCase();
    consolas = consolas.filter(c => {
      const matchName = c.name && c.name.toLowerCase().includes(q);
      const matchRep = c.repairs && c.repairs.some(r => r.name && r.name.toLowerCase().includes(q));
      return matchName || matchRep;
    });
  }

  if (consolas.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background:#fff; border:1px solid var(--border); padding:40px 20px; border-radius:var(--radius-md);">
        <div class="empty-icon">🎮</div>
        <h3>No se encontraron consolas</h3>
        <p>Presioná "➕ Nueva Consola" para agregar una consola al presupuestador.</p>
        <button type="button" class="btn btn-primary" onclick="openNewDeviceModal('consolas')">
          ➕ Agregar Nueva Consola
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = consolas.map((c) => {
    const devIdx = currentCotizador.consolas.indexOf(c);
    const repairs = c.repairs || [];

    const rowsHtml = repairs.map((r, rIdx) => {
      return `
        <tr>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.name)}" 
              placeholder="Servicio / Reparación"
              onchange="updateDeviceRepairName('consolas', ${devIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input repair-price-input" value="${escapeHtml(r.price)}" 
              placeholder="Precio ej: 45000"
              onchange="updateDeviceRepairPrice('consolas', ${devIdx}, ${rIdx}, this.value); updateWarrantyPreviewCell(this)"
              oninput="debouncedAutoSaveCotizador(); updateWarrantyPreviewCell(this)">
            <div class="warranty-preview-line">${formatAdminWarrantyBreakdown(r.price)}</div>
          </td>
          <td style="width: 32%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.note || '')}" 
              placeholder="Aclaración, garantía o descripción..."
              onchange="updateDeviceRepairNote('consolas', ${devIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 8%; text-align: center;">
            <button type="button" class="repair-del-btn" onclick="deleteDeviceRepair('consolas', ${devIdx}, ${rIdx})" title="Eliminar servicio">
              ✕
            </button>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="model-card">
        <div class="model-card-header">
          <div class="model-title-wrap">
            <span class="model-name-text">🎮 ${escapeHtml(c.name)}</span>
            <span class="model-count-pill">${repairs.length} servicios</span>
          </div>
          <div class="model-actions">
            <button type="button" class="btn btn-sm btn-outline" onclick="renameDevice('consolas', ${devIdx})">
              ✏️ Renombrar
            </button>
            <button type="button" class="btn btn-sm btn-success" onclick="openAddRepairModal('consolas', null, null, '${escapeHtml(c.id)}')">
              ➕ Agregar Servicio
            </button>
            <button type="button" class="btn btn-sm btn-danger-ghost" onclick="deleteDevice('consolas', ${devIdx})">
              🗑️ Eliminar Consola
            </button>
          </div>
        </div>

        <div class="table-responsive-wrap">
          <table class="model-repairs-table">
            <thead>
              <tr>
                <th>Servicio / Reparación</th>
                <th>Tarifa / Precio</th>
                <th>Detalle / Nota</th>
                <th style="text-align: center;">Borrar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="model-card-footer">
          <span class="quick-save-indicator">✓ Los cambios se guardan automáticamente</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="openAddRepairModal('consolas', null, null, '${escapeHtml(c.id)}')">
            ➕ Agregar otro servicio a esta consola
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// --------------------------------------------------------
// 9.3 JOYSTICKS
// --------------------------------------------------------
function renderJoysticksSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador || !currentCotizador.joysticks) return;

  let joysticks = currentCotizador.joysticks;
  if (cotizadorSearchTerm) {
    const q = cotizadorSearchTerm.toLowerCase();
    joysticks = joysticks.filter(j => {
      const matchName = j.name && j.name.toLowerCase().includes(q);
      const matchRep = j.repairs && j.repairs.some(r => r.name && r.name.toLowerCase().includes(q));
      return matchName || matchRep;
    });
  }

  if (joysticks.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="background:#fff; border:1px solid var(--border); padding:40px 20px; border-radius:var(--radius-md);">
        <div class="empty-icon">🕹️</div>
        <h3>No se encontraron mandos / joysticks</h3>
        <p>Presioná "➕ Nuevo Joystick" para agregar uno al presupuestador.</p>
        <button type="button" class="btn btn-primary" onclick="openNewDeviceModal('joysticks')">
          ➕ Agregar Nuevo Joystick
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = joysticks.map((j) => {
    const devIdx = currentCotizador.joysticks.indexOf(j);
    const repairs = j.repairs || [];

    const rowsHtml = repairs.map((r, rIdx) => {
      return `
        <tr>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.name)}" 
              placeholder="Servicio de Mando"
              onchange="updateDeviceRepairName('joysticks', ${devIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 30%;">
            <input type="text" class="repair-inline-input repair-price-input" value="${escapeHtml(r.price)}" 
              placeholder="Precio ej: 25000"
              onchange="updateDeviceRepairPrice('joysticks', ${devIdx}, ${rIdx}, this.value); updateWarrantyPreviewCell(this)"
              oninput="debouncedAutoSaveCotizador(); updateWarrantyPreviewCell(this)">
            <div class="warranty-preview-line">${formatAdminWarrantyBreakdown(r.price)}</div>
          </td>
          <td style="width: 32%;">
            <input type="text" class="repair-inline-input" value="${escapeHtml(r.note || '')}" 
              placeholder="Garantía, repuesto o nota..."
              onchange="updateDeviceRepairNote('joysticks', ${devIdx}, ${rIdx}, this.value)"
              oninput="debouncedAutoSaveCotizador()">
          </td>
          <td style="width: 8%; text-align: center;">
            <button type="button" class="repair-del-btn" onclick="deleteDeviceRepair('joysticks', ${devIdx}, ${rIdx})" title="Eliminar servicio">
              ✕
            </button>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <div class="model-card">
        <div class="model-card-header">
          <div class="model-title-wrap">
            <span class="model-name-text">🕹️ Mando ${escapeHtml(j.name)}</span>
            <span class="model-count-pill">${repairs.length} servicios</span>
          </div>
          <div class="model-actions">
            <button type="button" class="btn btn-sm btn-outline" onclick="renameDevice('joysticks', ${devIdx})">
              ✏️ Renombrar
            </button>
            <button type="button" class="btn btn-sm btn-success" onclick="openAddRepairModal('joysticks', null, null, '${escapeHtml(j.id)}')">
              ➕ Agregar Servicio
            </button>
            <button type="button" class="btn btn-sm btn-danger-ghost" onclick="deleteDevice('joysticks', ${devIdx})">
              🗑️ Eliminar Mando
            </button>
          </div>
        </div>

        <div class="table-responsive-wrap">
          <table class="model-repairs-table">
            <thead>
              <tr>
                <th>Servicio de Joystick</th>
                <th>Tarifa / Precio</th>
                <th>Detalle / Nota</th>
                <th style="text-align: center;">Borrar</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="model-card-footer">
          <span class="quick-save-indicator">✓ Los cambios se guardan automáticamente</span>
          <button type="button" class="btn btn-sm btn-outline" onclick="openAddRepairModal('joysticks', null, null, '${escapeHtml(j.id)}')">
            ➕ Agregar otro servicio a este mando
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// --------------------------------------------------------
// 9.4 COMPUTADORAS & NOTEBOOKS
// --------------------------------------------------------
function renderComputadorasSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador || !currentCotizador.computadoras) return;

  let servicios = currentCotizador.computadoras;
  if (cotizadorSearchTerm) {
    const q = cotizadorSearchTerm.toLowerCase();
    servicios = servicios.filter(s => {
      const matchName = s.name && s.name.toLowerCase().includes(q);
      const matchNote = s.note && s.note.toLowerCase().includes(q);
      return matchName || matchNote;
    });
  }

  const rowsHtml = servicios.map((s, idx) => {
    return `
      <tr>
        <td style="width: 30%;">
          <input type="text" class="repair-inline-input" value="${escapeHtml(s.name)}" 
            placeholder="Nombre del servicio"
            onchange="updatePcRepairName(${idx}, this.value)"
            oninput="debouncedAutoSaveCotizador()">
        </td>
        <td style="width: 30%;">
          <input type="text" class="repair-inline-input repair-price-input" value="${escapeHtml(s.price)}" 
            placeholder="Consultar o precio"
            onchange="updatePcRepairPrice(${idx}, this.value); updateWarrantyPreviewCell(this)"
            oninput="debouncedAutoSaveCotizador(); updateWarrantyPreviewCell(this)">
          <div class="warranty-preview-line">${formatAdminWarrantyBreakdown(s.price)}</div>
        </td>
        <td style="width: 32%;">
          <input type="text" class="repair-inline-input" value="${escapeHtml(s.note || '')}" 
            placeholder="Descripción del servicio..."
            onchange="updatePcRepairNote(${idx}, this.value)"
            oninput="debouncedAutoSaveCotizador()">
        </td>
        <td style="width: 8%; text-align: center;">
          <button type="button" class="repair-del-btn" onclick="deletePcRepair(${idx})" title="Eliminar servicio">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="model-card">
      <div class="model-card-header">
        <div class="model-title-wrap">
          <span class="model-name-text">💻 Servicios para Computadoras y Notebooks</span>
          <span class="model-count-pill">${servicios.length} servicios configurados</span>
        </div>
        <div class="model-actions">
          <button type="button" class="btn btn-sm btn-success" onclick="openAddRepairModal('computadoras')">
            ➕ Nuevo Servicio PC
          </button>
        </div>
      </div>

      <div class="table-responsive-wrap">
        <table class="model-repairs-table">
          <thead>
            <tr>
              <th>Servicio Informático</th>
              <th>Tarifa / Precio</th>
              <th>Descripción del Trabajo</th>
              <th style="text-align: center;">Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <div class="model-card-footer">
        <span class="quick-save-indicator">✓ Los cambios se guardan automáticamente</span>
        <button type="button" class="btn btn-sm btn-outline" onclick="openAddRepairModal('computadoras')">
          ➕ Agregar otro servicio informático
        </button>
      </div>
    </div>
  `;
}

function updatePcRepairPrice(idx, val) {
  if (!currentCotizador.computadoras || !currentCotizador.computadoras[idx]) return;
  const trimmed = String(val).trim();
  const num = Number(trimmed.replace(/\$/g, "").replace(/\./g, "").trim());
  if (!isNaN(num) && trimmed !== "" && !trimmed.toLowerCase().includes("usd") && !trimmed.toLowerCase().includes("consultar")) {
    currentCotizador.computadoras[idx].price = num;
  } else {
    currentCotizador.computadoras[idx].price = trimmed;
  }
  saveCotizadorDraft();
}

function updatePcRepairNote(idx, val) {
  if (!currentCotizador.computadoras || !currentCotizador.computadoras[idx]) return;
  currentCotizador.computadoras[idx].note = String(val).trim();
  saveCotizadorDraft();
}

function updatePcRepairName(idx, val) {
  if (!currentCotizador.computadoras || !currentCotizador.computadoras[idx]) return;
  currentCotizador.computadoras[idx].name = String(val).trim();
  saveCotizadorDraft();
}

function deletePcRepair(idx) {
  if (!currentCotizador.computadoras || !currentCotizador.computadoras[idx]) return;
  const s = currentCotizador.computadoras[idx];
  if (confirm(`¿Eliminar el servicio "${s.name}"?`)) {
    currentCotizador.computadoras.splice(idx, 1);
    saveCotizadorDraft();
    renderComputadorasSection();
  }
}

// Actualizaciones inline para Dispositivos (Consolas y Joysticks)
function updateDeviceRepairPrice(type, devIdx, rIdx, val) {
  const dev = currentCotizador[type]?.[devIdx];
  if (!dev || !dev.repairs[rIdx]) return;
  const trimmed = String(val).trim();
  const num = Number(trimmed.replace(/\$/g, "").replace(/\./g, "").trim());
  if (!isNaN(num) && trimmed !== "" && !trimmed.toLowerCase().includes("usd") && !trimmed.toLowerCase().includes("consultar")) {
    dev.repairs[rIdx].price = num;
  } else {
    dev.repairs[rIdx].price = trimmed;
  }
  saveCotizadorDraft();
}

function updateDeviceRepairNote(type, devIdx, rIdx, val) {
  const dev = currentCotizador[type]?.[devIdx];
  if (dev && dev.repairs[rIdx]) {
    dev.repairs[rIdx].note = String(val).trim();
    saveCotizadorDraft();
  }
}

function updateDeviceRepairName(type, devIdx, rIdx, val) {
  const dev = currentCotizador[type]?.[devIdx];
  if (dev && dev.repairs[rIdx]) {
    dev.repairs[rIdx].name = String(val).trim();
    saveCotizadorDraft();
  }
}

function deleteDeviceRepair(type, devIdx, rIdx) {
  const dev = currentCotizador[type]?.[devIdx];
  if (!dev || !dev.repairs[rIdx]) return;
  const rName = dev.repairs[rIdx].name;
  if (confirm(`¿Eliminar la tarifa "${rName}" de ${dev.name}?`)) {
    dev.repairs.splice(rIdx, 1);
    saveCotizadorDraft();
    if (type === "consolas") renderConsolasSection();
    else renderJoysticksSection();
  }
}

function renameDevice(type, devIdx) {
  const dev = currentCotizador[type]?.[devIdx];
  if (!dev) return;
  const newName = prompt(`Renombrar dispositivo "${dev.name}":`, dev.name);
  if (newName && newName.trim() && newName.trim() !== dev.name) {
    dev.name = newName.trim();
    saveCotizadorDraft();
    if (type === "consolas") renderConsolasSection();
    else renderJoysticksSection();
    showAlert(`✓ Dispositivo renombrado a "${dev.name}".`);
  }
}

function deleteDevice(type, devIdx) {
  const dev = currentCotizador[type]?.[devIdx];
  if (!dev) return;
  if (confirm(`¿Estás seguro de que deseás eliminar "${dev.name}" con todas sus reparaciones del presupuestador?`)) {
    currentCotizador[type].splice(devIdx, 1);
    saveCotizadorDraft();
    if (type === "consolas") renderConsolasSection();
    else renderJoysticksSection();
    showAlert(`✓ Dispositivo eliminado.`);
  }
}

// --------------------------------------------------------
// 9.5 CONFIGURACIÓN GENERAL Y TÉRMINOS
// --------------------------------------------------------
function describeWarrantyPctLabel(pct) {
  const n = Number(pct);
  if (isNaN(n) || n === 0) return "Precio base oficial (0%)";
  if (n < 0) return `Descuento del ${Math.abs(n)}%`;
  return `Recargo del +${n}%`;
}

function updateWarrantyPercentInput(key, val, previewId) {
  if (!currentCotizador) return;
  currentCotizador.warrantyAdjustments = getAdminWarrantyAdjustments();
  const n = Number(val);
  if (!isNaN(n)) {
    currentCotizador.warrantyAdjustments[key] = n;
    const prev = document.getElementById(previewId);
    if (prev) prev.textContent = describeWarrantyPctLabel(n);
    const exEl = document.getElementById("garantias-live-example");
    if (exEl) {
      const adj = currentCotizador.warrantyAdjustments;
      const calcEx = (p) => `$${Math.round(100000 * Math.max(0, 1 + p / 100)).toLocaleString("es-AR")}`;
      exEl.innerHTML = `Ejemplo sobre un arreglo de <strong>$100.000</strong>: ⚡ Sin garantía: <strong>${calcEx(adj.basic)}</strong> · 🛡️ 30 días: <strong>${calcEx(adj.estandar)}</strong> · 👑 90 días: <strong>${calcEx(adj.ultra)}</strong>`;
    }
    saveCotizadorDraft();
  }
}

function renderGarantiasSettingsSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador) return;
  const adj = getAdminWarrantyAdjustments();
  const calcEx = (p) => `$${Math.round(100000 * Math.max(0, 1 + p / 100)).toLocaleString("es-AR")}`;

  container.innerHTML = `
    <div class="cotizador-settings-card">
      <h2 style="font-size:20px; font-weight:800; margin-bottom:8px;">🛡️ Porcentajes de Descuento o Incremento por Garantía</h2>
      <p class="settings-help" style="margin-bottom:18px;">Elegí cuánto porcentaje se <strong>resta</strong> (con signo menos, ej: <code>-20</code>) o se <strong>suma</strong> (ej: <code>30</code>) sobre el precio base en cada una de las 3 opciones del presupuestador. Poné <code>0</code> para mantener el precio base sin cambios.</p>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:14px; margin-bottom:18px;">
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px;">
          <label for="gar-warranty-basic" style="font-size:13px; font-weight:800; display:block; margin-bottom:8px;">⚡ Sin garantía (0 días)</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="number" id="gar-warranty-basic" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:120px; font-weight:800; font-size:15px;" value="${adj.basic}" oninput="updateWarrantyPercentInput('basic', this.value, 'gar-preview-basic')">
            <span style="font-weight:800; color:#475569;">%</span>
          </div>
          <small id="gar-preview-basic" style="display:block; margin-top:8px; font-size:12px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.basic)}</small>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px;">
          <label for="gar-warranty-estandar" style="font-size:13px; font-weight:800; display:block; margin-bottom:8px;">🛡️ Garantía 30 días</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="number" id="gar-warranty-estandar" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:120px; font-weight:800; font-size:15px;" value="${adj.estandar}" oninput="updateWarrantyPercentInput('estandar', this.value, 'gar-preview-estandar')">
            <span style="font-weight:800; color:#475569;">%</span>
          </div>
          <small id="gar-preview-estandar" style="display:block; margin-top:8px; font-size:12px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.estandar)}</small>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px;">
          <label for="gar-warranty-ultra" style="font-size:13px; font-weight:800; display:block; margin-bottom:8px;">👑 Garantía 90 días</label>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="number" id="gar-warranty-ultra" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:120px; font-weight:800; font-size:15px;" value="${adj.ultra}" oninput="updateWarrantyPercentInput('ultra', this.value, 'gar-preview-ultra')">
            <span style="font-weight:800; color:#475569;">%</span>
          </div>
          <small id="gar-preview-ultra" style="display:block; margin-top:8px; font-size:12px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.ultra)}</small>
        </div>
      </div>

      <div id="garantias-live-example" style="background:#eff6ff; border:1px solid #bfdbfe; color:#1e3a8a; border-radius:10px; padding:12px 14px; font-size:13px; margin-bottom:18px;">
        Ejemplo sobre un arreglo de <strong>$100.000</strong>: ⚡ Sin garantía: <strong>${calcEx(adj.basic)}</strong> · 🛡️ 30 días: <strong>${calcEx(adj.estandar)}</strong> · 👑 90 días: <strong>${calcEx(adj.ultra)}</strong>
      </div>

      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" onclick="saveWarrantyAdjustmentsSettings()">
          💾 Aplicar y Publicar Porcentajes
        </button>
      </div>
    </div>
  `;
}

function saveWarrantyAdjustmentsSettings() {
  const wb = document.getElementById("gar-warranty-basic");
  const we = document.getElementById("gar-warranty-estandar");
  const wu = document.getElementById("gar-warranty-ultra");
  const adj = getAdminWarrantyAdjustments();
  if (wb && !isNaN(Number(wb.value))) adj.basic = Number(wb.value);
  if (we && !isNaN(Number(we.value))) adj.estandar = Number(we.value);
  if (wu && !isNaN(Number(wu.value))) adj.ultra = Number(wu.value);
  currentCotizador.warrantyAdjustments = adj;
  saveCotizadorDraft();
  publishCotizadorDirectlyToGithub();
}

function renderGeneralSettingsSection() {
  const container = document.getElementById("cotizador-content-area");
  if (!container || !currentCotizador) return;
  const adj = getAdminWarrantyAdjustments();

  container.innerHTML = `
    <div class="cotizador-settings-card">
      <h2 style="font-size:20px; font-weight:800; margin-bottom:18px;">⚙️ Ajustes Generales del Presupuestador</h2>
      
      <div class="settings-group" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px; margin-bottom:20px;">
        <label style="display:block; font-size:14px; font-weight:800; margin-bottom:6px;">📊 Porcentajes de Garantía (Sumar o Restar %)</label>
        <p class="settings-help" style="margin-bottom:14px;">Usá valores <strong>negativos</strong> para hacer descuento (ej: <code>-20</code> resta 20%) o <strong>positivos</strong> para sumar recargo (ej: <code>30</code> suma 30%). Poné <code>0</code> para mantener el precio base.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
            <label for="set-warranty-basic" style="font-size:12.5px; font-weight:800; display:block; margin-bottom:6px;">⚡ Sin garantía (0 días)</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="set-warranty-basic" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:110px;" value="${adj.basic}" oninput="updateWarrantyPercentInput('basic', this.value, 'preview-w-basic')">
              <span style="font-weight:800; color:#475569;">%</span>
            </div>
            <small id="preview-w-basic" style="display:block; margin-top:6px; font-size:11.5px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.basic)}</small>
          </div>

          <div style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
            <label for="set-warranty-estandar" style="font-size:12.5px; font-weight:800; display:block; margin-bottom:6px;">🛡️ Garantía 30 días</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="set-warranty-estandar" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:110px;" value="${adj.estandar}" oninput="updateWarrantyPercentInput('estandar', this.value, 'preview-w-estandar')">
              <span style="font-weight:800; color:#475569;">%</span>
            </div>
            <small id="preview-w-estandar" style="display:block; margin-top:6px; font-size:11.5px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.estandar)}</small>
          </div>

          <div style="background:#fff; border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
            <label for="set-warranty-ultra" style="font-size:12.5px; font-weight:800; display:block; margin-bottom:6px;">👑 Garantía 90 días</label>
            <div style="display:flex; align-items:center; gap:6px;">
              <input type="number" id="set-warranty-ultra" step="1" min="-95" max="500" class="repair-inline-input" style="max-width:110px;" value="${adj.ultra}" oninput="updateWarrantyPercentInput('ultra', this.value, 'preview-w-ultra')">
              <span style="font-weight:800; color:#475569;">%</span>
            </div>
            <small id="preview-w-ultra" style="display:block; margin-top:6px; font-size:11.5px; font-weight:700; color:#0284c7;">${describeWarrantyPctLabel(adj.ultra)}</small>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <label for="set-cot-whatsapp">Número de WhatsApp receptor:</label>
        <input type="text" id="set-cot-whatsapp" class="repair-inline-input" value="${escapeHtml(currentCotizador.whatsapp || '5491136620653')}">
        <p class="settings-help">Número con código de país y área sin espacios ni signos + (Ej: 5491136620653 para Argentina).</p>
      </div>

      <div class="settings-group">
        <label for="set-cot-business">Nombre Comercial:</label>
        <input type="text" id="set-cot-business" class="repair-inline-input" value="${escapeHtml(currentCotizador.businessName || 'NISSA')}">
        <p class="settings-help">Nombre que aparecerá en los encabezados y presupuestos generados.</p>
      </div>

      <div class="settings-group">
        <label class="checkbox-label">
          <input type="checkbox" id="set-cot-showterms" ${currentCotizador.showTerms ? "checked" : ""}>
          <span>Mostrar términos y condiciones legales en el pie del cotizador</span>
        </label>
      </div>

      <div class="settings-group">
        <label for="set-cot-terms">Texto de Términos Legales y Póliza de Garantía:</label>
        <textarea id="set-cot-terms" class="repair-inline-input" style="min-height:100px; resize:vertical;">${escapeHtml(currentCotizador.termsText || "")}</textarea>
        <p class="settings-help">Aclaración visible para los clientes que solicitan presupuestos.</p>
      </div>

      <div style="margin-top:24px; display:flex; gap:12px;">
        <button type="button" class="btn btn-primary" onclick="saveGeneralSettings()">
          💾 Guardar Configuración General
        </button>
      </div>
    </div>
  `;
}

function saveGeneralSettings() {
  const wa = document.getElementById("set-cot-whatsapp");
  const bn = document.getElementById("set-cot-business");
  const st = document.getElementById("set-cot-showterms");
  const tt = document.getElementById("set-cot-terms");
  const wb = document.getElementById("set-warranty-basic");
  const we = document.getElementById("set-warranty-estandar");
  const wu = document.getElementById("set-warranty-ultra");

  const adj = getAdminWarrantyAdjustments();
  if (wb && !isNaN(Number(wb.value))) adj.basic = Number(wb.value);
  if (we && !isNaN(Number(we.value))) adj.estandar = Number(we.value);
  if (wu && !isNaN(Number(wu.value))) adj.ultra = Number(wu.value);
  currentCotizador.warrantyAdjustments = adj;

  if (wa) currentCotizador.whatsapp = wa.value.trim();
  if (bn) currentCotizador.businessName = bn.value.trim();
  if (st) currentCotizador.showTerms = Boolean(st.checked);
  if (tt) currentCotizador.termsText = tt.value.trim();

  saveCotizadorDraft();
  showAlert("✓ Configuración general y porcentajes de garantía guardados. Recordá pulsar 'Guardar cambios' arriba para publicar en la tienda.");
}

// --------------------------------------------------------
// 9.6 MODALES DE CREACIÓN Y EDICIÓN DEL PRESUPUESTADOR
// --------------------------------------------------------

// Modal Nueva Marca
function openNewBrandModal() {
  const modal = document.getElementById("modal-new-brand");
  const input = document.getElementById("new-brand-name");
  if (input) input.value = "";
  if (modal) modal.style.display = "flex";
}

function closeNewBrandModal() {
  const modal = document.getElementById("modal-new-brand");
  if (modal) modal.style.display = "none";
}

function handleCreateBrand(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("new-brand-name");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  if (currentCotizador.celulares.some(b => b.brand.toLowerCase() === name.toLowerCase())) {
    alert("Ya existe una marca con ese nombre.");
    return;
  }

  currentCotizador.celulares.push({
    brand: name,
    models: []
  });

  activeCelularBrand = name;
  saveCotizadorDraft();
  closeNewBrandModal();
  renderBrandPills();
  renderCelularesSection();
  showAlert(`✓ Marca "${name}" agregada.`);
}

function deleteCelularBrand() {
  if (!currentCotizador.celulares || currentCotizador.celulares.length <= 1) {
    alert("Debe quedar al menos una marca en el cotizador.");
    return;
  }

  if (confirm(`¿Estás seguro de que deseás eliminar por completo la marca "${activeCelularBrand}" y TODOS sus modelos? Esta acción es irreversible.`)) {
    currentCotizador.celulares = currentCotizador.celulares.filter(b => b.brand.toLowerCase() !== activeCelularBrand.toLowerCase());
    activeCelularBrand = currentCotizador.celulares[0].brand;
    saveCotizadorDraft();
    renderBrandPills();
    renderCelularesSection();
    showAlert(`✓ Marca eliminada.`);
  }
}

// Modal Agregar Modelo Celular
function openAddCelularModelModal() {
  const modal = document.getElementById("modal-add-celular-model");
  const brandSelect = document.getElementById("new-model-brand");
  const nameInput = document.getElementById("new-model-name");
  const customBrandGroup = document.getElementById("custom-brand-group");
  const customBrandInput = document.getElementById("new-custom-brand-name");

  if (brandSelect && currentCotizador.celulares) {
    let opts = currentCotizador.celulares.map(b => `
      <option value="${escapeHtml(b.brand)}" ${b.brand.toLowerCase() === activeCelularBrand.toLowerCase() ? "selected" : ""}>
        ${escapeHtml(b.brand)}
      </option>
    `).join("");

    opts += `<option value="__new_brand__">➕ Crear otra marca nueva...</option>`;
    brandSelect.innerHTML = opts;
  }

  if (customBrandGroup) customBrandGroup.style.display = "none";
  if (customBrandInput) customBrandInput.value = "";
  if (nameInput) nameInput.value = "";
  if (modal) modal.style.display = "flex";
}

function toggleCustomBrandInput(val) {
  const customGroup = document.getElementById("custom-brand-group");
  const customInput = document.getElementById("new-custom-brand-name");
  if (customGroup) {
    customGroup.style.display = val === "__new_brand__" ? "block" : "none";
    if (val === "__new_brand__" && customInput) {
      setTimeout(() => customInput.focus(), 50);
    }
  }
}

function closeAddCelularModelModal() {
  const modal = document.getElementById("modal-add-celular-model");
  if (modal) modal.style.display = "none";
}

function handleCreateCelularModel(e) {
  if (e) e.preventDefault();
  const brandSelect = document.getElementById("new-model-brand");
  const nameInput = document.getElementById("new-model-name");
  const customBrandInput = document.getElementById("new-custom-brand-name");
  const prefillCheck = document.getElementById("prefill-standard-repairs");

  if (!brandSelect || !nameInput) return;
  let brandName = brandSelect.value;
  if (brandName === "__new_brand__") {
    brandName = customBrandInput ? customBrandInput.value.trim() : "";
    if (!brandName) {
      alert("Por favor ingresá el nombre de la nueva marca.");
      return;
    }
  }

  const modelName = nameInput.value.trim();
  if (!modelName) return;

  // Si la marca no existe, crearla
  let brandObj = currentCotizador.celulares.find(b => b.brand.toLowerCase() === brandName.toLowerCase());
  if (!brandObj) {
    brandObj = { brand: brandName, models: [] };
    currentCotizador.celulares.push(brandObj);
  }

  if (brandObj.models.some(m => m.name.toLowerCase() === modelName.toLowerCase())) {
    alert(`El modelo "${modelName}" ya existe en ${brandName}.`);
    return;
  }

  const newModel = {
    name: modelName,
    repairs: []
  };

  if (prefillCheck && prefillCheck.checked) {
    const slug = modelName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
    newModel.repairs = [
      { id: `cel_${slug}_1`, name: "📱 Pantalla / Módulo", price: "Consultar", note: "Seleccioná la calidad deseada debajo" },
      { id: `cel_${slug}_2`, name: "🔋 Batería", price: "Consultar", note: "Condición al 100% con garantía oficial" },
      { id: `cel_${slug}_3`, name: "🔌 Pin de carga", price: "Consultar", note: "Reemplazo de conector y flex de carga" },
      { id: `cel_${slug}_4`, name: "📸 Cámara Selfie (Frontal)", price: "Consultar", note: "Módulo de cámara frontal" },
      { id: `cel_${slug}_5`, name: "📷 Cámara Principal (Trasera)", price: "Consultar", note: "Módulo de cámara trasera original" },
      { id: `cel_${slug}_6`, name: "📱 Tapa Trasera / Cristal", price: "Consultar", note: "Cambio de tapa o cristal trasero" },
      { id: `cel_${slug}_7`, name: "🔓 Desbloqueo (Cuenta Google / iCloud / PIN)", price: "NO REALIZAMOS", note: "NO REALIZAMOS ESTE SERVICIO" },
      { id: `cel_${slug}_8`, name: "📶 Liberación de Compañía / Banda", price: "NO REALIZAMOS", note: "NO REALIZAMOS ESTE SERVICIO" }
    ];
  }

  brandObj.models.push(newModel);
  saveCotizadorDraft();
  closeAddCelularModelModal();
  renderBrandPills();
  renderCelularesSection();
  showAlert(`✓ Equipo "${modelName}" (${brandName}) agregado con éxito.`);
}

// Modal Agregar Reparación
function openAddRepairModal(targetType, brandName = null, modelIdx = null, deviceId = null) {
  const modal = document.getElementById("modal-add-repair");
  const typeInput = document.getElementById("repair-target-type");
  const brandInput = document.getElementById("repair-target-brand");
  const modelIdxInput = document.getElementById("repair-target-model-idx");
  const deviceIdInput = document.getElementById("repair-target-device-id");
  const title = document.getElementById("modal-repair-title");
  const subtitle = document.getElementById("modal-repair-subtitle");

  if (!modal) return;
  typeInput.value = targetType;
  brandInput.value = brandName || "";
  modelIdxInput.value = modelIdx !== null ? modelIdx : "";
  deviceIdInput.value = deviceId || "";

  document.getElementById("new-repair-name").value = "";
  document.getElementById("new-repair-price").value = "";
  document.getElementById("new-repair-note").value = "";

  if (targetType === "celulares") {
    const brandObj = currentCotizador.celulares.find(b => b.brand.toLowerCase() === brandName.toLowerCase());
    const modelObj = brandObj?.models[modelIdx];
    title.textContent = `➕ Nueva Reparación para ${modelObj ? modelObj.name : "Celular"}`;
    subtitle.textContent = `${brandName} · Agregá una tarifa específica a este modelo`;
  } else if (targetType === "consolas") {
    const dev = currentCotizador.consolas.find(c => c.id === deviceId);
    title.textContent = `➕ Nuevo Servicio para ${dev ? dev.name : "Consola"}`;
    subtitle.textContent = "Agregá un servicio o reparación a esta consola";
  } else if (targetType === "joysticks") {
    const dev = currentCotizador.joysticks.find(j => j.id === deviceId);
    title.textContent = `➕ Nuevo Servicio para ${dev ? dev.name : "Mando"}`;
    subtitle.textContent = "Agregá un servicio a este joystick";
  } else if (targetType === "computadoras") {
    title.textContent = "➕ Nuevo Servicio de Computadoras";
    subtitle.textContent = "Agregá un servicio informático al cotizador";
  }

  modal.style.display = "flex";
}

function closeAddRepairModal() {
  const modal = document.getElementById("modal-add-repair");
  if (modal) modal.style.display = "none";
}

function handleSaveNewRepair(e) {
  if (e) e.preventDefault();
  const type = document.getElementById("repair-target-type").value;
  const brandName = document.getElementById("repair-target-brand").value;
  const modelIdx = Number(document.getElementById("repair-target-model-idx").value);
  const deviceId = document.getElementById("repair-target-device-id").value;

  const name = document.getElementById("new-repair-name").value.trim();
  const rawPrice = document.getElementById("new-repair-price").value.trim();
  const note = document.getElementById("new-repair-note").value.trim();

  if (!name || !rawPrice) return;

  // Determinar precio numérico o string
  let finalPrice = rawPrice;
  const num = Number(rawPrice.replace(/\$/g, "").replace(/\./g, "").trim());
  if (!isNaN(num) && !rawPrice.toLowerCase().includes("usd") && !rawPrice.toLowerCase().includes("consultar")) {
    finalPrice = num;
  }

  const newId = `rep_${Date.now()}`;
  const repairObj = {
    id: newId,
    name: name,
    price: finalPrice,
    note: note
  };

  if (type === "celulares") {
    const brandObj = currentCotizador.celulares.find(b => b.brand.toLowerCase() === brandName.toLowerCase());
    if (brandObj && brandObj.models[modelIdx]) {
      brandObj.models[modelIdx].repairs.push(repairObj);
    }
    renderCelularesSection();
  } else if (type === "consolas") {
    const dev = currentCotizador.consolas.find(c => c.id === deviceId);
    if (dev) dev.repairs.push(repairObj);
    renderConsolasSection();
  } else if (type === "joysticks") {
    const dev = currentCotizador.joysticks.find(j => j.id === deviceId);
    if (dev) dev.repairs.push(repairObj);
    renderJoysticksSection();
  } else if (type === "computadoras") {
    currentCotizador.computadoras.push(repairObj);
    renderComputadorasSection();
  }

  saveCotizadorDraft();
  closeAddRepairModal();
  showAlert(`✓ Servicio "${name}" agregado.`);
}

// Modal Nuevo Dispositivo (Consola o Joystick)
function openNewDeviceModal(type) {
  const modal = document.getElementById("modal-new-device");
  const typeInput = document.getElementById("new-device-type");
  const nameInput = document.getElementById("new-device-name");
  const title = document.getElementById("modal-new-device-title");

  if (!modal) return;
  typeInput.value = type;
  if (nameInput) nameInput.value = "";

  if (type === "consolas") {
    title.textContent = "➕ Nueva Consola de Juegos";
    nameInput.placeholder = "Ej: Xbox Series X, Nintendo Switch OLED...";
  } else {
    title.textContent = "➕ Nuevo Joystick / Mando";
    nameInput.placeholder = "Ej: Xbox Wireless Controller, DualSense Edge...";
  }

  modal.style.display = "flex";
}

function closeNewDeviceModal() {
  const modal = document.getElementById("modal-new-device");
  if (modal) modal.style.display = "none";
}

function handleCreateDevice(e) {
  if (e) e.preventDefault();
  const type = document.getElementById("new-device-type").value;
  const nameInput = document.getElementById("new-device-name");
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return;

  const id = `${type}_${Date.now()}`;
  const newDev = {
    id: id,
    name: name,
    repairs: [
      { id: `${id}_1`, name: "Mantenimiento General y Cambio de Pasta Térmica", price: "Consultar", note: "Limpieza profunda y pasta de alta conductividad" }
    ]
  };

  currentCotizador[type].push(newDev);
  saveCotizadorDraft();
  closeNewDeviceModal();
  if (type === "consolas") renderConsolasSection();
  else renderJoysticksSection();
  showAlert(`✓ Dispositivo "${name}" agregado.`);
}

// Modal Ajuste Masivo (%)
function openMassAdjustModal() {
  const modal = document.getElementById("modal-mass-adjust");
  const scopeSelect = document.getElementById("mass-scope");
  if (scopeSelect) {
    scopeSelect.innerHTML = `
      <option value="current_brand">Marca actual (${escapeHtml(activeCelularBrand)})</option>
      <option value="all_celulares">Todos los celulares (todas las marcas)</option>
      <option value="consolas">Todas las consolas</option>
      <option value="joysticks">Todos los joysticks</option>
    `;
  }
  if (modal) modal.style.display = "flex";
}

function closeMassAdjustModal() {
  const modal = document.getElementById("modal-mass-adjust");
  if (modal) modal.style.display = "none";
}

function handleApplyMassAdjust(e) {
  if (e) e.preventDefault();
  const scope = document.getElementById("mass-scope").value;
  const filter = document.getElementById("mass-repair-filter").value;
  const op = document.getElementById("mass-operation").value;
  const val = Number(document.getElementById("mass-value").value);

  if (isNaN(val) || val <= 0) {
    alert("Por favor ingresá un valor mayor a cero.");
    return;
  }

  let count = 0;
  const applyToRepair = (r) => {
    if (typeof r.price !== "number" || isNaN(r.price)) return; // Proteger strings
    if (filter !== "all") {
      const n = (r.name || "").toLowerCase();
      if (!n.includes(filter)) return;
    }

    if (op === "percent_increase") {
      r.price = Math.round(r.price * (1 + val / 100));
    } else if (op === "percent_decrease") {
      r.price = Math.round(r.price * (1 - val / 100));
    } else if (op === "fixed_increase") {
      r.price = Math.round(r.price + val);
    } else if (op === "fixed_decrease") {
      r.price = Math.max(0, Math.round(r.price - val));
    }
    count++;
  };

  if (scope === "current_brand") {
    const brand = currentCotizador.celulares.find(b => b.brand.toLowerCase() === activeCelularBrand.toLowerCase());
    if (brand && brand.models) {
      brand.models.forEach(m => (m.repairs || []).forEach(applyToRepair));
    }
  } else if (scope === "all_celulares") {
    currentCotizador.celulares.forEach(b => {
      (b.models || []).forEach(m => (m.repairs || []).forEach(applyToRepair));
    });
  } else if (scope === "consolas") {
    currentCotizador.consolas.forEach(c => (c.repairs || []).forEach(applyToRepair));
  } else if (scope === "joysticks") {
    currentCotizador.joysticks.forEach(j => (j.repairs || []).forEach(applyToRepair));
  }

  saveCotizadorDraft();
  closeMassAdjustModal();
  renderCotizador();
  showAlert(`🎉 Ajuste masivo aplicado: se actualizaron ${count} precios numéricos.`);
}

// Búsqueda del Cotizador
function handleCotizadorSearch(val) {
  cotizadorSearchTerm = (val || "").trim();
  const clearBtn = document.getElementById("clear-cotizador-search-btn");
  if (clearBtn) clearBtn.style.display = cotizadorSearchTerm ? "block" : "none";
  renderCotizador();
}

function clearCotizadorSearch() {
  const input = document.getElementById("cotizador-search-input");
  if (input) input.value = "";
  handleCotizadorSearch("");
}

// --------------------------------------------------------
// 9.7 GENERACIÓN DE ARCHIVO, DESCARGA Y GITHUB
// --------------------------------------------------------
function generateCotizadorJsCode() {
  const jsonStr = JSON.stringify(currentCotizador, null, 2);
  const dateStr = new Date().toLocaleString("es-AR");

  return `// ========================================================
// Tarifas y modelos exactos del presupuestador NISSA
// Generado automáticamente desde el Panel de Administración NISSA
// Fecha de actualización: ${dateStr}
// 100% Compatible con GitHub Pages (Costo $0)
// ========================================================

let PRECIOS_WIDGET = ${jsonStr};

if (typeof window !== "undefined") {
  window.PRECIOS_WIDGET = PRECIOS_WIDGET;
}
`;
}

function downloadCotizadorJs() {
  const code = generateCotizadorJsCode();
  const blob = new Blob([code], { type: "application/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cotizador-data.js";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAlert("✓ Archivo cotizador-data.js descargado.");
}

function openCotizadorCodeModal() {
  const modal = document.getElementById("modal-cotizador-code");
  const textarea = document.getElementById("cotizador-code-output");
  if (!modal || !textarea) return;

  textarea.value = generateCotizadorJsCode();
  modal.style.display = "flex";
}

function closeCotizadorCodeModal() {
  const modal = document.getElementById("modal-cotizador-code");
  if (modal) modal.style.display = "none";
}

function copyCotizadorGeneratedCode() {
  const code = generateCotizadorJsCode();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      showAlert("✓ Código copiado al portapapeles.");
      closeCotizadorCodeModal();
    });
  } else {
    const textarea = document.getElementById("cotizador-code-output");
    if (textarea) {
      textarea.select();
      document.execCommand("copy");
      showAlert("✓ Código copiado al portapapeles.");
      closeCotizadorCodeModal();
    }
  }
}

async function publishCotizadorDirectlyToGithub() {
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("⚠️ Para guardar y publicar los cambios en la tienda en línea, primero ingresá tu clave de conexión.\n\nPresioná Aceptar para configurarla.");
    openGithubModal();
    return;
  }

  const publishBtn = document.getElementById("btn-publish-cotizador-github");
  const originalText = publishBtn ? publishBtn.innerHTML : "";
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = "⏳ Guardando cambios...";
  }

  // Guardar archivo cotizador-data.js en el disco del servidor local si está disponible
  const newCode = generateCotizadorJsCode();
  saveCotizadorFileToServer(newCode);

  try {
    const path = "cotizador-data.js";
    const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}&t=${Date.now()}`;
    let sha = null;
    const getRes = await callGithubApi(getUrl, { token: cfg.token });
    if (getRes.ok && getRes.data && getRes.data.sha) {
      sha = getRes.data.sha;
    }

    const payload = {
      message: `Actualización de tarifas del presupuestador (${new Date().toLocaleDateString("es-AR")})`,
      content: utf8ToBase64(newCode),
      branch: cfg.branch
    };
    if (sha) payload.sha = sha;

    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    let putRes = await callGithubApi(putUrl, {
      method: "PUT",
      token: cfg.token,
      body: payload
    });

    if (putRes.status === 409) {
      const freshGet = await callGithubApi(getUrl, { token: cfg.token });
      if (freshGet.ok && freshGet.data && freshGet.data.sha) {
        payload.sha = freshGet.data.sha;
        putRes = await callGithubApi(putUrl, {
          method: "PUT",
          token: cfg.token,
          body: payload
        });
      }
    }

    if (putRes.ok) {
      localStorage.removeItem("nissa_cotizador_draft");
      checkDraftStatus();
      showAlert("✓ ¡Tarifas del presupuestador guardadas y publicadas! La tienda se actualizará en línea en unos instantes.");
    } else {
      const msg = putRes.data?.message || putRes.statusText || "";
      if (putRes.status === 401 || msg.includes("Bad credentials")) {
        alert("⚠️ La clave de conexión expiró o no es válida. Por favor ingresala nuevamente en ⚙️ Conexión.");
        openGithubModal();
      } else {
        alert(`No se pudieron guardar los cambios (${putRes.status}): ${msg}`);
      }
    }
  } catch (err) {
    alert("Error de conexión al guardar cambios: " + (err.message || err));
  } finally {
    if (publishBtn) {
      publishBtn.disabled = false;
      publishBtn.innerHTML = originalText;
    }
  }
}

function resetToOriginalCotizador() {
  if (!confirm("¿Estás seguro de que deseás descartar todas las modificaciones no publicadas y volver a las tarifas originales del presupuestador?")) {
    return;
  }
  localStorage.removeItem("nissa_cotizador_draft");
  if (originalCotizadorBackup) {
    currentCotizador = JSON.parse(JSON.stringify(originalCotizadorBackup));
  }
  if (typeof window !== "undefined") {
    window.PRECIOS_WIDGET = currentCotizador;
  }
  checkDraftStatus();
  updateCountsBadge();
  renderCotizador();
  showAlert("✓ Se restauraron las tarifas originales del presupuestador.");
}

// ========================================================
// 10. GESTOR COMPLETO DE ESTÉTICA Y DISEÑO DE LA TIENDA
// ========================================================
function getDefaultSiteConfig() {
  return {
    brand: {
      pageTitle: "NISSA - Tienda Online y Servicio Técnico",
      metaDescription: "Tienda online de accesorios y tecnología NISSA con cotizador de reparaciones y calificaciones de Google.",
      headerLogo: "NISSA",
      footerBrand: "NISSA",
      footerSubtitle: "Tu tecnología en buenas manos. Servicio técnico y accesorios oficiales.",
      footerCopyright: "NISSA. Todos los derechos reservados.",
      whatsappNumber: "541136620653"
    },
    theme: {
      primaryColor: "#2563eb",
      accentColor: "#0ea5e9",
      bgColor: "#f8fafc",
      headerBg: "#ffffff",
      footerBg: "#0f172a",
      textColor: "#0f172a",
      bannerOverlayOpacity: ""
    },
    sectionOrder: [
      { id: "inicio", label: "Banner de Bienvenida", visible: true },
      { id: "cotizador", label: "Presupuestador", visible: true },
      { id: "productos", label: "Tienda Online", visible: true },
      { id: "informacion", label: "Información y Garantía", visible: true },
      { id: "resenas", label: "Reseñas de Google", visible: true }
    ],
    navTabs: [
      { id: "nav-cotizador", href: "#cotizador", label: "Presupuestar", visible: true, isTerms: false },
      { id: "nav-productos", href: "#productos", label: "Tienda", visible: true, isTerms: false },
      { id: "nav-informacion", href: "#informacion", label: "Información", visible: true, isTerms: false },
      { id: "nav-resenas", href: "#resenas", label: "Opiniones Google", visible: true, isTerms: false },
      { id: "nav-terminos", href: "/terminos-y-condiciones", label: "Términos y condiciones", visible: true, isTerms: true }
    ],
    banner: {
      image: "./banner-nissa.jpg",
      badge: "✦ BIENVENIDO A NISSA",
      title: "REPARAMOS TU EQUIPO",
      subtitle: "Servicio técnico profesional de celulares, consolas, mandos y notebooks con hasta 90 días de garantía de laboratorio.",
      primaryBtnText: "Cotizar reparación ahora ➔",
      primaryBtnHref: "#cotizador",
      primaryBtnVisible: true,
      secondaryBtnText: "Explorar tienda online",
      secondaryBtnHref: "#productos",
      secondaryBtnVisible: true
    },
    cotizadorSection: {
      badge: "⚡ SERVICIO TÉCNICO DE CONFIANZA",
      title: "COTIZÁ TU REPARACIÓN",
      subtitle: "Conocé el precio estimado de tu reparación en segundos y pedí tu turno.",
      step1Label: "1. ¿Qué equipo querés reparar?"
    },
    tiendaSection: {
      title: "Tienda Online",
      subtitle: "Precios por unidad y con descuento especial a partir de 3 unidades.",
      dividerTag: "CATÁLOGO",
      dividerTitle: "Explorá por categoría",
      searchPlaceholder: "Buscar productos en la tienda..."
    },
    infoSection: {
      tag: "INFORMACIÓN",
      title: "Todo lo que necesitás saber",
      cards: []
    },
    reviewsSection: {
      headerTag: "Calificaciones de NISSA.COM.AR",
      title: "Nuestros clientes nos recomiendan",
      subtitle: "Opiniones 100% verídicas que garantizan nuestro compromiso y servicio.",
      score: "5.0",
      scoreLabel: "Excelente",
      basedOnText: "reseñas de Google",
      items: []
    }
  };
}

function loadInitialSiteConfig() {
  const base = (typeof window.NISSA_SITE_CONFIG !== "undefined" && window.NISSA_SITE_CONFIG)
    ? JSON.parse(JSON.stringify(window.NISSA_SITE_CONFIG))
    : getDefaultSiteConfig();

  originalSiteConfigBackup = JSON.parse(JSON.stringify(base));

  const draft = localStorage.getItem("nissa_site_config_draft");
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      if (parsed && typeof parsed === "object" && parsed.brand && parsed.banner) {
        currentSiteConfig = parsed;
        return;
      }
    } catch (e) {
      console.warn("Error al leer borrador de estética:", e);
    }
  }
  currentSiteConfig = base;
}

function saveEsteticaDraft() {
  if (!currentSiteConfig) return;
  try {
    localStorage.setItem("nissa_site_config_draft", JSON.stringify(currentSiteConfig));
  } catch (e) {
    console.warn("No se pudo guardar borrador estético:", e);
  }
  if (typeof window !== "undefined") {
    window.NISSA_SITE_CONFIG = currentSiteConfig;
  }
  checkDraftStatus();
}

function switchEsteticaSubtab(subtab) {
  activeEsteticaSubtab = subtab;
  const tabs = ["orden", "banner", "textos", "info", "resenas", "colores"];
  tabs.forEach(t => {
    const btn = document.getElementById(`est-tab-${t}`);
    if (btn) btn.classList.toggle("active", t === subtab);
  });
  renderEstetica();
}

function setEsteticaField(path, value) {
  if (!currentSiteConfig) loadInitialSiteConfig();
  const keys = path.split(".");
  let target = currentSiteConfig;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]] || typeof target[keys[i]] !== "object") {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
  saveEsteticaDraft();
}

function moveSectionOrder(index, dir) {
  if (!currentSiteConfig || !Array.isArray(currentSiteConfig.sectionOrder)) return;
  const target = index + dir;
  if (target < 0 || target >= currentSiteConfig.sectionOrder.length) return;
  const arr = currentSiteConfig.sectionOrder;
  const tmp = arr[index];
  arr[index] = arr[target];
  arr[target] = tmp;
  saveEsteticaDraft();
  renderEstetica();
}

function toggleSectionVisible(index, checked) {
  if (!currentSiteConfig || !currentSiteConfig.sectionOrder[index]) return;
  currentSiteConfig.sectionOrder[index].visible = Boolean(checked);
  saveEsteticaDraft();
}

function updateNavTabField(index, field, val) {
  if (!currentSiteConfig || !currentSiteConfig.navTabs[index]) return;
  currentSiteConfig.navTabs[index][field] = val;
  saveEsteticaDraft();
}

function moveNavTabOrder(index, dir) {
  if (!currentSiteConfig || !Array.isArray(currentSiteConfig.navTabs)) return;
  const target = index + dir;
  if (target < 0 || target >= currentSiteConfig.navTabs.length) return;
  const arr = currentSiteConfig.navTabs;
  const tmp = arr[index];
  arr[index] = arr[target];
  arr[target] = tmp;
  saveEsteticaDraft();
  renderEstetica();
}

function addCustomNavTab() {
  if (!currentSiteConfig) loadInitialSiteConfig();
  currentSiteConfig.navTabs = currentSiteConfig.navTabs || [];
  currentSiteConfig.navTabs.push({
    id: `nav-custom-${Date.now()}`,
    href: "#productos",
    label: "Nueva Pestaña",
    visible: true,
    isTerms: false
  });
  saveEsteticaDraft();
  renderEstetica();
}

function removeNavTab(index) {
  if (!currentSiteConfig || !Array.isArray(currentSiteConfig.navTabs)) return;
  if (currentSiteConfig.navTabs.length <= 1) {
    alert("Debe quedar al menos una pestaña en el menú.");
    return;
  }
  if (confirm(`¿Eliminar la pestaña "${currentSiteConfig.navTabs[index].label}" del menú?`)) {
    currentSiteConfig.navTabs.splice(index, 1);
    saveEsteticaDraft();
    renderEstetica();
  }
}

async function handleBannerImageUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  try {
    const processed = await processImageFile(file, 1400, 0.82);
    pendingBannerFileState = {
      dataUrl: processed.dataUrl,
      filename: `banner-${Date.now()}.jpg`
    };
    currentSiteConfig.banner.image = processed.dataUrl;
    saveEsteticaDraft();
    renderEstetica();
    showAlert(`✓ Imagen de banner cargada (${processed.width}×${processed.height}px, ${processed.sizeKb} KB). Presioná "💾 Guardar cambios" para aplicarla en la tienda.`);
  } catch (err) {
    alert("Error al cargar imagen de banner: " + (err.message || err));
  }
}

function updateBannerPreviewLive() {
  const b = currentSiteConfig?.banner || {};
  const badgeEl = document.getElementById("est-preview-badge");
  const titleEl = document.getElementById("est-preview-title");
  const subEl = document.getElementById("est-preview-subtitle");
  if (badgeEl) badgeEl.textContent = b.badge || "";
  if (titleEl) titleEl.textContent = b.title || "";
  if (subEl) subEl.textContent = b.subtitle || "";
}

function updateInfoCardField(index, field, val) {
  if (!currentSiteConfig?.infoSection?.cards?.[index]) return;
  currentSiteConfig.infoSection.cards[index][field] = val;
  saveEsteticaDraft();
}

function moveInfoCardOrder(index, dir) {
  const cards = currentSiteConfig?.infoSection?.cards;
  if (!Array.isArray(cards)) return;
  const target = index + dir;
  if (target < 0 || target >= cards.length) return;
  const tmp = cards[index];
  cards[index] = cards[target];
  cards[target] = tmp;
  saveEsteticaDraft();
  renderEstetica();
}

function addInfoCard() {
  if (!currentSiteConfig) loadInitialSiteConfig();
  currentSiteConfig.infoSection = currentSiteConfig.infoSection || { tag: "INFORMACIÓN", title: "Todo lo que necesitás saber", cards: [] };
  currentSiteConfig.infoSection.cards.push({
    icon: "✨",
    title: "Nuevo bloque informativo",
    text: "Escribí aquí la información que querés mostrar a tus clientes."
  });
  saveEsteticaDraft();
  renderEstetica();
}

function removeInfoCard(index) {
  const cards = currentSiteConfig?.infoSection?.cards;
  if (!Array.isArray(cards)) return;
  if (confirm(`¿Eliminar la tarjeta "${cards[index]?.title || ""}"?`)) {
    cards.splice(index, 1);
    saveEsteticaDraft();
    renderEstetica();
  }
}

function updateReviewField(index, field, val) {
  const rev = currentSiteConfig?.reviewsSection?.items?.[index];
  if (!rev) return;
  rev[field] = field === "stars" ? Number(val) || 5 : val;
  if (field === "author") {
    const parts = String(val || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      rev.initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1) {
      rev.initials = parts[0].substring(0, 2).toUpperCase();
    }
  }
  saveEsteticaDraft();
}

function moveReviewOrder(index, dir) {
  const items = currentSiteConfig?.reviewsSection?.items;
  if (!Array.isArray(items)) return;
  const target = index + dir;
  if (target < 0 || target >= items.length) return;
  const tmp = items[index];
  items[index] = items[target];
  items[target] = tmp;
  saveEsteticaDraft();
  renderEstetica();
}

function addReviewItem() {
  if (!currentSiteConfig) loadInitialSiteConfig();
  currentSiteConfig.reviewsSection = currentSiteConfig.reviewsSection || { items: [] };
  currentSiteConfig.reviewsSection.items = currentSiteConfig.reviewsSection.items || [];
  currentSiteConfig.reviewsSection.items.push({
    author: "Nuevo Cliente",
    initials: "NC",
    avatarBg: "#e0f2fe",
    avatarColor: "#0369a1",
    badge: "Cliente",
    date: "Hace unos días",
    stars: 5,
    text: "Excelente atención y servicio técnico."
  });
  saveEsteticaDraft();
  renderEstetica();
}

function removeReviewItem(index) {
  const items = currentSiteConfig?.reviewsSection?.items;
  if (!Array.isArray(items)) return;
  if (confirm(`¿Eliminar la reseña de "${items[index]?.author || "este cliente"}"?`)) {
    items.splice(index, 1);
    saveEsteticaDraft();
    renderEstetica();
  }
}

function updateThemeColorField(key, val, syncInputId) {
  setEsteticaField(`theme.${key}`, val);
  if (syncInputId) {
    const el = document.getElementById(syncInputId);
    if (el && el.value !== val) el.value = val;
  }
}

function resetDefaultThemeColors() {
  if (!currentSiteConfig) loadInitialSiteConfig();
  currentSiteConfig.theme = JSON.parse(JSON.stringify(getDefaultSiteConfig().theme));
  saveEsteticaDraft();
  renderEstetica();
  showAlert("✓ Colores restaurados a la paleta original.");
}

function renderEstetica() {
  const container = document.getElementById("estetica-content-area");
  if (!container) return;
  if (!currentSiteConfig) loadInitialSiteConfig();
  const cfg = currentSiteConfig;

  if (activeEsteticaSubtab === "orden") {
    const sections = Array.isArray(cfg.sectionOrder) ? cfg.sectionOrder : [];
    const navTabs = Array.isArray(cfg.navTabs) ? cfg.navTabs : [];
    const brand = cfg.brand || {};

    container.innerHTML = `
      <div class="estetica-card">
        <div class="estetica-card-header">
          <div>
            <h3>🏷️ Identidad, Título de Página y Contacto</h3>
            <p>Configurá el título de la pestaña del navegador, logo, pie de página y número de WhatsApp.</p>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Título de la página (pestaña del navegador):</label>
            <input type="text" value="${escapeHtml(brand.pageTitle || '')}" oninput="setEsteticaField('brand.pageTitle', this.value)">
          </div>
          <div class="form-group flex-1">
            <label>Logo / Nombre en cabecera:</label>
            <input type="text" value="${escapeHtml(brand.headerLogo || '')}" oninput="setEsteticaField('brand.headerLogo', this.value)">
          </div>
          <div class="form-group flex-1">
            <label>WhatsApp de la tienda (botón flotante y pedidos):</label>
            <input type="text" value="${escapeHtml(brand.whatsappNumber || '')}" placeholder="541136620653" oninput="setEsteticaField('brand.whatsappNumber', this.value)">
          </div>
        </div>
        <div class="form-group">
          <label>Descripción general (SEO):</label>
          <input type="text" value="${escapeHtml(brand.metaDescription || '')}" oninput="setEsteticaField('brand.metaDescription', this.value)">
        </div>
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Nombre en pie de página:</label>
            <input type="text" value="${escapeHtml(brand.footerBrand || '')}" oninput="setEsteticaField('brand.footerBrand', this.value)">
          </div>
          <div class="form-group flex-2">
            <label>Texto descriptivo del pie de página:</label>
            <input type="text" value="${escapeHtml(brand.footerSubtitle || '')}" oninput="setEsteticaField('brand.footerSubtitle', this.value)">
          </div>
          <div class="form-group flex-1">
            <label>Copyright:</label>
            <input type="text" value="${escapeHtml(brand.footerCopyright || '')}" oninput="setEsteticaField('brand.footerCopyright', this.value)">
          </div>
        </div>
      </div>

      <div class="estetica-grid-2">
        <div class="estetica-card">
          <div class="estetica-card-header">
            <div>
              <h3>📐 Orden de Secciones de la Tienda</h3>
              <p>Elegí el orden vertical en que aparecen los bloques y si querés mostrar u ocultar alguno.</p>
            </div>
          </div>
          <div class="estetica-order-list">
            ${sections.map((s, idx) => `
              <div class="estetica-order-row">
                <div class="estetica-order-info">
                  <span class="estetica-order-num">${idx + 1}</span>
                  <strong>${escapeHtml(s.label || s.id)}</strong>
                </div>
                <div class="estetica-order-actions">
                  <label class="checkbox-label" style="font-size:12px;">
                    <input type="checkbox" ${s.visible !== false ? "checked" : ""} onchange="toggleSectionVisible(${idx}, this.checked)">
                    <span>Visible</span>
                  </label>
                  <button type="button" class="btn-icon-action" onclick="moveSectionOrder(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Subir">⬆️</button>
                  <button type="button" class="btn-icon-action" onclick="moveSectionOrder(${idx}, 1)" ${idx === sections.length - 1 ? "disabled" : ""} title="Bajar">⬇️</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="estetica-card">
          <div class="estetica-card-header">
            <div>
              <h3>🧭 Pestañas del Menú Superior</h3>
              <p>Renombrá, reordená, ocultá o agregá pestañas de navegación.</p>
            </div>
            <button type="button" class="btn btn-sm btn-outline" onclick="addCustomNavTab()">➕ Agregar Pestaña</button>
          </div>
          <div class="estetica-order-list">
            ${navTabs.map((t, idx) => `
              <div class="estetica-order-row">
                <div style="display:flex; gap:8px; flex:1; flex-wrap:wrap; min-width:200px;">
                  <input type="text" value="${escapeHtml(t.label || '')}" placeholder="Texto de pestaña" style="flex:1; min-width:120px; padding:6px 10px; font-size:13px;" oninput="updateNavTabField(${idx}, 'label', this.value)">
                  <input type="text" value="${escapeHtml(t.href || '')}" placeholder="#seccion" style="width:120px; padding:6px 10px; font-size:12px; color:#64748b;" ${t.isTerms ? "readonly" : ""} oninput="updateNavTabField(${idx}, 'href', this.value)">
                </div>
                <div class="estetica-order-actions">
                  <label class="checkbox-label" style="font-size:12px;">
                    <input type="checkbox" ${t.visible !== false ? "checked" : ""} onchange="updateNavTabField(${idx}, 'visible', this.checked)">
                    <span>Visible</span>
                  </label>
                  <button type="button" class="btn-icon-action" onclick="moveNavTabOrder(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Subir">⬆️</button>
                  <button type="button" class="btn-icon-action" onclick="moveNavTabOrder(${idx}, 1)" ${idx === navTabs.length - 1 ? "disabled" : ""} title="Bajar">⬇️</button>
                  ${!t.isTerms ? `<button type="button" class="btn-icon-action danger" onclick="removeNavTab(${idx})" title="Eliminar pestaña">✕</button>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  } else if (activeEsteticaSubtab === "banner") {
    const b = cfg.banner || {};
    const imgRaw = b.image || "./banner-nissa.jpg";
    const imgSrc = imgRaw.startsWith("data:") || imgRaw.startsWith("http") || imgRaw.startsWith("./") || imgRaw.startsWith("/") ? imgRaw : `./fotos/${imgRaw}`;

    container.innerHTML = `
      <div class="estetica-card">
        <div class="estetica-card-header">
          <div>
            <h3>🖼️ Banner Principal de Bienvenida</h3>
            <p>Editá la fotografía de portada, los títulos y los botones principales.</p>
          </div>
          <label for="estetica-banner-file" class="btn btn-primary btn-sm" style="cursor:pointer;">
            📁 Cambiar Imagen del Banner
          </label>
          <input type="file" id="estetica-banner-file" accept="image/*" class="sr-only-input" onchange="handleBannerImageUpload(this)">
        </div>

        <div class="estetica-banner-preview">
          <img src="${escapeHtml(imgSrc)}" alt="Vista previa del banner">
          <div class="estetica-banner-preview-overlay">
            <div id="est-preview-badge" style="font-size:11px; font-weight:800; color:#38bdf8; margin-bottom:6px;">${escapeHtml(b.badge || '')}</div>
            <div id="est-preview-title" style="font-size:24px; font-weight:900; letter-spacing:-0.02em; margin-bottom:6px;">${escapeHtml(b.title || '')}</div>
            <div id="est-preview-subtitle" style="font-size:13px; color:#e2e8f0; max-width:560px;">${escapeHtml(b.subtitle || '')}</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Insignia superior:</label>
            <input type="text" value="${escapeHtml(b.badge || '')}" oninput="setEsteticaField('banner.badge', this.value); updateBannerPreviewLive()">
          </div>
          <div class="form-group flex-2">
            <label>Título principal:</label>
            <input type="text" value="${escapeHtml(b.title || '')}" oninput="setEsteticaField('banner.title', this.value); updateBannerPreviewLive()">
          </div>
        </div>

        <div class="form-group">
          <label>Subtítulo descriptivo:</label>
          <textarea rows="2" oninput="setEsteticaField('banner.subtitle', this.value); updateBannerPreviewLive()">${escapeHtml(b.subtitle || '')}</textarea>
        </div>

        <div class="form-group">
          <label>Ruta o enlace de imagen actual:</label>
          <input type="text" value="${escapeHtml(b.image && b.image.startsWith('data:') ? 'Nueva imagen cargada lista para guardar' : (b.image || './banner-nissa.jpg'))}" ${b.image && b.image.startsWith('data:') ? 'readonly' : ''} oninput="setEsteticaField('banner.image', this.value)">
          <span class="form-hint">Podés subir cualquier foto con el botón "📁 Cambiar Imagen del Banner" o escribir una ruta (ej: ./banner-nissa.jpg).</span>
        </div>

        <div class="estetica-grid-2" style="margin-top:16px;">
          <div class="estetica-item-card">
            <div class="estetica-item-top">
              <strong>Botón Principal</strong>
              <label class="checkbox-label" style="font-size:12px;">
                <input type="checkbox" ${b.primaryBtnVisible !== false ? "checked" : ""} onchange="setEsteticaField('banner.primaryBtnVisible', this.checked)">
                <span>Mostrar botón</span>
              </label>
            </div>
            <div class="form-group">
              <label>Texto del botón:</label>
              <input type="text" value="${escapeHtml(b.primaryBtnText || '')}" oninput="setEsteticaField('banner.primaryBtnText', this.value)">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Destino (sección o enlace):</label>
              <input type="text" value="${escapeHtml(b.primaryBtnHref || '#cotizador')}" oninput="setEsteticaField('banner.primaryBtnHref', this.value)">
            </div>
          </div>

          <div class="estetica-item-card">
            <div class="estetica-item-top">
              <strong>Botón Secundario</strong>
              <label class="checkbox-label" style="font-size:12px;">
                <input type="checkbox" ${b.secondaryBtnVisible !== false ? "checked" : ""} onchange="setEsteticaField('banner.secondaryBtnVisible', this.checked)">
                <span>Mostrar botón</span>
              </label>
            </div>
            <div class="form-group">
              <label>Texto del botón:</label>
              <input type="text" value="${escapeHtml(b.secondaryBtnText || '')}" oninput="setEsteticaField('banner.secondaryBtnText', this.value)">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label>Destino (sección o enlace):</label>
              <input type="text" value="${escapeHtml(b.secondaryBtnHref || '#productos')}" oninput="setEsteticaField('banner.secondaryBtnHref', this.value)">
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (activeEsteticaSubtab === "textos") {
    const cot = cfg.cotizadorSection || {};
    const tnd = cfg.tiendaSection || {};

    container.innerHTML = `
      <div class="estetica-grid-2">
        <div class="estetica-card">
          <div class="estetica-card-header">
            <div>
              <h3>🛠️ Encabezado del Presupuestador</h3>
              <p>Textos visibles arriba del cotizador de reparaciones.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Insignia superior:</label>
            <input type="text" value="${escapeHtml(cot.badge || '')}" oninput="setEsteticaField('cotizadorSection.badge', this.value)">
          </div>
          <div class="form-group">
            <label>Título principal:</label>
            <input type="text" value="${escapeHtml(cot.title || '')}" oninput="setEsteticaField('cotizadorSection.title', this.value)">
          </div>
          <div class="form-group">
            <label>Subtítulo:</label>
            <textarea rows="2" oninput="setEsteticaField('cotizadorSection.subtitle', this.value)">${escapeHtml(cot.subtitle || '')}</textarea>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Pregunta Paso 1:</label>
            <input type="text" value="${escapeHtml(cot.step1Label || '')}" oninput="setEsteticaField('cotizadorSection.step1Label', this.value)">
          </div>
        </div>

        <div class="estetica-card">
          <div class="estetica-card-header">
            <div>
              <h3>🛍️ Encabezado de la Tienda Online</h3>
              <p>Títulos y textos de búsqueda del catálogo de productos.</p>
            </div>
          </div>
          <div class="form-group">
            <label>Título de la tienda:</label>
            <input type="text" value="${escapeHtml(tnd.title || '')}" oninput="setEsteticaField('tiendaSection.title', this.value)">
          </div>
          <div class="form-group">
            <label>Subtítulo:</label>
            <textarea rows="2" oninput="setEsteticaField('tiendaSection.subtitle', this.value)">${escapeHtml(tnd.subtitle || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Etiqueta divisora:</label>
              <input type="text" value="${escapeHtml(tnd.dividerTag || '')}" oninput="setEsteticaField('tiendaSection.dividerTag', this.value)">
            </div>
            <div class="form-group flex-2">
              <label>Título del divisor:</label>
              <input type="text" value="${escapeHtml(tnd.dividerTitle || '')}" oninput="setEsteticaField('tiendaSection.dividerTitle', this.value)">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Texto del buscador:</label>
            <input type="text" value="${escapeHtml(tnd.searchPlaceholder || '')}" oninput="setEsteticaField('tiendaSection.searchPlaceholder', this.value)">
          </div>
        </div>
      </div>
    `;
  } else if (activeEsteticaSubtab === "info") {
    const info = cfg.infoSection || {};
    const cards = Array.isArray(info.cards) ? info.cards : [];

    container.innerHTML = `
      <div class="estetica-card">
        <div class="estetica-card-header">
          <div>
            <h3>ℹ️ Sección de Información y Garantía</h3>
            <p>Editá el encabezado y cada tarjeta informativa de la tienda.</p>
          </div>
          <button type="button" class="btn btn-success btn-sm" onclick="addInfoCard()">➕ Agregar Tarjeta</button>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Etiqueta superior:</label>
            <input type="text" value="${escapeHtml(info.tag || '')}" oninput="setEsteticaField('infoSection.tag', this.value)">
          </div>
          <div class="form-group flex-2">
            <label>Título de la sección:</label>
            <input type="text" value="${escapeHtml(info.title || '')}" oninput="setEsteticaField('infoSection.title', this.value)">
          </div>
        </div>

        <div style="margin-top:12px;">
          ${cards.map((c, idx) => `
            <div class="estetica-item-card">
              <div class="estetica-item-top">
                <strong>Tarjeta #${idx + 1}</strong>
                <div class="estetica-order-actions">
                  <button type="button" class="btn-icon-action" onclick="moveInfoCardOrder(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Subir">⬆️</button>
                  <button type="button" class="btn-icon-action" onclick="moveInfoCardOrder(${idx}, 1)" ${idx === cards.length - 1 ? "disabled" : ""} title="Bajar">⬇️</button>
                  <button type="button" class="btn-icon-action danger" onclick="removeInfoCard(${idx})" title="Eliminar tarjeta">✕</button>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group" style="width:90px;">
                  <label>Ícono:</label>
                  <input type="text" value="${escapeHtml(c.icon || '')}" style="text-align:center; font-size:18px;" oninput="updateInfoCardField(${idx}, 'icon', this.value)">
                </div>
                <div class="form-group flex-2">
                  <label>Título:</label>
                  <input type="text" value="${escapeHtml(c.title || '')}" oninput="updateInfoCardField(${idx}, 'title', this.value)">
                </div>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Descripción:</label>
                <textarea rows="2" oninput="updateInfoCardField(${idx}, 'text', this.value)">${escapeHtml(c.text || '')}</textarea>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } else if (activeEsteticaSubtab === "resenas") {
    const revSec = cfg.reviewsSection || {};
    const items = Array.isArray(revSec.items) ? revSec.items : [];

    container.innerHTML = `
      <div class="estetica-card">
        <div class="estetica-card-header">
          <div>
            <h3>⭐ Sección de Reseñas y Calificaciones</h3>
            <p>Personalizá el puntaje mostrado, los textos y las opiniones individuales de clientes.</p>
          </div>
          <button type="button" class="btn btn-success btn-sm" onclick="addReviewItem()">➕ Agregar Reseña</button>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Etiqueta superior:</label>
            <input type="text" value="${escapeHtml(revSec.headerTag || '')}" oninput="setEsteticaField('reviewsSection.headerTag', this.value)">
          </div>
          <div class="form-group flex-2">
            <label>Título principal:</label>
            <input type="text" value="${escapeHtml(revSec.title || '')}" oninput="setEsteticaField('reviewsSection.title', this.value)">
          </div>
        </div>

        <div class="form-group">
          <label>Subtítulo:</label>
          <input type="text" value="${escapeHtml(revSec.subtitle || '')}" oninput="setEsteticaField('reviewsSection.subtitle', this.value)">
        </div>

        <div class="form-row" style="margin-bottom:16px;">
          <div class="form-group flex-1">
            <label>Puntaje (ej: 5.0):</label>
            <input type="text" value="${escapeHtml(revSec.score || '5.0')}" oninput="setEsteticaField('reviewsSection.score', this.value)">
          </div>
          <div class="form-group flex-1">
            <label>Calificación (ej: Excelente):</label>
            <input type="text" value="${escapeHtml(revSec.scoreLabel || 'Excelente')}" oninput="setEsteticaField('reviewsSection.scoreLabel', this.value)">
          </div>
          <div class="form-group flex-2">
            <label>Texto inferior (ej: reseñas de Google):</label>
            <input type="text" value="${escapeHtml(revSec.basedOnText || 'reseñas de Google')}" oninput="setEsteticaField('reviewsSection.basedOnText', this.value)">
          </div>
        </div>

        <div>
          ${items.map((rev, idx) => `
            <div class="estetica-item-card">
              <div class="estetica-item-top">
                <strong>Reseña #${idx + 1} · ${escapeHtml(rev.author || 'Cliente')}</strong>
                <div class="estetica-order-actions">
                  <button type="button" class="btn-icon-action" onclick="moveReviewOrder(${idx}, -1)" ${idx === 0 ? "disabled" : ""} title="Subir">⬆️</button>
                  <button type="button" class="btn-icon-action" onclick="moveReviewOrder(${idx}, 1)" ${idx === items.length - 1 ? "disabled" : ""} title="Bajar">⬇️</button>
                  <button type="button" class="btn-icon-action danger" onclick="removeReviewItem(${idx})" title="Eliminar reseña">✕</button>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group flex-2">
                  <label>Nombre del cliente:</label>
                  <input type="text" value="${escapeHtml(rev.author || '')}" oninput="updateReviewField(${idx}, 'author', this.value)">
                </div>
                <div class="form-group flex-1">
                  <label>Etiqueta (ej: Cliente / Local Guide):</label>
                  <input type="text" value="${escapeHtml(rev.badge || 'Cliente')}" oninput="updateReviewField(${idx}, 'badge', this.value)">
                </div>
                <div class="form-group flex-1">
                  <label>Fecha:</label>
                  <input type="text" value="${escapeHtml(rev.date || '')}" oninput="updateReviewField(${idx}, 'date', this.value)">
                </div>
                <div class="form-group" style="width:110px;">
                  <label>Estrellas:</label>
                  <select onchange="updateReviewField(${idx}, 'stars', this.value)">
                    <option value="5" ${Number(rev.stars) === 5 ? "selected" : ""}>5 ★★★★★</option>
                    <option value="4" ${Number(rev.stars) === 4 ? "selected" : ""}>4 ★★★★</option>
                    <option value="3" ${Number(rev.stars) === 3 ? "selected" : ""}>3 ★★★</option>
                    <option value="2" ${Number(rev.stars) === 2 ? "selected" : ""}>2 ★★</option>
                    <option value="1" ${Number(rev.stars) === 1 ? "selected" : ""}>1 ★</option>
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Lo que dice la reseña:</label>
                <textarea rows="2" oninput="updateReviewField(${idx}, 'text', this.value)">${escapeHtml(rev.text || '')}</textarea>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } else if (activeEsteticaSubtab === "colores") {
    const th = cfg.theme || {};
    const colorDefs = [
      { key: "primaryColor", label: "Color Principal (Botones y detalles)", def: "#2563eb" },
      { key: "accentColor", label: "Color Acento (Etiquetas e insignias)", def: "#0ea5e9" },
      { key: "bgColor", label: "Fondo General de la Página", def: "#f8fafc" },
      { key: "headerBg", label: "Fondo de la Barra Superior", def: "#ffffff" },
      { key: "footerBg", label: "Fondo del Pie de Página", def: "#0f172a" },
      { key: "textColor", label: "Color Principal de Textos", def: "#0f172a" }
    ];

    container.innerHTML = `
      <div class="estetica-card">
        <div class="estetica-card-header">
          <div>
            <h3>🎨 Paleta de Colores y Estilo Visual</h3>
            <p>Personalizá los colores de la tienda o volvé a la paleta original cuando quieras.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="resetDefaultThemeColors()">↺ Restaurar colores originales</button>
        </div>

        <div class="estetica-color-grid">
          ${colorDefs.map(c => {
            const val = th[c.key] || c.def;
            return `
              <div class="estetica-color-box">
                <label style="font-size:12.5px; font-weight:800;">${c.label}</label>
                <div class="estetica-color-row">
                  <input type="color" id="est-cp-${c.key}" value="${escapeHtml(val)}" oninput="updateThemeColorField('${c.key}', this.value, 'est-tx-${c.key}')">
                  <input type="text" id="est-tx-${c.key}" value="${escapeHtml(val)}" oninput="updateThemeColorField('${c.key}', this.value, 'est-cp-${c.key}')">
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="estetica-color-box" style="margin-top:16px; max-width:460px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;">
            <label style="font-size:12.5px; font-weight:800;">Degradé sobre la imagen del banner (${th.bannerOverlayOpacity && th.bannerOverlayOpacity !== "0.72" ? Math.round(parseFloat(th.bannerOverlayOpacity) * 100) + "%" : "Original"})</label>
            <button type="button" class="btn btn-xs btn-outline" onclick="setEsteticaField('theme.bannerOverlayOpacity', ''); renderEstetica();">↺ Degradé original</button>
          </div>
          <input type="range" min="0.2" max="0.96" step="0.04" value="${escapeHtml(th.bannerOverlayOpacity && th.bannerOverlayOpacity !== "0.72" ? th.bannerOverlayOpacity : "0.96")}" oninput="setEsteticaField('theme.bannerOverlayOpacity', this.value); this.previousElementSibling.querySelector('label').textContent = 'Degradé sobre la imagen del banner (' + Math.round(parseFloat(this.value) * 100) + '%)';">
        </div>
      </div>
    `;
  }
}

async function saveSiteConfigFileToServer(code) {
  if (!code) return;
  try {
    await fetch("/api/save-site-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
  } catch (err) {
    console.warn("Servidor no disponible para /api/save-site-config:", err);
  }
}

function generateSiteConfigJsCode() {
  const cfgJson = JSON.stringify(currentSiteConfig || getDefaultSiteConfig(), null, 2);
  const applierSource = typeof window.applyNissaSiteConfig === "function"
    ? window.applyNissaSiteConfig.toString()
    : `function applyNissaSiteConfig() {}`;

  return `// Configuración estética y de contenido oficial de la tienda NISSA
// Generado y gestionado desde el Panel de Administración NISSA
// Actualizado: ${new Date().toLocaleString("es-AR")}

var NISSA_SITE_CONFIG = ${cfgJson};

${applierSource}

if (typeof window !== "undefined") {
  window.NISSA_SITE_CONFIG = NISSA_SITE_CONFIG;
  window.applyNissaSiteConfig = applyNissaSiteConfig;
  if (document.readyState !== "loading") {
    applyNissaSiteConfig();
  } else {
    document.addEventListener("DOMContentLoaded", applyNissaSiteConfig);
  }
}
`;
}

async function saveAndPublishEstetica() {
  if (!currentSiteConfig) loadInitialSiteConfig();
  saveEsteticaDraft();

  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("⚠️ Para guardar y publicar los cambios en la tienda en línea, primero ingresá tu clave de conexión.\n\nPresioná Aceptar para configurarla.");
    openGithubModal();
    return;
  }

  const btn = document.getElementById("btn-publish-estetica");
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Guardando cambios...";
  }

  try {
    // 1. Si se cargó una imagen nueva para el banner (dataURL), subirla primero a fotos/
    if (currentSiteConfig.banner && typeof currentSiteConfig.banner.image === "string" && currentSiteConfig.banner.image.startsWith("data:")) {
      const filename = (pendingBannerFileState && pendingBannerFileState.filename)
        ? pendingBannerFileState.filename
        : `banner-nissa-${Date.now()}.jpg`;

      if (btn) btn.innerHTML = "⏳ Subiendo imagen del banner...";
      saveImageFileToServer(filename, currentSiteConfig.banner.image);

      const upRes = await uploadSinglePhotoToGithub(filename, currentSiteConfig.banner.image, cfg);
      if (!upRes.ok) {
        const errMsg = upRes.data?.message || upRes.statusText || "";
        if (upRes.status === 401 || errMsg.includes("Bad credentials")) {
          alert("⚠️ La clave de conexión expiró o no es válida. Por favor ingresala nuevamente en ⚙️ Conexión.");
          openGithubModal();
          return;
        }
      }
      currentSiteConfig.banner.image = `./fotos/${filename}`;
      pendingBannerFileState = { dataUrl: "", filename: "" };
    }

    if (btn) btn.innerHTML = "⏳ Guardando cambios...";

    const newCode = generateSiteConfigJsCode();
    saveSiteConfigFileToServer(newCode);

    const path = "site-config.js";
    const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${cfg.branch}&t=${Date.now()}`;
    let sha = null;
    const getRes = await callGithubApi(getUrl, { token: cfg.token });
    if (getRes.ok && getRes.data && getRes.data.sha) {
      sha = getRes.data.sha;
    }

    const payload = {
      message: `Actualización de estética y diseño NISSA [Admin Panel]`,
      content: utf8ToBase64(newCode),
      branch: cfg.branch
    };
    if (sha) payload.sha = sha;

    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    let putRes = await callGithubApi(putUrl, {
      method: "PUT",
      token: cfg.token,
      body: payload
    });

    if (putRes.status === 409) {
      const freshGet = await callGithubApi(getUrl, { token: cfg.token });
      if (freshGet.ok && freshGet.data && freshGet.data.sha) {
        payload.sha = freshGet.data.sha;
        putRes = await callGithubApi(putUrl, {
          method: "PUT",
          token: cfg.token,
          body: payload
        });
      }
    }

    if (putRes.ok) {
      localStorage.removeItem("nissa_site_config_draft");
      checkDraftStatus();
      renderEstetica();
      showAlert("✓ ¡Estética y diseño guardados y publicados! La tienda se actualizará en línea en unos instantes.");
    } else {
      const msg = putRes.data?.message || putRes.statusText || "";
      if (putRes.status === 401 || msg.includes("Bad credentials")) {
        alert("⚠️ La clave de conexión expiró o no es válida. Por favor ingresala nuevamente en ⚙️ Conexión.");
        openGithubModal();
      } else {
        alert(`No se pudieron guardar los cambios (${putRes.status}): ${msg}`);
      }
    }
  } catch (err) {
    alert("Error de conexión al guardar cambios: " + (err.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// ========================================================
// ASIGNACIÓN GLOBAL A WINDOW PARA INVOCACIONES INLINE
// ========================================================
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.togglePassVisibility = togglePassVisibility;
window.openPassChangeModal = openPassChangeModal;
window.closePassModal = closePassModal;
window.saveNewPass = saveNewPass;

// Tienda y Productos
window.switchAdminSection = switchAdminSection;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.switchProductTab = switchProductTab;
window.editProduct = editProduct;
window.duplicateProduct = duplicateProduct;
window.moveProductOrder = moveProductOrder;
window.deleteProduct = deleteProduct;
window.saveProduct = saveProduct;
window.saveAndPublishProductToGithub = saveAndPublishProductToGithub;
window.calculateDiscounts = calculateDiscounts;
window.previewMainImage = previewMainImage;
window.chooseImageSuggestion = chooseImageSuggestion;
window.handlePreviewError = handlePreviewError;
window.addGalleryImageInput = addGalleryImageInput;
window.initMainImageState = initMainImageState;
window.setMainImageStorageMode = setMainImageStorageMode;
window.updateFilenameFromInput = updateFilenameFromInput;
window.triggerMainImageUpload = triggerMainImageUpload;
window.handleMainFileInput = handleMainFileInput;
window.removeMainImage = removeMainImage;
window.toggleAdvancedImageField = toggleAdvancedImageField;
window.handleManualImageInput = handleManualImageInput;
window.downloadMainImageFile = downloadMainImageFile;
window.uploadMainImageToGithub = uploadMainImageToGithub;
window.triggerGalleryMultiUpload = triggerGalleryMultiUpload;
window.handleGalleryMultiFileInput = handleGalleryMultiFileInput;
window.moveGalleryItem = moveGalleryItem;
window.removeGalleryItem = removeGalleryItem;
window.handleGalleryItemInputChange = handleGalleryItemInputChange;
window.openImageGalleryModal = openImageGalleryModal;
window.closeImageGalleryModal = closeImageGalleryModal;
window.setGalleryFilter = setGalleryFilter;
window.filterImageGallery = filterImageGallery;
window.clearGallerySearch = clearGallerySearch;
window.selectImageFromGallery = selectImageFromGallery;
window.selectGalleryItemByIndex = selectGalleryItemByIndex;
window.applyAndSaveCatalogChanges = applyAndSaveCatalogChanges;
window.applyAndSaveCotizadorChanges = applyAndSaveCotizadorChanges;
window.triggerGalleryModalUpload = triggerGalleryModalUpload;
window.handleGalleryModalUpload = handleGalleryModalUpload;
window.addFeatureInput = addFeatureInput;
window.addSpecInput = addSpecInput;
window.downloadProductsJs = downloadProductsJs;
window.openCodePreviewModal = openCodePreviewModal;
window.closeCodeModal = closeCodeModal;
window.copyGeneratedCode = copyGeneratedCode;
window.openGithubModal = openGithubModal;
window.closeGithubModal = closeGithubModal;
window.saveGithubConfig = saveGithubConfig;
window.testGithubConnection = testGithubConnection;
window.publishDirectlyToGithub = publishDirectlyToGithub;
window.resetToOriginalCatalog = resetToOriginalCatalog;
window.handleSearch = handleSearch;
window.clearSearch = clearSearch;
window.handleCategoryFilter = handleCategoryFilter;
window.handleSort = handleSort;
window.closeAdminAlert = closeAdminAlert;

// Presupuestador de Reparaciones
window.switchCotizadorSubtab = switchCotizadorSubtab;
window.renderCotizador = renderCotizador;
window.selectCelularBrand = selectCelularBrand;
window.openNewBrandModal = openNewBrandModal;
window.closeNewBrandModal = closeNewBrandModal;
window.handleCreateBrand = handleCreateBrand;
window.deleteCelularBrand = deleteCelularBrand;
window.openAddCelularModelModal = openAddCelularModelModal;
window.closeAddCelularModelModal = closeAddCelularModelModal;
window.handleCreateCelularModel = handleCreateCelularModel;
window.renameCelularModel = renameCelularModel;
window.deleteCelularModel = deleteCelularModel;
window.updateCelularRepairPrice = updateCelularRepairPrice;
window.updateCelularRepairNote = updateCelularRepairNote;
window.updateCelularRepairName = updateCelularRepairName;
window.deleteCelularRepair = deleteCelularRepair;
window.openAddRepairModal = openAddRepairModal;
window.closeAddRepairModal = closeAddRepairModal;
window.handleSaveNewRepair = handleSaveNewRepair;
window.openNewDeviceModal = openNewDeviceModal;
window.closeNewDeviceModal = closeNewDeviceModal;
window.handleCreateDevice = handleCreateDevice;
window.renameDevice = renameDevice;
window.deleteDevice = deleteDevice;
window.updateDeviceRepairPrice = updateDeviceRepairPrice;
window.updateDeviceRepairNote = updateDeviceRepairNote;
window.updateDeviceRepairName = updateDeviceRepairName;
window.deleteDeviceRepair = deleteDeviceRepair;
window.updatePcRepairPrice = updatePcRepairPrice;
window.updatePcRepairNote = updatePcRepairNote;
window.updatePcRepairName = updatePcRepairName;
window.deletePcRepair = deletePcRepair;
window.saveGeneralSettings = saveGeneralSettings;
window.openMassAdjustModal = openMassAdjustModal;
window.closeMassAdjustModal = closeMassAdjustModal;
window.handleApplyMassAdjust = handleApplyMassAdjust;
window.handleCotizadorSearch = handleCotizadorSearch;
window.clearCotizadorSearch = clearCotizadorSearch;
window.downloadCotizadorJs = downloadCotizadorJs;
window.openCotizadorCodeModal = openCotizadorCodeModal;
window.closeCotizadorCodeModal = closeCotizadorCodeModal;
window.copyCotizadorGeneratedCode = copyCotizadorGeneratedCode;
window.publishCotizadorDirectlyToGithub = publishCotizadorDirectlyToGithub;
window.resetToOriginalCotizador = resetToOriginalCotizador;
window.debouncedAutoSaveCotizador = debouncedAutoSaveCotizador;
window.duplicateCelularModel = duplicateCelularModel;
window.toggleCustomBrandInput = toggleCustomBrandInput;
window.updateWarrantyPreviewCell = updateWarrantyPreviewCell;

// Estética y Diseño de la Tienda
window.switchEsteticaSubtab = switchEsteticaSubtab;
window.renderEstetica = renderEstetica;
window.setEsteticaField = setEsteticaField;
window.moveSectionOrder = moveSectionOrder;
window.toggleSectionVisible = toggleSectionVisible;
window.updateNavTabField = updateNavTabField;
window.moveNavTabOrder = moveNavTabOrder;
window.addCustomNavTab = addCustomNavTab;
window.removeNavTab = removeNavTab;
window.handleBannerImageUpload = handleBannerImageUpload;
window.updateBannerPreviewLive = updateBannerPreviewLive;
window.updateInfoCardField = updateInfoCardField;
window.moveInfoCardOrder = moveInfoCardOrder;
window.addInfoCard = addInfoCard;
window.removeInfoCard = removeInfoCard;
window.updateReviewField = updateReviewField;
window.moveReviewOrder = moveReviewOrder;
window.addReviewItem = addReviewItem;
window.removeReviewItem = removeReviewItem;
window.updateThemeColorField = updateThemeColorField;
window.resetDefaultThemeColors = resetDefaultThemeColors;
window.saveAndPublishEstetica = saveAndPublishEstetica;
window.syncDescToTab3 = syncDescToTab3;
window.syncDescFromTab3 = syncDescFromTab3;
window.clearStoredToken = clearStoredToken;
window.updateWarrantyPercentInput = updateWarrantyPercentInput;
window.saveWarrantyAdjustmentsSettings = saveWarrantyAdjustmentsSettings;

