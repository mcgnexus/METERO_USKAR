# Flujo de calibracion meteorologica de Meteo Huescar

Este documento explica, paso a paso, como el programa combina datos de AEMET Baza, AEMET Huescar/San Clemente y Open-Meteo para aproximarse al dato real del casco urbano/llano de Huescar y generar las previsiones meteorologicas.

## 1. Fuentes de datos

El sistema usa varias fuentes con funciones distintas.

| Fuente | ID / ubicacion | Uso principal |
|---|---|---|
| AEMET Baza | `5047E`, 785 m | Base termica baja para interpolacion vertical y presion de referencia |
| AEMET Huescar / San Clemente | `5051X`, 1101 m | Punto alto cercano, afectado por pantano de San Clemente |
| Open-Meteo Huescar | 37.8094, -2.5392, 953 m | Cielo, sensacion, viento, previsiones horarias/diarias y fallback |
| RIA Baza / Puebla | Red agraria | Radiacion, viento 2 m y ET0 cuando hay datos |
| Miniestacion local | opcional | Dato real para auditar y corregir el modelo |

## 2. Dos flujos principales

La pagina `/huescar` consume dos endpoints:

```txt
/api/weather/climate-calibration
  -> dato local calibrado del hero
  -> interpolacion Baza + Huescar/San Clemente
  -> humedad, rocio, viento 2 m, ET0, confianza y residual

/api/weather/current
  -> condiciones meteorologicas fusionadas
  -> cielo actual, avisos, nowcast, radar, rayos, forecast 24 h/5 dias
```

El hero usa como fuente principal `climate-calibration` para el dato local calibrado. `/current` se usa como apoyo para el estado del cielo y para los modulos de forecast, radar, avisos y nowcast.

## 3. Flujo del dato local calibrado

Archivo principal: `src/services/climateCalibrationService.ts`.

### Paso 1: descarga de AEMET Baza

El programa consulta la estacion `5047E` de Baza mediante AEMET OpenData.

Datos usados:

- Temperatura `ta`
- Humedad relativa `hr`
- Presion `pres`
- Altitud `alt`

Si Baza responde correctamente, se usa como nodo base del modelo.

### Paso 2: descarga de AEMET Huescar/San Clemente

El programa consulta la estacion `5051X`, que corresponde a Huescar en el entorno del pantano de San Clemente.

Esta estacion se usa como punto alto cercano para calcular el gradiente termico vertical entre Baza y Huescar/San Clemente.

### Paso 3: fallback si falla Baza

Si Baza no tiene datos, el programa intenta reconstruir Baza desde Huescar/San Clemente.

El orden es:

1. Baza AEMET real `5047E`.
2. Baza estimada desde AEMET Huescar/San Clemente `5051X`.
3. Baza estimada desde Open-Meteo en Huescar/San Clemente.
4. Baza desde Open-Meteo directo en coordenadas de Baza.

Cuando se estima Baza desde Huescar/San Clemente, se corrige primero el sesgo del pantano.

## 4. Correccion del pantano de San Clemente

La estacion `5051X` esta cerca del agua, por lo que puede no representar exactamente el casco urbano o el llano.

El modelo aplica dos correcciones:

| Correccion | Motivo |
|---|---|
| `reservoir_temp_bias_day` | De dia el agua puede suavizar/enfriar la lectura |
| `reservoir_temp_bias_night` | De noche el agua puede liberar calor y templar la estacion |
| `reservoir_dew_bias` | El pantano puede elevar el punto de rocio/humedad local |

La idea es retirar parte del efecto del pantano antes de usar `5051X` como referencia del terreno alto.

## 5. Calculo del gradiente dinamico Baza-Huescar

Con Baza a 785 m y Huescar/San Clemente a 1101 m, el programa calcula un gradiente real del momento:

```txt
```

Interpretacion:

- `gamma > 0`: situacion normal, baja la temperatura al subir altitud.
- `gamma = 0`: atmosfera casi isotermica.
- `gamma < 0`: inversion, la estacion alta esta mas calida que la baja.

El valor se limita entre rangos razonables para evitar extrapolaciones absurdas por datos erroneos o cortes de estacion.

## 6. Interpolacion al llano/casco urbano de Huescar

El objetivo local esta definido en:

```txt
lat 37.8094
lon -2.5392
elevacion 953 m
```

La temperatura base del llano se estima desde Baza:

```txt
T_llano_base = T_baza - gamma * (953 - 785)
```

Ejemplo conceptual:

- Si Baza esta mas baja y mas calida, subir a 953 m reduce la temperatura.
- Si hay inversion, el gradiente puede aumentar la temperatura al subir.

## 7. Correccion microclimatica del llano

Despues de interpolar por altitud, se aplican correcciones locales.

### Drenaje nocturno de aire frio

De noche, con poco viento y cielo despejado, el llano puede enfriarse mas que el valor interpolado.

Formula conceptual:

```txt
drenaje = -amplitud_maxima * factor_viento * factor_cielo
```

Donde:

- Mas viento reduce el drenaje porque mezcla el aire.
- Mas nubosidad reduce el enfriamiento radiativo.
- Cielo despejado y calma maximizan el enfriamiento.

### Isla de calor urbana

Se suma una pequena correccion positiva por casco urbano:

- Dia: pequena subida.
- Noche: subida algo mayor por inercia termica urbana.

Resultado:

```txt
T_llano_final = T_llano_base + drenaje_frio + isla_calor
```

## 8. Humedad y punto de rocio

La humedad no se interpola como una simple media. El programa usa conservacion de presion de vapor.

Pasos:

1. Toma temperatura y humedad de Baza.
2. Calcula el vapor real contenido en el aire.
3. Lleva ese vapor a la temperatura estimada del llano.
4. Recalcula la humedad relativa resultante.

Esto es mas realista porque la humedad relativa cambia mucho con la temperatura aunque la cantidad de vapor sea parecida.

Si hay viento de oeste y Baza esta muy humeda, se puede aplicar una penalizacion por posible influencia del embalse del Negratin.

## 9. Presion atmosferica

La presion se calcula con esta prioridad:

1. Presion de miniestacion local si existe.
2. Presion de Baza AEMET corregida barometricamente a 953 m.
3. Atmosfera estandar por elevacion si no hay dato real.

Esto evita usar presion de una altitud distinta sin corregir.

## 10. Viento local 2 m

Para el hero, el viento principal viene del motor climatico:

1. Preferencia por viento RIA Baza si esta disponible.
2. Si no, RIA Puebla reducida por distancia/orografia.
3. Si no hay RIA, Open-Meteo convertido de 10 m a 2 m.

Luego se aplica un factor de friccion local de la vega:

```txt
viento_local_2m = viento_referencia * vega_friction_factor
```

Las rachas del modulo `/current` se reducen con `wind_gust_reduction_factor` para aproximarlas al llano.

## 11. Radiacion y ET0

Para agricultura, el sistema intenta usar radiacion RIA Baza/Puebla.

La mezcla depende de la situacion:

- Anticiclon/despejado: ponderacion por distancia tipo IDW.
- Foehn/nubosidad/orografia: se da mas peso a Baza.
- Si no hay RIA: fallback a Open-Meteo.

Con temperatura, humedad, presion, radiacion y viento 2 m se calcula ET0 por FAO56 Penman-Monteith horario.

## 12. Miniestacion local y residual

Si hay miniestacion fresca, el programa la usa como verdad local.

Entonces:

```txt
residual = temperatura_estimada - temperatura_real_local
```

Este residual sirve para auditar el modelo y guardar informacion de entrenamiento.

Si no hay miniestacion fresca, se muestra el valor calibrado pero no se puede calcular residual real.

## 13. Flujo de condiciones actuales fusionadas

Archivo principal: `src/services/layerObservation.ts`.

Este flujo alimenta `/api/weather/current`.

Fuentes:

- AEMET Huescar `5051X`
- Open-Meteo en coordenadas de Huescar a 953 m
- Miniestaciones locales

Pasos:

1. Descarga AEMET `5051X`.
2. Corrige sesgo del pantano.
3. Corrige temperatura de 1101 m a 953 m.
4. Descarga Open-Meteo con `elevation=953`.
5. Lee miniestaciones activas y frescas.
6. Aplica correcciones de relieve/microclima.
7. Fusiona valores por pesos y calidad.

Pesos base:

| Variable | AEMET | Open-Meteo | Local |
|---|---:|---:|---:|
| Temperatura | 0.45 | 0.35 | 0.50 |
| Humedad | 0.40 | 0.35 | 0.50 |
| Lluvia | 0.35 | 0.40 | 0 |
| Viento | 0.35 | 0.40 | 0 |

El peso efectivo se multiplica por la calidad de cada fuente.

## 14. Previsiones meteorologicas

Las previsiones vienen principalmente de Open-Meteo.

Hay dos usos:

### Forecast principal de `/current`

Archivo: `src/services/openMeteoForecastClient.ts`.

Solicita:

- Temperatura actual y aparente.
- Humedad.
- Precipitacion.
- Codigo WMO de estado del cielo.
- Viento y rachas.
- Forecast horario de temperatura, humedad, probabilidad de lluvia, lluvia, codigo WMO y viento.
- Forecast diario de max/min, lluvia, rachas, ET0 y codigo WMO.

Este forecast se usa para:

- Tarjetas de proximas horas.
- Prevision diaria.
- Estado del cielo actual.
- Sensacion/descripcion meteorologica auxiliar.

### Forecast agricola corregido

Archivo: `src/app/api/weather/forecast/route.ts`.

Usa Open-Meteo con coordenadas/elevacion del llano y aplica correcciones de sesgo historico mediante `biasCorrectionService`.

Este flujo alimenta la prevision de varios dias con variables agronomicas como radiacion, suelo, humedad media y ET0.

## 15. Resumen operativo

El objetivo del sistema no es elegir una unica fuente, sino construir el dato mas probable para el casco urbano/llano:

```txt
AEMET Baza 5047E
  + AEMET Huescar/San Clemente 5051X
  + Open-Meteo 953 m
  + RIA Baza/Puebla
  + miniestacion local si existe
  -> gradiente dinamico
  -> correccion de pantano
  -> correccion altitudinal
  -> correccion nocturna de cubeta
  -> correccion urbana
  -> humedad por presion de vapor
  -> viento local 2 m
  -> dato local calibrado
```

Para previsiones:

```txt
Open-Meteo 953 m
  -> forecast horario/diario
  -> correccion de sesgo donde aplica
  -> modulos de 24 h, 5 dias, agricultura, avisos y nowcast
```

## 16. Estado tras las ultimas correcciones

Correcciones ya aplicadas:

- AEMET `vv` y `vmax` se convierten de m/s a km/h.
- Open-Meteo recibe `elevation=953` en el cliente de `/current`.
- `sourceLevel` ya distingue correctamente `LOCAL_STATIONS`.
- El llano usa elevacion coherente de 953 m.
- El hero usa como dato principal el motor climatico calibrado, no una mezcla visual de motores distintos.

## 17. Riesgos restantes

- AEMET `5051X` se nombra a veces como San Clemente, pero realmente representa Huescar en entorno de pantano; convendria renombrarlo internamente para evitar confusion.
- Hay dos pipelines vivos: `climate-calibration` y `current`. Ya se han alineado en UI, pero siguen siendo servicios separados.
- Las correcciones microclimaticas dependen de parametros calibrables. Sin miniestacion local fresca, el modelo estima bien, pero no puede auditarse en tiempo real.
