// NISSA - Tienda Online
const WHATSAPP_NUMBER = "541136620653";

const productsGrid = document.getElementById("products-grid");
const searchInput = document.getElementById("search-input");
const categories = document.querySelectorAll(".category");
const cart = document.getElementById("cart");
const openCart = document.getElementById("open-cart");
const closeCart = document.getElementById("close-cart");
const overlay = document.getElementById("overlay");
const cartItems = document.getElementById("cart-items");
const cartEmpty = document.getElementById("cart-empty");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const clearCartButton = document.getElementById("clear-cart");
const checkoutButton = document.getElementById("checkout-button");
const menuButton = document.getElementById("menu-button");
const nav = document.getElementById("nav");

let selectedCategory = "todos";
let shoppingCart = JSON.parse(localStorage.getItem("nissaCart")) || [];
// Limpieza de estados anteriores de fotos cargadas desde UI para usar las fotos individuales
try {
  localStorage.removeItem("nissaProductImages");
} catch (e) {}

// Carpeta donde se almacenan las fotos de los productos en GitHub
const PRODUCT_IMAGES_DIR = "fotos";

function getProductImage(product) {
  if (!product) return "";
  let img = product.image ? String(product.image).trim() : "";

  // Si no se asignó imagen explícita, buscar por nombre del producto normalizado (ej: "auriculares-bluetooth.jpg")
  if (!img && product.name) {
    img = product.name
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + ".jpg";
  }

  if (!img) return "";

  // Si es URL externa (http/https) o data URI, devolverla tal cual
  if (/^(https?:|\/\/|data:)/i.test(img)) {
    return img;
  }

  // Limpiar cualquier prefijo de ruta para estandarizar
  img = img.replace(/^(\.\/|\/)+/, "");
  if (img.startsWith(PRODUCT_IMAGES_DIR + "/")) {
    img = img.substring((PRODUCT_IMAGES_DIR + "/").length);
  }

  // Retorna la ruta relativa './fotos/nombre.ext' compatible con GitHub Pages y local
  return `./${PRODUCT_IMAGES_DIR}/${img}`;
}

function handleProductImgError(img, productId) {
  if (!img) return;
  const currentSrc = img.getAttribute("src") || "";
  const step = Number(img.dataset.retryStep || 0);

  // Extraer el nombre del archivo sin ruta
  const filename = currentSrc.split("/").pop() || "";
  const dotIndex = filename.lastIndexOf(".");
  const nameWithoutExt = dotIndex !== -1 ? filename.substring(0, dotIndex) : filename;
  const currentExt = dotIndex !== -1 ? filename.substring(dotIndex).toLowerCase() : ".jpg";

  // Intentos inteligentes:
  // 1. Probar en './fotos/' con extensiones alternativas (.png, .jpg, .jpeg)
  // 2. Probar en la raíz './' (por si las fotos se subieron sueltas en GitHub junto a banner-nissa.jpg)
  const candidateExtensions = [".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG"];
  const alternateExts = candidateExtensions.filter(ext => ext.toLowerCase() !== currentExt);

  // Pasos para la carpeta fotos/
  if (step < alternateExts.length) {
    img.dataset.retryStep = String(step + 1);
    img.src = `./${PRODUCT_IMAGES_DIR}/${nameWithoutExt}${alternateExts[step]}`;
    return;
  }

  // Pasos para la raíz ./ (sin subcarpeta fotos/)
  const rootStep = step - alternateExts.length;
  const allExts = [currentExt, ...alternateExts];
  if (rootStep < allExts.length) {
    img.dataset.retryStep = String(step + 1);
    img.src = `./${nameWithoutExt}${allExts[rootStep]}`;
    return;
  }

  // Si fallan todas las rutas en fotos/ y en raíz, ocultar imagen y mostrar emoji fallback
  img.style.display = "none";
  if (img.parentElement && img.parentElement.classList.contains("pm-thumbnail-btn")) {
    img.parentElement.style.display = "none";
  } else if (img.nextElementSibling) {
    img.nextElementSibling.style.display = "block";
  }
}

function escapeAttr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(price);
}

function renderProductButtonHtml(productId, qty) {
  if (qty > 0) {
    return `
      <div class="product-qty-stepper" id="stepper-${productId}">
        <button type="button" class="stepper-btn stepper-btn-minus" onclick="changeCardQuantity(${productId}, -1)" aria-label="Restar una unidad">−</button>
        <div class="stepper-center">
          <span class="stepper-qty-num">${qty}</span>
          <span class="stepper-qty-label">${qty === 1 ? 'en carrito' : 'en carrito'}</span>
        </div>
        <button type="button" class="stepper-btn stepper-btn-plus" onclick="changeCardQuantity(${productId}, 1)" aria-label="Sumar una unidad">+</button>
      </div>
    `;
  }
  return `
    <button class="product-button" id="add-to-cart-btn-${productId}" onclick="addToCartFromCard(${productId})">
      Agregar al carrito
    </button>
  `;
}

function updateProductCardAction(productId) {
  const container = document.getElementById(`product-action-${productId}`);
  if (!container) return;
  const inCart = shoppingCart.find(item => Number(item.id) === Number(productId));
  const qty = inCart ? inCart.quantity : 0;
  container.innerHTML = renderProductButtonHtml(productId, qty);
}

function updateAllProductCardActions() {
  (typeof products !== "undefined" ? products : []).forEach(p => {
    updateProductCardAction(p.id);
  });
}

function renderProducts() {
  if (!productsGrid) return;
  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase().trim();
  const filteredProducts = (typeof products !== "undefined" ? products : []).filter(product => {
    const matchesCategory = selectedCategory === "todos" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  productsGrid.innerHTML = "";

  filteredProducts.forEach(product => {
    const productCard = document.createElement("article");
    productCard.className = "product-card";
    productCard.id = `product-card-${product.id}`;

    // Clic en la tarjeta abre la presentación detallada del producto
    productCard.onclick = (e) => {
      if (e.target.closest('.product-action-container') || e.target.closest('.product-qty-stepper') || e.target.closest('.product-button')) {
        return;
      }
      openProductModal(product.id);
    };

    const imgSource = getProductImage(product);
    const isImagePath = imgSource && (imgSource.startsWith("data:image/") || imgSource.includes("/") || imgSource.includes("."));
    const photosList = getProductImagesList(product);

    const inCart = shoppingCart.find(item => Number(item.id) === Number(product.id));
    const qty = inCart ? inCart.quantity : 0;

    productCard.innerHTML = `
      ${product.tag ? `<span class="product-card-badge-top">${escapeAttr(product.tag)}</span>` : ''}
      ${photosList.length > 1 ? `<span class="product-card-photos-count">📷 ${photosList.length} fotos</span>` : ''}
      <div class="product-image">
        ${isImagePath ? `<img src="${escapeAttr(imgSource)}" alt="${escapeAttr(product.name)}" loading="lazy" onerror="handleProductImgError(this, ${product.id})"><span class="product-image-fallback" style="display:none;">📦</span>` : `<span class="product-image-fallback">${escapeAttr(imgSource || "📦")}</span>`}
      </div>
      <div class="product-content">
        <span class="product-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>

        <div class="price-table" aria-label="Precios por cantidad">
          <div class="price-row main-price">
            <span class="price-from">Desde 1 u.</span>
            <strong>${formatPrice(product.price)}</strong>
          </div>
          <div class="price-row">
            <span class="price-from">Desde 3 u.</span>
            <strong>${formatPrice(product.price3 || product.price)}</strong>
          </div>
          <div class="price-row">
            <span class="price-from">Desde 5 u.</span>
            <strong>${formatPrice(product.price5 || product.price)}</strong>
          </div>
          <div class="price-row wholesale">
            <span class="price-from">+20 Mayor</span>
            <strong>${formatPrice(product.price20 || product.price)}</strong>
          </div>
        </div>

        <div class="product-view-hint">
          <span>🔍 Ver fotos y características</span> ➔
        </div>

        <div class="product-action-container" id="product-action-${product.id}">
          ${renderProductButtonHtml(product.id, qty)}
        </div>
      </div>
    `;

    productsGrid.appendChild(productCard);
  });
}

function addToCartFromCard(productId) {
  const pId = Number(productId);
  const product = (typeof products !== "undefined" ? products : []).find(item => Number(item.id) === pId);
  if (!product) return;
  const existingProduct = shoppingCart.find(item => Number(item.id) === pId);

  if (existingProduct) existingProduct.quantity++;
  else shoppingCart.push({...product, image: getProductImage(product), quantity: 1});

  saveCart();
  renderCart();
  updateProductCardAction(productId);
}

function changeCardQuantity(productId, delta) {
  const pId = Number(productId);
  const product = (typeof products !== "undefined" ? products : []).find(item => Number(item.id) === pId);
  if (!product) return;
  const itemIndex = shoppingCart.findIndex(item => Number(item.id) === pId);

  if (itemIndex > -1) {
    shoppingCart[itemIndex].quantity += delta;
    if (shoppingCart[itemIndex].quantity <= 0) {
      shoppingCart.splice(itemIndex, 1);
    }
  } else if (delta > 0) {
    shoppingCart.push({...product, image: getProductImage(product), quantity: 1});
  }

  saveCart();
  renderCart();
  updateProductCardAction(productId);
}

function addToCart(productId) {
  addToCartFromCard(productId);
  openCartFunction();
}

function getUnitPrice(item) {
  if (item.quantity > 20) return item.price20 || item.price;
  if (item.quantity >= 5) return item.price5 || item.price;
  if (item.quantity >= 3) return item.price3 || item.price;
  return item.price;
}

function getTierLabel(quantity) {
  if (quantity > 20) return "Precio +20 u.";
  if (quantity >= 5) return "Precio x5 u.";
  if (quantity >= 3) return "Precio x3 u.";
  return "Precio x1 u.";
}

function renderCart() {
  const itemsContainer = document.getElementById("cart-items");
  const emptyContainer = document.getElementById("cart-empty");
  if (!itemsContainer || !emptyContainer) return;
  
  itemsContainer.innerHTML = "";
  const hasItems = shoppingCart.length > 0;

  if (hasItems) {
    emptyContainer.style.display = "none";
    emptyContainer.classList.add("hidden");
    itemsContainer.style.display = "block";
  } else {
    emptyContainer.style.display = "block";
    emptyContainer.classList.remove("hidden");
    itemsContainer.style.display = "none";
  }

  shoppingCart.forEach(item => {
    const unitPrice = getUnitPrice(item);
    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";
    const imgSource = getProductImage(item);
    const isImagePath = imgSource && (imgSource.startsWith("data:image/") || imgSource.includes("/") || imgSource.includes("."));

    cartItem.innerHTML = `
      <div class="cart-item-image">
        ${isImagePath ? `<img src="${escapeAttr(imgSource)}" alt="${escapeAttr(item.name)}" onerror="handleProductImgError(this, ${item.id})"><span class="cart-image-fallback" style="display:none;">📦</span>` : `<span class="cart-image-fallback">${escapeAttr(imgSource || "📦")}</span>`}
      </div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="cart-price-line">
          <p>${formatPrice(unitPrice)} <span>/ u.</span></p>
          <small>${getTierLabel(item.quantity)}</small>
        </div>
        <div class="cart-controls">
          <button class="qty-button" onclick="changeQuantity(${item.id}, -1)" aria-label="Reducir cantidad">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-button" onclick="changeQuantity(${item.id}, 1)" aria-label="Aumentar cantidad">+</button>
          <button class="remove-item" onclick="removeFromCart(${item.id})" aria-label="Eliminar producto">✕</button>
        </div>
        <div class="cart-subtotal">Subtotal <strong>${formatPrice(unitPrice * item.quantity)}</strong></div>
      </div>`;
    itemsContainer.appendChild(cartItem);
  });

  updateCartInfo();
}

function changeQuantity(productId, amount) {
  const product = shoppingCart.find(item => item.id === productId);
  if (!product) return;
  product.quantity += amount;
  if (product.quantity <= 0) return removeFromCart(productId);
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  shoppingCart = shoppingCart.filter(item => item.id !== productId);
  saveCart();
  renderCart();
}

function updateCartInfo() {
  const totalQuantity = shoppingCart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = shoppingCart.reduce((total, item) => total + getUnitPrice(item) * item.quantity, 0);
  if (cartCount) cartCount.textContent = totalQuantity;
  if (cartTotal) cartTotal.textContent = formatPrice(totalPrice);
  updateAllProductCardActions();
}

function saveCart() {
  localStorage.setItem("nissaCart", JSON.stringify(shoppingCart));
}

function clearCart() {
  shoppingCart = [];
  saveCart();
  renderCart();
}

if (clearCartButton) clearCartButton.addEventListener("click", clearCart);

function openCartFunction() {
  if (!cart || !overlay) return;
  cart.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCartFunction() {
  if (!cart || !overlay) return;
  cart.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

if (openCart) openCart.addEventListener("click", openCartFunction);
if (closeCart) closeCart.addEventListener("click", closeCartFunction);
if (overlay) overlay.addEventListener("click", closeCartFunction);

categories.forEach(category => {
  category.addEventListener("click", () => {
    categories.forEach(button => button.classList.remove("active"));
    category.classList.add("active");
    selectedCategory = category.dataset.category;
    renderProducts();
  });
});

if (searchInput) searchInput.addEventListener("input", renderProducts);

if (checkoutButton) {
  checkoutButton.addEventListener("click", () => {
    if (shoppingCart.length === 0) return alert("Tu carrito está vacío. Agregá productos para continuar.");

    let message = "¡Hola NISSA! 👋 Quiero realizar el siguiente pedido desde la tienda online:\n\n";
    shoppingCart.forEach(item => {
      const unitPrice = getUnitPrice(item);
      message += `• *${item.name}*\n  Cantidad: ${item.quantity}\n  Precio unitario: ${formatPrice(unitPrice)} (${getTierLabel(item.quantity)})\n  Subtotal: ${formatPrice(unitPrice * item.quantity)}\n\n`;
    });

    const total = shoppingCart.reduce((sum, item) => sum + getUnitPrice(item) * item.quantity, 0);
    message += `💰 *TOTAL A ABONAR: ${formatPrice(total)}*\n\n`;
    message += "¿Tienen stock disponible para coordinar la entrega o retiro? ¡Muchas gracias!";

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  });
}

if (menuButton && nav) {
  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.toggle("active");
  });
  document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
      const href = link.getAttribute("href");
      if (href === "#terminos" || href === "#terminos-y-condiciones") {
        goToTermsPage();
      } else if (href && href.startsWith("#")) {
        goToMainPage(href);
      }
    });
  });
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("active") && !nav.contains(e.target) && !menuButton.contains(e.target)) {
      nav.classList.remove("active");
    }
  });
}

// Router para alternar entre la página principal y Términos y Condiciones
function goToTermsPage() {
  window.location.hash = "#terminos";
  checkRoute();
}

function goToMainPage(targetHash) {
  window.location.hash = targetHash || "#inicio";
  checkRoute();
}

function checkRoute() {
  const hash = window.location.hash;
  const mainContent = document.getElementById("main-content");
  const terminosSection = document.getElementById("terminos-section");
  if (nav) nav.classList.remove("active");

  if (hash === "#terminos" || hash === "#terminos-y-condiciones") {
    if (mainContent) mainContent.style.display = "none";
    if (terminosSection) {
      terminosSection.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    document.title = "NISSA - Términos y Condiciones y Garantía Oficial";
  } else {
    if (mainContent) mainContent.style.display = "block";
    if (terminosSection) terminosSection.style.display = "none";
    document.title = "NISSA - Tienda Online y Servicio Técnico";

    if (hash && hash !== "#" && hash !== "#inicio") {
      const targetEl = document.querySelector(hash);
      if (targetEl) {
        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    }
  }
}

window.addEventListener("hashchange", checkRoute);
window.addEventListener("load", checkRoute);

const headerLogo = document.getElementById("header-logo");
if (headerLogo) {
  headerLogo.addEventListener("click", (e) => {
    e.preventDefault();
    goToMainPage("#inicio");
  });
}

// Exponer en window para llamadas inline
window.goToTermsPage = goToTermsPage;
window.goToMainPage = goToMainPage;

const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ========================================================
// PRESENTACIÓN Y DETALLE DE PRODUCTO (MODAL INTERACTIVO)
// ========================================================
let currentModalProduct = null;
let currentModalImageIndex = 0;
let currentModalQty = 1;

function getProductImagesList(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }
  if (product.image) {
    return [product.image];
  }
  return [];
}

function resolvePhotoUrl(imgName, product) {
  if (!imgName) return getProductImage(product);
  if (/^(https?:|\/\/|data:)/i.test(imgName)) return imgName;
  let clean = String(imgName).trim().replace(/^(\.\/|\/)+/, "");
  if (clean.startsWith(PRODUCT_IMAGES_DIR + "/")) {
    clean = clean.substring((PRODUCT_IMAGES_DIR + "/").length);
  }
  return `./${PRODUCT_IMAGES_DIR}/${clean}`;
}

function getUnitPriceForQty(product, qty) {
  if (!product) return 0;
  if (qty >= 20) return product.price20 || product.price;
  if (qty >= 5) return product.price5 || product.price;
  if (qty >= 3) return product.price3 || product.price;
  return product.price;
}

function getDiscountPercent(basePrice, discountedPrice) {
  if (!basePrice || !discountedPrice || discountedPrice >= basePrice) return 0;
  return Math.round(((basePrice - discountedPrice) / basePrice) * 100);
}

function renderProductModalContent() {
  const container = document.getElementById("product-modal-container");
  if (!container || !currentModalProduct) return;
  const p = currentModalProduct;

  const images = getProductImagesList(p);
  if (currentModalImageIndex >= images.length) currentModalImageIndex = 0;
  if (currentModalImageIndex < 0) currentModalImageIndex = images.length - 1;

  const activeImgFile = images[currentModalImageIndex] || p.image;
  const activeImgSrc = resolvePhotoUrl(activeImgFile, p);
  const isImagePath = activeImgSrc && (activeImgSrc.startsWith("data:image/") || activeImgSrc.includes("/") || activeImgSrc.includes("."));

  const unitPrice = getUnitPriceForQty(p, currentModalQty);
  const subtotal = unitPrice * currentModalQty;
  const standardSubtotal = p.price * currentModalQty;
  const totalSavings = standardSubtotal - subtotal;

  const disc3 = getDiscountPercent(p.price, p.price3);
  const disc5 = getDiscountPercent(p.price, p.price5);
  const disc20 = getDiscountPercent(p.price, p.price20);

  // Generar HTML de miniaturas
  let thumbsHtml = "";
  if (images.length > 1) {
    thumbsHtml = `
      <div class="pm-thumbnails-strip" aria-label="Fotos del producto">
        ${images.map((img, idx) => {
          const thumbSrc = resolvePhotoUrl(img, p);
          const isActive = idx === currentModalImageIndex;
          return `
            <button type="button" class="pm-thumbnail-btn ${isActive ? 'active' : ''}" onclick="setModalImageIndex(${idx})" aria-label="Ver foto ${idx + 1}">
              <img src="${escapeAttr(thumbSrc)}" alt="Miniatura ${idx + 1}" onerror="handleProductImgError(this, ${p.id})">
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  // Generar viñetas de características esenciales y claras
  let featuresHtml = "";
  if (Array.isArray(p.features) && p.features.length > 0) {
    featuresHtml = `
      <div class="pm-features-box">
        <div class="pm-section-label">✨ Características destacadas</div>
        <ul class="pm-features-list">
          ${p.features.slice(0, 4).map(f => `
            <li>
              <span class="pm-feature-check">✓</span>
              <span>${escapeAttr(f)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  // Mensaje de WhatsApp personalizado
  const waText = encodeURIComponent(
    `¡Hola NISSA! 👋 Me interesa comprar ${currentModalQty} u. de "${p.name}" por ${formatPrice(subtotal)} (${getTierLabel(currentModalQty)}).\n\n¿Tienen stock disponible para retiro o entrega en el día? ¡Muchas gracias!`
  );

  container.innerHTML = `
    <!-- BARRA SUPERIOR -->
    <div class="pm-top-bar">
      <button type="button" class="pm-back-btn" onclick="closeProductModal()">
        ← Volver a la tienda
      </button>
      <button type="button" class="pm-close-btn" onclick="closeProductModal()" aria-label="Cerrar ventana">
        ✕
      </button>
    </div>

    <!-- CUERPO PRINCIPAL -->
    <div class="pm-body-grid">
      
      <!-- COLUMNA IZQUIERDA: GALERÍA DE FOTOS -->
      <div class="pm-gallery-col">
        <div class="pm-main-image-wrap">
          ${p.tag ? `<span class="pm-gallery-badge-tag">${escapeAttr(p.tag)}</span>` : ''}
          ${images.length > 1 ? `<span class="pm-gallery-counter">📷 Foto ${currentModalImageIndex + 1} de ${images.length}</span>` : ''}

          ${images.length > 1 ? `
            <button type="button" class="pm-gallery-arrow pm-gallery-arrow-prev" onclick="prevModalImage()" aria-label="Foto anterior">‹</button>
            <button type="button" class="pm-gallery-arrow pm-gallery-arrow-next" onclick="nextModalImage()" aria-label="Foto siguiente">›</button>
          ` : ''}

          ${isImagePath ? `
            <img src="${escapeAttr(activeImgSrc)}" alt="${escapeAttr(p.name)}" id="pm-active-photo" onerror="handleProductImgError(this, ${p.id})">
            <span class="pm-main-image-fallback" style="display:none;">📦</span>
          ` : `
            <span class="pm-main-image-fallback">${escapeAttr(activeImgSrc || "📦")}</span>
          `}
        </div>

        ${thumbsHtml}
      </div>

      <!-- COLUMNA DERECHA: INFORMACIÓN, PRECIOS Y COMPRA -->
      <div class="pm-info-col">
        <div class="pm-meta-row">
          <span class="pm-category-pill">${escapeAttr(p.category)}</span>
          <span class="pm-stock-pill"><b></b> En stock inmediato</span>
        </div>

        <h2 class="pm-product-title" id="modal-product-title">${escapeAttr(p.name)}</h2>

        <p class="pm-description">${escapeAttr(p.description || "")}</p>

        <!-- TARJETA DE PRECIOS Y DESCUENTOS POR VOLUMEN -->
        <div class="pm-pricing-card">
          <div class="pm-pricing-header">
            <div>
              <span class="pm-pricing-label">Precio Unitario Aplicado:</span>
              <div style="display:flex; align-items:baseline; margin-top:2px;">
                <span class="pm-pricing-main-value" id="pm-price-display">${formatPrice(unitPrice)}</span>
                <span class="pm-pricing-unit-tag">/ unidad</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="pm-pricing-label">Subtotal (${currentModalQty} u.):</span>
              <div style="font-size:18px; font-weight:900; color:#0f172a; margin-top:2px;" id="pm-subtotal-display">
                ${formatPrice(subtotal)}
              </div>
            </div>
          </div>

          <!-- ESCALONES DE VOLUMEN (CLICABLES) -->
          <div>
            <div style="font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; margin-bottom:6px; letter-spacing:0.04em;">
              💡 Descuentos por cantidad:
            </div>
            <div class="pm-tiers-grid">
              <button type="button" class="pm-tier-btn ${currentModalQty < 3 ? 'active' : ''}" onclick="setModalQty(1)" title="Seleccionar 1 unidad">
                <span class="pm-tier-qty">1 u.</span>
                <span class="pm-tier-price">${formatPrice(p.price)}</span>
                <span class="pm-tier-badge">Lista</span>
              </button>

              <button type="button" class="pm-tier-btn ${currentModalQty >= 3 && currentModalQty < 5 ? 'active' : ''}" onclick="setModalQty(3)" title="Seleccionar 3 unidades">
                <span class="pm-tier-qty">Desde 3 u.</span>
                <span class="pm-tier-price">${formatPrice(p.price3 || p.price)}</span>
                <span class="pm-tier-badge">${disc3 > 0 ? `-${disc3}%` : 'Ahorro'}</span>
              </button>

              <button type="button" class="pm-tier-btn ${currentModalQty >= 5 && currentModalQty < 20 ? 'active' : ''}" onclick="setModalQty(5)" title="Seleccionar 5 unidades">
                <span class="pm-tier-qty">Desde 5 u.</span>
                <span class="pm-tier-price">${formatPrice(p.price5 || p.price)}</span>
                <span class="pm-tier-badge">${disc5 > 0 ? `-${disc5}%` : 'Ahorro'}</span>
              </button>

              <button type="button" class="pm-tier-btn wholesale ${currentModalQty >= 20 ? 'active' : ''}" onclick="setModalQty(20)" title="Seleccionar 20 unidades mayoristas">
                <span class="pm-tier-qty">+20 Mayor</span>
                <span class="pm-tier-price">${formatPrice(p.price20 || p.price)}</span>
                <span class="pm-tier-badge">${disc20 > 0 ? `-${disc20}%` : 'Mayor'}</span>
              </button>
            </div>
          </div>

          <!-- BANNER DE AHORRO DINÁMICO -->
          ${totalSavings > 0 ? `
            <div class="pm-savings-box">
              <span class="pm-savings-icon">🎉</span>
              <span>¡Descuento activo! Ahorrás <strong>${formatPrice(totalSavings)}</strong> en tu compra.</span>
            </div>
          ` : `
            <div style="font-size:11.5px; color:#64748b; background:#ffffff; border:1px dashed #cbd5e1; border-radius:10px; padding:8px 12px; text-align:center;">
              ⚡ Llevando <strong>3 unidades o más</strong> accedés a precios con descuento.
            </div>
          `}
        </div>

        <!-- ACCIONES DE COMPRA -->
        <div class="pm-actions-row">
          <div class="pm-stepper">
            <button type="button" class="pm-stepper-btn" onclick="changeModalQty(-1)" aria-label="Restar una unidad">−</button>
            <span class="pm-stepper-value" id="pm-stepper-num">${currentModalQty}</span>
            <button type="button" class="pm-stepper-btn" onclick="changeModalQty(1)" aria-label="Sumar una unidad">+</button>
          </div>

          <button type="button" class="pm-btn-add-cart" id="pm-add-cart-btn" onclick="addModalProductToCart()">
            <span>🛒 Agregar al Carrito</span>
            <span style="font-size:12px; opacity:0.9;">(${formatPrice(subtotal)})</span>
          </button>
        </div>

        <!-- BOTÓN DIRECTO DE WHATSAPP -->
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waText}" target="_blank" rel="noopener" class="pm-btn-whatsapp">
          <svg viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.966.01c3.179.001 6.169 1.24 8.409 3.485 2.24 2.246 3.473 5.239 3.471 8.417-.004 6.616-5.34 11.954-11.91 11.954a11.91 11.91 0 0 1-5.69-1.444L0 24zm5.824-3.482l.415.247a9.92 9.92 0 0 0 5.174 1.456c5.825 0 10.563-4.73 10.567-10.548.002-2.822-1.096-5.474-3.09-7.472-1.995-2-4.65-3.1-7.468-3.102-5.83 0-10.57 4.73-10.574 10.551a10.5 10.5 0 0 0 1.426 5.142l.271.431-1.01 3.687 3.791-.995z"/></svg>
          <span>Consultar o pedir por WhatsApp</span>
        </a>

        <!-- CARACTERÍSTICAS DESTACADAS -->
        ${featuresHtml}

      </div>
    </div>
  `;
}

function setModalImageIndex(idx) {
  if (!currentModalProduct) return;
  const images = getProductImagesList(currentModalProduct);
  if (idx < 0 || idx >= images.length) return;
  currentModalImageIndex = idx;

  const activeImgFile = images[currentModalImageIndex] || currentModalProduct.image;
  const activeImgSrc = resolvePhotoUrl(activeImgFile, currentModalProduct);

  const mainImg = document.getElementById("pm-active-photo");
  if (mainImg) {
    mainImg.src = activeImgSrc;
  }

  const thumbs = document.querySelectorAll(".pm-thumbnail-btn");
  thumbs.forEach((t, i) => {
    if (i === idx) t.classList.add("active");
    else t.classList.remove("active");
  });

  const counter = document.querySelector(".pm-gallery-counter");
  if (counter) {
    counter.textContent = `📷 Foto ${idx + 1} de ${images.length}`;
  }
}

function prevModalImage() {
  if (!currentModalProduct) return;
  const images = getProductImagesList(currentModalProduct);
  if (images.length <= 1) return;
  const nextIdx = (currentModalImageIndex - 1 + images.length) % images.length;
  setModalImageIndex(nextIdx);
}

function nextModalImage() {
  if (!currentModalProduct) return;
  const images = getProductImagesList(currentModalProduct);
  if (images.length <= 1) return;
  const nextIdx = (currentModalImageIndex + 1) % images.length;
  setModalImageIndex(nextIdx);
}

function changeModalQty(delta) {
  const newQty = Math.max(1, currentModalQty + delta);
  setModalQty(newQty);
}

function setModalQty(newQty) {
  currentModalQty = Math.max(1, newQty);
  renderProductModalContent();
}

function addModalProductToCart() {
  if (!currentModalProduct) return;
  const p = currentModalProduct;
  const existingProduct = shoppingCart.find(item => Number(item.id) === Number(p.id));

  if (existingProduct) {
    existingProduct.quantity = currentModalQty;
  } else {
    shoppingCart.push({
      ...p,
      image: getProductImage(p),
      quantity: currentModalQty
    });
  }

  saveCart();
  renderCart();
  updateProductCardAction(p.id);

  const addBtn = document.getElementById("pm-add-cart-btn");
  if (addBtn) {
    addBtn.classList.add("added");
    addBtn.innerHTML = `<span>✓ ¡Agregado al carrito!</span>`;
    setTimeout(() => {
      if (document.getElementById("pm-add-cart-btn")) {
        renderProductModalContent();
      }
    }, 1200);
  }
}

function openProductModal(productId, qty) {
  const pId = Number(productId);
  const p = (typeof products !== "undefined" ? products : []).find(item => Number(item.id) === pId);
  if (!p) return;

  currentModalProduct = p;
  currentModalImageIndex = 0;

  const inCart = shoppingCart.find(item => Number(item.id) === pId);
  currentModalQty = qty || (inCart ? inCart.quantity : 1);

  renderProductModalContent();

  const backdrop = document.getElementById("product-modal-backdrop");
  if (backdrop) {
    backdrop.classList.add("active");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function closeProductModal() {
  const backdrop = document.getElementById("product-modal-backdrop");
  if (backdrop) {
    backdrop.classList.remove("active");
    backdrop.setAttribute("aria-hidden", "true");
  }
  if (!cart || !cart.classList.contains("active")) {
    document.body.style.overflow = "";
  }
  currentModalProduct = null;
}

const modalBackdrop = document.getElementById("product-modal-backdrop");
if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) {
      closeProductModal();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (currentModalProduct) {
      closeProductModal();
    }
  }
});

// Asignar al objeto window para invocaciones inline
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.setModalImageIndex = setModalImageIndex;
window.prevModalImage = prevModalImage;
window.nextModalImage = nextModalImage;
window.changeModalQty = changeModalQty;
window.setModalQty = setModalQty;
window.addModalProductToCart = addModalProductToCart;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderCart();
});
renderProducts();
renderCart();
