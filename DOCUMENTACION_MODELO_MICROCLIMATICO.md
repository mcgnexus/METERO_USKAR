# Documentación Exhaustiva del Modelo Microclimático — METERO USKAR

Este documento constituye la referencia técnica completa del observatorio meteorológico de Huéscar y su comarca. Describe la arquitectura, los 9 subsistemas (fases), los servicios, endpoints, base de datos, fórmulas, parámetros, componentes UI, configuración y despliegue.

---

## Índice

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Punto Objetivo y Fuentes](#3-punto-objetivo-y-fuentes)
4. [Fase 1 — Microclima Básico](#4-fase-1--microclima-básico)
5. [Fase 2 — Relieve](#5-fase-2--relieve)
6. [Fase 3 — Miniestaciones Calibradas](#6-fase-3--miniestaciones-calibradas)
7. [Fase 4 — Modelo Comarcal](#7-fase-4--modelo-comarcal)
8. [Fase 5 — Vegetación, Suelo y Agua](#8-fase-5--vegetación-suelo-y-agua)
9. [Fase 6 — Precipitación Avanzada y Nowcasting](#9-fase-6--precipitación-avanzada-y-nowcasting)
10. [Fase 7 — Validación Histórica y Aprendizaje](#10-fase-7--validación-histórica-y-aprendizaje)
11. [Fase 8 — Transparencia del Modelo en UI](#11-fase-8--transparencia-del-modelo-en-ui)
12. [Fase 9 — Zonas Locales de Huéscar](#12-fase-9--zonas-locales-de-huéscar)
13. [Corrección Específica AEMET 5051X por Embalse](#13-corrección-específica-aemet-5051x-por-embalse)
14. [Fusión de Fuentes y Confianza](#14-fusión-de-fuentes-y-confianza)
15. [Cron y Persistencia](#15-cron-y-persistencia)
16. [Base de Datos](#16-base-de-datos)
17. [API Completa](#17-api-completa)
18. [Componentes UI](#18-componentes-ui)
19. [Configuración y Variables de Entorno](#19-configuración-y-variables-de-entorno)
20. [Despliegue](#20-despliegue)
21. [Limitaciones Conocidas](#21-limitaciones-conocidas)

---

## 1. Visión General

El observatorio meteorológico METERO USKAR es una aplicación web construida con Next.js 16 (App Router), React, TypeScript y Tailwind CSS v4. Su propósito es proporcionar estimaciones meteorológicas locales precisas para Huéscar (Granada) y su comarca, combinando múltiples fuentes de datos y aplicando un modelo microclimático por capas.

### Datos Clave del Proyecto

- **Ubicación del proyecto**: `C:\Users\Manuel Q\Proyectos\METERO_USKAR\metero-uskaro`
- **Repositorio remoto**: `https://github.com/mcgnexus/METERO_USKAR.git`
- **Framework**: Next.js 16.2.9 (Turbopack)
- **Base de datos principal**: Neon PostgreSQL (`DATABASE_URL`)
- **Base de datos de estaciones**: Neon PostgreSQL (`STATIONS_DATABASE_URL`)
- **Puerto de desarrollo local**: 3358
- **Último build**: exitoso (fases 1–9)

### Flujo General

1. Cada petición a `/api/weather/current` dispara la capa de observación.
2. Se obtienen datos de AEMET 5051X + Open-Meteo + miniestaciones.
3. Cada fuente se corrige individualmente (altitud, embalse, microclima).
4. Se fusionan las fuentes ponderadas.
5. Se calcula confianza.
6. Se añaden datos adicionales (nowcasting, rayos, radar, orografía).
7. Se devuelve el payload al frontend.

---

## 2. Arquitectura del Sistema

### Estructura de Directorios

```
metero-uskaro/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/                    # login, logout, overview, force-refresh
│   │   │   ├── cron/
│   │   │   │   └── weather-capture/      # captura periódica (cron)
│   │   │   └── weather/
│   │   │       ├── current/              # dato fusionado actual
│   │   │       ├── comarca/              # estimaciones comarcales
│   │   │       ├── zones/                # zonas locales de Huéscar
│   │   │       ├── nowcast/              # nowcasting 0-2h
│   │   │       ├── radar/                # radar AEMET
│   │   │       ├── lightning/            # rayos Blitzortung
│   │   │       ├── stations/             # miniestaciones
│   │   │       ├── metrics/              # métricas de validación
│   │   │       ├── avisos/               # avisos AEMET
│   │   │       └── geographic-profiles/  # perfiles geográficos
│   │   ├── admin/                        # página de administración
│   │   ├── meteo/                        # dashboard público
│   │   └── widget/                       # widget ayuntamiento
│   ├── components/
│   │   ├── WeatherDashboard.tsx          # dashboard principal
│   │   ├── WeatherDashboardAyto.tsx      # wrapper variante ayto
│   │   ├── WeatherStationPanel.tsx       # panel miniestaciones
│   │   ├── RadarPanel.tsx                # panel radar
│   │   ├── NowcastPanel.tsx              # panel nowcasting
│   │   ├── ModelTransparencyPanel.tsx    # panel transparencia
│   │   ├── ZonePanel.tsx                 # panel zonas locales
│   │   └── AdminConsole.tsx              # consola admin
│   ├── services/
│   │   ├── layerObservation.ts           # CAPA PRINCIPAL: orquestación
│   │   ├── aemetClient.ts                # cliente AEMET API
│   │   ├── openMeteoForecastClient.ts    # cliente Open-Meteo
│   │   ├── openMeteoArchiveClient.ts     # archivo histórico Open-Meteo
│   │   ├── stationService.ts             # lectura miniestaciones BD
│   │   ├── altitudeCorrection.ts         # corrección por altitud
│   │   ├── correctionService.ts          # microclima: inversión, viento, rocío
│   │   ├── reliefService.ts              # relieve 3×3 y clasificación
│   │   ├── stationCalibration.ts         # calibración miniestaciones
│   │   ├── sentinelService.ts            # NDVI/NDWI (CDSE)
│   │   ├── osmService.ts                 # OSM Overpass: agua/manantiales
│   │   ├── vegetationService.ts          # correcciones por vegetación/agua
│   │   ├── comarcaService.ts             # modelo comarcal
│   │   ├── zoneService.ts                # zonas locales de Huéscar
│   │   ├── orographicService.ts          # ajuste orográfico barlovento/sotavento
│   │   ├── nowcastService.ts             # nowcasting 0-2h
│   │   ├── precipCorrectionService.ts    # corrección por miniestaciones
│   │   ├── radarService.ts               # radar AEMET + nowcasting básico
│   │   ├── lightningService.ts           # Blitzortung WebSocket
│   │   ├── backtestingService.ts         # MAE/RMSE/bias histórico
│   │   ├── modelParameterService.ts      # auto-calibración de parámetros
│   │   ├── calibrationService.ts         # tolerancias Bayesianas
│   │   ├── consensusConfidence.ts        # cálculo de confianza
│   │   ├── weatherAggregator.ts          # agregador de datos
│   │   ├── layerComarca.ts               # capa comarcal (cron)
│   │   ├── cronAuth.ts                   # autenticación del cron
│   │   ├── adminAuth.ts                  # autenticación admin
│   │   └── agriculturalService.ts        # datos agrícolas
│   ├── lib/
│   │   ├── geo.ts                        # coordenadas, distancias
│   │   ├── dewPoint.ts                   # fórmulas punto de rocío
│   │   ├── weatherStore.ts               # acceso a BD (Neon)
│   │   ├── inMemoryCache.ts              # caché en memoria
│   │   └── display.ts                    # helpers UI
│   └── types/
│       └── weather.ts                    # todos los tipos TypeScript
```

---

## 3. Punto Objetivo y Fuentes

### 3.1 Punto Objetivo Principal

El modelo estima condiciones para **Huéscar ciudad**:

```txt
Latitud:   37.8094
Longitud: -2.5392
Altitud:   953 m
```

### 3.2 Fuentes de Datos

| Fuente | Tipo | Prioridad |
|--------|------|-----------|
| AEMET 5051X | Observación real (EMA oficial) | Alta si es reciente |
| Open-Meteo | Modelo numérico espacial | Estable |
| Miniestaciones propias | Observación local | Alta si están cerca y calibradas |

### 3.3 Estación AEMET 5051X

```txt
ID:       5051X
Nombre:   AEMET 5051X Huéscar
Latitud:  37.861389
Longitud: -2.652778
Altitud:  1101 m
Cercana a embalse: Sí
Distancia a embalse: 278 m
Distancia a ciudad: 11.5 km
```

### 3.4 Pantano de San Clemente

```txt
Nombre:     Pantano de San Clemente
Latitud:   37.860763009894654
Longitud: -2.6497118917245626
Distancia a AEMET 5051X: 278 m
```

---

## 4. Fase 1 — Microclima Básico

### 4.1 Objetivo

Aplicar correcciones físicas fundamentales para que las fuentes externas representen adecuadamente las condiciones de Huéscar ciudad.

### 4.2 Archivos

```
src/services/altitudeCorrection.ts
src/services/correctionService.ts
src/lib/dewPoint.ts
src/services/layerObservation.ts
src/services/consensusConfidence.ts
```

### 4.3 Corrección por Altitud

**Fórmula**:

```
correccion_altitud = (elevacion_fuente - elevacion_objetivo) × 0.006
```

**Ejemplo AEMET → Huéscar**:

```
(1101 - 953) × 0.006 = +0.888 °C
```

La estación está más alta que la ciudad, por lo que la temperatura estimada sube al trasladar la observación.

### 4.4 Peso por Distancia

La distancia reduce la confianza/peso de la fuente, no cambia el valor directamente.

**Función**:

| Distancia | Factor |
|-----------|-------:|
| ≤ 2 km | 1.00 |
| 2–5 km | 1.0 → 0.85 (lineal) |
| ≥ 5 km | 0.85 → 0.65 (lineal) |

AEMET 5051X está a ~11.5 km, por lo que su factor es ~0.65.

### 4.5 Humedad con Punto de Rocío

La humedad relativa se corrige mediante el punto de rocío, no sumando/restando porcentajes:

```txt
Td = dewPoint(T, HR)
Td_ajustado = Td + correcciones (altitud, vegetación, agua, etc.)
HR_final = relativeHumidity(T_corregida, Td_ajustado)
```

**Funciones** (`src/lib/dewPoint.ts`):

```txt
saturationVaporPressure(tempC) → es
dewPoint(tempC, rhPct)        → temperatura de rocío
relativeHumidity(tempC, tdC)  → humedad relativa
correctHumidityByElevation(t, rh, srcElev, tgtElev) → HR corregida por altitud
```

### 4.6 Corrección de Viento Básica

El viento se ajusta mediante factores multiplicativos según el relieve (ver Fase 2). Sin datos de relieve, factor = 1.0.

---

## 5. Fase 2 — Relieve

### 5.1 Objetivo

Clasificar el contexto topográfico local para ajustar inversión térmica nocturna, exposición al viento y otras variables microclimáticas.

### 5.2 Archivos

```
src/services/reliefService.ts
src/services/correctionService.ts
```

### 5.3 Datos de Elevación

Se consulta la API de elevación de Open-Meteo para construir una rejilla 3×3 (~4 km × 4 km) alrededor del punto objetivo.

**Parámetros**:

```
GRID_SPACING = 0.036 grados (~4 km)
Cache del relieve: 7 días
```

### 5.4 Datos Calculados por Punto

| Campo | Descripción |
|-------|-------------|
| `centerElevation` | Elevación central (m) |
| `minElevation` | Mínimo de la rejilla (m) |
| `maxElevation` | Máximo de la rejilla (m) |
| `elevationRange` | Rango altitudinal (m) |
| `valleyExposure` | Exposición de valle (0–1) |
| `slopePct` | Pendiente aproximada (%) |
| `aspect` | Orientación textual (N, NE, E, etc.) |
| `aspectDeg` | Orientación en grados (0–360) |
| `microclimate` | Tipo de microclima |

### 5.5 Clasificación Microclimática

```txt
VALLEY:          valleyExposure >= 0.6
PIEDMONT:        range >= 450 m
EXPOSED_PLATEAU: valleyExposure <= -0.5 y range < 300 m
MIXED_RELIEF:    resto
```

### 5.6 Inversión Térmica Nocturna

Se aplica solo si es de noche, viento bajo (≤ 5 km/h) y el relieve es valle o mixto:

```txt
VALLEY:       -1.5 °C
MIXED_RELIEF: -0.5 °C
Resto:         0.0 °C
```

### 5.7 Factor de Viento

```txt
EXPOSED_PLATEAU: 1.2  (viento más intenso)
PIEDMONT:        1.0  (neutro)
VALLEY:          0.7  (viento más suave)
MIXED_RELIEF:    0.9
```

### 5.8 Aplicación en el Flujo

El microclima se aplica en `correctionService.ts` mediante `applyMicroclimateCorrections()`, que recibe la temperatura, humedad, viento, hora, elevaciones y datos de relieve. Aplica:

1. Corrección por altitud (si fuente ≠ objetivo).
2. Inversión nocturna (si aplica).
3. Factor de viento.
4. Ajuste de humedad por altitud (punto de rocío + gradiente 0.0018 °C/m).

---

## 6. Fase 3 — Miniestaciones Calibradas

### 6.1 Objetivo

Utilizar miniestaciones propias aplicando correcciones individuales por bias histórico, en lugar de asumir que todas miden perfectamente.

### 6.2 Archivos

```
src/services/stationService.ts      ← lectura de BD
src/services/stationCalibration.ts  ← calibración
src/lib/weatherStore.ts             ← persistencia
src/components/WeatherStationPanel.tsx ← UI
```

### 6.3 Tablas de Base de Datos

**`station_comparisons`**: almacena cada comparación estación vs referencia:

```sql
id SERIAL PRIMARY KEY
station_id TEXT NOT NULL
measured_at TIMESTAMPTZ NOT NULL
variable TEXT NOT NULL
station_value FLOAT
reference_value FLOAT
error FLOAT
absolute_error FLOAT
```

**`station_calibrations`**: almacena el bias calculado por estación y variable:

```sql
station_id TEXT NOT NULL
variable TEXT NOT NULL
bias FLOAT NOT NULL DEFAULT 0
sample_count INT NOT NULL DEFAULT 0
last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
PRIMARY KEY (station_id, variable)
```

### 6.4 Flujo de Calibración

1. Se obtienen lecturas recientes de miniestaciones.
2. Se comparan contra la referencia AEMET corregida.
3. Se guarda el error por variable en `station_comparisons`.
4. Si hay ≥ 5 muestras, se calcula bias medio.
5. Si |bias| > 0.3, se guarda en `station_calibrations`.
6. En lecturas posteriores se aplica: `valor_corregido = valor_estacion - bias`.

**Fórmula**:

```txt
bias = Σ(observacion_estacion - referencia) / n
valor_corregido = valor_bruto - bias
```

### 6.5 Variables Calibradas

- Temperatura.
- Humedad.

### 6.6 Cache

Los bias se almacenan en caché durante 30 minutos.

---

## 7. Fase 4 — Modelo Comarcal

### 7.1 Objetivo

Extender el modelo a las localidades de la comarca de Huéscar.

### 7.2 Archivos

```
src/services/comarcaService.ts
src/app/api/weather/comarca/route.ts
src/lib/geo.ts ← COMARCA_LOCATIONS
```

### 7.3 Localidades Incluidas

| Localidad | Latitud | Longitud | Altitud (m) |
|-----------|---------|----------|:-----------:|
| Huéscar | 37.8094 | -2.5392 | 953 |
| Castril | 37.7961 | -2.7464 | 890 |
| Castilléjar | 37.7186 | -2.6489 | 795 |
| Galera | 37.7433 | -2.5514 | 820 |
| Orce | 37.7194 | -2.4772 | 925 |
| Puebla de Don Fadrique | 37.9583 | -2.4350 | 1164 |
| La Hinojosa | 37.7897 | -2.4286 | 980 |

### 7.4 Método de Estimación

Para cada localidad:

1. Obtener Open-Meteo local y del punto ancla (Huéscar).
2. Calcular delta espacial: `Δ = OM_local - OM_ancla`.
3. Si AEMET está disponible: `base = AEMET_corregido + Δ`.
4. Si no: `base = OM_local`.
5. Aplicar relieve local (inversión térmica, viento).
6. Aplicar vegetación/agua (NDVI, NDWI, masas de agua).
7. Aplicar ajuste orográfico (barlovento/sotavento).
8. Calcular confianza.

### 7.5 Confianza Comarcal

```txt
confianza base = 80%
  - antigüedad AEMET > 120 min: hasta -30%
  - sin relieve: -10%
  - sin forecast: -20%
  - distancia: × max(0, 1 - 0.03 × km)
Límites: [25%, 92%]
```

---

## 8. Fase 5 — Vegetación, Suelo y Agua

### 8.1 Objetivo

Incorporar información de vegetación, humedad superficial y masas de agua para ajustar temperatura y humedad.

### 8.2 Archivos

```
src/services/sentinelService.ts     ← NDVI/NDWI (CDSE)
src/services/osmService.ts          ← OSM Overpass API
src/services/vegetationService.ts   ← correcciones
src/services/comarcaService.ts      ← integración
```

### 8.3 Sentinel-2 (CDSE)

**Autenticación**:

```
POST https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
  grant_type=client_credentials
  client_id=SENTINEL_HUB_CLIENT_ID
  client_secret=SENTINEL_HUB_CLIENT_SECRET
```

**Estadísticas**:

```
POST https://sh.dataspace.copernicus.eu/api/v1/statistics
  Body: JSON con bbox, evalscript, ventana temporal
```

**Parámetros**:

```txt
Ventana temporal:       últimos 30 días
Agregación:            cada 10 días (P10D)
Mosaico:               menor cobertura nubosa
Cobertura nubes máx:   80%
Cache índices:         7 días
```

**Índices calculados**:

```txt
NDVI = (B08 - B04) / (B08 + B04)
NDWI = (B03 - B08) / (B03 + B08)
```

**Clasificación NDVI**:

| Valor | Cobertura |
|-------|-----------|
| > 0.6 | densa |
| > 0.4 | moderada |
| > 0.2 | escasa |
| ≤ 0.2 | desnuda |

**Evalscript**: filma píxeles con `SCL` en clases de nube/sombra/nieve (3, 8, 9, 10, 11) y requiere `dataMask`.

### 8.4 OpenStreetMap (Overpass API)

**Endpoint**: `POST https://overpass-api.de/api/interpreter`

**Cabeceras requeridas**:

```
Content-Type: application/x-www-form-urlencoded
User-Agent: METERO-USKAR/1.0 (meteorological observatory)
```

**Radio**: 5000 m (configurable). **Cache**: 30 días.

**Elementos consultados**:

```overpass
way["natural"="water"](around:5000,lat,lon)
relation["natural"="water"](around:5000,lat,lon)
way["waterway"](around:5000,lat,lon)
node["natural"="spring"](around:5000,lat,lon)
```

### 8.5 Filtrado de Cauces Secos

Para evitar que barrancos, ramblas y ríos secos inflen artificialmente la humedad:

| Tipo | Peso | Condición |
|------|:----:|-----------|
| `spring` | 1.0 | Manantial |
| `water` | 0.8 | Masa de agua |
| `canal` | 0.6 | Canal de riego |
| `river` | 0.3 | Río |
| `Río Huéscar` | 0.1 | Degradado por ser seco la mayor parte del año |
| `stream`, `ditch`, `barranco`, `arroyo` | 0.0 | Sin agua permanente |
| `intermittent=yes` | 0.0 | Explícitamente estacional |

### 8.6 Elementos Conocidos Añadidos Manualmente

OSM puede no representar bien ciertos elementos locales. Se añaden manualmente:

**Fuencaliente**:

```
Nombre: Fuencaliente
Latitud: 37.801980717778704
Longitud: -2.5223947364766244
Peso: 1.0 (spring)
```

**Pantano de San Clemente**:

```
Nombre: Pantano de San Clemente
Latitud: 37.860763009894654
Longitud: -2.6497118917245626
Peso: 0.9 (reservoir)
```

### 8.7 Correcciones por Vegetación y Agua

**Reglas** (`vegetationService.ts:applyVegetationCorrections`):

| Condición | Temp | HR | Punto rocío |
|-----------|:----:|:--:|:-----------:|
| NDVI > 0.6 | -0.5°C | — | +0.3°C |
| NDVI > 0.4 | -0.3°C | — | +0.2°C |
| NDVI < 0.15 | +0.4°C | — | -0.2°C |
| NDWI > 0 | -0.2°C | — | +0.2°C |
| Agua efectiva < 1 km | -0.3°C | +4% | +0.5°C |
| Agua efectiva 1–3 km | — | +2% | +0.2°C |
| Agua efectiva 3–5 km | — | +1% | — |

**Distancia efectiva**: `distancia_efectiva = distancia_real / peso_tipo_agua`

Un manantial a 1 km con peso 1.0 → distancia efectiva 1 km.
Un río intermitente a 1 km con peso 0 → descartado (peso 0).

---

## 9. Fase 6 — Precipitación Avanzada y Nowcasting

### 9.1 Objetivo

Mejorar la estimación de lluvia local mediante corrección orográfica (barlovento/sotavento), nowcasting a 2 horas con Open-Meteo minutely, detección de tormentas con Blitzortung y corrección por pluviómetros de miniestaciones.

### 9.2 Archivos

```
src/services/orographicService.ts        ← ajuste orográfico
src/services/nowcastService.ts           ← nowcasting avanzado
src/services/precipCorrectionService.ts  ← corrección por miniestaciones
src/app/api/weather/nowcast/route.ts     ← endpoint
```

### 9.3 Ajuste Orográfico

**Datos de entrada**:

- Dirección del viento (grados meteorológicos: de dónde viene).
- Orientación de la ladera (`ReliefData.aspectDeg`).
- Pendiente (`ReliefData.slopePct`).

**Clasificación**:

```txt
α = |windDir - aspectDeg| (diferencia angular, 0–180)
α ≤ 45°:  barlovento (la ladera enfrenta el viento)
α ≥ 135°: sotavento (la ladera está protegida)
resto:    neutro
```

**Factores de precipitación**:

```txt
slopeWeight = min(1.0, slopePct / 25)

Barlovento:
  intensidad = (1 - α/45) × slopeWeight × windFactor
  factor = 1.0 + intensidad × 0.4       [1.00 – 1.40]

Sotavento:
  intensidad = ((α-135)/45) × slopeWeight × windFactor
  factor = 1.0 - intensidad × 0.35      [0.65 – 1.00]

Neutro:
  factor = 1.0
```

**Integración**: el factor orográfico se aplica a la precipitación fusionada en `layerObservation.ts` y a cada localidad en `comarcaService.ts`. Se expone en el payload como `orographic: { factor, classification, description }`.

### 9.4 Nowcasting Avanzado

**Fuentes**:

- Open-Meteo `minutely_15=precipitation`: 8 intervalos de 15 min (próximas 2h).
- Blitzortung (WebSocket): detección de rayos en tiempo real.

**Datos calculados** (`NowcastData`):

| Campo | Descripción |
|-------|-------------|
| `intervals[]` | 8 intervalos de 15 min con `time` y `precipMm` |
| `totalPrecipNext2h` | Precipitación acumulada estimada (mm) |
| `maxIntensityMm` | Intensidad máxima (mm/15min) |
| `minutesToRain` | Minutos hasta primera lluvia >0.1 mm |
| `minutesToEndRain` | Minutos hasta fin de lluvia |
| `trajectory` | Tendencia: `increasing`, `decreasing`, `stable`, `none` |
| `rainApproachingFrom` | Dirección cardinal de procedencia |
| `stormDetected` | True si hay rayos a <30 km |
| `stormDistanceKm` | Distancia a la tormenta más cercana |
| `stormBearing` | Rumbo a la tormenta |
| `level` | `ninguno`, `aviso`, `alerta`, `peligro` |
| `message` | Mensaje descriptivo en español |

**Niveles de alerta**:

```txt
peligro: tormenta <30 km e intensidad >2.0 mm/15min
          O intensidad >4.0 mm/15min
alerta:  intensidad >1.5 mm/15min
          O tormenta próxima sin lluvia intensa
aviso:   intensidad >0.1 mm/15min
ninguno: sin precipitación ni tormenta
```

**Cache**: 8 minutos.

### 9.5 Corrección por Miniestaciones

**Método**:

1. Extraer lecturas de precipitación de miniestaciones en un radio ≤15 km.
2. Ponderar por distancia inversa: `peso = 1 / max(distancia, 0.5)`.
3. Fusionar con el valor del modelo:

```txt
peso_estaciones = min(0.4, n_estaciones × 0.1)
peso_modelo = 1 - peso_estaciones
precip_final = modelo × peso_modelo + media_estaciones × peso_estaciones
```

### 9.6 Endpoint

```txt
GET /api/weather/nowcast?lat=...&lon=...&windDir=...
```

Devuelve `NowcastData` completo.

---

## 10. Fase 7 — Validación Histórica y Aprendizaje

### 10.1 Objetivo

Calcular métricas de rendimiento del modelo sobre datos históricos (MAE, RMSE, bias) y auto-ajustar parámetros del modelo en función de los errores observados.

### 10.2 Archivos

```
src/services/backtestingService.ts      ← cálculo de métricas
src/services/modelParameterService.ts   ← auto-calibración
src/lib/weatherStore.ts                 ← tablas BD
src/app/api/weather/metrics/route.ts    ← endpoint
```

### 10.3 Tablas de Base de Datos

**`model_validation_daily`**:

```sql
id SERIAL PRIMARY KEY
validation_date DATE NOT NULL
source TEXT NOT NULL
variable TEXT NOT NULL
hour_band TEXT NOT NULL DEFAULT 'all'
season TEXT NOT NULL DEFAULT 'all'
mae FLOAT
rmse FLOAT
bias FLOAT
sample_count INT
computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE (validation_date, source, variable, hour_band, season)
```

**`model_parameters`**:

```sql
parameter_key TEXT PRIMARY KEY
value FLOAT NOT NULL
previous_value FLOAT
sample_count INT DEFAULT 0
last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### 10.4 Backtesting

**`runDailyBacktest(date)`**: procesa todas las mediciones de un día desde `source_measurements`, calculando métricas por combinación fuente/variable, desglosadas por:

| Desglose | Valores |
|----------|---------|
| Franja horaria | `madrugada` (<7h), `mañana` (7–12), `mediodía` (12–18), `tarde` (18–21), `noche` (≥21), `all` |
| Estación | `primavera`, `verano`, `otoño`, `invierno`, `all` |

**Métricas**:

```txt
MAE  = Σ|error| / n
RMSE = √( Σ(error²) / n )
Bias = Σ error / n
```

**`runBacktestRange(daysBack)`**: ejecuta backtesting para varios días consecutivos.

### 10.5 Parámetros Auto-Calibrables

| Clave | Default | Descripción |
|-------|:-------:|-------------|
| `reservoir_temp_bias_day` | -0.50 | Sesgo térmico diurno del embalse |
| `reservoir_temp_bias_night` | -0.20 | Sesgo térmico nocturno del embalse |
| `reservoir_dew_bias` | 0.40 | Sesgo de punto de rocío del embalse |
| `night_inversion_valley` | -1.50 | Inversión térmica nocturna en valle |
| `night_inversion_mixed` | -0.50 | Inversión en relieve mixto |
| `altitude_lapse_rate` | 0.006 | Gradiente térmico vertical (°C/m) |
| `wind_factor_valley` | 0.70 | Factor de viento en valle |
| `wind_factor_plateau` | 1.20 | Factor de viento en meseta |
| `orographic_barlovento_max` | 0.40 | Enhancement máximo barlovento |
| `orographic_sotavento_max` | 0.35 | Reducción máxima sotavento |

### 10.6 Lógica de Ajuste

- Si AEMET tiene bias positivo en temperatura → se reduce la corrección del embalse.
- Si AEMET tiene bias en humedad → se ajusta la corrección de punto de rocío.
- Si Open-Meteo tiene bias térmico → se ajusta el gradiente altitudinal.
- Se requiere mínimo 10 muestras para ajustar.
- El ajuste es parcial (30% del bias detectado).
- El valor anterior se guarda en `previous_value` para auditoría.

**Fórmula**:

```txt
nuevo_valor = valor_actual - bias_detectado × 0.3
```

### 10.7 Endpoint de Métricas

```txt
GET /api/weather/metrics              ← auth admin
GET /api/weather/metrics?detail=true  ← incluye histórico día a día
```

**Respuesta**:

```json
{
  "tolerances": { "temperature": 1.2, "humidity": 8.5, ... },
  "measurements": [ { "variable": "temperature", "mae": 1.5, "sampleCount": 42 } ],
  "aggregatedValidation": { "AEMET_temperature_all_all": { ... } },
  "validationHistory": [ ... ],  // solo si detail=true
  "modelParameters": {
    "current": { "reservoir_temp_bias_day": -0.47, ... },
    "defaults": { "reservoir_temp_bias_day": -0.50, ... }
  }
}
```

---

## 11. Fase 8 — Transparencia del Modelo en UI

### 11.1 Objetivo

Que el usuario vea exactamente por qué el dato final difiere de AEMET u Open-Meteo, mostrando todas las correcciones aplicadas, el estado de cada fuente y el diagnóstico de confianza.

### 11.2 Archivos

```
src/components/ModelTransparencyPanel.tsx  ← panel desplegable de correcciones
src/components/NowcastPanel.tsx           ← panel nowcasting
src/components/WeatherDashboard.tsx       ← modificado para integrar ambos
```

### 11.3 ModelTransparencyPanel

Panel desplegable que se activa con un botón "▶ Transparencia del modelo". Muestra para cada fuente:

| Información | Detalle |
|-------------|---------|
| Nombre | AEMET 5051X, Open-Meteo, Miniestación |
| Calidad | Punto verde/ámbar/rojo según `qualityScore` (alta≥0.7, media≥0.4, baja) |
| Antigüedad | "hace X min" |
| Estado | Badge "En vivo" / "Cache fresco" / "Cache" según `retrievalStatus` |
| Temperatura bruta | `rawTemperatureC` |
| Distancia | km al punto objetivo |
| Cota | `elevación_origen → elevación_destino` |
| Corrección total | ±X.XX°C (naranja si sube, azul si baja) |
| Peso espacial | Porcentaje según distancia |

Además:

- **Corrección por embalse**: explica el sesgo del Pantano de San Clemente.
- **Clasificación orográfica**: barlovento/sotavento/neutro con factor y descripción.
- **Confianza**: porcentaje + explicación textual con desglose de penalizaciones.

### 11.4 NowcastPanel

Panel que aparece en la columna derecha cuando hay precipitación o tormenta. Muestra:

- Nivel de alerta con color (verde/amarillo/naranja/rojo).
- Mensaje descriptivo en español.
- Mini-gráfico de barras con 8 intervalos de 15 min.
- Minutos hasta lluvia, acumulado 2h, intensidad máxima.
- Tendencia (↑ aumentando, ↓ disminuyendo, → estable).
- Detección de tormentas con distancia y rumbo (⚡).
- Dirección de procedencia estimada.

### 11.5 Cambios en WeatherDashboard

| Cambio | Antes | Ahora |
|--------|-------|-------|
| Panel de ajustes | `SourceAdjustmentPanel` inline (solo distancia/altitud) | `ModelTransparencyPanel` completo |
| Nowcasting | No visible | `NowcastPanel` en columna derecha |
| Confianza | Solo admin | Todos los usuarios |
| Explicación confianza | No visible | En panel desplegable |
| Temp. bruta por fuente | No visible | En panel desplegable |
| Orografía | No visible | En panel desplegable |
| Calidad/edad por fuente | No visible | En panel desplegable |

### 11.6 Datos Ahora Visibles en UI

| Payload field | Antes | Ahora | Componente |
|---|---|---|---|
| `confidencePct` | Solo admin | Todos | Header + TransparencyPanel |
| `confidenceExplanation` | No visible | Sí | ModelTransparencyPanel |
| `orographic` | No visible | Sí | ModelTransparencyPanel |
| `nowcast` | No visible | Sí | NowcastPanel |
| `sources[].rawTemperatureC` | No visible | Sí | ModelTransparencyPanel |
| `sources[].qualityScore` | No visible | Sí | ModelTransparencyPanel (color dot) |
| `sources[].retrievalStatus` | No visible | Sí | ModelTransparencyPanel (badge) |
| `sources[].dataAgeMinutes` | No visible | Sí | ModelTransparencyPanel |

---

## 12. Fase 9 — Zonas Locales de Huéscar

### 12.1 Objetivo

Estimar condiciones meteorológicas para zonas específicas del término municipal de Huéscar, no solo el casco urbano. Cada zona tiene su propio microclima según su tipo (urbano, vega, secano, monte, embalse).

### 12.2 Archivos

```
src/lib/geo.ts              ← HUESCAR_ZONES
src/services/zoneService.ts ← servicio de estimación
src/app/api/weather/zones/route.ts ← endpoint
src/components/ZonePanel.tsx ← componente UI
src/types/weather.ts        ← ZoneEstimation type
```

### 12.3 Zonas Definidas

| Zona | Tipo | Lat | Lon | Alt (m) | Dist (km) |
|------|:----:|:---:|:---:|:-------:|:---------:|
| Casco urbano | URBAN | 37.8094 | -2.5392 | 953 | 0 |
| Vega del Guadalentín | VEGA | 37.7950 | -2.5350 | 920 | 1.6 |
| El Altiplano Norte | SECANO | 37.8350 | -2.5100 | 1000 | 3.8 |
| Sierra de Huéscar | MONTE | 37.8450 | -2.5800 | 1150 | 5.3 |
| Entorno Pantano San Clemente | RESERVOIR | 37.8608 | -2.6497 | 1095 | 11.3 |
| La Encarnación | VEGA | 37.7850 | -2.5000 | 940 | 4.4 |
| Campos del Este | SECANO | 37.8100 | -2.4900 | 970 | 4.3 |
| Cerro del Castellón | MONTE | 37.8220 | -2.5600 | 1050 | 2.3 |

### 12.4 Tipos de Zona y Ajustes

| Tipo | Temp día | Temp noche | HR | Punto rocío | Factor riego | Refuerzo helada |
|:----:|:--------:|:----------:|:--:|:-----------:|:------------:|:---------------:|
| URBAN | +0.6°C | +1.2°C | -3% | -0.2°C | 1.0 | -0.3 |
| VEGA | -1.0°C | -1.5°C | +8% | +0.6°C | 1.3 | +0.4 |
| SECANO | +0.8°C | -0.5°C | -5% | -0.4°C | 1.5 | +0.2 |
| MONTE | -0.8°C | -1.0°C | +5% | +0.3°C | 0.7 | +0.1 |
| RESERVOIR | -0.5°C | -0.3°C | +4% | +0.4°C | 0.5 | -0.1 |

### 12.5 Método de Estimación

Para cada zona:

1. Obtener Open-Meteo local para delta espacial.
2. Partir de AEMET corregido (o fallback Open-Meteo).
3. Aplicar relieve y microclima local.
4. Aplicar correcciones de vegetación (NDVI/NDWI/agua vía vegetaciónService).
5. Aplicar ajuste orográfico a precipitación.
6. **Aplicar ajuste por tipo de zona** (isla de calor, regadío, etc.).
   - Desplazar punto de rocío según tipo.
   - Recalcular humedad relativa.
7. Calcular riesgo de helada con refuerzo según tipo.
8. Estimar necesidad de riego.

### 12.6 Riesgo de Helada por Zona

```txt
T_ajustada = T + refuerzo_helada × 2

T_ajustada < -4°C → muy_alta
T_ajustada < -1°C → alta
T_ajustada <  2°C → media
resto              → none
```

### 12.7 Necesidad de Riego

```txt
riego_mm = max(0, (T - 5) × 0.08 × factor_necesidad_tipo)
```

Solo se calcula cuando `frostRisk = "none"` y `HR < 50%`.

### 12.8 Resultados Típicos

Ejemplo nocturno de verano (AEMET 24.9°C corregido → 25.2°C fusión Huéscar):

```
Casco urbano:       24.1°C  32% HR  adj +1.2°C  riego 1.5mm
Vega Guadalentín:   21.8°C  51% HR  adj -1.5°C
Altiplano Norte:    21.4°C  34% HR  adj -0.5°C  riego 2mm
Sierra de Huéscar:  20.5°C  51% HR  adj -1.0°C
Pantano S. Clemente: 21.0°C 53% HR  adj -0.3°C
La Encarnación:     21.0°C  53% HR  adj -1.5°C
Campos del Este:    21.7°C  37% HR  adj -0.5°C  riego 2mm
Cerro del Castellón: 21.3°C 46% HR  adj -1.0°C  riego 0.9mm
```

Diferencia térmica máxima: **3.6°C** (casco urbano vs sierra).

---

## 13. Corrección Específica AEMET 5051X por Embalse

### 13.1 Contexto

La estación AEMET 5051X está ubicada a ~278 m del Pantano de San Clemente. El embalse puede hacer que la estación mida:

- Temperatura más baja (enfriamiento por evaporación).
- Humedad más alta (aporte de vapor de agua).

Como Huéscar ciudad está a ~11 km del pantano, es necesario retirar este sesgo antes de trasladar la observación.

### 13.2 Orden Correcto de Correcciones

```txt
1. Lectura bruta AEMET
2. Retirar sesgo del embalse
3. Corregir altitud (1101 m → 953 m)
4. Aplicar microclima (inversión, viento) — SIN re-aplicar altitud
5. Fusionar con otras fuentes
```

**Nota**: Se corrigió un bug donde la altitud se aplicaba dos veces (una en el bloque AEMET y otra en el bucle de microclima). Ahora el microclima recibe `HUESCAR_URBAN_CENTER.elevation` como elevación fuente para AEMET, evitando la duplicación.

### 13.3 Parámetros Actuales

Los parámetros escalan según la distancia real al embalse:

```txt
reservoirInfluence = sqrt(0.48 / distancia_embalse_km)
  limitado entre 0.5 y 1.5
```

Con la distancia real de 0.28 km:

```txt
reservoirInfluence = sqrt(0.48 / 0.28) ≈ 1.31
```

**Sesgos aplicados**:

| Sesgo | Base | Escalado | Efecto |
|-------|:----:|:--------:|--------|
| Temp día | -0.5°C | -0.65°C | La estación lee más fresca de día |
| Temp noche | -0.2°C | -0.26°C | La estación lee más fresca de noche |
| Punto de rocío | +0.4°C | +0.52°C | La estación registra más humedad |

**Eliminación del sesgo**:

```txt
temperatura_sin_embalse = temperatura_bruta - bias_embalse
  (si bias = -0.65: temp_sin = temp_bruta - (-0.65) = temp_bruta + 0.65)

td_estacion = dewPoint(temp_bruta, HR_bruta)
td_sin_embalse = td_estacion - bias_rocio_embalse
HR_sin_embalse = relativeHumidity(temp_sin_embalse, td_sin_embalse)
```

---

## 14. Fusión de Fuentes y Confianza

### 14.1 Pesos Base por Variable

Definidos en `layerObservation.ts`:

| Variable | AEMET | Open-Meteo | Miniestaciones |
|----------|:-----:|:----------:|:--------------:|
| Temperatura | 0.45 | 0.35 | 0.50 |
| Humedad | 0.40 | 0.35 | 0.50 |
| Precipitación | 0.35 | 0.40 | — |
| Viento | 0.35 | 0.40 | — |
| Rachas | 0.35 | 0.40 | — |

### 14.2 Fórmula de Fusión

```txt
valor_fusionado = Σ(valor_fuente × peso_fuente × calidad_fuente)
                  / Σ(peso_fuente × calidad_fuente)
```

Donde `calidad_fuente` incluye: frescura del dato, factor de distancia, calidad de la fuente.

### 14.3 Cálculo de Confianza

`consensusConfidence.ts` implementa un cálculo que penaliza:

- Discrepancias entre fuentes (delta de temperatura, humedad, viento).
- Antigüedad de los datos.
- Calidad de las fuentes.
- Distancia entre fuentes y objetivo.
- Tolerancias calibradas (vía `calibrationService.ts`).

**Tolerancias**: se obtienen de `calibrationService.ts`, que aplica una mezcla Bayesiana entre prior empírico y MAE histórico:

```txt
peso_histórico = sampleCount / (sampleCount + 24)
tolerancia = prior × (1 - peso_histórico) + MAE × peso_histórico
```

Priors por defecto:

| Variable | Prior |
|----------|:-----:|
| temperature | 1.5 |
| humidity | 10.0 |
| precipitation | 1.0 |
| wind | 8.0 |
| gusts | 12.0 |

La confianza puede ser baja incluso con todas las fuentes operativas, si existe una discrepancia real entre AEMET y Open-Meteo.

---

## 15. Cron y Persistencia

### 15.1 Endpoint

```txt
GET /api/cron/weather-capture
Authentication: Bearer <CRON_SECRET>
```

### 15.2 Acciones por Ejecución

| Frecuencia | Acción |
|------------|--------|
| **Siempre** | Capturar observación fusionada y guardar en `consensus_snapshots` |
| **Siempre** | Persistir mediciones por fuente en `source_measurements` |
| **Cada 3h** | Recargar tolerancias calibradas |
| **Cada 3h** | Estimar y guardar datos comarcales (`comarca_estimations`) |
| **Cada 3h** | Calibrar miniestaciones |
| **Cada 3h** | Pre-calcular zonas locales (cachear relieve/vegetación) |
| **02-03h** | Backtesting del día anterior |
| **03h** | Backtesting retroactivo (3 días) + auto-calibración de parámetros |

### 15.3 Inicialización de Base de Datos

Al inicio de cada ejecución del cron se llama `initializeDatabase()`, que ejecuta `CREATE TABLE IF NOT EXISTS` para todas las tablas del sistema. Es seguro ejecutarlo repetidamente.

### 15.4 Archivos

```
src/app/api/cron/weather-capture/route.ts
src/lib/weatherStore.ts
src/services/cronAuth.ts
src/services/layerComarca.ts
```

---

## 16. Base de Datos

### 16.1 Conexiones

- **Principal** (Neon): `DATABASE_URL` en `.env.local`.
- **Miniestaciones** (Neon): `STATIONS_DATABASE_URL` en `.env.local`.

Ambas son PostgreSQL vía `@neondatabase/serverless`.

### 16.2 Tablas (Esquema Completo)

**`consensus_snapshots`** — instantáneas del dato fusionado:

```sql
consensus_time TIMESTAMPTZ PRIMARY KEY
confidence FLOAT
estimate_json JSONB
explanation TEXT
```

**`source_measurements`** — mediciones por fuente y variable:

```sql
id SERIAL PRIMARY KEY
snapshot_id TIMESTAMPTZ REFERENCES consensus_snapshots(consensus_time)
source TEXT
variable TEXT
value FLOAT
reference_value FLOAT
error FLOAT
absolute_error FLOAT
squared_error FLOAT
```

**`forecast_predictions`** — predicciones vs observaciones:

```sql
id SERIAL PRIMARY KEY
source TEXT
issued_at TIMESTAMPTZ
valid_for TIMESTAMPTZ
lead_hours INT
variable TEXT
predicted_value FLOAT
observed_value FLOAT
error FLOAT
```

**`latest_source_observations`** — última observación por fuente:

```sql
source TEXT PRIMARY KEY
observation JSONB
```

**`external_calibration_measurements`** — calibraciones externas:

```sql
source TEXT
observation_date DATE
variable TEXT
observed_value FLOAT
predicted_value FLOAT
error FLOAT
absolute_error FLOAT
squared_error FLOAT
PRIMARY KEY (source, observation_date, variable)
```

**`comarca_estimations`** — datos comarcales por fecha:

```sql
reference_date DATE PRIMARY KEY
payload JSONB
```

**`location_profiles`** — perfiles geográficos:

```sql
location_id TEXT
version TEXT
is_active BOOLEAN DEFAULT true
payload JSONB
generated_at TIMESTAMPTZ
PRIMARY KEY (location_id, version)
```

**`station_calibrations`** — bias por estación:

```sql
station_id TEXT NOT NULL
variable TEXT NOT NULL
bias FLOAT NOT NULL DEFAULT 0
sample_count INT NOT NULL DEFAULT 0
last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
PRIMARY KEY (station_id, variable)
```

**`station_comparisons`** — comparaciones individuales:

```sql
id SERIAL PRIMARY KEY
station_id TEXT NOT NULL
measured_at TIMESTAMPTZ NOT NULL
variable TEXT NOT NULL
station_value FLOAT
reference_value FLOAT
error FLOAT
absolute_error FLOAT
```

**`model_validation_daily`** — métricas de validación diarias:

```sql
id SERIAL PRIMARY KEY
validation_date DATE NOT NULL
source TEXT NOT NULL
variable TEXT NOT NULL
hour_band TEXT NOT NULL DEFAULT 'all'
season TEXT NOT NULL DEFAULT 'all'
mae FLOAT
rmse FLOAT
bias FLOAT
sample_count INT
computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
UNIQUE (validation_date, source, variable, hour_band, season)
```

**`model_parameters`** — parámetros auto-calibrados:

```sql
parameter_key TEXT PRIMARY KEY
value FLOAT NOT NULL
previous_value FLOAT
sample_count INT DEFAULT 0
last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

---

## 17. API Completa

### 17.1 Endpoints Meteorológicos

| Endpoint | Descripción | Cache | Auth |
|----------|-------------|-------|:----:|
| `GET /api/weather/current` | Dato fusionado actual + nowcast + orografía + radar + rayos | 60s público | No |
| `GET /api/weather/comarca` | Estimaciones comarcales (7 localidades) | 120s | No |
| `GET /api/weather/zones` | Zonas locales de Huéscar (8 zonas) | 120s | No |
| `GET /api/weather/nowcast?lat=&lon=&windDir=` | Nowcasting 0-2h | 8 min | No |
| `GET /api/weather/radar?lat=&lon=` | Radar AEMET + nowcasting básico | 8 min | No |
| `GET /api/weather/lightning` | Rayos Blitzortung | 2 min | No |
| `GET /api/weather/stations` | Miniestaciones locales | No | No |
| `GET /api/weather/avisos` | Avisos AEMET | Variable | No |

### 17.2 Endpoints de Gestión

| Endpoint | Descripción | Auth |
|----------|-------------|:----:|
| `GET /api/cron/weather-capture` | Captura y persistencia periódica | Bearer CRON_SECRET |
| `GET /api/weather/metrics?detail=true` | Métricas de validación | Admin session |
| `GET /api/admin/login` | Login admin | POST |
| `POST /api/admin/login` | Login admin | Form data |
| `POST /api/admin/logout` | Logout admin | Admin session |
| `GET /api/admin/overview` | Estado del sistema | Admin session |
| `GET /api/admin/force-refresh` | Forzar refresh | Admin session |

### 17.3 Páginas

| Ruta | Descripción | Variante |
|------|-------------|----------|
| `/meteo` | Dashboard público | neutral |
| `/widget` | Widget ayuntamiento (iframe) | ayto |
| `/admin` | Consola de administración | dark |
| `/admin/login` | Login admin | — |

---

## 18. Componentes UI

### 18.1 WeatherDashboard

**Ruta**: `src/components/WeatherDashboard.tsx`

Componente principal del dashboard. Soporta dos variantes visuales mediante la prop `variant`:

- `neutral` (público): fondos slate, texto slate.
- `ayto` (ayuntamiento): fondo blanco, texto azul marino `#1B3668`, bordes crema `#e8e4d8`.

**Funcionalidades**:

- Fondo dinámico según tiempo (noche, tormenta, lluvia, calor, helada, templado).
- Panel principal: emoji WMO, temperatura coloreada, 8 métricas (sensación, humedad, precipitación, radiación, viento, ráfagas, ET0).
- Gráfico de temperatura Chart.js (hourly + daily max/min).
- Tabla horaria (últimas 24h).
- Tarjetas diarias (7 días).
- Alertas colapsables.
- Paneles incrustados: `WeatherStationPanel`, `ZonePanel`, `RadarPanel`, `NowcastPanel`, `LightningPanel`, `AgriculturalSection`, `LivestockSection`.

### 18.2 Subcomponentes

| Componente | Archivo | Función |
|------------|---------|---------|
| `SourceDot` | WeatherDashboard (inline) | Punto de estado OK/DEGRADED/ERROR |
| `SeverityBadge` | WeatherDashboard (inline) | Badge de nivel de alerta |
| `SourceHealthRow` | WeatherDashboard (inline) | Indicadores de salud de fuentes |
| `AlertDropdown` | WeatherDashboard (inline) | Alertas colapsables |
| `LightningPanel` | WeatherDashboard (inline) | Datos de rayos |
| `AgriculturalSection` | WeatherDashboard (inline) | ET0, GDD, horas frío, helada, riego, plagas |
| `LivestockSection` | WeatherDashboard (inline) | Índice THI |
| `HourlyTable` | WeatherDashboard (inline) | Tabla horaria 24h |
| `DailyCards` | WeatherDashboard (inline) | Pronóstico 7 días |
| `TemperatureChart` | WeatherDashboard (inline) | Gráfico Chart.js |
| `LegendBadge` | WeatherDashboard (inline) | Punto de leyenda |
| `WeatherStationPanel` | Componente separado | Miniestaciones |
| `RadarPanel` | Componente separado | Radar AEMET |
| `NowcastPanel` | Componente separado | Nowcasting visual |
| `ModelTransparencyPanel` | Componente separado | Correcciones detalladas |
| `ZonePanel` | Componente separado | Zonas locales |
| `AdminConsole` | Componente separado | Consola de administración |

---

## 19. Configuración y Variables de Entorno

### 19.1 Archivo `.env.local`

```env
# AEMET
AEMET_API_KEY=...

# Open-Meteo (no requiere clave)

# Sentinel Hub / CDSE
SENTINEL_HUB_CLIENT_ID=sh-...
SENTINEL_HUB_CLIENT_SECRET=...

# Neon database (principal)
DATABASE_URL=postgresql://...

# Neon database (miniestaciones)
STATIONS_DATABASE_URL=postgresql://...

# Admin session
ADMIN_SESSION_SECRET=...

# Cron auth
CRON_SECRET=...
```

### 19.2 Archivo `.env.example`

Contiene placeholders seguros versionados en Git.

### 19.3 Archivo `.gitignore`

Ignora: `.env.local`, `.next/`, `node_modules/`, `*.tsbuildinfo`, etc.

---

## 20. Despliegue

### 20.1 Requisitos

- Node.js 22+
- PostgreSQL (Neon)
- Credenciales AEMET, CDSE (Sentinel Hub)

### 20.2 Build

```bash
npx next build
```

Build actual: exitoso (todas las rutas compiladas sin errores).

### 20.3 Desarrollo

```bash
npx next dev --port 3358
```

### 20.4 Rutas del Build

```
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

○  /                          → landing page
○  /meteo                     → dashboard público
○  /widget                    → widget ayuntamiento
○  /admin                     → admin console
○  /admin/login               → admin login
ƒ  /api/admin/force-refresh
ƒ  /api/admin/login
ƒ  /api/admin/logout
ƒ  /api/admin/overview
ƒ  /api/cron/weather-capture
ƒ  /api/weather/avisos
ƒ  /api/weather/comarca
ƒ  /api/weather/current
ƒ  /api/weather/geographic-profiles
ƒ  /api/weather/lightning
ƒ  /api/weather/metrics
ƒ  /api/weather/nowcast
ƒ  /api/weather/radar
ƒ  /api/weather/stations
ƒ  /api/weather/zones
```

---

## 21. Limitaciones Conocidas

### 21.1 Modelo

- Los parámetros del embalse son empíricos y se calibran progresivamente con datos históricos.
- La inversión térmica usa reglas simples (valle + noche + viento bajo); no incorpora nubosidad ni radiación de forma explícita.
- La rejilla de elevación 3×3 es relativamente gruesa (~4 km entre puntos).
- El viento no canaliza dirección por eje real de valle, solo ajusta velocidad mediante factores.
- La precipitación orográfica depende de la dirección del viento, pero no modela convección ni fenómenos locales complejos.

### 21.2 Datos

- La vegetación (NDVI/NDWI) puede tener lagunas por nubes o mosaicos incompletos.
- OSM puede tener errores, omisiones o representaciones incompletas de la hidrografía local.
- Blitzortung puede no detectar todos los rayos (depende de la red de sensores).
- El radar de AEMET no siempre está disponible; el nowcasting usa Open-Meteo como alternativa.

### 21.3 Sistema

- Las tablas de base de datos se crean con `CREATE TABLE IF NOT EXISTS` en cada ejecución del cron (inocuo pero no óptimo).
- La caché en memoria (`inMemoryCache.ts`) se pierde al reiniciar el servidor.
- No hay autenticación en los endpoints públicos (por diseño).

---

## Resumen de Capacidades

El modelo microclimático completo (fases 1–9) puede estimar condiciones para:

| Ámbito | Cantidad | Detalle |
|--------|:--------:|---------|
| Punto global | 1 | Huéscar ciudad (fusión AEMET + OM + miniestaciones) |
| Localidades comarcales | 7 | Castril, Castilléjar, Galera, Orce, Puebla DF, Hinojosa |
| Zonas locales | 8 | Casco urbano, vegas, secanos, montes, embalse |
| Nowcasting | 2h | 8 intervalos de 15 min + tormentas |
| Parámetros auto-calibrados | 12 | Embalse, altitud, inversión, viento, orografía |
| Fuentes de datos | 3 | AEMET 5051X, Open-Meteo, miniestaciones |
| Endpoints API | 13 | meteorológicos + gestión |
| Tablas BD | 11 | snapshots, mediciones, calibraciones, validación |
| Componentes UI | 7 | dashboard, estaciones, radar, nowcast, transparencia, zonas, admin |
