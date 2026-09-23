# NISSA - Servicio Técnico & Tienda Online

Sitio web oficial de NISSA: Cotizador de reparaciones instantáneo y tienda de repuestos y accesorios.

## 📁 Estructura del Proyecto

- `index.html` - Página principal del sitio.
- `style.css` - Estilos de diseño modernos y responsivos.
- `script.js` - Lógica de la tienda, carrito de compras y resolución de imágenes.
- `products.js` - Catálogo de productos.
- `cotizador.js` & `cotizador-data.js` - Lógica y precios del cotizador de reparaciones.
- `reviews.js` - Sistema de opiniones y calificaciones.
- `banner-nissa.jpg` - Imagen del banner superior.
- `fotos/` - Carpeta con las fotos de los productos.
- `.nojekyll` - Archivo esencial para que GitHub Pages cargue todos los recursos estáticos.

---

## 🚀 Cómo subir este proyecto a GitHub sin errores

### ¿Por qué la web de GitHub no sube algunas carpetas o archivos?
1. **El botón "choose your files"** del navegador solo permite seleccionar archivos sueltos, **no carpetas**.
2. **Límite de 100 archivos en la web de GitHub:** Si intentás subir todo junto o si se incluye `node_modules`, GitHub rechaza o trunca los archivos faltantes.

---

### Opción 1: Subir mediante Git (Recomendada - 100% infalible)
Abre una terminal o Git Bash en la carpeta descomprimida y ejecuta:
```bash
git init
git add .
git commit -m "Web NISSA completa"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main --force
```

---

### Opción 2: Subir con GitHub Desktop (Visual y fácil)
1. Descarga **GitHub Desktop** (https://desktop.github.com/).
2. Ve a **File -> Add Local Repository** y selecciona la carpeta descomprimida del proyecto.
3. Haz clic en **Publish repository** a tu cuenta de GitHub. ¡Sube todas las carpetas y fotos automáticamente!

---

### Opción 3: Subir mediante la Web de GitHub (github.com)
1. **NO subas la carpeta `node_modules`** (elimínala si vino en tu descarga, contiene miles de archivos que GitHub web bloquea).
2. Para subir la carpeta `fotos`:
   - Arrastra la carpeta **`fotos`** directamente desde el explorador de archivos a la ventana de GitHub en Google Chrome o Edge.
   - O bien, en GitHub haz clic en **Add file -> Create new file**, escribe en el nombre `fotos/.gitkeep`, haz commit, y luego dentro de la carpeta `fotos` sube las imágenes.

---

## 🌐 Activar GitHub Pages
1. En tu repositorio en GitHub, ve a **Settings** (Configuración) -> pestaña **Pages** (en el menú izquierdo).
2. En **Build and deployment -> Source**, selecciona **Deploy from a branch**.
3. En **Branch**, selecciona **main** (o master) y carpeta **/ (root)**.
4. Haz clic en **Save**. En 1 minuto tu página estará online en: `https://TU_USUARIO.github.io/TU_REPOSITORIO/`
