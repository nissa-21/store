// ========================================================
// NISSA ADMIN - LÓGICA DE CONTROL DE CATÁLOGO Y PRECIOS
// 100% Compatible con GitHub Pages (Costo $0)
// ========================================================

const DEFAULT_PASS = "nissa2026";
let currentProducts = [];
let originalProductsBackup = [];
let editingProductId = null;
let activeSearchTerm = "";
let activeCategoryFilter = "todos";
let activeSortFilter = "default";

// ========================================================
// 1. AUTENTICACIÓN Y SEGURIDAD
// ========================================================
function getStoredPassword() {
  return localStorage.getItem("nissa_admin_pass") || DEFAULT_PASS;
}

function isAuthenticated() {
  return sessionStorage.getItem("nissa_admin_auth") === "true";
}

function handleLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById("admin-pass");
  const errorMsg = document.getElementById("login-error");
  if (!input) return;

  const entered = input.value.trim();
  const correct = getStoredPassword();

  if (entered === correct) {
    sessionStorage.setItem("nissa_admin_auth", "true");
    if (errorMsg) errorMsg.style.display = "none";
    showAdminApp();
  } else {
    if (errorMsg) {
      errorMsg.style.display = "block";
      errorMsg.textContent = "⚠️ Contraseña incorrecta. Por favor volvé a intentarlo.";
    }
    input.focus();
    input.select();
  }
}

function handleLogout() {
  if (confirm("¿Estás seguro de que deseás cerrar la sesión del panel?")) {
    sessionStorage.removeItem("nissa_admin_auth");
    window.location.reload();
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
  if (isAuthenticated()) {
    showAdminApp();
  } else {
    showLoginScreen();
  }
});

function showLoginScreen() {
  const login = document.getElementById("login-screen");
  const app = document.getElementById("admin-app");
  if (login) login.style.display = "flex";
  if (app) app.style.display = "none";
}

function showAdminApp() {
  const login = document.getElementById("login-screen");
  const app = document.getElementById("admin-app");
  if (login) login.style.display = "none";
  if (app) app.style.display = "flex";

  loadInitialProducts();
  renderCategoryFilter();
  renderProductsList();
  checkDraftStatus();
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
  const draft = localStorage.getItem("nissa_catalog_draft");
  const badge = document.getElementById("draft-indicator");
  if (badge) {
    badge.style.display = draft ? "inline-block" : "none";
  }
}

function saveDraft() {
  localStorage.setItem("nissa_catalog_draft", JSON.stringify(currentProducts));
  checkDraftStatus();
  updateProductCount();
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
// 3. RENDERIZADO DEL CATÁLOGO DE PRODUCTOS
// ========================================================
function formatPrice(num) {
  return "$" + Number(num || 0).toLocaleString("es-AR");
}

function resolveAdminPhoto(img, prod) {
  if (!img) return "";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
    return img;
  }
  if (img.startsWith("./fotos/") || img.startsWith("/fotos/")) {
    return img;
  }
  return "./fotos/" + img;
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
          <img src="${escapeHtml(mainImg)}" alt="${escapeHtml(p.name)}" class="card-thumb-img" onerror="this.onerror=null; this.src=''; this.style.display='none'; this.nextElementSibling.style.display='block';">
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
    previewMainImage(p.image || "");

    document.getElementById("prod-desc").value = p.description || "";

    // Garantía y stock desde specs
    if (p.specs) {
      document.getElementById("prod-spec-garantia").value = p.specs["Garantía"] || "";
      document.getElementById("prod-spec-stock").value = p.specs["Disponibilidad"] || "";
    }

    // Galería
    if (Array.isArray(p.images)) {
      p.images.forEach(img => addGalleryImageInput(img));
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
    document.getElementById("prod-spec-garantia").value = "90 días oficial escrita NISSA";
    document.getElementById("prod-spec-stock").value = "Stock inmediato para entrega o retiro";
    addGalleryImageInput();
    addFeatureInput();
    previewMainImage("");
  }

  calculateDiscounts();
  modal.style.display = "flex";
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

function previewMainImage(val) {
  const imgEl = document.getElementById("main-image-preview");
  const placeholder = document.getElementById("main-image-placeholder");
  const info = document.getElementById("main-image-path-info");
  if (!imgEl || !placeholder) return;

  const resolved = resolveAdminPhoto(val.trim());
  if (resolved) {
    imgEl.src = resolved;
    imgEl.style.display = "block";
    placeholder.style.display = "none";
    if (info) info.textContent = `Ruta: ${resolved}`;
  } else {
    imgEl.src = "";
    imgEl.style.display = "none";
    placeholder.style.display = "block";
    if (info) info.textContent = "Ninguna imagen seleccionada";
  }
}

function handlePreviewError(img) {
  img.style.display = "none";
  const placeholder = document.getElementById("main-image-placeholder");
  if (placeholder) {
    placeholder.style.display = "block";
    placeholder.textContent = "⚠️ Imagen no encontrada";
  }
}

function chooseImageSuggestion() {
  const currentImages = new Set();
  currentProducts.forEach(p => {
    if (p.image) currentImages.add(p.image);
    if (Array.isArray(p.images)) p.images.forEach(img => currentImages.add(img));
  });

  const list = Array.from(currentImages);
  if (list.length === 0) {
    alert("No hay imágenes previas registradas.");
    return;
  }

  const selection = prompt("Imágenes existentes en el catálogo:\n\n" + list.join("\n") + "\n\nCopiá o escribí el nombre que querés usar:", list[0]);
  if (selection) {
    const input = document.getElementById("prod-main-image");
    if (input) {
      input.value = selection.trim();
      previewMainImage(selection.trim());
    }
  }
}

// GESTIÓN DINÁMICA DE FOTOS DE GALERÍA
function addGalleryImageInput(val = "") {
  const container = document.getElementById("gallery-inputs-list");
  if (!container) return;

  const item = document.createElement("div");
  item.className = "gallery-input-item";
  item.innerHTML = `
    <input type="text" class="gallery-input" placeholder="Nombre en fotos/ (ej: caja-detalle.jpg) o URL..." value="${escapeHtml(val)}">
    <button type="button" class="btn-remove-item" onclick="this.parentElement.remove()" title="Eliminar foto">✕</button>
  `;
  container.appendChild(item);
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
function saveProduct(e) {
  if (e) e.preventDefault();

  const idVal = document.getElementById("prod-id").value;
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value.trim().toLowerCase();
  const tag = document.getElementById("prod-tag").value.trim();

  const price = Number(document.getElementById("prod-price").value) || 0;
  const price3 = Number(document.getElementById("prod-price3").value) || price;
  const price5 = Number(document.getElementById("prod-price5").value) || price;
  const price20 = Number(document.getElementById("prod-price20").value) || price;

  const mainImage = document.getElementById("prod-main-image").value.trim();
  const description = document.getElementById("prod-desc").value.trim();

  // Galería de fotos
  const galleryInputs = document.querySelectorAll(".gallery-input");
  const images = [];
  if (mainImage) images.push(mainImage);
  galleryInputs.forEach(inp => {
    const v = inp.value.trim();
    if (v && !images.includes(v)) images.push(v);
  });

  // Características
  const featureInputs = document.querySelectorAll(".feature-input");
  const features = [];
  featureInputs.forEach(inp => {
    const v = inp.value.trim();
    if (v) features.push(v);
  });

  // Specs
  const specs = {};
  const garantia = document.getElementById("prod-spec-garantia").value.trim();
  const stock = document.getElementById("prod-spec-stock").value.trim();
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
        image: mainImage,
        images: images.length > 0 ? images : [mainImage],
        description,
        features,
        specs
      };
    }
  } else {
    // Nuevo ID
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
      image: mainImage,
      images: images.length > 0 ? images : [mainImage],
      description,
      features,
      specs
    });
  }

  saveDraft();
  closeProductModal();
  renderCategoryFilter();
  renderProductsList();
  showAlert(`✓ Producto "${name}" guardado con éxito. (Recordá hacer clic en "Descargar products.js" o "Publicar en GitHub" para aplicar en vivo).`);
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
  showAlert(`✓ Producto duplicado como #${cloned.id}. Ahora podés editarlo.`);
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
}

function deleteProduct(id) {
  const p = currentProducts.find(item => Number(item.id) === Number(id));
  if (!p) return;

  if (confirm(`¿Estás seguro de que deseás eliminar el producto "${p.name}" (#${p.id}) del catálogo?`)) {
    currentProducts = currentProducts.filter(item => Number(item.id) !== Number(id));
    saveDraft();
    renderCategoryFilter();
    renderProductsList();
    showAlert(`✓ Producto #${id} eliminado del catálogo.`);
  }
}

// ========================================================
// 6. GENERACIÓN DE CÓDIGO JS Y DESCARGA DE PRODUCTS.JS
// ========================================================
function generateProductsJsCode() {
  const dateStr = new Date().toLocaleString("es-AR");
  const productsJson = JSON.stringify(currentProducts, null, 2);

  return `// Catálogo de productos NISSA
// Generado automáticamente desde el Panel de Administración NISSA
// Actualizado: ${dateStr}
// 100% Compatible con GitHub Pages (Costo $0)

let products = ${productsJson};

// Si existe un borrador guardado localmente desde el Panel Administrador, aplicarlo para previsualización inmediata:
try {
  if (typeof localStorage !== "undefined") {
    const draft = localStorage.getItem("nissa_catalog_draft");
    if (draft) {
      const parsedDraft = JSON.parse(draft);
      if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
        products = parsedDraft;
      }
    }
  }
} catch (e) {}

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
function getGithubConfig() {
  return {
    owner: localStorage.getItem("gh_owner") || "",
    repo: localStorage.getItem("gh_repo") || "",
    branch: localStorage.getItem("gh_branch") || "main",
    path: localStorage.getItem("gh_path") || "products.js",
    token: localStorage.getItem("gh_token") || ""
  };
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
  document.getElementById("gh-token").value = cfg.token;

  if (modal) modal.style.display = "flex";
}

function closeGithubModal() {
  const modal = document.getElementById("github-modal");
  if (modal) modal.style.display = "none";
}

function saveGithubConfig(e) {
  if (e) e.preventDefault();
  const owner = document.getElementById("gh-owner").value.trim();
  const repo = document.getElementById("gh-repo").value.trim();
  const branch = document.getElementById("gh-branch").value.trim() || "main";
  const path = document.getElementById("gh-path").value.trim() || "products.js";
  const token = document.getElementById("gh-token").value.trim();

  localStorage.setItem("gh_owner", owner);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_branch", branch);
  localStorage.setItem("gh_path", path);
  if (token) localStorage.setItem("gh_token", token);

  closeGithubModal();
  showAlert("✓ Configuración de GitHub guardada.");
}

async function testGithubConnection() {
  const owner = document.getElementById("gh-owner").value.trim();
  const repo = document.getElementById("gh-repo").value.trim();
  const branch = document.getElementById("gh-branch").value.trim() || "main";
  const path = document.getElementById("gh-path").value.trim() || "products.js";
  const token = document.getElementById("gh-token").value.trim();
  const status = document.getElementById("gh-test-status");

  if (!owner || !repo || !token) {
    if (status) {
      status.className = "status-msg error";
      status.style.display = "block";
      status.textContent = "Por favor completá Usuario, Repositorio y Token.";
    }
    return;
  }

  if (status) {
    status.className = "status-msg";
    status.style.display = "block";
    status.textContent = "Probando conexión con GitHub...";
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (res.ok) {
      status.className = "status-msg success";
      status.textContent = `✓ ¡Conexión exitosa! El archivo ${path} fue localizado en la rama ${branch}. Ya podés publicar con 1 clic.`;
    } else if (res.status === 404) {
      status.className = "status-msg success";
      status.textContent = `✓ Conexión con el repositorio correcta (el archivo ${path} será creado en el primer commit).`;
    } else {
      const errData = await res.json().catch(() => ({}));
      status.className = "status-msg error";
      status.textContent = `Error (${res.status}): ${errData.message || "Verificá tu token y nombre de repo."}`;
    }
  } catch (err) {
    if (status) {
      status.className = "status-msg error";
      status.textContent = "Error de red o conexión: " + err.message;
    }
  }
}

// Convertir texto UTF-8 a Base64 de forma segura
function utf8ToBase64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

async function publishDirectlyToGithub() {
  const cfg = getGithubConfig();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    alert("Para publicar con 1 clic en GitHub, primero completá tus datos del repositorio y el Token de acceso gratuito.");
    openGithubModal();
    return;
  }

  const publishBtn = document.getElementById("btn-publish-github");
  const originalBtnText = publishBtn ? publishBtn.innerHTML : "";
  if (publishBtn) {
    publishBtn.disabled = true;
    publishBtn.innerHTML = "⏳ Publicando en GitHub...";
  }

  try {
    // 1. Obtener el SHA actual del archivo en GitHub (si existe)
    const getUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}?ref=${cfg.branch}&t=${Date.now()}`;
    let currentSha = null;

    const getRes = await fetch(getUrl, {
      headers: {
        "Authorization": `token ${cfg.token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (getRes.ok) {
      const data = await getRes.json();
      currentSha = data.sha;
    }

    // 2. Generar el nuevo contenido de products.js
    const newContent = generateProductsJsCode();
    const base64Content = utf8ToBase64(newContent);

    // 3. Hacer el commit mediante PUT
    const putUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const payload = {
      message: `Actualización de catálogo NISSA (${currentProducts.length} productos) [Admin Panel]`,
      content: base64Content,
      branch: cfg.branch
    };
    if (currentSha) {
      payload.sha = currentSha;
    }

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Authorization": `token ${cfg.token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (putRes.ok) {
      showAlert(`🎉 ¡Catálogo publicado exitosamente en GitHub! GitHub Pages actualizará tu tienda en ~30 segundos.`);
    } else {
      const errData = await putRes.json().catch(() => ({}));
      alert(`No se pudo publicar en GitHub: ${errData.message || putRes.statusText}\n\nPodés descargar el archivo products.js manualmente con el botón "Descargar products.js".`);
    }

  } catch (err) {
    alert("Error de conexión al publicar en GitHub: " + err.message + "\n\nPodés descargar el archivo products.js manualmente con el botón 'Descargar products.js'.");
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
function showAlert(msg) {
  const el = document.getElementById("admin-alert");
  const txt = document.getElementById("admin-alert-text");
  if (!el || !txt) return;

  txt.textContent = msg;
  el.style.display = "flex";

  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => {
    el.style.display = "none";
  }, 6000);
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
