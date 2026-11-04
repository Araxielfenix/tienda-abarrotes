/**
 * AbarrotesPOS - Simple POS Scanner
 * No database, no storage - just scan, price, total
 */

// State
let ticket = [];
let currentProduct = null;
let cameraStream = null;
let scanInterval = null;
let lastBarcode = null;
let facingMode = 'environment';

// DOM Elements
const $ = id => document.getElementById(id);

const els = {
  // Ticket
  ticketItems: $('ticket-items'),
  ticketEmpty: $('ticket-empty'),
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateTicket();
});

function setupEventListeners() {
  // Scan button
  els.btnScan.addEventListener('click', openCamera);
  
  // Camera controls
  els.btnCloseCamera.addEventListener('click', closeCamera);
  els.cameraOverlay.addEventListener('click', closeCamera);
  els.btnSwitch.addEventListener('click', switchCamera);
  els.btnCapture.addEventListener('click', captureAndScan);
  
  // Product modal
  els.btnAddProduct.addEventListener('click', addToTicket);
  els.btnCancelProduct.addEventListener('click', closeProductModal);
  els.productOverlay.addEventListener('click', closeProductModal);
  els.productPrice.addEventListener('keydown', e => {
    if (e.key === 'Enter') addToTicket();
  });
  
  // Search modal
  els.btnCloseSearch.addEventListener('click', closeSearchModal);
  els.searchOverlay.addEventListener('click', closeSearchModal);
  
  // Payment
  els.received.addEventListener('input', calculateChange);
  els.btnCharge.addEventListener('click', completeSale);
  
  // Clear
  els.btnClear.addEventListener('click', () => {
    if (ticket.length > 0 && confirm('¿Limpiar ticket?')) {
      ticket = [];
      updateTicket();
      toast('Ticket limpiado');
    }
  });
  
  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCamera();
      closeProductModal();
      closeSearchModal();
    }
  });
}

// ==================== TICKET ====================
function updateTicket() {
  const total = ticket.reduce((sum, item) => sum + item.total, 0);
  
  els.total.textContent = `$${total.toFixed(2)}`;
  
  els.ticketItems.innerHTML = '';
  if (ticket.length === 0) {
    els.ticketEmpty.style.display = 'flex';
    els.btnCharge.disabled = true;
  } else {
    els.ticketEmpty.style.display = 'none';
    els.btnCharge.disabled = false;
    
    ticket.forEach(item => {
      const div = document.createElement('div');
      div.className = 'ticket-item';
      div.innerHTML = `
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-price">$${item.price.toFixed(2)} c/u</div>
        </div>
        <div class="item-controls">
          <button class="qty-btn" onclick="updateQty('${item.id}', -1)">−</button>
          <span class="item-qty">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
        </div>
        <div class="item-total">$${item.total.toFixed(2)}</div>
        <button class="remove-btn" onclick="removeItem('${item.id}')">×</button>
      `;
      els.ticketItems.appendChild(div);
    });
  }
  
  calculateChange();
}

window.updateQty = function(id, delta) {
  const item = ticket.find(t => t.id === id);
  if (!item) return;
  
  item.quantity += delta;
  
  if (item.quantity <= 0) {
    removeItem(id);
    return;
  }
  
  item.total = item.quantity * item.price;
  updateTicket();
};

window.removeItem = function(id) {
  ticket = ticket.filter(t => t.id !== id);
  updateTicket();
};

function calculateChange() {
  const given = parseFloat(els.received.value) || 0;
  const total = ticket.reduce((sum, item) => sum + item.total, 0);
  const change = Math.max(0, given - total);
  
  els.change.textContent = `$${change.toFixed(2)}`;
  els.change.style.color = given >= total ? 'var(--success)' : 'var(--danger)';
}

function completeSale() {
  const total = ticket.reduce((sum, t) => sum + t.total, 0);
  const received = parseFloat(els.received.value) || 0;
  const change = received - total;
  
  if (received < total) {
    toast(`Faltan $${(total - received).toFixed(2)}`, 'error');
    return;
  }
  
  alert(
    `✅ Venta completada\n\n` +
    `Total: $${total.toFixed(2)}\n` +
    `Recibido: $${received.toFixed(2)}\n` +
    `Cambio: $${change.toFixed(2)}`
  );
  
  ticket = [];
  els.received.value = '';
  updateTicket();
  toast('Venta completada', 'success');
}

// ==================== CÁMARA ====================
async function openCamera() {
  try {
    els.cameraOverlay.classList.add('visible');
    els.cameraModal.classList.add('visible');
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    
    els.cameraVideo.srcObject = stream;
    cameraStream = stream;
    els.cameraStatus.textContent = 'Apunta al código de barras';
    
    // Start auto-scanning after camera is ready
    els.cameraVideo.onloadedmetadata = () => {
      startAutoScan();
    };
    
  } catch (err) {
    console.error('Error cámara:', err);
    toast('No se pudo acceder a la cámara. Permite el acceso.', 'error');
    closeCamera();
  }
}

function closeCamera() {
  stopAutoScan();
  
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  
  els.cameraVideo.srcObject = null;
  els.cameraOverlay.classList.remove('visible');
  els.cameraModal.classList.remove('visible');
  lastBarcode = null;
}

async function switchCamera() {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  closeCamera();
  await openCamera();
}

function startAutoScan() {
  stopAutoScan();
  
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
        logger: () => {}
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
  const video = els.cameraVideo;
  const canvas = els.cameraCanvas;
  
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
  // Look for EAN-13, UPC-A, EAN-8 patterns
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
  els.cameraStatus.textContent = 'Buscando producto...';
  
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    
    const data = await response.json();
    
    closeCamera();
    
    if (data.status === 1 && data.product) {
      const p = data.product;
      currentProduct = {
        name: p.product_name || p.product_name_es || p.product_name_en || 'Producto',
        barcode: barcode,
        image: p.image_url || p.image_front_url || ''
      };
      
      showProductModal();
      
      // Auto-search prices
      searchPrices(currentProduct.name);
      
    } else {
      currentProduct = {
        name: 'Producto desconocido',
        barcode: barcode,
        image: ''
      };
      
      showProductModal();
      toast('Producto no encontrado', 'warning');
    }
    
  } catch (error) {
    console.error('Lookup error:', error);
    closeCamera();
    
    currentProduct = {
      name: 'Producto',
      barcode: barcode,
      image: ''
    };
    
    showProductModal();
    toast('Error al buscar producto', 'error');
  }
}

function showProductModal() {
  els.productTitle.textContent = currentProduct.name;
  els.productBarcode.textContent = currentProduct.barcode ? `Código: ${currentProduct.barcode}` : '';
  els.productPrice.value = '';
  els.productPrice.focus();
  
  if (currentProduct.image) {
    els.productPreview.innerHTML = `<img src="${currentProduct.image}" alt="${currentProduct.name}">`;
  } else {
    els.productPreview.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <path d="M21 15l-5-5L5 21"></path>
      </svg>
    `;
  }
  
  els.productOverlay.classList.add('visible');
  els.productModal.classList.add('visible');
}

function closeProductModal() {
  currentProduct = null;
  els.productOverlay.classList.remove('visible');
  els.productModal.classList.remove('visible');
}

function addToTicket() {
  const price = parseFloat(els.productPrice.value);
  
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
      id: Date.now().toString(),
      name: currentProduct.name,
      barcode: currentProduct.barcode,
      image: currentProduct.image,
      price: price,
      quantity: 1,
      total: price
    });
  }
  
  closeProductModal();
  updateTicket();
  toast(`${currentProduct.name} agregado`);
}

// ==================== PRICE SEARCH ====================
async function searchPrices(productName) {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(productName)}&limit=5`
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const results = data.results || [];
    
    if (results.length > 0) {
      const avgPrice = results.reduce((sum, r) => sum + (r.price || 0), 0) / results.length;
      
      if (avgPrice > 0 && !els.productPrice.value) {
        els.productPrice.value = avgPrice.toFixed(2);
      }
    }
  } catch (error) {
    // Silent fail
  }
}

function closeSearchModal() {
  els.searchOverlay.classList.remove('visible');
  els.searchModal.classList.remove('visible');
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  
  els.toastContainer.appendChild(el);
  
  setTimeout(() => el.remove(), 3000);
}
