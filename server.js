/**
 * Tienda de Abarrotes - Servidor Backend
 * Proxyea peticiones a SerpApi para buscar precios de forma segura
 * (protege la API key y evita scraping directo de Walmart)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');
const fsExtra = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ==================== CONFIGURACIÓN SERPAPI ====================
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

if (!SERPAPI_API_KEY || SERPAPI_API_KEY === 'TU_API_KEY_DE_SERPAPI_AQUI') {
  console.warn('⚠️  ADVERTENCIA: SERPAPI_API_KEY no configurada. La búsqueda de precios no funcionará.');
  console.warn('   Copia .env.example a .env y agrega tu API key de SerpApi.');
}

// ==================== CONFIGURACIÓN MULTER (fotos) ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'public/uploads');
    fsExtra.ensureDirSync(uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

if (!fs.existsSync(path.join(__dirname, 'public/uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'public/uploads'), { recursive: true });
}

// ==================== BASE DE DATOS LOCAL (JSON) ====================
const productsPath = path.join(__dirname, 'products.json');
const salesPath = path.join(__dirname, 'sales.json');

function readJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`No se pudo leer ${filePath}, usando valor por defecto`);
  }
  return defaultValue;
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

let products = readJson(productsPath, []);
let sales = readJson(salesPath, []);

if (products.length === 0) {
  products = [
    { id: 'p1', name: 'Leche Lala 1L', price: 28.50, category: 'Lácteos', barcode: '7501010101012', stock: 50, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p2', name: 'Pan Bimbo Blanco', price: 45.00, category: 'Panadería', barcode: '7501010202013', stock: 30, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p3', name: 'Huevos blancos (docena)', price: 42.00, category: 'Lácteos', barcode: '7501010303014', stock: 40, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p4', name: 'Aceite Vegetal 900ml', price: 55.00, category: 'Despensa', barcode: '7501010404015', stock: 25, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p5', name: 'Arroz blanco 1kg', price: 24.50, category: 'Despensa', barcode: '7501010505016', stock: 60, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p6', name: 'Frijol negro 1kg', price: 28.00, category: 'Despensa', barcode: '7501010606017', stock: 45, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p7', name: 'Azúcar blanca 1kg', price: 22.00, category: 'Despensa', barcode: '7501010707018', stock: 55, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p8', name: 'Sal de mesa 250g', price: 12.00, category: 'Despensa', barcode: '7501010808019', stock: 70, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p9', name: 'Coca-Cola 600ml', price: 18.00, category: 'Bebidas', barcode: '7501010909020', stock: 80, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p10', name: 'Agua Ciel 600ml', price: 12.00, category: 'Bebidas', barcode: '7501011010021', stock: 90, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p11', name: 'Jabón Zote rosa', price: 35.00, category: 'Limpieza', barcode: '7501011111022', stock: 35, photo_url: '', created_at: new Date().toISOString() },
    { id: 'p12', name: 'Papel Higiénico (4 rollos)', price: 45.00, category: 'Limpieza', barcode: '7501011212023', stock: 40, photo_url: '', created_at: new Date().toISOString() },
  ];
  writeJson(productsPath, products);
}

setInterval(() => {
  writeJson(productsPath, products);
  writeJson(salesPath, sales);
}, 30000);

process.on('exit', () => {
  writeJson(productsPath, products);
  writeJson(salesPath, sales);
});

// ==================== RUTAS DE PRODUCTOS ====================

app.get('/api/products', (req, res) => {
  const productList = [...products].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, products: productList });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Producto no encontrado' });
  }
  res.json({ success: true, product });
});

app.post('/api/products', upload.single('photo'), (req, res) => {
  try {
    const { name, price, category, barcode, stock } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Nombre y precio son requeridos' });
    }
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const id = uuidv4();
    const product = {
      id,
      name,
      price: parseFloat(price),
      category: category || '',
      barcode: barcode || '',
      stock: stock ? parseInt(stock) : 0,
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    products.push(product);
    writeJson(productsPath, products);
    res.json({ success: true, id, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/products/:id', upload.single('photo'), (req, res) => {
  try {
    const { name, price, category, barcode, stock } = req.body;
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    if (name) products[idx].name = name;
    if (price !== undefined) products[idx].price = parseFloat(price);
    if (category !== undefined) products[idx].category = category;
    if (barcode !== undefined) products[idx].barcode = barcode;
    if (stock !== undefined) products[idx].stock = parseInt(stock);
    if (req.file) products[idx].photo_url = `/uploads/${req.file.filename}`;
    products[idx].updated_at = new Date().toISOString();
    writeJson(productsPath, products);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Producto no encontrado' });
  }
  products.splice(idx, 1);
  writeJson(productsPath, products);
  res.json({ success: true });
});

app.get('/api/products/search/:q', (req, res) => {
  const q = req.params.q.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.barcode.toLowerCase().includes(q)
  ).slice(0, 50);
  res.json({ success: true, products: filtered });
});

app.get('/api/products/barcode/:barcode', (req, res) => {
  const product = products.find(p => p.barcode === req.params.barcode);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Producto no encontrado con ese código de barras' });
  }
  res.json({ success: true, product });
});

// Servir foto de producto
app.get('/api/products/:id/photo', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product || !product.photo_url) {
    return res.status(404).send('No hay foto');
  }
  res.sendFile(path.join(__dirname, product.photo_url));
});

// ==================== RUTAS DE VENTAS ====================

app.post('/api/sales', (req, res) => {
  try {
    const { items, subtotal, tax, total, amountGiven, change, paymentMethod, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'La venta debe tener al menos un producto' });
    }
    const saleId = uuidv4();
    const now = new Date().toISOString();

    const sale = {
      id: saleId,
      subtotal,
      tax,
      total,
      amount_given: amountGiven,
      change,
      payment_method: paymentMethod || 'efectivo',
      notes: notes || '',
      created_at: now,
      items: items.map(item => ({
        id: uuidv4(),
        sale_id: saleId,
        product_id: item.productId || '',
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.total,
      })),
    };

    sales.unshift(sale);

    // Descontar stock
    for (const item of items) {
      if (item.productId) {
        const p = products.find(prod => prod.id === item.productId);
        if (p) {
          p.stock = Math.max(0, p.stock - item.quantity);
        }
      }
    }

    writeJson(salesPath, sales);
    writeJson(productsPath, products);

    res.json({ success: true, saleId, total, change, createdAt: now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  const saleList = [...sales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  res.json({ success: true, sales: saleList });
});

app.get('/api/sales/:id', (req, res) => {
  const sale = sales.find(s => s.id === req.params.id);
  if (!sale) {
    return res.status(404).json({ success: false, error: 'Venta no encontrada' });
  }
  res.json({ success: true, sale });
});

// ==================== RUTA DE BÚSQUEDA DE PRECIOS (SERPAPI) ====================

/**
 * Busca precios de un producto en Walmart México usando SerpApi.
 * El backend protege la API key y evita scraping directo.
 */
app.post('/api/buscar-precios', async (req, res) => {
  try {
    const { producto, sitio = 'walmart.com.mx' } = req.body;

    if (!producto) {
      return res.status(400).json({ success: false, error: 'Se requiere el nombre del producto' });
    }

    if (!SERPAPI_API_KEY || SERPAPI_API_KEY === 'TU_API_KEY_DE_SERPAPI_AQUI') {
      return res.status(500).json({
        success: false,
        error: 'SERPAPI_API_KEY no configurada en el servidor',
      });
    }

    // Construir consulta: site:walmart.com.mx "nombre producto"
    const query = `site:${sitio} "${producto}"`;

    const params = {
      engine: 'google',
      q: query,
      api_key: SERPAPI_API_KEY,
      gl: 'mx',
      hl: 'es',
      num: 10,
    };

    const response = await axios.get(SERPAPI_BASE_URL, { params, timeout: 15000 });
    const data = response.data;

    // Extraer resultados orgánicos
    const resultados = (data.organic_results || []).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      price: item.price || null,
      source: item.source || 'Google',
      position: item.position || 0,
    }));

    // También buscar en resultados de compras (shopping_results) si existen
    const shoppingResults = (data.shopping_results || []).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      price: item.price || null,
      source: item.source || 'Google Shopping',
      position: item.position || 0,
      thumbnail: item.thumbnail || '',
    }));

    res.json({
      success: true,
      query,
      total_results: data.search_information?.total_results || 0,
      organic_results: resultados,
      shopping_results: shoppingResults,
      search_metadata: data.search_metadata || {},
    });
  } catch (err) {
    console.error('Error SerpApi:', err.message);
    if (err.response) {
      res.status(err.response.status).json({
        success: false,
        error: 'Error en SerpApi',
        detail: err.response.data || err.message,
      });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// ==================== RUTA PRINCIPAL ====================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🛒 Tienda de Abarrotes corriendo en http://localhost:${PORT}`);
  console.log(`🔍 Búsqueda de precios vía SerpApi: ${SERPAPI_API_KEY ? 'Configurada' : 'No configurada'}`);
});

module.exports = app;