# CuentasPro 🟠

Panel para gestionar un negocio de venta de cuentas y perfiles de streaming: ventas, combos, cuentas madre, reparto de perfiles, cobros por WhatsApp y ganancias, todo en una sola pantalla. Funciona en celular, PC, portátil y tablet, y puede tener los mismos datos en todos.

Es una app web (HTML + CSS + JavaScript). Se instala en el celular como app y funciona sin internet. Para usar los mismos datos en varios dispositivos usa una pequeña función de Netlify incluida en el proyecto.

---

## 1. Subirla a GitHub

**Opción fácil (sin instalar nada):**
1. Entra a [github.com](https://github.com) e inicia sesión.
2. Arriba a la derecha toca **+ → New repository**, ponle un nombre (por ejemplo `cuentaspro`), déjalo en **Private** y toca **Create repository**.
3. En la página del repositorio toca **uploading an existing file**.
4. Descomprime el `.zip`, abre la carpeta `cuentaspro` y arrastra **todo lo que hay dentro** (incluida la carpeta `netlify`). Toca **Commit changes**.
   - Si el navegador no te deja arrastrar carpetas, sube los archivos sueltos y luego crea el archivo de la función: **Add file → Create new file**, escribe como nombre `netlify/functions/sync.mjs` y pega el contenido de ese archivo.

**Con la terminal:**
```bash
cd cuentaspro
git init
git add .
git commit -m "CuentasPro"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cuentaspro.git
git push -u origin main
```

## 2. Publicarla en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com) e inicia sesión con GitHub.
2. **Add new site → Import an existing project → GitHub** y elige tu repositorio.
3. No cambies nada (el archivo `netlify.toml` ya lo configura) y toca **Deploy**.
4. En un minuto tendrás un enlace tipo `https://tu-sitio.netlify.app`. En **Site configuration → Change site name** puedes ponerle un nombre más bonito.

> Arrastrar la carpeta a *Netlify Drop* también publica la app, pero **sin** la sincronización entre dispositivos. Para tenerla, publica desde GitHub.

## 3. Activar la sincronización (mismos datos en celular, PC, portátil y tablet)

1. En Netlify abre tu sitio → **Site configuration → Environment variables → Add a variable**.
2. Nombre (*Key*): `SYNC_KEY`. Valor: una clave larga que solo tú sepas, por ejemplo `MiNegocio-2026-perfiles-seguros`. Guarda.
3. Ve a **Deploys → Trigger deploy → Deploy site** para que la variable quede activa.
4. Abre tu enlace en el primer dispositivo → **Ajustes → Usar en varios dispositivos**, escribe la misma clave y toca **Conectar**.
5. Repite el paso 4 en cada celular, PC, portátil o tablet. Si ese dispositivo ya tenía datos, la app te pregunta si quieres usar los de la nube (lo normal en un dispositivo nuevo) o subir los de ahí.

Cómo funciona:
- Cada cambio se sube solo en uno o dos segundos. Los demás dispositivos lo reciben al abrir la app, al volver a ella o cada 30 segundos.
- Si no hay internet, sigues trabajando normal y se sincroniza cuando vuelve la conexión (el ícono de nube arriba te muestra el estado).
- Si dos dispositivos cambian cosas distintas al mismo tiempo, se combinan los cambios de ambos.
- Los datos quedan en el almacenamiento de tu propio sitio de Netlify (Netlify Blobs), protegidos con tu `SYNC_KEY`. Nadie sin la clave puede leerlos. Si alguien la conoce, cámbiala en Netlify y vuelve a conectar tus dispositivos.

## 4. Instalarla en el celular
Abre tu enlace en Chrome (Android) o Safari (iPhone) y elige **Agregar a la pantalla de inicio / Instalar app**.

---

## Cómo subir una cuenta madre y repartir sus perfiles

1. Ve a **Cuentas → + Cuenta madre**.
2. Elige el servicio, escribe cuántos perfiles tiene, el correo y la clave. Proveedor, costo y fecha de corte son opcionales, pero sirven para que la app te avise antes de que se venza.
3. Opcional: en **Nombres y PIN de los perfiles** escribe uno por línea, por ejemplo `Rojo:1234`. Así, al vender, cada perfil sale con su nombre y su PIN.
4. Toca **Guardar y repartir**. Para cada perfil eliges el cliente (uno existente o uno nuevo con su WhatsApp), revisas nombre, PIN y precio. Los que dejes en *Dejar libre* quedan disponibles.
5. Toca **Guardar y enviar uno por uno**. Aparece la lista de clientes y con **Enviar** a cada uno le llega **solo su perfil** por WhatsApp.

Más adelante puedes repartir los perfiles que queden libres con el botón **Repartir** en la tarjeta de la cuenta. ¿Tienes muchas cuentas? Usa **Importar varias** y pega `correo:clave` por línea.

### El enlace de acceso
Cada mensaje de entrega lleva un enlace (también lo puedes copiar con el ícono 🔗). El cliente lo abre en su celular, PC, portátil o tablet y ve su correo, clave (oculta hasta que toque *Ver*), perfil, PIN, fecha de vencimiento, botones para copiar y un botón para escribirte a soporte.
Los datos van dentro del propio enlace, no se guardan en ningún servidor; por eso cualquiera que tenga el enlace puede ver ese acceso, igual que pasa con el mensaje de WhatsApp.

## Logo
**Ajustes → Tu negocio → Subir logo.** Aparece en la app, en la pantalla del PIN y en la **imagen de precios** (Tienda → *Imagen para estados*), lista para WhatsApp o Instagram. Escribe también el **WhatsApp del negocio**: sale en esa imagen y en el botón de soporte del enlace de acceso.
El ícono que se ve al instalar la app en el celular son los archivos `icon-192.png`, `icon-512.png`, `icon-maskable.png` e `icon.svg`. Si quieres tu logo ahí, reemplázalos por imágenes con el mismo nombre y tamaño.

---

## Qué incluye

**Panel:** vencidas, vencen hoy, por vencer, por cobrar, cobrado hoy y en el mes, ganancia del mes y perfiles libres; cobranzas pendientes por cliente con WhatsApp en un toque; envío de recordatorios a todos; cuentas madre por vencer; perfiles listos para liberar; inventario por servicio.

**Ventas y combos:** el combo llena solas las apps con la cuenta que tenga perfiles libres; perfil y PIN automáticos; fechas distintas por app; *Guardar y entregar* por WhatsApp; renovar sin que el cliente pierda días; marcar pagado; liberar y reactivar perfiles.

**Clientes:** ficha con servicios activos, historial, pagos, deuda y notas; reenviar accesos, cobrar o renovar todo con un toque.

**Cuentas madre:** clave oculta con botón de copiar, quién ocupa cada perfil, repartir perfiles, importar muchas, renovar con el proveedor registrando el gasto.

**Tienda:** lista de precios con stock real y ahorro de combos, para copiar, enviar por WhatsApp o descargar como imagen con tu logo.

**Reportes:** ingresos, gastos, ganancia, margen, ticket promedio, gráfica de 6 meses, ingresos por servicio, mejores clientes y CSV.

**Ajustes:** logo, moneda, indicativo de país, días de aviso y de gracia, mensajes de WhatsApp editables (variables `{cliente}`, `{negocio}`, `{detalle}`, `{total}`, `{vence}`, `{enlace}`), servicios, combos, sincronización, PIN, modo claro/oscuro, respaldo y restauración.

## Respaldo
Aunque tengas la sincronización activa, descarga de vez en cuando un respaldo en **Ajustes → Descargar respaldo**. Si activas el PIN y lo olvidas, borra los datos del sitio en el navegador y vuelve a conectar la sincronización o restaura un respaldo.

## Al publicar una versión nueva
Sube el número de `CACHE` en `sw.js` (por ejemplo `cuentaspro-v3`) para que los celulares reciban la actualización.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app |
| `acceso.html` | Página que ve el cliente al abrir su enlace de acceso |
| `netlify/functions/sync.mjs` | Guarda y entrega los datos para sincronizar dispositivos |
| `package.json` | Le dice a Netlify qué instalar para la función |
| `netlify.toml` | Configuración de Netlify |
| `sw.js`, `manifest.webmanifest`, `icon*` | Funcionamiento sin internet e instalación como app |
