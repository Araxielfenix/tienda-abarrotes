# 🛒 Tienda de Abarrotes - Punto de Venta

Sistema de punto de venta (POS) para tiendas de abarrotes pequeñas y medianas en México. Funciona en PC, tablets y teléfonos. Incluye cámara para fotos de productos, cálculo automático de cambio, catálogo de productos, y historial de ventas.

## ✨ Características

- **Cámara web**: Toma fotos de productos con el celular o webcam de la PC
- **Carrito de compras**: Agrega productos, ajusta cantidades, elimina items
- **Cálculo automático**: Subtotal, IVA (16%), total, dinero recibido y cambio
- **Catálogo de productos**: Agrega, edita y elimina productos con precios y fotos
- **Historial de ventas**: Consulta todas las ventas realizadas
- **Búsqueda por código de barras**: Encuentra productos rápidamente
- **Open Food Facts**: Importa información de productos por código de barras (API gratuita)
- **Responsivo**: Funciona en PC, tablets y smartphones
- **PWA**: Se puede instalar como aplicación en el celular

## 🚀 Instalación y uso

### Requisitos
- Node.js 16 o superior
- Navegador con acceso a cámara (Chrome, Edge, Safari, Firefox)

### Instalación

```bash
# Clonar o descomprimir el proyecto
cd tienda-abarrotes

# Instalar dependencias
npm install

# Iniciar el servidor
npm start
```

Luego abre tu navegador en: `http://localhost:3000`

### Para uso en red local (otros celulares en el WiFi)

```bash
# En la PC que funciona como servidor, descubre tu IP local (ipconfig en Windows)
# Luego desde el celular entra a: http://<TU-IP-LOCAL>:3000
```

## 📦 Estructura del proyecto

```
tienda-abarrotes/
├── server.js              # Servidor Express y API REST
├── package.json           # Dependencias y scripts
├── .gitignore             # Archivos ignorados por Git
├── README.md              # Esta documentación
├── db/
│   └── database.js        # Base de datos SQLite con productos de ejemplo
├── public/
│   ├── index.html         # Interfaz de usuario
│   ├── style.css          # Estilos responsivos
│   ├── app.js             # Lógica del frontend
│   └── uploads/           # Fotos de productos (se crea automáticamente)
└── routes/                # Rutas adicionales (si se expande)
```

## 🏪 Cómo usar

### 1. Agregar productos
Desde el menú lateral, selecciona "Gestionar Productos". Puedes agregar productos con:
- Nombre, precio, categoría
- Código de barras (para búsquedas rápidas)
- Stock inicial
- Foto del producto

### 2. Hacer una venta
- Busca productos en la lista principal o usa el buscador
- Toca un producto para agregarlo al carrito
- Ajusta cantidades con los botones + y −
- Ingresa el dinero recibido para calcular el cambio automáticamente
- Toca "Cobrar Venta" para registrar la venta

### 3. Tomar fotos de productos
Toca el icono 📷 en la parte superior para abrir la cámara y tomar fotos de productos o códigos de barras.

### 4. Importar de Open Food Facts
Desde el menú, selecciona "Importar Open Food Facts" e ingresa un código de barras. La app consultará la API gratuita de Open Food Facts para obtener el nombre y categoría del producto.

## 🔌 API para precios en México

No existe una API gratuita oficial y completa de precios de productos de abarrotes en México. Las opciones son:

| API | Gratis | Cubre México | Notas |
|-----|--------|--------------|-------|
| **Open Food Facts** | ✅ Sí | ✅ Sí | Base de datos colaborativa global, incluye productos mexicanos |
| **MercadoLibre** | ✅ Sí (con app) | ✅ Sí | Requiere registrar aplicación para obtener API key |
| **Catálogo local** | ✅ Sí | ✅ Sí | **Recomendado**: tú controlas los precios reales de tu tienda |

Esta app usa el **catálogo local** como fuente principal (tus precios reales) y ofrece integración opcional con **Open Food Facts** para obtener información de productos por código de barras.

## 📱 Instalar como PWA (móvil)

1. Abre `http://localhost:3000` en Chrome para Android o Safari para iOS
2. En Android: toca "Instalar app" en el menú del navegador
3. En iOS: toca "Compartir" → "Agregar a pantalla de inicio"

## 🗄️ Base de datos

La app usa **SQLite** (archivo `store.db` en la carpeta del proyecto). Incluye productos de ejemplo automáticamente. Puedes hacer backup del archivo `store.db` para respaldar tus datos.

## 📄 Licencia

MIT - Úsalo, modifícalo, compártelo libremente.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Abre un issue o envía un pull request.

---

**Desarrollado para tiendas de abarrotes en México** 🇲🇽