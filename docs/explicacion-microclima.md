# Cómo explicar el análisis de microclima

## Para público general (vecinos, web, redes)

> "Las apps del tiempo generales miran un modelo que divide el mapa en cuadrículas de 9 km². Para ellas, Huéscar, la vega y La Parra son el mismo punto. Nosotros ajustamos la temperatura, humedad y viento según la altitud real de cada zona, la proximidad al embalse de San Clemente, la inversión térmica nocturna en zonas bajas y el efecto del relieve. El resultado es un dato más realista para tu ubicación exacta."

## Para agricultores y ganaderos

> "Cuando una app dice 2°C a las 7:00 en Huéscar, ese dato es el de la estación de AEMET en el embalse, a 1100 m de altitud. La vega, que está 150 m más abajo, puede tener hasta 4-5°C menos por la inversión nocturna. Nosotros corregimos eso. Te decimos la temperatura real de tu parcela, no la del modelo genérico."

## Para el Ayuntamiento (propuesta formal)

> "Meteo Huéscar aplica correcciones microclimáticas locales que ninguna app generalista realiza: ajuste altitudinal con gradiente térmico real (0.65°C/100 m), influencia del embalse de San Clemente (humedad y moderación térmica), inversión nocturna en la vega, canalización del viento por el relieve y efecto orográfico en precipitación. Todo ello parametrizado con datos de AEMET, Open-Meteo y, en el futuro, miniestaciones propias."

## Explicación de cada factor microclimático

### 1. Corrección por altitud (lapse rate)
La temperatura baja ~0.65°C por cada 100 m de ascenso. La estación 5051X de AEMET está a 1101 m. El casco urbano de Huéscar está a 953 m. La vega y zonas bajas están por debajo. Corregimos la temperatura de la estación a la altitud real de cada zona.

**Ejemplo concreto:**
- Estación AEMET (1101 m): 10°C
- Casco urbano (953 m): 10.96°C (+0.96°C por estar 148 m más abajo)
- Vega (850 m): 11.6°C (+1.6°C)

### 2. Influencia del embalse de San Clemente
La estación 5051X está a solo 280 m del embalse. El agua modera las temperaturas: frescor en verano, menos frío en invierno, y más humedad ambiental.

**Ejemplo concreto:**
- Sin corrección por embalse: la temperatura nocturna sería más baja de lo real
- Con corrección: ajustamos entre +0.5°C y +1.5°C según hora del día

### 3. Inversión térmica nocturna
Por la noche, el aire frío baja a las zonas más húmedas y bajas (vega, barrancos). En noches despejadas y sin viento, la diferencia puede ser de 4-5°C entre el casco urbano y la vega.

**Ejemplo concreto:**
- AEMET a las 7:00: 2°C (en el embalse, 1101 m)
- Vega (850 m) con inversión: -2°C (4°C menos por acumulación de frío)
- Casco urbano (953 m): 0-1°C

Esto es crítico para la agricultura (heladas tardías).

### 4. Efecto del viento por el relieve
El relieve del Altiplano canaliza el viento. El valle del Guardal y la sierra de la Encantada modifican la dirección e intensidad del viento respecto al modelo general.

### 5. Precipitación orográfica
La Sierra de La Sagra y la Sierra de la Encantada fuerzan la elevación del aire húmedo, aumentando la precipitación en las laderas de barlovento y reduciéndola en las de sotavento.

---

## Ejemplo visual para explicar el microclima en 30 segundos

> "Imagina que AEMET mide el tiempo a 1100 m, al lado del embalse de San Clemente. Google Weather usa ese mismo punto. Pero tu casa está en el casco urbano, a 950 m, o tu finca está en la vega, a 850 m. La temperatura no es la misma. Nosotros calculamos la diferencia real para cada zona."

## Para un post de Facebook/Instagram

> 🌡️ ¿Sabías que la estación de AEMET de Huéscar está a 1101 m de altitud, junto al embalse de San Clemente?
>
> Cuando una app te dice "13°C en Huéscar", ese es el dato del embalse. Pero el casco urbano está a 953 m y la vega a 850 m. La temperatura real varía hasta 4-5°C según la zona, la hora y si hay inversión térmica.
>
> Meteo Huéscar corrige eso. Calculamos la temperatura, humedad y viento ajustados a tu altitud real, al efecto del embalse, al relieve y a la inversión nocturna.
>
> No es el tiempo de un modelo genérico. Es el tiempo de tu zona.
>
> 🌐 meteohuescar.com/huescar
