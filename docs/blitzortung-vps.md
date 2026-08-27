# Blitzortung en VPS

El worker `scripts/blitzortung-worker.mjs` mantiene una conexión persistente con Blitzortung y guarda los impactos cercanos en Neon. La aplicación consulta esos impactos desde `lightningService.ts`; si el heartbeat del worker tiene menos de tres minutos, la fuente se marca como `blitzortung`.

## Acción manual necesaria

Necesito que ejecutes estos pasos en el VPS. No puedo instalarlo sin acceso SSH, IP, usuario y permisos del servidor.

### 1. Instalar Node.js y PM2

En Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nodejs npm
sudo npm install -g pm2
```

Node.js 20 o superior es recomendable.

### 2. Descargar el proyecto

```bash
git clone https://github.com/mcgnexus/meteo_uskar_leads.git
cd meteo_uskar_leads
npm ci
```

Si el proyecto ya existe en el VPS, actualízalo con `git pull`.

### 3. Configurar la conexión de Neon

Crear un archivo `.env` en el VPS, sin subirlo a GitHub:

```bash
DATABASE_URL='postgresql://...'
LIGHTNING_LAT='37.8094'
LIGHTNING_LON='-2.5392'
LIGHTNING_RADIUS_KM='50'
```

Usa la misma `DATABASE_URL` de producción que ya está configurada en Vercel.

### 4. Probar el worker

```bash
set -a
. ./.env
set +a
npm run lightning:worker
```

Debe mostrar intentos de conexión a `ws*.blitzortung.org`. Detén la prueba con `Ctrl+C`.

### 5. Ejecutarlo permanentemente

```bash
set -a
. ./.env
set +a
pm2 start npm --name blitzortung-worker -- run lightning:worker
pm2 save
pm2 startup
```

El último comando imprimirá otro comando `sudo`; ejecútalo exactamente como aparezca.

Comprobación:

```bash
pm2 status
pm2 logs blitzortung-worker
```

### 6. Verificar desde la web

Después de que el worker lleve unos segundos conectado:

```bash
curl -s 'https://meteo.tecrural.es/api/weather/lightning?radius=20'
```

La respuesta debe contener:

```json
"source": "blitzortung"
```

Si no hay rayos, `strikeCount` será `0`, pero la fuente seguirá siendo `blitzortung` mientras el heartbeat esté activo.

## Seguridad

- No publiques `.env`.
- No expongas Neon en el navegador.
- Mantén la API de la aplicación detrás de HTTPS.
- Revisa las condiciones de uso de Blitzortung antes de publicar datos o construir alertas comerciales.
