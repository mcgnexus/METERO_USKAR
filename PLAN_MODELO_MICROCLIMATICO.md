# Plan de Modelo Microclimático Completo

Este documento define una propuesta de evolución del observatorio meteorológico de Huéscar hacia un modelo microclimático completo para estimar condiciones locales de temperatura, humedad, viento, precipitación y riesgo.

## Objetivo

Construir un modelo por capas que corrija las observaciones y modelos meteorológicos según:

- Altitud.
- Distancia entre fuente y punto objetivo.
- Relieve local.
- Exposición solar.
- Valle, ladera, meseta o piedemonte.
- Cobertura vegetal y suelo.
- Observaciones de miniestaciones propias.
- Datos históricos para calibración automática.

## 1. Punto Objetivo

Definir para qué punto se estima la meteorología:

- Centro urbano de Huéscar.
- Barrios o zonas concretas.
- Parcelas agrícolas.
- Localidades de la comarca.

Cada punto objetivo debe tener:

- Latitud y longitud.
- Altitud.
- Pendiente.
- Orientación.
- Tipo de relieve.
- Cobertura vegetal o uso del suelo.
- Distancia a cauces, ramblas, masas forestales o zonas regadas.

## 2. Fuentes Base

El modelo combinará varias fuentes:

- AEMET 5051X como observación oficial.
- Open-Meteo como campo espacial continuo.
- Miniestaciones propias como observación local.
- Open-Meteo Archive para aprendizaje histórico.
- DEM/elevación para relieve.
- Sentinel/NDVI para vegetación y humedad superficial.
- Radar o avisos para precipitación inmediata.

## 3. Corrección Térmica

La temperatura objetivo se estima como:

```txt
T_objetivo = T_fuente + correccion_altitud + correccion_valle + correccion_exposicion + correccion_suelo
```

### Corrección por Altitud

```txt
correccion_altitud = (elevacion_fuente - elevacion_objetivo) * 0.006
```

Ejemplo:

```txt
Estación AEMET 5051X: 1101 m
Huéscar ciudad: 953 m
Diferencia: 148 m
Corrección: 148 * 0.006 = +0.888 °C
```

### Corrección por Valle

La inversión térmica nocturna se aplica sobre todo con:

- Noche.
- Cielo despejado.
- Viento bajo.
- Fondo de valle.

Ejemplo inicial:

```txt
-1.5 °C si noche + viento < 5 km/h + valle marcado
-0.5 °C si noche + valle moderado
 0.0 °C si día o viento alto
```

### Corrección por Exposición

- Laderas sur y oeste: más cálidas durante el día.
- Laderas norte: más frescas.
- Zonas expuestas: mayor amplitud térmica.

### Corrección por Suelo y Vegetación

- Zonas urbanas/minerales: más retención de calor.
- Zonas vegetadas o regadas: enfriamiento relativo.
- Suelo húmedo: menor amplitud térmica.

## 4. Corrección de Humedad

La humedad relativa no debe corregirse linealmente. La forma recomendada es usar punto de rocío o presión de vapor.

Flujo recomendado:

1. Calcular punto de rocío desde temperatura y humedad de la fuente.
2. Ajustar punto de rocío por vegetación, regadío, cauces o valle.
3. Recalcular humedad relativa con la temperatura corregida.

```txt
HR_objetivo = f(T_objetivo, punto_rocio_estimado)
```

Esto evita errores derivados de subir o bajar porcentajes de humedad directamente.

## 5. Corrección de Viento

El viento se corrige con factores multiplicativos:

```txt
viento_objetivo = viento_base * factor_exposicion * factor_valle * factor_rugosidad
```

Factores iniciales:

| Entorno | Factor |
| --- | ---: |
| Meseta expuesta | 1.1 - 1.3 |
| Valle cerrado | 0.5 - 0.8 |
| Urbano/arbolado | 0.6 - 0.9 |
| Crestas/laderas expuestas | 1.2 - 1.5 |

Dirección:

- En valles se puede canalizar el viento hacia el eje del valle.
- Si no se conoce el eje del valle, se aplica solo factor de velocidad.

## 6. Corrección de Precipitación

La precipitación es la variable más difícil. Se estima combinando:

- Gradiente orográfico.
- Radar, si existe.
- Diferencia espacial de Open-Meteo.
- Observaciones de miniestaciones.

Modelo inicial:

```txt
precip_objetivo = precip_base + delta_open_meteo_espacial + ajuste_orografico
```

Criterios:

- Más altitud y barlovento: posible aumento de precipitación.
- Sotavento: posible disminución.
- Radar cercano con precipitación: mayor prioridad al radar.

## 7. Consenso Ponderado

Cada fuente se corrige primero y después se fusiona:

```txt
valor_final = sum(valor_fuente_corregido * peso_fuente) / sum(peso_fuente)
```

El peso se calcula como:

```txt
peso = calidad * frescura * factor_distancia * factor_variable
```

Pesos orientativos:

- AEMET: alto si es reciente, baja con distancia o antigüedad.
- Miniestaciones: alto si están frescas, cerca y calibradas.
- Open-Meteo: estable, pero con menor peso al ser modelo.
- Radar: alto para precipitación inmediata.

## 8. Calibración Automática

Guardar errores históricos:

```txt
error = observacion_real - prediccion_modelo
```

Aprender por:

- Variable.
- Zona.
- Hora del día.
- Situación meteorológica.
- Fuente.

Métricas:

- MAE de temperatura.
- MAE de humedad.
- MAE de viento.
- Bias nocturno.
- Bias por inversión térmica.
- Bias por lluvia o calor.

Ejemplos:

- Si el modelo se queda corto de noche en el casco urbano, aprende una corrección nocturna.
- Si una miniestación mide sistemáticamente +0.8 °C, se calibra individualmente.

## Implementación por Fases

### Fase 1: Microclima Básico

- Temperatura por altitud.
- Peso por distancia.
- Humedad mediante punto de rocío.
- Viento con factor de exposición simple.
- Mostrar ajustes aplicados en UI.

### Fase 2: Relieve

- Obtener elevación 3x3 alrededor del punto.
- Calcular valle, meseta, ladera o piedemonte.
- Calcular exposición aproximada.
- Aplicar inversión nocturna.

### Fase 3: Miniestaciones Calibradas

- Guardar histórico de cada nodo.
- Comparar contra AEMET/Open-Meteo.
- Calcular bias por estación.
- Aplicar corrección individual.

### Fase 4: Comarca

- Aplicar el modelo a Castril, Galera, Orce, Castilléjar, Puebla de Don Fadrique y otras zonas.
- Usar deltas espaciales de Open-Meteo y corrección por relieve.

### Fase 5: Vegetación y Suelo

- NDVI/NDWI Sentinel.
- Distancia a cauces y zonas regadas.
- Corrección de humedad y temperatura superficial.

## Recomendación Inicial

Empezar por Fase 1 y Fase 2, porque mejoran la coherencia del dato local sin depender todavía de Sentinel ni de históricos largos.
