/**
 * Tienda de Abarrotes - Punto de Venta Estático
 * Funciona 100% en el navegador con localStorage + Búsqueda de precios locales
 */

// Estado de la aplicación
let cart = [];
let currentProductFound = null;
let priceSearchResults = [];

// URL del backend en la Raspberry Pi (solo para entorno local con SerpApi)
const API_BASE = 'http://192.168.200.32:3000';

// Datos de ejemplo iniciales (se cargan solo si no hay nada en localStorage)
const PRODUCTOS_EJEMPLO = [
  { id: 'p1', name: 'Leche Lala 1L', price: 28.50, category: 'Lácteos', barcode: '7501010101012', stock: 50, photo_url: '' },
  { id: 'p2', name: 'Pan Bimbo Blanco', price: 45.00, category: 'Panadería', barcode: '7501010202013', stock: 30, photo_url: '' },
  { id: 'p3', name: 'Huevos blancos (docena)', price: 42.00, category: 'Lácteos', barcode: '7501010303014', stock: 40, photo_url: '' },
  { id: 'p4', name: 'Aceite Vegetal 900ml', price: 55.00, category: 'Despensa', barcode: '7501010404015', stock: 25, photo_url: '' },
  { id: 'p5', name: 'Arroz blanco 1kg', price: 24.50, category: 'Despensa', barcode: '7501010505016', stock: 60, photo_url: '' },
  { id: 'p6', name: 'Frijol negro 1kg', price: 28.00, category: 'Despensa', barcode: '7501010606017', stock: 45, photo_url: '' },
  { id: 'p7', name: 'Azúcar blanca 1kg', price: 22.00, category: 'Despensa', barcode: '7501010707018', stock: 55, photo_url: '' },
  { id: 'p8', name: 'Sal de mesa 250g', price: 12.00, category: 'Despensa', barcode: '7501010808019', stock: 70, photo_url: '' },
  { id: 'p9', name: 'Coca-Cola 600ml', price: 18.00, category: 'Bebidas', barcode: '7501010909020', stock: 80, photo_url: '' },
  { id: 'p10', name: 'Agua Ciel 600ml', price: 12.00, category: 'Bebidas', barcode: '7501011010021', stock: 90, photo_url: '' },
  { id: 'p11', name: 'Jabón Zote rosa', price: 35.00, category: 'Limpieza', barcode: '7501011111022', stock: 35, photo_url: '' },
  { id: 'p12', name: 'Papel Higiénico (4 rollos)', price: 45.00, category: 'Limpieza', barcode: '7501011212023', stock: 40, photo_url: '' },
];

// Elementos DOM
const els = {
  searchInput: document.getElementById('search-input'),
  productsGrid: document.getElementById('products-grid'),
  cartItems: document.getElementById('cart-items'),
  emptyCart: document.querySelector('.empty-cart'),
  summarySubtotal: document.getElementById('summary-subtotal'),
  summaryTax: document.getElementById('summary-tax'),
  summaryTotal: document.getElementById('summary-total'),
  amountGiven: document.getElementById('amount-given'),
  changeDisplay: document.getElementById('change-display'),
  btnCompleteSale: document.getElementById('btn-complete-sale'),
  btnPrintTicket: document.getElementById('btn-print-ticket'),
  btnClearCart: document.getElementById('btn-clear-cart'),
  btnMenu: document.getElementById('btn-menu'),
  btnCloseMenu: document.getElementById('btn-close-menu'),
  cartPanel: document.getElementById('cart-panel'),
  sidebarMenu: document.getElementById('sidebar-menu'),
  modalOverlay: document.getElementById('modal-overlay'),
  cameraModal: document.getElementById('camera-modal'),
  cameraVideo: document.getElementById('camera-video'),
  cameraCanvas: document.getElementById('camera-canvas'),
  btnCapture: document.getElementById('btn-capture'),
  btnSwitchCamera: document.getElementById('btn-switch-camera'),
  btnCloseCamera: document.getElementById('btn-close-camera'),
  cameraError: document.getElementById('camera-error'),
  cameraResult: document.getElementById('camera-result'),
  productFound: document.getElementById('product-found'),
  productFoundImg: document.getElementById('product-found-img'),
  productFoundName: document.getElementById('product-found-name'),
  productFoundBarcode: document.getElementById('product-found-barcode'),
  productFoundPrice: document.getElementById('product-found-price'),
  btnAddFound: document.getElementById('btn-add-found'),
  btnCloseFound: document.getElementById('btn-close-found'),
  btnCamera: document.getElementById('btn-camera'),
  btnProducts: document.getElementById('btn-products'),
  btnManageProducts: document.getElementById('btn-manage-products'),
  btnViewSales: document.getElementById('btn-view-sales'),
  btnImportOpenFood: document.getElementById('btn-import-openfood'),
  btnExportCsv: document.getElementById('btn-export-csv'),
  modalProductsOverlay: document.getElementById('modal-products-overlay'),
  modalProducts: document.getElementById('modal-products'),
  btnCloseProducts: document.getElementById('btn-close-products'),
  prodName: document.getElementById('prod-name'),
  prodPrice: document.getElementById('prod-price'),
  prodCategory: document.getElementById('prod-category'),
  prodBarcode: document.getElementById('prod-barcode'),
  prodStock: document.getElementById('prod-stock'),
  prodPhoto: document.getElementById('prod-photo'),
  btnSaveProduct: document.getElementById('btn-save-product'),
  btnCancelProduct: document.getElementById('btn-cancel-product'),
  existingProducts: document.getElementById('existing-products'),
  modalSalesOverlay: document.getElementById('modal-sales-overlay'),
  modalSales: document.getElementById('modal-sales'),
  btnCloseSales: document.getElementById('btn-close-sales'),
  salesTableBody: document.getElementById('sales-table-body'),
};

// ==================== LOCALSTORAGE ====================
function loadFromStorage() {
  const savedProducts = localStorage.getItem('abarrotes_products');
  const savedSales = localStorage.getItem('abarrotes_sales');

  if (savedProducts) {
    return JSON.parse(savedProducts);
  }
  localStorage.setItem('abarrotes_products', JSON.stringify(PRODUCTOS_EJEMPLO));
  return PRODUCTOS_EJEMPLO;
}

let products = loadFromStorage();

function saveProducts() {
  localStorage.setItem('abarrotes_products', JSON.stringify(products));
}

let sales = JSON.parse(localStorage.getItem('abarrotes_sales') || '[]');

function saveSales() {
  localStorage.setItem('abarrotes_sales', JSON.stringify(sales));
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
  renderProducts(products);
  setupEventListeners();
  setupAmountGivenListener();
});

function renderProducts(productList) {
  els.productsGrid.innerHTML = '';
  if (productList.length === 0) {
    els.productsGrid.innerHTML = '<div class="empty-cart">No hay productos</div>';
    return;
  }
  productList.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${p.photo_url ? `<img src="${p.photo_url}" alt="${p.name}">` : '<div class="no-image"></div>'}
      <div class="product-name">${escapeHtml(p.name)}</div>
      <div class="product-price">$${parseFloat(p.price).toFixed(2)}</div>
      <div class="product-stock ${parseInt(p.stock) <= 5 ? 'low' : ''}">Stock: ${p.stock}</div>
      <div class="product-actions">
        <button class="btn-add-cart" onclick="addToCart('${p.id}')" title="Agregar al carrito">+</button>
        <button class="btn-search-price" onclick="buscarPrecioWeb('${escapeHtml(p.name)}')" title="Buscar precio en Walmart">🔍</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn-add-cart') && !e.target.classList.contains('btn-search-price')) {
        addToCart(p);
      }
    });
    els.productsGrid.appendChild(card);
  });
}

// ==================== BÚSQUEDA ====================
els.searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (q.length < 1) {
    renderProducts(products);
    return;
  }
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.barcode.toLowerCase().includes(q)
  );
  renderProducts(filtered);
});

// ==================== CARRITO ====================
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    existing.quantity += 1;
    existing.total = existing.quantity * existing.unitPrice;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      unitPrice: parseFloat(product.price),
      quantity: 1,
      total: parseFloat(product.price),
    });
  }
  updateCart();
}

function updateQuantity(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  item.total = item.quantity * item.unitPrice;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.productId !== productId);
  }
  updateCart();
}

function removeItem(productId) {
  cart = cart.filter(i => i.productId !== productId);
  updateCart();
}

function updateCart() {
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  els.summarySubtotal.textContent = `$${subtotal.toFixed(2)}`;
  els.summaryTax.textContent = `$${tax.toFixed(2)}`;
  els.summaryTotal.textContent = `$${total.toFixed(2)}`;

  els.cartItems.innerHTML = '';
  if (cart.length === 0) {
    els.emptyCart.style.display = 'flex';
    els.btnCompleteSale.disabled = true;
  } else {
    els.emptyCart.style.display = 'none';
    els.btnCompleteSale.disabled = false;
    cart.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      const product = products.find(p => p.id === item.productId);
      div.innerHTML = `
        ${product && product.photo_url ? `<img src="${product.photo_url}" alt="${escapeHtml(item.name)}">` : '<div style="width:50px;height:50px;background:#e2e8f0;border-radius:8px;"></div>'}
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">$${item.unitPrice.toFixed(2)} c/u</div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="updateQuantity('${item.productId}', -1)">−</button>
          <span style="font-weight:600">${item.quantity}</span>
          <button class="btn-qty" onclick="updateQuantity('${item.productId}', 1)">+</button>
          <button class="btn-remove-item" onclick="removeItem('${item.productId}')">×</button>
        </div>
      `;
      els.cartItems.appendChild(div);
    });
  }

  calculateChange();
}

function setupAmountGivenListener() {
  els.amountGiven.addEventListener('input', calculateChange);
}

function calculateChange() {
  const given = parseFloat(els.amountGiven.value) || 0;
  const total = cart.reduce((sum, item) => sum + item.total, 0) * 1.16;
  const change = given - total;
  els.changeDisplay.textContent = change >= 0 ? `$${change.toFixed(2)}` : `$0.00`;
  els.changeDisplay.style.color = change >= 0 ? '#10b981' : '#ef4444';
}

// ==================== BÚSQUEDA DE PRECIOS WEB (sin backend) ====================

/**
 * Busca precios de un producto usando la API pública de MercadoLibre México
 * Funciona directamente desde el navegador sin necesidad de backend
 */
async function buscarPrecioWeb(producto) {
  if (!producto) return;

  const btn = event ? event.target : null;
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = '⏳';
    btn.disabled = true;
  }

  try {
    // Buscar en MercadoLibre México (API pública, sin autenticación)
    const query = encodeURIComponent(producto);
    const response = await fetch(
      `https://api.mercadolibre.com.mx/sites/MLA/search?q=${query}&limit=10`
    );

    if (!response.ok) {
      throw new Error('Error en la respuesta de MercadoLibre');
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
      alert('No se encontraron productos para: ' + producto);
      return;
    }

    // Transformar resultados al formato de mostrarResultadosPrecio
    const transformed = {
      organic_results: results.map(item => ({
        title: item.title,
        price: item.price ? `$${item.price.toFixed(2)}` : 'Consultar',
        link: item.permalink,
        snippet: item.sold_quantity ? `Ventas: ${item.sold_quantity}` : '',
      })),
      shopping_results: [],
      total_results: data.results.length,
    };

    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }

    priceSearchResults = transformed;
    mostrarResultadosPrecio(transformed, producto);

  } catch (err) {
    console.error('Error buscando precios:', err);
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
    alert('No se pudieron obtener precios en este momento. Intenta de nuevo.');
  }
}

function mostrarResultadosPrecio(data, producto) {
  const organic = data.organic_results || [];
  const shopping = data.shopping_results || [];

  let html = `
    <div class="price-results-header">
      <h3>🔍 Precios para: <strong>${escapeHtml(producto)}</strong></h3>
      <p>Resultados en Walmart México (vía Google)</p>
      <div class="price-results-stats">
        <span>Total resultados: ${data.total_results || 0}</span>
      </div>
    </div>
  `;

  if (shopping.length > 0) {
    html += `<div class="price-section"><h4>🛒 Productos destacados</h4><div class="price-grid">`;
    shopping.forEach((item, idx) => {
      html += `
        <div class="price-card">
          <div class="price-card-title">${escapeHtml(item.title)}</div>
          ${item.price ? `<div class="price-card-price">${item.price}</div>` : '<div class="price-card-price">Precio no disponible</div>'}
          ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" class="price-card-img">` : ''}
          ${item.link ? `<a href="${item.link}" target="_blank" class="price-card-link">Ver en Walmart →</a>` : ''}
        </div>
      `;
    });
    html += `</div></div>`;
  }

  if (organic.length > 0) {
    html += `<div class="price-section"><h4>📋 Otros resultados</h4><div class="price-list">`;
    organic.slice(0, 5).forEach((item) => {
      html += `
        <div class="price-item">
          <div class="price-item-title">${escapeHtml(item.title)}</div>
          ${item.price ? `<div class="price-item-price">${item.price}</div>` : ''}
          ${item.snippet ? `<div class="price-item-snippet">${escapeHtml(item.snippet)}</div>` : ''}
          ${item.link ? `<a href="${item.link}" target="_blank" class="price-item-link">Ver enlace →</a>` : ''}
        </div>
      `;
    });
    html += `</div></div>`;
  }

  if (organic.length === 0 && shopping.length === 0) {
    html += `<div class="price-empty">No se encontraron precios para este producto en Walmart México.</div>`;
  }

  // Mostrar en modal o panel temporal
  const existing = document.getElementById('price-results-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'price-results-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>Precios Web</h3>
      <button class="btn-close" onclick="cerrarPrecioModal()">✕</button>
    </div>
    <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
      ${html}
    </div>
    <div style="padding: 1rem;">
      <button class="btn-secondary btn-full" onclick="cerrarPrecioModal()">Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

window.cerrarPrecioModal = function() {
  const modal = document.getElementById('price-results-modal');
  if (modal) {
    modal.remove();
  }
};

// Exponer para uso en HTML
window.buscarPrecioWeb = buscarPrecioWeb;

// ==================== CÁMARA ====================
els.btnCamera.addEventListener('click', async () => {
  await openCamera();
});

els.btnCloseCamera.addEventListener('click', closeCamera);
els.modalOverlay.addEventListener('click', closeCamera);

async function openCamera() {
  try {
    els.modalOverlay.style.display = 'block';
    els.cameraModal.style.display = 'flex';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    els.cameraVideo.srcObject = stream;
    els.cameraError.textContent = '';
    els.cameraModal.dataset.stream = 'active';
  } catch (err) {
    console.error('Error cámara:', err);
    els.cameraError.textContent = 'No se pudo acceder a la cámara. Permite el acceso en el navegador.';
    closeCamera();
  }
}

function closeCamera() {
  const stream = els.cameraVideo.srcObject;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  els.cameraVideo.srcObject = null;
  els.modalOverlay.style.display = 'none';
  els.cameraModal.style.display = 'none';
  els.cameraResult.innerHTML = '';
  delete els.cameraModal.dataset.stream;
}

els.btnCapture.addEventListener('click', captureFrame);

function captureFrame() {
  const video = els.cameraVideo;
  const canvas = els.cameraCanvas;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  const imageData = canvas.toDataURL('image/jpeg', 0.8);

  els.cameraResult.innerHTML = `
    <div style="text-align:center; padding:1rem;">
      <img src="${imageData}" style="max-width:200px; border-radius:8px; margin-bottom:0.5rem;">
      <p style="color:#64748b; font-size:0.875rem;">Foto capturada</p>
      <button class="btn-primary" style="margin-top:0.5rem; padding:0.5rem 1rem; font-size:0.875rem;" onclick="usarFotoCapturada()">Usar esta foto</button>
    </div>
  `;
}

window.usarFotoCapturada = function() {
  const imgData = els.cameraCanvas.toDataURL('image/jpeg', 0.8);
  const editingId = els.modalProducts.dataset.editingId;
  if (editingId) {
    const p = products.find(p => p.id === editingId);
    if (p) {
      p.photo_url = imgData;
      saveProducts();
      loadExistingProducts();
      renderProducts(products);
      alert('Foto guardada en el producto');
    }
  }
  closeCamera();
};

// ==================== PRODUCTO ENCONTRADO ====================
els.btnAddFound.addEventListener('click', () => {
  if (currentProductFound) {
    addToCart(currentProductFound.id);
    closeProductFound();
  }
});

els.btnCloseFound.addEventListener('click', closeProductFound);

function showProductFound(product) {
  currentProductFound = product;
  els.productFoundName.textContent = product.name;
  els.productFoundBarcode.textContent = product.barcode ? `Código: ${product.barcode}` : '';
  els.productFoundPrice.textContent = `$${parseFloat(product.price).toFixed(2)}`;
  els.productFoundImg.src = product.photo_url || '';
  els.productFoundImg.style.display = product.photo_url ? 'block' : 'none';
  els.productFound.classList.remove('hidden');
}

function closeProductFound() {
  currentProductFound = null;
  els.productFound.classList.add('hidden');
}

// ==================== VENTA ====================
els.btnCompleteSale.addEventListener('click', () => {
  if (cart.length === 0) return;

  const given = parseFloat(els.amountGiven.value) || 0;
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const change = given - total;

  if (change < 0) {
    alert('El monto recibido es insuficiente');
    return;
  }

  const sale = {
    id: Date.now().toString(),
    subtotal,
    tax,
    total,
    amount_given: given,
    change,
    payment_method: 'efectivo',
    notes: '',
    created_at: new Date().toISOString(),
    items: cart.map(item => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.total,
    })),
  };

  for (const item of cart) {
    const p = products.find(prod => prod.id === item.productId);
    if (p) {
      p.stock = Math.max(0, p.stock - item.quantity);
    }
  }

  saveProducts();
  sales.unshift(sale);
  saveSales();

  els.btnPrintTicket.style.display = 'block';
  alert(`Venta completada.\nTotal: $${total.toFixed(2)}\nCambio: $${change.toFixed(2)}`);
  cart = [];
  els.amountGiven.value = '';
  updateCart();
  renderProducts(products);
});

els.btnClearCart.addEventListener('click', () => {
  cart = [];
  els.amountGiven.value = '';
  updateCart();
});

// ==================== MENÚ LATERAL ====================
els.btnMenu.addEventListener('click', () => {
  els.sidebarMenu.style.display = 'flex';
});
els.btnCloseMenu.addEventListener('click', () => {
  els.sidebarMenu.style.display = 'none';
});

// ==================== GESTIONAR PRODUCTOS ====================
els.btnManageProducts.addEventListener('click', () => {
  els.sidebarMenu.style.display = 'none';
  els.modalProductsOverlay.style.display = 'block';
  els.modalProducts.style.display = 'flex';
  delete els.modalProducts.dataset.editingId;
  limpiarFormularioProducto();
  loadExistingProducts();
});

els.btnCloseProducts.addEventListener('click', () => {
  els.modalProductsOverlay.style.display = 'none';
  els.modalProducts.style.display = 'none';
});
els.modalProductsOverlay.addEventListener('click', () => {
  els.modalProductsOverlay.style.display = 'none';
  els.modalProducts.style.display = 'none';
});

function limpiarFormularioProducto() {
  els.prodName.value = '';
  els.prodPrice.value = '';
  els.prodCategory.value = '';
  els.prodBarcode.value = '';
  els.prodStock.value = '';
  els.prodPhoto.value = '';
}

async function loadExistingProducts() {
  els.existingProducts.innerHTML = '';
  products.forEach(p => {
    const div = document.createElement('div');
    div.className = 'product-list-item';
    div.innerHTML = `
      ${p.photo_url ? `<img src="${p.photo_url}" alt="" style="max-height:40px;">` : '<div style="width:40px;height:40px;background:#e2e8f0;border-radius:6px;"></div>'}
      <div class="product-list-item-info">
        <div class="product-list-item-name">${escapeHtml(p.name)}</div>
        <div class="product-list-item-price">$${parseFloat(p.price).toFixed(2)}</div>
      </div>
      <div style="display:flex; gap:0.25rem;">
        <button class="btn-delete-product" onclick="editarProducto('${p.id}')" title="Editar">✏️</button>
        <button class="btn-delete-product" onclick="eliminarProducto('${p.id}')" title="Eliminar">×</button>
      </div>
    `;
    els.existingProducts.appendChild(div);
  });
}

els.btnSaveProduct.addEventListener('click', () => {
  const name = els.prodName.value.trim();
  const price = parseFloat(els.prodPrice.value);
  const category = els.prodCategory.value.trim();
  const barcode = els.prodBarcode.value.trim();
  const stock = parseInt(els.prodStock.value) || 0;

  if (!name || !price) {
    alert('Nombre y precio son requeridos');
    return;
  }

  const editingId = els.modalProducts.dataset.editingId;
  let photo_url = '';

  if (els.prodPhoto.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      photo_url = e.target.result;
      guardarProducto(name, price, category, barcode, stock, photo_url, editingId);
    };
    reader.readAsDataURL(els.prodPhoto.files[0]);
  } else if (editingId) {
    const existente = products.find(p => p.id === editingId);
    photo_url = existente ? existente.photo_url : '';
    guardarProducto(name, price, category, barcode, stock, photo_url, editingId);
  } else {
    guardarProducto(name, price, category, barcode, stock, photo_url, editingId);
  }
});

function guardarProducto(name, price, category, barcode, stock, photo_url, editingId) {
  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx >= 0) {
      products[idx] = { ...products[idx], name, price, category, barcode, stock, photo_url, updated_at: new Date().toISOString() };
    }
  } else {
    const nuevo = {
      id: Date.now().toString(),
      name, price, category, barcode, stock, photo_url,
      created_at: new Date().toISOString(),
    };
    products.push(nuevo);
  }
  saveProducts();
  limpiarFormularioProducto();
  delete els.modalProducts.dataset.editingId;
  loadExistingProducts();
  renderProducts(products);
}

els.btnCancelProduct.addEventListener('click', () => {
  limpiarFormularioProducto();
  delete els.modalProducts.dataset.editingId;
});

window.editarProducto = (id) => {
  const p = products.find(prod => prod.id === id);
  if (!p) return;
  els.modalProducts.dataset.editingId = id;
  els.prodName.value = p.name;
  els.prodPrice.value = p.price;
  els.prodCategory.value = p.category;
  els.prodBarcode.value = p.barcode;
  els.prodStock.value = p.stock;
  els.modalProductsOverlay.style.display = 'block';
  els.modalProducts.style.display = 'flex';
};

window.eliminarProducto = (id) => {
  if (!confirm('¿Eliminar este producto?')) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  loadExistingProducts();
  renderProducts(products);
};

// ==================== HISTORIAL DE VENTAS ====================
els.btnViewSales.addEventListener('click', () => {
  els.sidebarMenu.style.display = 'none';
  els.modalSalesOverlay.style.display = 'block';
  els.modalSales.style.display = 'flex';
  loadSales();
});

els.btnCloseSales.addEventListener('click', () => {
  els.modalSalesOverlay.style.display = 'none';
  els.modalSales.style.display = 'none';
});
els.modalSalesOverlay.addEventListener('click', () => {
  els.modalSalesOverlay.style.display = 'none';
  els.modalSales.style.display = 'none';
});

function loadSales() {
  els.salesTableBody.innerHTML = '';
  sales.forEach(s => {
    const itemCount = s.items.reduce((sum, it) => sum + it.quantity, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${new Date(s.created_at).toLocaleString('es-MX')}</td>
      <td>${itemCount} productos</td>
      <td>$${parseFloat(s.total).toFixed(2)}</td>
      <td>$${parseFloat(s.amount_given).toFixed(2)}</td>
      <td>$${parseFloat(s.change).toFixed(2)}</td>
    `;
    els.salesTableBody.appendChild(tr);
  });
}

// ==================== EXPORTAR CSV ====================
els.btnExportCsv.addEventListener('click', () => {
  if (sales.length === 0) {
    alert('No hay ventas para exportar');
    return;
  }
  let csv = 'Fecha,Productos,Total,Recibido,Cambio\n';
  sales.forEach(s => {
    const fecha = new Date(s.created_at).toLocaleString('es-MX');
    const items = s.items.reduce((sum, it) => sum + it.quantity, 0);
    csv += `"${fecha}",${items},${s.total.toFixed(2)},${s.amount_given.toFixed(2)},${s.change.toFixed(2)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ventas-abarrotes.csv';
  a.click();
  URL.revokeObjectURL(url);
});

// ==================== IMPORTAR OPEN FOOD FACTS ====================
els.btnImportOpenFood.addEventListener('click', () => {
  const barcode = prompt('Ingresa el código de barras del producto:');
  if (!barcode) return;
  fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 1 && data.product) {
        const p = data.product;
        els.prodName.value = p.product_name || p.product_name_es || 'Producto sin nombre';
        els.prodCategory.value = p.categories || '';
        els.prodBarcode.value = barcode;
        els.modalProductsOverlay.style.display = 'block';
        els.modalProducts.style.display = 'flex';
        alert('Producto encontrado en Open Food Facts. Completa el precio y guarda.');
      } else {
        alert('Producto no encontrado en Open Food Facts');
      }
    })
    .catch(() => alert('Error consultando Open Food Facts'));
});

// ==================== UTILIDADES ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== BARRA NAVEGACIÓN INFERIOR (móvil) ====================
const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
const fabCart = document.getElementById('fab-cart');
const fabBadge = document.getElementById('fab-badge');

function updateFabBadge() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (count > 0) {
    fabBadge.textContent = count;
    fabBadge.style.display = 'flex';
    fabCart.classList.add('visible');
  } else {
    fabBadge.style.display = 'none';
    fabCart.classList.remove('visible');
  }
}

bottomNavItems.forEach(item => {
  item.addEventListener('click', () => {
    const action = item.dataset.action;

    // Quitar active de todos
    bottomNavItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    switch (action) {
      case 'cart':
        toggleCartPanel();
        break;
      case 'scan':
        els.btnCamera.click();
        break;
      case 'products':
        els.btnManageProducts.click();
        break;
      case 'menu':
        els.btnMenu.click();
        break;
    }
  });
});

fabCart.addEventListener('click', () => {
  toggleCartPanel();
});

function toggleCartPanel() {
  els.cartPanel.classList.toggle('open');
  // Cerrar barra inferior al abrir el carrito
  if (els.cartPanel.classList.contains('open')) {
    bottomNavItems.forEach(i => i.classList.remove('active'));
  }
}

// Actualizar badge del FAB cuando cambia el carrito
const originalUpdateCart = updateCart;
updateCart = function() {
  originalUpdateCart();
  updateFabBadge();
};

// Actualizar badge al iniciar
updateFabBadge();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeProductFound();
    cerrarPrecioModal();
    els.sidebarMenu.style.display = 'none';
    els.modalProductsOverlay.style.display = 'none';
    els.modalProducts.style.display = 'none';
    els.modalSalesOverlay.style.display = 'none';
    els.modalSales.style.display = 'none';
    els.cartPanel.classList.remove('open');
  }
});