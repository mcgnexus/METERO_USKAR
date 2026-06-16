# Análisis PROFUNDO de degradación de AEMET (con evidencia empírica)

> Fecha: 2026-06-16
> Método: lectura de código + llamadas reales a la API de AEMET + medición de tiempos

---

## Evidencia empírica

### 1. Tiempos de respuesta reales

```
Llamada 1 (metadata): 692 ms    → HTTP 200
Llamada 2 (datos):    334 ms    → HTTP 200
Total por petición:  ~1.026 ms
```

**Conclusión**: La API NO es lenta. Responde en 300-700 ms por llamada. El timeout de 4s (`AEMET_TIMEOUT_MS=4000` en `.env.local`) es más que suficiente.

### 2. Rate limit (429)

```
ráfaga de 15 llamadas sin delay → 15/2 HTTP 200 ✓
ráfaga de 8 llamadas tras uso intenso → 8/8 HTTP 429 ✗
tras 90s de espera → 10/10 llamadas a 1/seg → 10/10 HTTP 200 ✓
ráfaga de 15 tras reset → 15/15 HTTP 200 ✓
```

**Conclusión**: El rate limit permite ~15 llamadas en ráfaga. Si se excede, bloquea durante ~60s. No es tan restrictivo como se suponía.

### 3. Antigüedad real del dato

```
UTC actual:     2026-06-16T06:23:28Z
Último dato:    2026-06-16T05:00:00+0000  (temp=15.7°C, hr=64%)
Antigüedad:     83 minutos
```

La estación 5051X publica datos a las `:00` UTC de cada hora. Hay un retraso de procesamiento de ~20-30 min antes de que el dato esté disponible vía API.

**Por tanto, el dato más reciente disponible tiene SIEMPRE entre 20 y 90 minutos de antigüedad.**

### 4. qualityScore simulado por antigüedad

```
age= 0 min: qs=1.000
age=30 min: qs=1.000  (penalización empieza a los 30 min)
age=45 min: qs=0.925
age=60 min: qs=0.850
age=75 min: qs=0.775  ← antigüedad típica del dato AEMET
age=83 min: qs=0.738  ← antigüedad real medida hoy
age=90 min: qs=0.700
age=120 min: qs=0.550
age=150 min: qs=0.400
```

Y si entra por caché obsoleta (`reduceQuality`):
```
age= 0 min: qs=0.600  (reduceQuality resta 0.4)
age=45 min: qs=0.525
age=75 min: qs=0.375
age=83 min: qs=0.338  ← caso real con stale cache
age=120 min: qs=0.150
```

---

## Causas raíz REALES (revisadas con evidencia)

### 🔴 R1 — El dato es horario, pero el qualityScore lo penaliza como si fuera "en tiempo real"

**Esta es la causa #1 de la degradación percibida.**

El endpoint `/observacion/convencional/datos/estacion/5051X` publica a las `:00` UTC. El dato más reciente disponible tiene **siempre 20-90 min** de antigüedad. Pero el `qualityScore` empieza a penalizar a los 30 min:

```typescript
// aemetClient.ts:91
const dynamicQualityScore = Math.max(0.3, 1.0 - Math.max(0, ageMinutes - 30) / 200);
```

Con la antigüedad típica de 60-90 min:
- qs = 0.70 - 0.85 (antes de reduceQuality)
- qs = 0.30 - 0.45 (si entra por stale cache con reduceQuality)

Esto hace que AEMET aparezca sistemáticamente con menor calidad que Open-Meteo (que tiene datos del minuto actual), **incluso cuando la API funciona perfectamente**.

La UI muestra "dato antiguo" (>60 min) para AEMET en la mayoría de casos, simplemente porque la naturaleza del endpoint es horaria.

### 🔴 R2 — reduceQuality() resta 0.4 fijos sin importar la causa

**Archivo**: `aemetClient.ts:131-140`

```typescript
qualityScore: Math.max(0.05, Math.round((obs.qualityScore - 0.4) * 100) / 100),
```

Cuando los datos se sirven desde caché obsoleta (stale, TTL 4h), se resta 0.4 al qualityScore. Esto es agresivo:

- Un dato de 45 min con qs=0.925 → stale: qs=0.525 (casi la mitad)
- Un dato de 75 min con qs=0.775 → stale: qs=0.375

La penalización de 0.4 es arbitraria y no tiene en cuenta que para un endpoint horario, un dato de 75 min puede ser perfectamente válido.

### 🟡 R3 — 4 variables de entorno definidas pero IGNORADAS por el código

`.env.local` define:
```
AEMET_CACHE_MAX_AGE_MINUTES=240        ← NO USADA por el código
AEMET_REFRESH_INTERVAL_MS=900000        ← NO USADA por el código
AEMET_FAILURE_COOLDOWN_MS=600000        ← NO USADA (código usa hardcoded 300000 = 5 min)
AEMET_RATE_LIMIT_COOLDOWN_MS=900000     ← NO USADA (código usa hardcoded 60000 = 1 min)
```

El código tiene:
```typescript
const COOLDOWN_TTL_MS = 5 * 60 * 1000;           // hardcoded, ignora .env
const RATE_LIMIT_COOLDOWN_TTL_MS = 60 * 1000;     // hardcoded, ignora .env
```

**El usuario configuró cooldowns de 10 y 15 minutos, pero el código aplica 5 min y 1 min.**

Tras un 429, el código espera solo 1 minuto (en lugar de 15) y reintenta. Si el rate limit aún está activo, recibe otro 429, activa otro cooldown de 1 min, y entra en un ciclo de 429s repetidos.

### 🟡 R4 — La caché fresca tiene TTL insuficiente para datos horarios

Antes de mi corrección: TTL fresco = 5 min. Tras mi corrección: 60 min.

Pero hay una tensión: con TTL de 60 min, para el final del periodo el dato puede tener 60+83 = 143 min. El `dataAgeMinutes` se recalcula en cada petición:

```typescript
// layerObservation.ts:377
aemetObs.dataAgeMinutes = (Date.now() - new Date(aemetObs.time).getTime()) / 60000;
```

Esto significa que aunque el dato se sirva desde caché fresca, la edad mostrada aumenta continuamente. A los 60 min de caché + 83 min de antigüedad original = 143 min mostrados en la UI.

### 🟢 R5 — Rate limit (429) no es la causa principal

**Evidencia**: La API permite ~15 llamadas en ráfaga antes de bloquear. La app hace:
- 2 llamadas por fetch de observaciones (con caché de 60 min → 2 llamadas/hora)
- 2 llamadas por fetch de avisos (caché 5 min → ~24 llamadas/hora)
- 2 llamadas por fetch de radar (caché 8 min → ~15 llamadas/hora)
- Total: ~41 llamadas/hora = ~0.7/min

Esto está muy por debajo del límite. El 429 solo aparece si hay múltiples instancias serverless con cachés frías simultáneas, o si se hacen pruebas manuales rápidas.

### 🟢 R6 — El timeout NO es un problema

**Evidencia**: Respuestas en 300-700ms. El timeout de 4s del `.env.local` es 6-13x mayor que el tiempo real. El timeout de la capa (30s tras mi corrección) es aún más generoso.

---

## Consumidores de AEMET (mapa completo)

| Consumidor | Endpoint | Llamadas HTTP | TTL caché | Frecuencia real |
|---|---|---|---|---|
| `aemetClient.ts` | `/observacion/convencional/datos/estacion/5051X` | 2 (meta+datos) | 60 min | ~2/hora |
| `aemetWarningsService.ts` | `/avisos_cap/ultimos` | 2 (meta+datos) | 5 min | ~24/hora |
| `radar/image/route.ts` | `/red/radar/regional/am` | 2 (meta+imagen) | 8 min | ~15/hora |
| `layerComarca.ts` | reutiliza `fetchAEMETObservations()` | 0 (si caché caliente) | — | — |

**Total estimado**: ~41 llamadas/hora a AEMET = 0.7/min (bien dentro del límite)

---

## Por qué parece que AEMET "se degrada constantemente"

El ciclo real NO es un problema de conectividad API. Es un problema de **scoring y presentación**:

```
1. AEMET publica dato a las :00 UTC
2. El dato está disponible vía API a las :20-:30 UTC (procesamiento interno)
3. La app lo obtiene → antigüedad = 20-30 min → qs ≈ 1.0 ✓
4. Pasan 30 min más → antigüedad = 50-60 min → qs baja a 0.85
5. La UI muestra "hace 50 min" → parece acceptable
6. Pasan 30 min más → antigüedad = 80-90 min → qs baja a 0.70-0.77
7. La UI muestra "dato antiguo" (>60 min) ← AQUÍ PARECE DEGRADADO
8. A los 60 min de caché → fresh cache expira → reintenta AEMET
9. Obtiene nuevo dato horario → antigüedad reset a 20-30 min → qs ≈ 1.0
10. El ciclo se repite
```

**Resultado**: Durante 30-40 minutos de cada hora, AEMET aparece como "dato antiguo" en la UI, aunque el dato sea el más reciente disponible y la API funcione perfectamente.

---

## Soluciones recomendadas (priorizadas)

### Prioridad ALTA

1. **Ajustar qualityScore para endpoint horario** (R1)
   - La penalización por antigüedad debería empezar a los 60 min, no a los 30
   - El mínimo debería ser 0.5, no 0.3
   - Fórmula propuesta: `Math.max(0.5, 1.0 - Math.max(0, ageMinutes - 60) / 240)`

2. **Leer las variables de entorno de cooldown** (R3)
   - `COOLDOWN_TTL_MS` debe leer `AEMET_FAILURE_COOLDOWN_MS` del env
   - `RATE_LIMIT_COOLDOWN_TTL_MS` debe leer `AEMET_RATE_LIMIT_COOLDOWN_MS` del env

3. **Ajustar reduceQuality** (R2)
   - Restar 0.2 en lugar de 0.4
   - O basarlo en antigüedad: si >120 min, restar 0.4; si 60-120 min, restar 0.2

### Prioridad MEDIA

4. **Mejorar las etiquetas de la UI** (R4)
   - "dato horario" (en lugar de "dato antiguo") cuando la antigüedad es 60-90 min y es la hora actual
   - "dato antiguo" solo cuando >120 min (realmente obsoleto)
   - Mostrar "última actualización AEMET: HH:00" para dar contexto

5. **Diferenciar freshness de AEMET vs Open-Meteo en la UI**
   - Open-Meteo: dato del minuto actual
   - AEMET: dato horario (publicación a :00 UTC)
   - No deberían usar el mismo criterio de "en vivo" vs "antiguo"

### Prioridad BAJA

6. **Aumentar TTL de warnings a 30 min** (reduce llamadas a AEMET de 24/hora a 4/hora)

7. **Añadir logging estructurado** para monitorizar patrones reales de éxito/fallo
