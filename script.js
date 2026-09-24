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
  if (img.nextElementSibling) {
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

    const imgSource = getProductImage(product);
    const isImagePath = imgSource && (imgSource.startsWith("data:image/") || imgSource.includes("/") || imgSource.includes("."));

    const inCart = shoppingCart.find(item => Number(item.id) === Number(product.id));
    const qty = inCart ? inCart.quantity : 0;

    productCard.innerHTML = `
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
  menuButton.addEventListener("click", () => nav.classList.toggle("active"));
  document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => nav.classList.remove("active"));
  });
}

const yearSpan = document.getElementById("year");
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderCart();
});
renderProducts();
renderCart();
