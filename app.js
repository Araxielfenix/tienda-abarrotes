/**
 * AbarrotesPOS - Simple POS Scanner
 * No database, no storage - just scan, price, total
 */

// State
let cart = [];

// DOM Elements
const $ = id => document.getElementById(id);

const elements = {
  // Ticket
  ticketItems: $('ticket-items'),
  ticketEmpty: $('ticket-empty'),
  subtotal: $('subtotal'),
  tax: $('tax'),
  total: $('total'),
  received: $('received'),
  change: $('change'),
  btnCharge: $('btn-charge'),
  btnClear: $('btn-clear'),
  
  // Camera
  btnScan: $('btn-scan'),
  cameraOverlay: $('camera-overlay'),
  cameraModal: $('camera-modal'),
  cameraVideo: $('camera-video'),
  cameraCanvas: $('camera-canvas'),
  cameraStatus: $('camera-status'),
  btnCloseCamera: $('btn-close-camera'),
  btnSwitch: $('btn-switch'),
  btnCapture: $('btn-capture'),
  
  // Product Modal
  productOverlay: $('product-overlay'),
  productModal: $('product-modal'),
  productPreview: $('product-preview'),
  productTitle: $('product-title'),
  productBarcode: $('product-barcode'),
  productPrice: $('product-price'),
  btnAddProduct: $('btn-add-product'),
  btnCancelProduct: $('btn-cancel-product'),
  
  // Search Modal
  searchOverlay: $('search-overlay'),
  searchModal: $('search-modal'),
  searchResults: $('search-results'),
  btnCloseSearch: $('btn-close-search'),
  
  // Toast
  toastContainer: $('toast-container')
};

// ==================== TICKET ====================
function updateCart() {
  const total = ticket.reduce((sum, item) => sum + item.total, 0);

  elements.subtotal.textContent = `$${total.toFixed(2)}`;
  elements.tax.textContent = `$0.00`;
  elements.total.textContent = `$${total.toFixed(2)}`;

  elements.cartItems.innerHTML = '';
  if (cart.length === 0) {
    elements.ticketEmpty.style.display = 'flex';
    elements.btnCharge.disabled = true;
  } else {
    elements.ticketEmpty.style.display = 'none';
    elements.btnCharge.disabled = false;
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
      els.ticketItems.appendChild(div);
    });
  }

  calculateChange();
}

function calculateChange() {
  const given = parseFloat(elements.received.value) || 0;
  const total = ticket.reduce((sum, item) => sum + item.total, 0);
  const change = given - total;
  elements.change.textContent = change >= 0 ? `$${change.toFixed(2)}` : `$0.00`;
  els.change.style.color = change >= 0 ? '#10b981' : '#ef4444';
}

// ==================== CÁMARA ====================

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
    // Start auto-scanning
    startAutoScan();
  } catch (err) {
    console.error('Error cámara:', err);
    els.cameraError.textContent = 'No se pudo acceder a la cámara. Permite el acceso en el navegador.';
    closeCamera();
  }
}

function closeCamera() {
  stopAutoScan();
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

async function captureAndScan() {
  const video = elements.cameraVideo;
  const canvas = elements.cameraCanvas;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  els.cameraStatus.textContent = 'Escaneando...';
  
  try {
    const result = await Tesseract.recognize(imageData, 'spa', {
      logger: m => {
        if (m.status === 'recognizing text') {
          els.cameraStatus.textContent = `Escaneando... ${Math.round(m.progress * 100)}%`;
        }
      }
    });
    
    const text = result.data.text;
    const barcode = extractBarcode(text);
    
    if (barcode) {
      els.cameraStatus.textContent = `Código encontrado: ${barcode}`;
      await lookupProduct(barcode);
    } else {
      els.cameraStatus.textContent = 'No se encontró código. Intenta de nuevo.';
      toast('No se detectó código de barras', 'error');
    }
    
  } catch (error) {
    console.error('OCR error:', error);
    toast('Error al escanear', 'error');
    els.cameraStatus.textContent = 'Error. Intenta de nuevo.';
  }
}

function extractBarcode(text) {
  const patterns = [
    /\b(\d{13})\b/g,
    /\b(\d{12})\b/g,
    /\b(\d{8})\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      return matches.reduce((a, b) => a.length >= b.length ? a : b);
    }
  }
  return null;
}

// ==================== PRODUCT LOOKUP ====================
async function lookupProduct(barcode) {
  stopAutoScan();
  
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    
    const data = await response.json();
    
    closeCamera();
    
    if (data.status === 1 && data.product) {
      const p = data.product;
      currentProduct = {
        id: barcode,
        name: p.product_name || p.product_name_es || p.product_name_en || 'Producto',
        price: p.price || parseFloat((Math.random() * 30 + 10).toFixed(2)),
        barcode: barcode,
        photo_url: p.image_url || p.image_front_url || '',
        category: p.categories || ''
      };
      
      showProductModal();
      
    } else {
      // Product not in database - let user enter manually
      currentProduct = {
        id: barcode,
        name: 'Producto desconocido',
        price: 0,
        barcode: barcode,
        photo_url: '',
        category: ''
      };
      
      showProductModal();
      toast('Producto no encontrado en base de datos', 'warning');
    }
    
  } catch (error) {
    console.error('Lookup error:', error);
    closeCamera();
    
    currentProduct = {
      id: barcode,
      name: 'Producto',
      price: 0,
      barcode: barcode,
      photo_url: '',
      category: ''
    };
    
    showProductModal();
    toast('Error al buscar producto', 'error');
  }
}

function showProductModal() {
  elements.productTitle.textContent = currentProduct.name;
  elements.productBarcode.textContent = currentProduct.barcode ? `Código: ${currentProduct.barcode}` : '';
  elements.productPrice.value = '';
  elements.productPrice.focus();
  
  // Show image if available
  if (currentProduct.photo_url) {
    elements.productPreview.innerHTML = `<img src="${currentProduct.photo_url}" alt="${currentProduct.name}">`;
  } else {
    elements.productPreview.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <path d="M21 15l-5-5L5 21"></path>
      </svg>
    `;
  }
  
  elements.productOverlay.classList.add('visible');
  elements.productModal.classList.add('visible');
}

function closeProductModal() {
  currentProduct = null;
  elements.productOverlay.classList.remove('visible');
  elements.productModal.classList.remove('visible');
}

// ==================== TICKET ====================
function updateCart() {
  const total = ticket.reduce((sum, item) => sum + item.total, 0);

  elements.subtotal.textContent = `$${total.toFixed(2)}`;
  elements.tax.textContent = `$0.00`;
  elements.total.textContent = `$${total.toFixed(2)}`;

  elements.cartItems.innerHTML = '';
  if (cart.length === 0) {
    elements.ticketEmpty.style.display = 'flex';
    elements.btnCharge.disabled = true;
  } else {
    elements.ticketEmpty.style.display = 'none';
    elements.btnCharge.disabled = false;
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
      els.ticketItems.appendChild(div);
    });
  }

  calculateChange();
}

function calculateChange() {
  const given = parseFloat(elements.received.value) || 0;
  const total = ticket.reduce((sum, item) => sum + item.total, 0);
  const change = given - total;
  elements.change.textContent = change >= 0 ? `$${change.toFixed(2)}` : `$0.00`;
  els.change.style.color = change >= 0 ? '#10b981' : '#ef4444';
}

// ==================== CÁMARA ====================
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
    // Start auto-scanning
    startAutoScan();
  } catch (err) {
    console.error('Error cámara:', err);
    els.cameraError.textContent = 'No se pudo acceder a la cámara. Permite el acceso en el navegador.';
    closeCamera();
  }
}

function closeCamera() {
  stopAutoScan();
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

async function captureAndScan() {
  const video = elements.cameraVideo;
  const canvas = elements.cameraCanvas;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  els.cameraStatus.textContent = 'Escaneando...';
  
  try {
    const result = await Tesseract.recognize(imageData, 'spa', {
      logger: m => {
        if (m.status === 'recognizing text') {
          els.cameraStatus.textContent = `Escaneando... ${Math.round(m.progress * 100)}%`;
        }
      }
    });
    
    const text = result.data.text;
    const barcode = extractBarcode(text);
    
    if (barcode) {
      els.cameraStatus.textContent = `Código encontrado: ${barcode}`;
      await lookupProduct(barcode);
    } else {
      els.cameraStatus.textContent = 'No se encontró código. Intenta de nuevo.';
      toast('No se detectó código de barras', 'error');
    }
    
  } catch (error) {
    console.error('OCR error:', error);
    toast('Error al escanear', 'error');
    els.cameraStatus.textContent = 'Error. Intenta de nuevo.';
  }
}

function startAutoScan() {
  stopAutoScan();
  
  if (!cameraStream) return;
  
  scanInterval = setInterval(async () => {
    if (!cameraStream || els.cameraVideo.readyState !== HTMLVideoElement.HAVE_ENOUGH_DATA) return;
    
    const video = els.cameraVideo;
    const canvas = els.cameraCanvas;
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    try {
      const result = await Tesseract.recognize(imageData, 'spa', {
        logger: m => {}
      });
      
      const text = result.data.text;
      const barcode = extractBarcode(text);
      
      if (barcode && barcode !== lastBarcode) {
        lastBarcode = barcode;
        els.cameraStatus.textContent = `Código encontrado: ${barcode}`;
        await lookupProduct(barcode);
      }
    } catch (error) {
      // Continue scanning
    }
  }, 500);
}

function stopAutoScan() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
}

async function captureAndScan() {
  const video = elements.cameraVideo;
  const canvas = elements.cameraCanvas;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  const imageData = canvas.toDataURL('image/jpeg', 0.9);
  
  els.cameraStatus.textContent = 'Escaneando...';
  
  try {
    const result = await Tesseract.recognize(imageData, 'spa', {
      logger: m => {
        if (m.status === 'recognizing text') {
          els.cameraStatus.textContent = `Escaneando... ${Math.round(m.progress * 100)}%`;
        }
      }
    });
    
    const text = result.data.text;
    const barcode = extractBarcode(text);
    
    if (barcode) {
      els.cameraStatus.textContent = `Código encontrado: ${barcode}`;
      await lookupProduct(barcode);
    } else {
      els.cameraStatus.textContent = 'No se encontró código. Intenta de nuevo.';
      toast('No se detectó código de barras', 'error');
    }
    
  } catch (error) {
    console.error('OCR error:', error);
    toast('Error al escanear', 'error');
    els.cameraStatus.textContent = 'Error. Intenta de nuevo.';
  }
}

// ==================== PRODUCT LOOKUP ====================
async function lookupProduct(barcode) {
  stopAutoScan();
  
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    
    const data = await response.json();
    
    closeCamera();
    
    if (data.status === 1 && data.product) {
      const p = data.product;
      currentProduct = {
        id: barcode,
        name: p.product_name || p.product_name_es || p.product_name_en || 'Producto',
        price: p.price || parseFloat((Math.random() * 30 + 10).toFixed(2)),
        barcode: barcode,
        photo_url: p.image_url || p.image_front_url || '',
        category: p.categories || ''
      };
      
      showProductModal();
      
    } else {
      // Product not in database - let user enter manually
      currentProduct = {
        id: barcode,
        name: 'Producto desconocido',
        price: 0,
        barcode: barcode,
        photo_url: '',
        category: ''
      };
      
      showProductModal();
      toast('Producto no encontrado en base de datos', 'warning');
    }
    
  } catch (error) {
    console.error('Lookup error:', error);
    closeCamera();
    
    currentProduct = {
      id: barcode,
      name: 'Producto',
      price: 0,
      barcode: barcode,
      photo_url: '',
      category: ''
    };
    
    showProductModal();
    toast('Error al buscar producto', 'error');
  }
}

function showProductModal() {
  elements.productTitle.textContent = currentProduct.name;
  elements.productBarcode.textContent = currentProduct.barcode ? `Código: ${currentProduct.barcode}` : '';
  elements.productPrice.value = '';
  elements.productPrice.focus();
  
  // Show image if available
  if (currentProduct.photo_url) {
    elements.productPreview.innerHTML = `<img src="${currentProduct.photo_url}" alt="${currentProduct.name}">`;
  } else {
    elements.productPreview.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <path d="M21 15l-5-5L5 21"></path>
      </svg>
    `;
  }
  
  elements.productOverlay.classList.add('visible');
  elements.productModal.classList.add('visible');
}

function closeProductModal() {
  currentProduct = null;
  elements.productOverlay.classList.remove('visible');
  elements.productModal.classList.remove('visible');
}

// ==================== TICKET ====================
function addToTicket() {
  const price = parseFloat(elements.productPrice.value);
  
  if (!price || price <= 0) {
    toast('Ingresa un precio válido', 'error');
    return;
  }
  
  if (!currentProduct) return;
  
  // Check if already in ticket
  const existing = ticket.find(t => t.barcode === currentProduct.barcode);
  
  if (existing) {
    existing.quantity++;
    existing.total = existing.quantity * existing.price;
  } else {
    ticket.push({
      id: Date.now(),
      name: currentProduct.name,
      barcode: currentProduct.barcode,
      image: currentProduct.image,
      price: price,
      quantity: 1,
      total: price
    });
  }
  
  closeProductModal();
  updateCart();
  toast(`${currentProduct.name} agregado`);
}

function updateCart() {
  const total = ticket.reduce((sum, item) => sum + item.total, 0);

  elements.subtotal.textContent = `$${total.toFixed(2)}`;
  elements.tax.textContent = `$0.00`;
  elements.total.textContent = `$${total.toFixed(2)}`;

  elements.cartItems.innerHTML = '';
  if (cart.length === 0) {
    elements.ticketEmpty.style.display = 'flex';
    elements.btnCharge.disabled = true;
  } else {
    elements.ticketEmpty.style.display = 'none';
    elements.btnCharge.disabled = false;
    cart.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      const product = products.find(p => p.id === item.productId);
      div.innerHTML = `
        <div class="cart-item">
          <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-price">$${item.unitPrice.toFixed(2)} c/u</div>
          </div>
          <div class="item-controls">
            <button class="btn-qty" onclick="updateQuantity('${item.productId}', -1)">−</button>
            <span class="item-qty">${item.quantity}</span>
            <button class="btn-qty" onclick="updateQuantity('${item.productId}', 1)">+</button>
          </div>
          <div class="item-total">$${item.total.toFixed(2)}</div>
          <button class="remove-btn" onclick="removeItem('${item.productId}')">×</button>
        </div>
      `;
      els.ticketItems.appendChild(div);
    });
  }

  calculateChange();
}

function calculateChange() {
  const given = parseFloat(elements.received.value) || 0;
  const total = ticket.reduce((sum, item) => sum + item.total, 0);
  const change = given - total;
  elements.change.textContent = change >= 0 ? `$${change.toFixed(2)}` : `$0.00`;
  els.change.style.color = change >= 0 ? '#10b981' : '#ef4444';
}

// ==================== BÚSQUEDA DE PRECIOS WEB (sin backend) ====================
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
      `https://api.mercadolibre.com.mx/sites/MLM/search?q=${query}&limit=10`
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

// ==================== CÁMARA ====================

// ==================== TICKET ====================
function addToTicket() {
  const price = parseFloat(elements.productPrice.value);
  
  if (!price || price <= 0) {
    toast('Ingresa un precio válido', 'error');
    return;
  }
  
  if (!currentProduct) return;
  
  // Check if already in ticket
  const existing = ticket.find(t => t.barcode === currentProduct.barcode);
  
  if (existing) {
    existing.quantity++;
    existing.total = existing.quantity * existing.price;
  } else {
    ticket.push({
      id: Date.now(),
      name: currentProduct.name,
      barcode: currentProduct.barcode,
      image: currentProduct.image,
      price: price,
      quantity: 1,
      total: price
    });
  }
  
  closeProductModal();
  updateCart();
  toast(`${currentProduct.name} agregado`);
}

// ==================== MENÚ LATERAL ====================
elements.btnMenu.addEventListener('click', () => {
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

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  
  elements.toastContainer.appendChild(el);
  
  setTimeout(() => el.remove(), 3000);
}