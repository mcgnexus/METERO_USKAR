# Documentacion de Implementacion del Modelo Microclimatico

Este documento describe la implementacion real del modelo microclimatico de METERO USKAR, organizada por fases de la 1 a la 5. Complementa el plan conceptual definido en `PLAN_MODELO_MICROCLIMATICO.md` y documenta las decisiones tecnicas, formulas, servicios, endpoints y limitaciones actuales.

## Objetivo General

El objetivo del modelo es transformar datos meteorologicos de varias fuentes en una estimacion local para Huescar ciudad y su comarca. El sistema no copia directamente una fuente, sino que aplica correcciones geograficas y microclimaticas antes de fusionar los datos.

El modelo tiene en cuenta:

- Estacion oficial AEMET 5051X.
- Open-Meteo como campo meteorologico espacial continuo.
- Miniestaciones propias.
- Distancia entre fuente y punto objetivo.
- Diferencia de altitud.
- Relieve local.
- Inversion termica nocturna.
- Viento y exposicion.
- Vegetacion, humedad superficial y masas de agua.
- Bias historico de miniestaciones.

## Punto Objetivo Principal

El punto objetivo principal es Huescar ciudad:

```txt
Latitud: 37.8094
Longitud: -2.5392
Altitud: 953 m
```

La estacion AEMET oficial usada es exclusivamente la 5051X:

```txt
ID: 5051X
Latitud: 37.861389
Longitud: -2.652778
Altitud: 1101 m
Distancia a Huescar ciudad: ~11.5 km
```

Tambien se modela su proximidad al Pantano de San Clemente:

```txt
Pantano de San Clemente
Latitud: 37.860763009894654
Longitud: -2.6497118917245626
Distancia a AEMET 5051X: ~278 m
```

## Arquitectura General

El flujo principal se implementa en `src/services/layerObservation.ts`:

1. Obtener observacion AEMET 5051X.
2. Obtener observacion/forecast actual de Open-Meteo.
3. Obtener miniestaciones locales.
4. Corregir cada fuente segun su contexto geografico.
5. Aplicar microclima local.
6. Fusionar fuentes ponderadas.
7. Calcular confianza.
8. Persistir observaciones cuando se ejecuta el cron.

Endpoints principales:

- `GET /api/weather/current`: dato actual fusionado.
- `GET /api/weather/comarca`: estimaciones por localidades de la comarca.
- `GET /api/weather/stations`: miniestaciones.
- `GET /api/cron/weather-capture`: captura periodica y persistencia.

## Fase 1: Microclima Basico

### Estado

Implementada.

### Objetivo

Aplicar las primeras correcciones fisicas necesarias para que una fuente externa pueda representar mejor Huescar ciudad.

### Componentes

- `src/services/altitudeCorrection.ts`
- `src/services/correctionService.ts`
- `src/lib/dewPoint.ts`
- `src/services/layerObservation.ts`
- `src/services/consensusConfidence.ts`

### Correccion por Altitud

La temperatura se corrige con un gradiente vertical aproximado de 0.006 grados por metro:

```txt
correccion_altitud = (elevacion_fuente - elevacion_objetivo) * 0.006
```

Para AEMET 5051X hacia Huescar ciudad:

```txt
1101 m - 953 m = 148 m
148 * 0.006 = +0.888 C
```

Como la estacion esta mas alta que Huescar ciudad, al trasladar la lectura al casco urbano la temperatura estimada sube.

### Peso por Distancia

La distancia no cambia directamente la temperatura, sino la confianza/peso de la fuente.

Funcion actual:

```txt
<= 2 km: factor 1.00
2-5 km: baja gradualmente hasta minimo 0.85
> 5 km: baja gradualmente hasta minimo 0.65
```

AEMET 5051X esta a unos 11.5 km de Huescar ciudad, por lo que su peso se reduce, pero no se descarta porque es la estacion oficial mas relevante.

### Humedad con Punto de Rocio

La humedad relativa no se corrige sumando/restando porcentajes de forma directa salvo ajustes secundarios muy localizados. La base fisica es:

1. Calcular punto de rocio desde temperatura y humedad relativa.
2. Ajustar temperatura o punto de rocio si procede.
3. Recalcular humedad relativa.

Funciones:

- `dewPoint(tempC, rhPct)`
- `relativeHumidity(tempC, dewPointC)`
- `correctHumidityByElevation(...)`

Esto evita incoherencias como subir temperatura sin modificar correctamente la humedad relativa resultante.

### Correccion de Viento Basica

El viento se ajusta mediante factores de exposicion en `correctionService.ts`, usando informacion de relieve cuando esta disponible.

## Fase 2: Relieve

### Estado

Implementada.

### Objetivo

Clasificar el contexto topografico local para aplicar ajustes de inversion termica, exposicion y viento.

### Componentes

- `src/services/reliefService.ts`
- `src/services/correctionService.ts`

### Datos Usados

Se consulta la API de elevacion de Open-Meteo para construir una rejilla 3x3 alrededor del punto objetivo.

Parametros relevantes:

```txt
GRID_SPACING = 0.036 grados
Cache relieve = 7 dias
```

Para cada punto se calcula:

- Elevacion central.
- Elevacion minima.
- Elevacion maxima.
- Rango de elevacion.
- Exposicion de valle.
- Pendiente aproximada.
- Orientacion aproximada.
- Tipo de microclima.

### Clasificacion Microclimatica

Tipos actuales:

- `VALLEY`: fondo o zona con comportamiento de valle.
- `PIEDMONT`: piedemonte o zona con gran rango altitudinal alrededor.
- `EXPOSED_PLATEAU`: zona expuesta/meseta.
- `MIXED_RELIEF`: relieve mixto.

### Inversion Termica Nocturna

La inversion se aplica si:

- Es de noche.
- El viento es bajo.
- El punto esta clasificado como valle o relieve mixto.

Reglas actuales:

```txt
VALLEY + noche + viento <= 5 km/h: -1.5 C
MIXED_RELIEF + noche + viento <= 5 km/h: -0.5 C
Resto: 0 C
```

### Factor de Viento

Factores actuales:

```txt
EXPOSED_PLATEAU: 1.2
PIEDMONT: 1.0
VALLEY: 0.7
MIXED_RELIEF: 0.9
```

## Fase 3: Miniestaciones Calibradas

### Estado

Implementada.

### Objetivo

Usar miniestaciones propias sin asumir que todas miden perfectamente. Cada estacion puede aprender un bias individual comparandose contra una referencia.

### Componentes

- `src/services/stationService.ts`
- `src/services/stationCalibration.ts`
- `src/lib/weatherStore.ts`
- `src/components/WeatherStationPanel.tsx`

### Tablas de Base de Datos

El sistema usa tablas para:

- Lecturas de miniestaciones.
- Comparaciones estacion vs referencia.
- Calibraciones por estacion y variable.

Tablas principales relacionadas:

- `station_comparisons`
- `station_calibrations`

### Flujo de Calibracion

1. Se obtienen lecturas recientes de miniestaciones.
2. Se comparan contra la referencia AEMET corregida.
3. Se guarda el error por variable.
4. Si hay al menos 5 muestras recientes, se calcula bias medio.
5. Si el bias supera 0.3 unidades, se guarda calibracion.
6. En lecturas posteriores se aplica la correccion individual.

Formula:

```txt
bias = media(observacion_estacion - referencia)
valor_corregido = valor_estacion - bias
```

Variables calibradas actualmente:

- Temperatura.
- Humedad.

### Cache

Los bias se cachean durante 30 minutos para evitar consultas repetidas.

## Fase 4: Modelo Comarcal

### Estado

Implementada.

### Objetivo

Extender el modelo fuera de Huescar ciudad y generar estimaciones para localidades de la comarca.

### Componentes

- `src/services/comarcaService.ts`
- `src/app/api/weather/comarca/route.ts`
- `src/lib/geo.ts`

### Localidades Incluidas

Actualmente se estiman:

- Huescar.
- Castril.
- Castillejar.
- Galera.
- Orce.
- Puebla de Don Fadrique.
- La Hinojosa.

### Metodo

Para cada localidad:

1. Se obtiene Open-Meteo local.
2. Se obtiene Open-Meteo para el punto ancla de Huescar.
3. Se calcula delta espacial entre ambos.
4. Se parte de AEMET corregido si esta disponible.
5. Se suma el delta espacial de Open-Meteo.
6. Se aplica relieve local.
7. Se aplica vegetacion/agua si hay datos.
8. Se calcula confianza.

Formula simplificada:

```txt
base_local = AEMET_Huescar_corregido + (OpenMeteo_local - OpenMeteo_Huescar)
final_local = base_local + correcciones_relieve + correcciones_vegetacion
```

Si AEMET no esta disponible, el modelo usa Open-Meteo local como fallback.

### Confianza Comarcal

La confianza depende de:

- Antiguedad del dato AEMET.
- Distancia al punto ancla.
- Disponibilidad de relieve.
- Disponibilidad de forecast.

Rango actual:

```txt
minimo 25%
maximo 92%
```

## Fase 5: Vegetacion, Suelo y Agua

### Estado

Implementada.

### Objetivo

Incorporar informacion de vegetacion, humedad superficial y masas de agua para ajustar temperatura y humedad local.

### Componentes

- `src/services/sentinelService.ts`
- `src/services/osmService.ts`
- `src/services/vegetationService.ts`
- `src/services/comarcaService.ts`

### Sentinel/CDSE

Se usa Copernicus Data Space Ecosystem con Sentinel-2 L2A.

Autenticacion:

```txt
https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
```

Statistics API:

```txt
https://sh.dataspace.copernicus.eu/api/v1/statistics
```

Indices calculados:

- NDVI: vegetacion.
- NDWI: humedad/agua superficial.

Ventana temporal:

```txt
Ultimos 30 dias
Agregacion cada 10 dias
Cache indices = 7 dias
```

Clasificacion NDVI:

```txt
NDVI > 0.6: densa
NDVI > 0.4: moderada
NDVI > 0.2: escasa
resto: desnuda
```

### OpenStreetMap / Overpass

Se consulta Overpass para masas de agua, cauces y manantiales cercanos.

Radio por defecto:

```txt
5000 m
```

Cache:

```txt
30 dias
```

Se anaden manualmente elementos relevantes que OSM puede no representar bien:

- Fuencaliente.
- Pantano de San Clemente.

### Filtrado de Cauces Secos

Para evitar que ramblas, barrancos o rios normalmente secos inflen artificialmente la humedad:

- `stream`, `barranco`, `arroyo`: peso 0.
- `ditch`: peso bajo o 0 si no consta agua permanente.
- Rio Huescar: peso degradado a 0.1.
- Manantiales: peso 1.0.
- Embalses: peso 0.9.

### Correcciones por Vegetacion y Agua

Reglas actuales en `vegetationService.ts`:

```txt
NDVI > 0.6: -0.5 C, +0.3 C punto de rocio
NDVI > 0.4: -0.3 C, +0.2 C punto de rocio
NDVI < 0.15: +0.4 C, -0.2 C punto de rocio
NDWI > 0: -0.2 C, +0.2 C punto de rocio
Agua efectiva < 1 km: -0.3 C, +4% HR, +0.5 C punto de rocio
Agua efectiva < 3 km: +2% HR, +0.2 C punto de rocio
Agua efectiva < 5 km: +1% HR
```

La distancia efectiva se calcula asi:

```txt
distancia_efectiva = distancia_real / peso_tipo_agua
```

## Correccion Especifica AEMET 5051X por Embalse

### Estado

Implementada.

### Motivo

La estacion AEMET 5051X esta muy cerca del Pantano de San Clemente, a unos 278 m. Esto puede hacer que mida:

- Temperatura algo mas baja que el entorno seco equivalente.
- Humedad algo mas alta.

Como Huescar ciudad esta a unos 11 km del pantano, se retira ese sesgo antes de trasladar la observacion al casco urbano.

### Orden Correcto de Correcciones

El orden actual es:

```txt
lectura_bruta_AEMET
-> retirar sesgo del embalse
-> corregir altitud AEMET -> Huescar ciudad
-> aplicar microclima sin repetir altitud
-> fusionar con otras fuentes
```

Se corrigio un problema previo: la altitud se estaba aplicando dos veces a AEMET. Ahora el bucle de microclima no reaplica altitud a AEMET porque ya llega corregida.

### Parametros Actuales

Los parametros escalan por distancia al embalse. La referencia anterior era 0.48 km; ahora se usa 0.28 km.

Factor:

```txt
reservoirInfluence = sqrt(0.48 / distancia_embalse_km)
limitado entre 0.5 y 1.5
```

Con 0.28 km:

```txt
reservoirInfluence ~= 1.31
```

Sesgos aplicados sobre la lectura de la estacion:

```txt
Dia:   -0.5 C * 1.31 ~= -0.65 C
Noche: -0.2 C * 1.31 ~= -0.26 C
Punto de rocio: +0.4 C * 1.31 ~= +0.52 C
```

Como el sesgo de temperatura indica que la estacion lee mas fresca, se elimina asi:

```txt
temp_sin_embalse = temp_bruta - reservoirTempBias
```

Ejemplo diurno:

```txt
temp_sin_embalse = 26.6 - (-0.65) = 27.25 C
```

La humedad se corrige via punto de rocio:

```txt
td_estacion = dewPoint(temp_bruta, HR_bruta)
td_sin_embalse = td_estacion - reservoirDewBias
HR_sin_embalse = relativeHumidity(temp_sin_embalse, td_sin_embalse)
```

## Fusion de Fuentes

### Fuentes Actuales

- AEMET corregido.
- Open-Meteo.
- Miniestaciones calibradas.

### Pesos Base

Pesos por variable definidos en `layerObservation.ts`:

```txt
AEMET: temp 0.45, humedad 0.40, precipitacion 0.35, viento 0.35, rachas 0.35
Open-Meteo: temp 0.35, humedad 0.35, precipitacion 0.40, viento 0.40, rachas 0.40
```

Las miniestaciones entran segun disponibilidad, frescura y calibracion.

### Confianza

La confianza final penaliza:

- Fuentes antiguas.
- Discrepancias entre fuentes.
- Falta de datos.
- Distancias grandes.
- Calidad reducida de fuente.

Por eso puede bajar aunque todas las fuentes funcionen: una discrepancia real entre AEMET corregido y Open-Meteo reduce la confianza.

## Persistencia y Cron

El cron meteorologico guarda:

- Observaciones fuente.
- Observacion fusionada.
- Comparaciones para calibracion.
- Datos comarcales cuando procede.

Archivos relacionados:

- `src/app/api/cron/weather-capture/route.ts`
- `src/lib/weatherStore.ts`
- `src/services/cronAuth.ts`

El acceso al cron esta protegido mediante secreto y comparacion segura.

## Interfaz

Componentes principales:

- `src/components/WeatherDashboard.tsx`
- `src/components/WeatherStationPanel.tsx`

La UI muestra:

- Dato actual fusionado.
- Fuentes disponibles.
- Estado de salud de fuentes.
- Miniestaciones.
- Ajustes espaciales y microclimaticos cuando estan disponibles.
- Leyenda de colores/fuentes.

## Limitaciones Actuales

- Los parametros de embalse son empiricos y deben validarse con historico local.
- La inversion termica usa reglas simples; no incorpora nubosidad ni radiacion de forma completa.
- El relieve usa una rejilla 3x3 relativamente gruesa.
- La vegetacion se basa en Sentinel reciente, pero puede verse afectada por nubes o mosaicos incompletos.
- OSM puede tener errores o ausencia de detalles locales.
- La precipitacion aun no tiene un modelo orografico avanzado.
- El viento no canaliza direccion por eje real de valle, solo ajusta velocidad.

## Fase 6: Precipitacion Avanzada y Nowcasting

### Estado

Implementada.

### Objetivo

Mejorar la estimacion de lluvia local, detectar tormentas proximas y aplicar correcciones orograficas a la precipitacion.

### Componentes

- `src/services/orographicService.ts`: ajuste orografico por barlovento/sotavento.
- `src/services/nowcastService.ts`: nowcasting avanzado con trayectoria y tormentas.
- `src/services/precipCorrectionService.ts`: correccion de precipitacion por miniestaciones.
- `src/app/api/weather/nowcast/route.ts`: endpoint de nowcasting.
- `src/services/radarService.ts`: radar AEMET + nowcasting basico (preexistente).
- `src/services/lightningService.ts`: deteccion de rayos Blitzortung (preexistente).

### Ajuste Orografico

El modelo determina si el punto objetivo esta en barlovento (lado de donde sopla el viento) o sotavento (lado protegido) respecto al relieve local.

Datos usados:

- Direccion del viento (grados meteorologicos: de donde viene).
- Orientacion de la ladera (`aspectDeg`).
- Pendiente (`slopePct`).

Clasificacion:

```txt
Diff <= 45 grados:  barlovento (la ladera enfrenta el viento)
Diff >= 135 grados: sotavento (la ladera esta protegida del viento)
Resto:              neutro
```

Factores aplicados a la precipitacion:

```txt
Barlovento: precip * (1.0 a 1.40) segun alineacion y pendiente
Sotavento:  precip * (0.65 a 1.00) segun desalineacion y pendiente
Neutro:     precip * 1.00
```

El factor se calcula como:

```txt
slopeWeight = min(1.0, slopePct / 25)
intensity = (1 - diff/45) * slopeWeight     // barlovento
factor = 1.0 + intensity * 0.4              // barlovento

intensity = ((diff-135)/45) * slopeWeight    // sotavento
factor = 1.0 - intensity * 0.35              // sotavento
```

Integracion:

- En `layerObservation.ts`: se aplica al `fusedPrecip` antes de construir el `current`.
- En `comarcaService.ts`: se aplica a cada localidad con su relieve local y viento.
- El resultado orografico se expone en el payload como `orographic: { factor, classification, description }`.

### Nowcasting Avanzado

El servicio `nowcastService.ts` combina:

1. Open-Meteo minutely_15 precipitation (proximas 2 horas).
2. Deteccion de rayos Blitzortung para identificar tormentas.

Datos calculados:

- `intervals`: precipitacion cada 15 minutos (8 intervalos).
- `totalPrecipNext2h`: precipitacion acumulada estimada.
- `maxIntensityMm`: intensidad maxima en un intervalo.
- `minutesToRain`: minutos hasta la primera precipitacion perceptible (>0.1 mm).
- `minutesToEndRain`: minutos hasta el fin de la precipitacion.
- `trajectory`: increasing, decreasing, stable o none.
- `rainApproachingFrom`: direccion cardinal estimada de procedencia.
- `stormDetected`: true si hay rayos a menos de 30 km.
- `stormDistanceKm`: distancia a la tormenta mas cercana.
- `stormBearing`: rumbo a la tormenta mas cercana.
- `level`: ninguno, aviso, alerta, peligro.
- `message`: mensaje descriptivo en espanol.

Niveles:

```txt
peligro: tormenta con rayos < 30 km y > 2.0 mm/15min  O  intensidad > 4.0 mm/15min
alerta:  intensidad > 1.5 mm/15min  O  tormenta moderada
aviso:   intensidad > 0.1 mm/15min
ninguno: sin precipitacion ni tormenta
```

Cache: 8 minutos (alineado con el radar AEMET).

### Correccion por Miniestaciones

El servicio `precipCorrectionService.ts` permite ajustar la precipitacion usando pluviometros de miniestaciones cercanas.

Metodo:

1. Extraer lecturas de precipitacion de miniestaciones dentro de un radio.
2. Calcular media ponderada por distancia inversa.
3. Fusionar con el valor del modelo usando peso proporcional al numero de estaciones.

Formula:

```txt
peso_estacion = min(0.4, num_estaciones * 0.1)
peso_modelo = 1 - peso_estacion
precip_final = precip_modelo * peso_modelo + media_estaciones * peso_estacion
```

### Endpoint de Nowcasting

```txt
GET /api/weather/nowcast?lat=...&lon=...&windDir=...
```

Devuelve `NowcastData` con todos los campos descritos arriba.

### Integracion en el Flujo Principal

En `/api/weather/current`:

1. Se obtiene el dato fusionado con correccion orografica ya aplicada.
2. Se obtiene lightning de Blitzortung.
3. Se obtiene nowcast combinando Open-Meteo minutely + lightning.
4. Se obtiene radar de AEMET.
5. Todo se une en el payload final.

El payload ahora incluye:

- `orographic`: factor y clasificacion.
- `nowcast`: datos completos de nowcasting.
- `radar`: imagen de radar y mensaje basico.

### Ejemplo de Resultado

Sin precipitacion:

```txt
Huéscar: precip=0mm orographic=sotavento(0.95)
Orce:    precip=0mm orographic=barlovento(1.04)
nowcast: level=ninguno trajectory=none
```

Con precipitacion (ejemplo teorico):

```txt
base_precip = 5.0 mm
Huéscar (sotavento 0.95): precip = 4.75 mm
Orce (barlovento 1.30): precip = 6.50 mm
```

## Fase 7: Validacion Historica y Aprendizaje

### Estado

Implementada.

### Objetivo

Convertir parametros empiricos del modelo en parametros calibrados con datos reales, mediante backtesting y auto-ajuste.

### Componentes

- `src/services/backtestingService.ts`: calcula MAE/RMSE/bias por fuente, variable, franja horaria y estacion.
- `src/services/modelParameterService.ts`: auto-calibra parametros del modelo desde errores historicos.
- `src/lib/weatherStore.ts`: tablas `model_validation_daily` y `model_parameters`.
- `src/app/api/weather/metrics/route.ts`: endpoint extendido con validacion y parametros.

### Tablas Nuevas

#### model_validation_daily

Almacena metricas de validacion diarias por combinacion de fuente, variable, franja horaria y estacion.

```sql
CREATE TABLE model_validation_daily (
  id SERIAL PRIMARY KEY,
  validation_date DATE NOT NULL,
  source TEXT NOT NULL,
  variable TEXT NOT NULL,
  hour_band TEXT NOT NULL DEFAULT 'all',
  season TEXT NOT NULL DEFAULT 'all',
  mae FLOAT,
  rmse FLOAT,
  bias FLOAT,
  sample_count INT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (validation_date, source, variable, hour_band, season)
);
```

#### model_parameters

Almacena parametros auto-calibrados del modelo.

```sql
CREATE TABLE model_parameters (
  parameter_key TEXT PRIMARY KEY,
  value FLOAT NOT NULL,
  previous_value FLOAT,
  sample_count INT DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Backtesting

El servicio `backtestingService.ts` ejecuta:

1. `runDailyBacktest(date)`: procesa las mediciones de un dia concreto desde `source_measurements`.
2. `runBacktestRange(daysBack)`: procesa varios dias hacia atras.

Para cada combinacion de fuente y variable, calcula:

- **MAE** (Mean Absolute Error): error absoluto medio.
- **RMSE** (Root Mean Square Error): raiz del error cuadratico medio.
- **Bias**: error sistemático (media del error con signo).

Desgloses calculados:

| Desglose | Valores |
|---|---|
| Franja horaria | madrugada, manana, mediodia, tarde, noche, all |
| Estacion | primavera, verano, otono, invierno, all |

Cada franja/estacion se guarda como fila independiente en `model_validation_daily`.

### Auto-Calibracion de Parametros

El servicio `modelParameterService.ts` lee los resultados agregados de validacion y ajusta parametros del modelo.

Parametros calibrables:

| Clave | Default | Descripcion |
|---|---:|---|
| reservoir_temp_bias_day | -0.50 | Sesgo termico diurno del embalse |
| reservoir_temp_bias_night | -0.20 | Sesgo termico nocturno del embalse |
| reservoir_dew_bias | 0.40 | Sesgo punto de rocio del embalse |
| night_inversion_valley | -1.50 | Inversion termica en valle |
| night_inversion_mixed | -0.50 | Inversion termica en relieve mixto |
| altitude_lapse_rate | 0.006 | Gradiente termico vertical (C/m) |
| wind_factor_valley | 0.70 | Factor viento en valle |
| wind_factor_plateau | 1.20 | Factor viento en meseta |
| orographic_barlovento_max | 0.40 | Enhancement maximo barlovento |
| orographic_sotavento_max | 0.35 | Reduccion maxima sotavento |

Logica de ajuste:

- Si AEMET tiene un bias positivo en temperatura (lee mas alto que el consenso), se reduce la correccion del embalse (el embalse enfría menos de lo esperado).
- Si AEMET tiene un bias en humedad, se ajusta la correccion del punto de rocio.
- Si Open-Meteo tiene un bias termico, se ajusta el gradiente altitudinal.
- Solo se ajusta si hay al menos 10 muestras historicas.
- El ajuste es parcial (30% del bias detectado), no cambia abruptamente.
- El valor anterior se guarda en `previous_value` para auditoria.

### Cron

El cron meteorologico ejecuta:

- **Cada 3 horas** (hour % 3 === 0): calibracion de tolerancias, comarca, miniestaciones.
- **A las 02-03h**: backtesting del dia anterior.
- **A las 03h**: backtesting de los ultimos 3 dias + auto-calibracion de parametros.

### Endpoint de Metricas

```txt
GET /api/weather/metrics         (requiere auth admin)
GET /api/weather/metrics?detail=true   (incluye historico detallado)
```

Devuelve:

- `tolerances`: tolerancias calibradas actuales.
- `measurements`: MAE por variable (ultimos 45 dias).
- `aggregatedValidation`: MAE/RMSE/bias agregados por fuente/variable/hora/estacion.
- `validationHistory`: detalle diario (solo con `?detail=true`).
- `modelParameters`: parametros actuales vs defaults.

### Inicializacion de Base de Datos

Se anadio `initializeDatabase()` al inicio del cron para garantizar que todas las tablas (incluidas las nuevas) existen antes de cualquier operacion. Usa `CREATE TABLE IF NOT EXISTS`, por lo que es seguro ejecutarlo en cada pasada.

## Fase 8: Transparencia del Modelo en UI

### Estado

Implementada.

### Objetivo

Que el usuario vea exactamente por que el dato final difiere de AEMET u Open-Meteo, y comprenda las correcciones aplicadas.

### Componentes Nuevos

- `src/components/ModelTransparencyPanel.tsx`: panel desplegable con todas las correcciones por fuente.
- `src/components/NowcastPanel.tsx`: panel visual de nowcasting con mini-grafico de barras.

### Cambios en WeatherDashboard

- Se sustituye el `SourceAdjustmentPanel` inline por el nuevo `ModelTransparencyPanel`.
- Se anade `NowcastPanel` en la columna derecha, encima del radar.
- La confianza pasa a ser visible para todos los usuarios (no solo admin).
- Se elimina el codigo del viejo `SourceAdjustmentPanel`.

### ModelTransparencyPanel

Panel desplegable que muestra para cada fuente:

- Nombre y tipo (AEMET 5051X, Open-Meteo, Miniestacion).
- Punto de color de calidad (verde/ambar/rojo segun `qualityScore`).
- Antiguedad del dato (minutos).
- Estado de recuperacion (En vivo / Cache fresco / Cache).
- Temperatura bruta vs corregida.
- Distancia al punto objetivo.
- Cota origen -> destino.
- Correccion total aplicada (con color: naranja si sube, azul si baja).
- Peso espacial.

Adicionalmente muestra:

- **Correccion por embalse**: explica que se retira el sesgo del Pantano de San Clemente.
- **Clasificacion orografica**: barlovento/sotavento/neutro con factor y descripcion.
- **Diagnostico de confianza**: porcentaje + explicacion textual del calculo.

### NowcastPanel

Panel visual que aparece cuando hay precipitacion o tormenta detectada. Muestra:

- Nivel de alerta con colores (aviso/alerta/peligro).
- Mensaje descriptivo en espanol.
- Mini-grafico de barras con 8 intervalos de 15 minutos.
- Minutos hasta la primera lluvia.
- Precipitacion acumulada estimada a 2 horas.
- Intensidad maxima por intervalo.
- Tendencia (aumentando/disminuyendo/estable).
- Deteccion de tormentas con distancia y rumbo.
- Direccion de procedencia estimada.

### Visibilidad de Confianza

Antes: la confianza solo se mostraba para usuarios admin.

Ahora: todos los usuarios ven el porcentaje de confianza junto al estado de fuentes. El `ModelTransparencyPanel` ademas muestra la explicacion detallada del calculo:

```txt
temp_delta=0.4 penalty=2.1; humidity_delta=2.0 penalty=0.8;
wind_delta=10.7 penalty=5.3; time_diff=180min penalty=6.0;
source_quality penalty=6.7
```

Esto permite entender por que la confianza es del 71% y no mayor: penalizaciones por discrepancias entre fuentes, antiguedad y calidad.

### Datos del Payload Ahora Visibles

| Campo | Antes | Ahora |
|---|---|---|
| `confidencePct` | Solo admin | Todos los usuarios |
| `confidenceExplanation` | No visible | En ModelTransparencyPanel |
| `orographic` | No visible | En ModelTransparencyPanel |
| `nowcast` | No visible | NowcastPanel (cuando hay actividad) |
| `sources[].rawTemperatureC` | No visible | En ModelTransparencyPanel |
| `sources[].qualityScore` | No visible | Punto de color + label |
| `sources[].retrievalStatus` | No visible | Badge en ModelTransparencyPanel |
| `sources[].dataAgeMinutes` | No visible | "hace X min" |

## Fase 9: Zonas Locales de Huescar

### Estado

Implementada.

### Objetivo

Estimar condiciones meteorologicas para zonas especificas del termino municipal de Huescar, no solo el casco urbano. Incluye barrios, vegas, campos de secano, montes y la zona del embalse, cada una con su propio microclima.

### Zonas Definidas

| Zona | Tipo | Latitud | Longitud | Altitud (m) | Distancia centro (km) |
|---|---|---|---|---|---|
| Casco urbano | URBAN | 37.8094 | -2.5392 | 953 | 0 |
| Vega del Guadalentin | VEGA | 37.7950 | -2.5350 | 920 | 1.6 |
| El Altiplano Norte | SECANO | 37.8350 | -2.5100 | 1000 | 3.8 |
| Sierra de Huescar | MONTE | 37.8450 | -2.5800 | 1150 | 5.3 |
| Entorno Pantano San Clemente | RESERVOIR | 37.8608 | -2.6497 | 1095 | 11.3 |
| La Encarnacion | VEGA | 37.7850 | -2.5000 | 940 | 4.4 |
| Campos del Este | SECANO | 37.8100 | -2.4900 | 970 | 4.3 |
| Cerro del Castellon | MONTE | 37.8220 | -2.5600 | 1050 | 2.3 |

### Tipos de Zona

Cada zona tiene un tipo que determina ajustes especificos de microclima local:

| Tipo | Temp dia | Temp noche | Humedad | Punto rocio | Descripcion |
|---|---|---|---|---|---|
| URBAN | +0.6°C | +1.2°C | -3% | -0.2°C | Isla de calor urbana, mayor efecto nocturno |
| VEGA | -1.0°C | -1.5°C | +8% | +0.6°C | Regadio y huerta, enfriamiento por evapotranspiracion |
| SECANO | +0.8°C | -0.5°C | -5% | -0.4°C | Campo seco, mas calido de dia, se enfría de noche |
| MONTE | -0.8°C | -1.0°C | +5% | +0.3°C | Bosque mediterraneo, sombra y humedad |
| RESERVOIR | -0.5°C | -0.3°C | +4% | +0.4°C | Influencia de masa de agua, efecto moderador |

### Componentes

- `src/lib/geo.ts`: definicion de `HUESCAR_ZONES` con coordenadas, tipo y descripcion.
- `src/services/zoneService.ts`: calculo de estimaciones por zona con el modelo completo.
- `src/app/api/weather/zones/route.ts`: endpoint de zonas.
- `src/components/ZonePanel.tsx`: panel visual en el dashboard.
- `src/types/weather.ts`: tipo `ZoneEstimation`.

### Metodo de Estimacion

Para cada zona se sigue el mismo pipeline que para la comarca:

1. Obtener Open-Meteo local para delta espacial.
2. Partir de AEMET corregido si esta disponible.
3. Aplicar relieve y microclima local.
4. Aplicar correcciones de vegetacion (NDVI/NDWI/agua).
5. Aplicar ajuste orografico a precipitacion.
6. **Aplicar ajuste por tipo de zona** (isla de calor, regadio, etc.).
7. Calcular riesgo de helada.
8. Estimar necesidad de riego.

El ajuste por tipo de zona se aplica sobre la temperatura y humedad ya corregidas por relieve y vegetacion. Primero se desplaza el punto de rocio segun el tipo, y luego se recalcula la humedad relativa.

### Riesgo de Helada

Se calcula para cada zona con un factor de refuerzo segun el tipo:

- URBAN: -0.3 (menos riesgo por isla de calor).
- VEGA: +0.4 (mas riesgo por acumulacion de aire frio en zonas bajas).
- SECANO: +0.2.
- MONTE: +0.1.
- RESERVOIR: -0.1.

Los umbrales son:

```txt
T < -4°C: muy_alta
T < -1°C: alta
T <  2°C: media
resto:    none
```

### Necesidad de Riego

Se estima para zonas sin riesgo de helada y con humedad baja:

```txt
riego_mm = max(0, (temp - 5) * 0.08 * factor_necesidad_tipo)
```

Donde `factor_necesidad_tipo` es mayor para secano (1.5) y menor para reservorio (0.5).

### Endpoint

```txt
GET /api/weather/zones
```

Devuelve un array de `ZoneEstimation` con todas las zonas, ordenadas por distancia al centro.

### Panel UI

`ZonePanel.tsx` se renderiza en el dashboard debajo de las miniestaciones. Muestra:

- Nombre de la zona con emoji de tipo (urbano/vega/secano/monte/embalse).
- Temperatura con color segun la escala termica.
- Humedad relativa.
- Ajuste por tipo de zona con signo y color.
- Precipitacion si la hay.
- Riesgo de helada con color (verde/amarillo/naranja/rojo).
- Riego recomendado si aplica.
- Distancia al centro y altitud.
- Diferencia termica total entre la zona mas calida y la mas fria.

### Resultados Tipicos (noche, verano)

```txt
Casco urbano:      24.1°C  32% HR  adj +1.2°C  riego 1.5mm
Vega Guadalentin:  21.8°C  51% HR  adj -1.5°C
Altiplano Norte:   21.4°C  34% HR  adj -0.5°C  riego 2mm
Sierra de Huescar: 20.5°C  51% HR  adj -1.0°C
Pantano S. Clemente: 21°C  53% HR  adj -0.3°C
La Encarnacion:    21.0°C  53% HR  adj -1.5°C
Campos del Este:   21.7°C  37% HR  adj -0.5°C  riego 2mm
Cerro Castellon:   21.3°C  46% HR  adj -1.0°C  riego 0.9mm
```

La diferencia termica entre la zona mas calida (casco urbano) y la mas fria (sierra) es de hasta **3.6°C**, un rango microclimatico relevante para agricultura, ganaderia y planificacion local.

### Integracion en Cron

En cada ejecucion (cada 3 horas), el cron ejecuta `fetchZoneWeather()` con la referencia AEMET disponible. Esto calienta la cache de relieve/vegetacion para las zonas si no existia previamente.

## Fases Completadas

Las fases 1 a 9 estan implementadas y operativas. No quedan fases del plan original ni de las extensiones recomendadas sin implementar.

## Conclusion

El modelo microclimatico de fases 1 a 9 esta implementado y operativo. Cubre desde la correccion basica por altitud hasta el desglose por zonas locales, pasando por relieve, calibracion de estaciones, modelo comarcal, vegetacion, efecto embalse, nowcasting, orografia, validacion historica, auto-calibracion de parametros, transparencia en UI y zonas locales.

El sistema actual puede estimar condiciones para:

- **1 punto global**: Huescar ciudad fusionando AEMET + Open-Meteo + miniestaciones.
- **7 localidades comarcales**: Castril, Castillejar, Galera, Orce, Puebla de Don Fadrique y La Hinojosa.
- **8 zonas locales**: casco urbano, vegas, secanos, montes y entorno del pantano.
- **Nowcasting a 2 horas**: precipitacion, tormentas y trayectoria.
- **Parametros auto-calibrados**: embalse, gradiente altitudinal, bias, basados en errores historicos.

Todas las correcciones son visibles y explicadas en la interfaz de usuario.
