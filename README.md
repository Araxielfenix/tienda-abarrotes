# 🛒 Tienda de Abarrotes - Punto de Venta

Sistema de punto de venta (POS) para tiendas de abarrotes pequeñas y medianas en México. **Funciona 100% estáticamente en el navegador** sin necesidad de backend. Se puede usar en PC, tablets y teléfonos. Incluye cámara para fotos de productos, cálculo automático de cambio, catálogo de productos, historial de ventas y búsqueda de precios en MercadoLibre México.

## ✨ Características

- **100% estático**: No requiere backend, funciona directamente desde GitHub Pages
- **Cámara web**: Toma fotos de productos con el celular o webcam de la PC
- **Carrito de compras**: Agrega productos, ajusta cantidades, elimina items
- **Cálculo automático**: Subtotal, IVA (16%), total, dinero recibido y cambio
- **Catálogo de productos**: Agrega, edita y elimina productos con precios y fotos
- **Historial de ventas**: Consulta todas las ventas realizadas
- **Búsqueda por código de barras**: Encuentra productos rápidamente
- **Open Food Facts**: Importa información de productos por código de barras (API gratuita)
- **Búsqueda de precios**: Compara precios en MercadoLibre México directamente desde el navegador
- **Interfaz móvil optimizada**: Barra de navegación inferior, botón flotante del carrito, touch-friendly
- **PWA**: Se puede instalar como aplicación en el celular
- **Offline**: Funciona sin conexión a internet (datos se guardan en localStorage)

## 🚀 Uso

### GitHub Pages (recomendado)

Abre la aplicación directamente en tu navegador:
`https://araxielfenix.github.io/tienda-abarrotes`

### Uso local

Abre el archivo `index.html` directamente en tu navegador, o sirve los archivos estáticos con cualquierservidor web.

```bash
# Opcional: servir con Python
python3 -m http.server 8000
# Luego abre: http://localhost:8000
```

## 📱 Instalar como PWA (móvil)

1. Abre la aplicación en Chrome para Android o Safari para iOS
2. En Android: toca "Instalar app" en el menú del navegador
3. En iOS: toca "Compartir" → " agregar a pantalla de inicio"

## 🏪 Cómo usar

### 1. Agregar productos
Desde el menú lateral, selecciona "Gestionar Productos". Puedes agregar productos con:
- Nombre, precio, categoría
- Código de barras (para búsquedas rápidas)
- Stock inicial
- Foto del producto (cámara o archivo)

### 2. Hacer una venta
- Busca productos en la lista principal o usa el buscador
- Toca un producto para agregarlo al carrito
- Ajusta cantidades con los botones + y −
- Ingresa el dinero recibido para calcular el cambio automáticamente
- Toca "Cobrar Venta" para registrar la venta

### 3. Buscar precios en MercadoLibre
Toca el botón 🔍 en cualquier producto para buscar precios de comparación en MercadoLibre México.

### 4. Tomar fotos de productos
Toca el icono 📷 en la parte inferior (móvil) o superior (escritorio) para abrir la cámara y tomar fotos de productos o códigos de barras.

### 5. Importar de Open Food Facts
Desde el menú, selecciona "Importar Open Food Facts" e ingresa un código de barras. La app consultará la API gratuita de Open Food Facts para obtener el nombre y categoría del producto.

## 📦 Estructura del proyecto

```
tienda-abarrotes/
├── index.html         # Interfaz de usuario
├── style.css          # Estilos responsivos (móvil optimizado)
├── app.js             # Lógica del frontend (100% estático)
├── manifest.json      # Configuración PWA
├── .env.example       # Ejemplo de variables de entorno (no se usa en estático)
├── .gitignore         # Archivos ignorados por Git
└── README.md          # Esta documentación
```

## 🗄️ Almacenamiento

La app usa **localStorage** del navegador para guardar datos:
- `abarrotes_products`: Catálogo de productos
- `abarrotes_sales`: Historial de ventas

Los datos persisten mientras no se borre la caché del navegador.

## 🔌 API para precios

La búsqueda de precios usa la **API pública de MercadoLibre México**:
- Endpoint: `https://api.mercadolibre.com.mx/sites/MLA/search?q=`
- Sin autenticación requerida
- Funciona directamente desde el navegador

## 📄 Licencia

MIT - Úsalo, modifícalo, compártelo libremente.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Abre un issue o envía un pull request.

---

**Desarrollado para tiendas de abarrotes en México** 🇲🇽