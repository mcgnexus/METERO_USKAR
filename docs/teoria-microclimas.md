# Teoría y Fundamento de los Microclimas — Meteo Huéscar

## 1. Introducción geográfica

El sistema modela el microclima de **Huéscar** (Granada, 37.8094°N, −2.5392°E) a partir de datos observacionales de estaciones AEMET en la comarca y fuentes complementarias (Open-Meteo, RIA). La orografía del Altiplano granadino genera diferencias térmicas e hídricas significativas en distancias cortas.

### Puntos de referencia

| Punto | Latitud | Longitud | Elevación | Rol |
|---|---|---|---|---|
| **AEMET Baza (5047E)** | 37.5058 | −2.7350 | **785 m** | Estación de referencia termométrica y barométrica |
| **AEMET San Clemente (5051X)** | 37.8614 | −2.6528 | **1101 m** | Referencia de alta montaña (Sierra de La Sagra) |
| **Huéscar (casco urbano)** | 37.8094 | −2.5392 | **953 m** | **Objetivo principal del modelo** |
| **Embalse de San Clemente** | 37.8608 | −2.6497 | ~1079 m | A 280 m de la estación 5051X; modifica sus lecturas |
| **Embalse del Negratín** | 37.5617 | −2.9300 | ~700 m | A 35 km al SO de Huéscar; fuente de humedad advectiva |

### Diferencias altitudinales clave

- Baza → Huéscar: Δz = **+168 m** (Huéscar es más alto)
- San Clemente → Huéscar: Δz = **−148 m** (Huéscar es más bajo)

---

## 2. Gradiente térmico vertical (Lapse Rate)

### 2.1 Gradiente estándar ISA

En la atmósfera estándar internacional (ISA), la temperatura decrece con la altitud a razón de:

```
Γ_ISA = 0.0065 °C/m = 0.65 °C / 100 m
```

Aplicación al caso Huéscar desde Baza:

```
T_llano = T_Baza − 0.0065 × (953 − 785)
        = T_Baza − 0.0065 × 168
        = T_Baza − 1.09 °C
```

### 2.2 Gradiente dinámico observacional

El modelo no asume ciegamente el gradiente ISA. Cuando ambas estaciones AEMET (Baza y San Clemente) tienen datos, calcula el gradiente real observado entre ellas:

```
Γ_obs = (T_Baza − T_SanClemente) / (1101 − 785)
      = (T_Baza − T_SanClemente) / 316
```

Este gradiente se **clampa** a un rango físicamente plausible:

```typescript
// climateCalibrationService.ts — computeDynamicGradient()
gammaCPerM = clamp(rawGamma, −0.03, +0.02)  // °C/m
```

Límites:
- **−0.03 °C/m** (−3 °C/100 m): inversión térmica muy intensa
- **+0.02 °C/m** (+2 °C/100 m): adiabática seca máxima en descenso (Foehn)

Si una estación falla o el gradiente es errático, se usa el valor por defecto `0.0065`.

### 2.3 Detección de inversión térmica

Se detecta inversión cuando la temperatura aumenta con la altitud:

```
inversión = T_Baza < T_SanClemente
```

En una inversión típica del Altiplano:

```
T_SanClemente (1101 m) = 12 °C
T_Baza (785 m)         = 8 °C

Γ_inv = (8 − 12) / 316 = −0.0127 °C/m
T_llano = 8 + (−0.0127) × 168 = 5.9 °C
```

La temperatura en Huéscar (5.9 °C) es **intermedia** entre Baza (8 °C) y San Clemente (12 °C), pero el gradiente negativo hace que el llano sea más frío que ambas.

---

## 3. Ecuación hipsométrica (presión atmosférica)

La presión en Huéscar se extrapola desde Baza usando la **ecuación hipsométrica** (atmósfera en equilibrio hidrostático con gradiente lineal):

```
P₂ = P₁ × [ 1 − Γ × Δz / T₁ ]^(g·M / R·Γ)
```

Donde:

| Símbolo | Valor | Significado |
|---|---|---|
| Γ | 0.0065 K/m | Gradiente térmico estándar |
| g | 9.80665 m/s² | Aceleración gravitatoria |
| M_aire | 0.02896 kg/mol | Masa molar del aire seco |
| R | 8.314 J/(mol·K) | Constante universal de los gases |
| Exponente | **5.255** | g·M / R·Γ |

Ejemplo con Baza a 930 hPa y 15 °C para Huéscar (953 m):

```
T₁_k = 15 + 273.15 = 288.15 K
P_Huéscar = 930 × [1 − 0.0065 × 168 / 288.15]^5.255
          = 930 × [1 − 0.00379]^5.255
          = 930 × 0.9803
          = 911.7 hPa
```

### Métodos empleados (por orden de prioridad)

1. **Barométrico desde Baza AEMET**: usa P_real de Baza (mejor precisión)
2. **Barométrico desde Baza estimada**: usa P estimada cuando Baza offline
3. **Atmósfera estándar**: fórmula ISA pura cuando no hay datos de presión

```
P = 101.325 × ((293 − 0.0065 × elev) / 293)^5.255
```

---

## 4. Conservación de vapor de agua (humedad relativa)

### 4.1 Principio físico

El modelo asume que el **vapor de agua se conserva** al desplazarse horizontalmente de Baza a Huéscar (no hay fuentes ni sumideros de vapor entre ambos puntos). La humedad relativa cambia solo por el efecto de la temperatura en la presión de saturación.

### 4.2 Tetens-Magnus (presión de vapor saturante)

```
e_s(T) = 6.112 × exp(17.67 × T / (T + 243.5))
```

Donde:
- `e_s(T)` = presión de vapor saturante a temperatura T (hPa)
- T = temperatura (°C)
- 17.67 y 243.5 = constantes de Magnus para el rango −40 °C a +50 °C (sobre agua)

### 4.3 Cadena de conservación

```
e_actual = e_s(T_Baza) × HR_Baza / 100   // Vapor presente en Baza
HR_llano = (e_actual / e_s(T_llano)) × 100  // HR resultante en Huéscar
```

Ejemplo numérico:

```
T_Baza = 20 °C,  HR_Baza = 60%
e_s(20) = 6.112 × exp(353.4 / 263.5) = 6.112 × exp(1.341) = 23.37 hPa
e_actual = 23.37 × 0.60 = 14.02 hPa

T_llano = 18.9 °C (tras gradiente −1.09 °C)
e_s(18.9) = 6.112 × exp(333.96 / 262.4) = 6.112 × exp(1.273) = 21.83 hPa
HR_llano = (14.02 / 21.83) × 100 = 64.2%
```

La HR sube del 60% al 64% porque la temperatura es menor y el aire puede saturarse con menos vapor.

### 4.4 Penalti del Negratín

El embalse del Negratín (al SO de Baza) es una fuente masiva de vapor de agua. Cuando el viento en Baza viene del oeste y la HR supera el 90%, el modelo aplica un factor reductor:

```typescript
// climateCalibrationService.ts — buildExtrapolation()
if (windDir >= 225° && windDir <= 315° && HR_Baza > 90%) {
    HR_efectiva = HR_Baza × 0.85   // Reducción del 15%
    penalti_negratín = true
}
```

**Fundamento físico**: El aire húmedo del Negratín es forzado a ascender por el **Cerro Jabalcón** (1495 m) antes de llegar a Huéscar. La condensación y precipitación orográfica eliminan parte del vapor, por lo que el aire que llega al llano es menos húmedo de lo que indica la estación de Baza.

---

## 5. Corrección por embalse de San Clemente

La estación AEMET **5051X** está a solo **280 m** del embalse de San Clemente. El volumen de agua modifica localmente las lecturas. El modelo corrige este sesgo para obtener valores representativos de la ladera libre.

### 5.1 Factores de corrección

| Parámetro | Valor | Efecto |
|---|---|---|
| `reservoir_temp_bias_day` | −0.3 °C | Día: el agua absorbe calor → estación más fría |
| `reservoir_temp_bias_night` | +0.4 °C | Noche: el agua libera calor → estación más cálida |
| `reservoir_humidity_bias_pct` | 15 % | Evaporación del embalse infla la HR |
| `reservoir_dew_bias` | +0.5 °C | Rocío elevado por la humedad extra |

### 5.2 Factor de influencia por distancia

La influencia disminuye con la distancia al embalse:

```typescript
influencia = clamp(sqrt(0.28 / d), 0.5, 1.5)
```

- A 280 m (d = 0.28 km): influencia = 1.0 (plena)
- A 100 m: influencia = 1.5 (máxima)
- A >1.12 km: influencia = 0.5 (mínima)

### 5.3 Corrección aplicada

```typescript
T_corregida = T_5051X − bias_termico × influencia
HR_corregida = HR_5051X − bias_humedad × influencia
PuntoRocio_corregido = PuntoRocio_5051X − bias_rocio × influencia
```

El resultado se usa como **T_SanClemente** en los cálculos de gradiente del modelo.

---

## 6. Capa 4: Microclima local del Llano de Huéscar

Esta es la capa de corrección más importante. Se aplica **después** de la interpolación térmica (Capas 1-3), y modifica la temperatura estimada con dos efectos locales superpuestos:

```
T_final = T_interpolada + drenaje_aire_frio + isla_calor_urbana
```

### 6.1 Drenaje de aire frío (Cold Air Drainage)

**Mecanismo físico**: Durante la noche, en condiciones anticiclónicas (cielo despejado, viento débil), el suelo se enfría por radiación de onda larga. El aire en contacto con el suelo se vuelve más denso y **drena** hacia las cotas topográficas más bajas siguiendo la pendiente. La cubeta de Huéscar y la vega del Guardal actúan como **sumideros de aire frío**.

El modelo usa dos parámetros para este efecto:

```typescript
cold_air_drainage_min_c = −2.0 °C   // Mínimo enfriamiento (viento ~umbral)
cold_air_drainage_max_c = −5.0 °C   // Máximo enfriamiento (calma total)
inversion_wind_threshold_ms = 1.5 m/s
```

**Fórmula**:

```typescript
calma = max(0, 1 − velocidad_viento / 1.5)
enfriamiento = −2.0 + (−5.0 − (−2.0)) × calma
             = −2.0 + (−3.0) × calma
```

Interpretación:
- **Viento ≥ 1.5 m/s** (calma = 0): enfriamiento = −2.0 °C (mezcla turbulenta rompe la inversión)
- **Viento = 0 m/s** (calma = 1): enfriamiento = −5.0 °C (inversión pura y máxima)
- **Valores intermedios**: interpolación lineal

**Activación**: Solo se aplica en **horario nocturno** (20:00–07:59 hora legal de Madrid).

### 6.2 Isla de calor urbana (Urban Heat Island)

**Mecanismo físico**: Los materiales urbanos (asfalto, hormigón, tejados) tienen mayor capacidad calorífica y menor albedo que el suelo natural. Durante el día absorben más radiación y la liberan lentamente, elevando la temperatura del casco urbano respecto al entorno rural.

```typescript
urban_heat_island_c = +0.2 °C
```

**Activación**: Solo en **horario diurno** (08:00–19:59).

### 6.3 Ejemplo completo de Capa 4

```
Condiciones: noche despejada, viento 0.5 m/s
T_interpolada = 12.0 °C

calma = 1 − 0.5/1.5 = 0.667
enfriamiento = −2.0 + (−3.0) × 0.667 = −4.0 °C
isla_calor = 0 (nocturno)

T_final = 12.0 + (−4.0) + 0 = 8.0 °C
```

---

## 7. Radiación solar y viento (fusión de estaciones RIA)

La red RIA (Red de Información Agroclimática de Andalucía) proporciona datos horarios de radiación y viento desde dos estaciones cercanas:

- **Baza** (RIA código 1, 718 m)
- **Puebla de Don Fadrique** (RIA código 2, 1017 m)

### 7.1 Fusión por inverso de distancia (IDW)

El modelo pondera las dos estaciones según la distancia a Huéscar:

```
d_Baza    ≈ 42 km  →  w_Baza    ≈ 0.16
d_Puebla  ≈ 20 km  →  w_Puebla  ≈ 0.84
```

Cálculo:

```
R_llano = (R_Baza / d_Baza² + R_Puebla / d_Puebla²) / (1/d_Baza² + 1/d_Puebla²)
```

### 7.2 Modo tormenta (Storm mode)

En condiciones de tormenta o Foehn, las ponderaciones cambian:

```typescript
if (nubosidad ≥ 60% || R_Puebla < R_Baza × 0.8) {
    w_Baza   = 0.70
    w_Puebla = 0.30
}
```

**Fundamento**: Durante el Foehn, el viento del sur (Sierra de la Sagra) arrastra nubes bajas que afectan más a Puebla. Baza, al sur de la sierra, recibe más radiación. La ponderación se desplaza a Baza para reflejar esta asimetría.

### 7.3 Viento a 2 m (FAO-56)

El viento se mide a 10 m en las estaciones RIA. Para el cálculo de ETo se necesita a 2 m:

```
u₂ = u₁₀ × 4.87 / ln(67.8 × 10 − 5.42)
   = u₁₀ × 0.748
```

Además se aplica el **factor de fricción de la vega**:

```typescript
u₂_final = u₂_base × vega_friction_factor  // 0.85
```

Este factor representa la rugosidad del terreno cultivado (árboles, setos, invernaderos) que frena el viento respecto a la estación RIA en campo abierto.

---

## 8. Evapotranspiración de referencia (ETo) — FAO-56 Penman-Monteith

El modelo implementa la ecuación horaria de FAO-56:

```
ETo = [0.408 · Δ · (Rn − G) + γ · (37 / (T + 273)) · u₂ · (e_s − e_a)]
      / [Δ + γ · (1 + 0.34 · u₂)]
```

| Símbolo | Significado | Unidad |
|---|---|---|
| Δ | Pendiente de la curva de presión de vapor | kPa/°C |
| Rn | Radiación neta (asumida 0.77 × Rs) | MJ/m²·h |
| G | Flujo de calor en el suelo (≈ 0 en paso horario) | MJ/m²·h |
| γ | Constante psicrométrica (= 0.000665 × P) | kPa/°C |
| T | Temperatura media horaria | °C |
| u₂ | Velocidad del viento a 2 m | m/s |
| e_s | Presión de vapor saturante | kPa |
| e_a | Presión de vapor actual | kPa |

La radiación solar en W/m² se convierte a MJ/m²·h:

```
Rs_MJ = Rs_Wm2 × 0.0036
```

---

## 9. Riesgo de helada

### 9.1 Clasificación por temperatura crítica

```typescript
function computeFrostRisk(tempC, dewPointC) {
    const critico = Math.min(tempC, dewPointC)
    if (critico ≤ −4) return "muy_alta"
    if (critico ≤ −1) return "alta"
    if (critico ≤  2) return "media"
    return "none"
}
```

La variable crítica es el **mínimo entre temperatura ambiente y punto de rocío**, porque el enfriamiento real de un cultivo está limitado por la condensación (el cambio de fase libera calor latente, frenando el descenso térmico).

### 9.2 Helada negra (Black frost)

Ocurre cuando el punto de rocío está por debajo de 0 °C y la temperatura es ≤ 2 °C:

```
helada_negra = (dewPointC ≤ 0) && (tempC ≤ 2)
```

**Mecanismo físico**: Cuando el rocío está por debajo de 0 °C, el vapor de agua se **sublima** directamente a hielo en lugar de condensar primero como agua líquida. No se libera calor latente de fusión, por lo que el tejido vegetal se enfría más rápido y se forman cristales de hielo **intracelulares** que rompen las membranas. Es la helada más peligrosa para la agricultura.

### 9.3 Ajuste por zonas geográficas

Cada zona del término municipal tiene un ajuste diferencial al riesgo de helada:

```typescript
T_ajustada = T_base + refuerzo_helada × 2
```

| Zona | Refuerzo | Fundamento |
|---|---|---|
| URBAN | −0.3 °C | Isla de calor: 0.3 °C más cálido |
| VEGA | +0.4 °C | Sumidero de frío: 0.8 °C más frío |
| SECANO | +0.2 °C | Albedo alto, suelo desnudo: 0.4 °C más frío |
| MONTE | +0.1 °C | Vegetación: 0.2 °C más frío |
| RESERVOIR | −0.1 °C | Agua modera: 0.2 °C más cálido |

---

## 10. Efecto Foehn (sombra orográfica)

### 10.1 Factor de precipitación

La Sierra de La Sagra (2386 m) y Sierra de la Encantada (~1500 m) fuerzan la elevación del aire húmedo procedente del sur-suroeste. Al ascender se enfría, condensa y precipita en las laderas de barlovento. El aire desciende por la ladera norte (donde está Huéscar) ya seco y recalentado por compresión adiabática.

```
P_llano = P_SanClemente × 0.5
```

El factor de **0.5** (rango observado 0.3–0.6) significa que el llano recibe aproximadamente la mitad de la precipitación que San Clemente, en la sierra.

### 10.2 Detección automática

El modelo detecta condiciones de Foehn cuando:

```
nubosidad ≥ 60%  O  R_Puebla < R_Baza × 0.8
```

La lógica: en Foehn, la nubosidad es alta en las sierras pero la radiación en Baza (sur) es notablemente mayor que en Puebla (norte, en la sombra orográfica).

---

## 11. Referencias científicas

| Concepto | Fuente |
|---|---|
| FAO-56 Penman-Monteith | Allen et al., 1998. *Crop Evapotranspiration*. FAO Irrigation and Drainage Paper 56 |
| Tetens-Magnus (e_s) | Tetens, 1930. *Über einige meteorologische Begriffe*. Z. Geophys. 6:297–309 |
| Atmósfera estándar ISA | ISO 2533:1975. *Standard Atmosphere* |
| Ecuación hipsométrica | Wallace & Hobbs, 2006. *Atmospheric Science*. Academic Press |
| Cold air drainage | Geiger, 1950. *The Climate Near the Ground*. Harvard UP |
| Urban heat island | Oke, 1982. *The energetic basis of the urban heat island*. Q.J.R. Meteorol. Soc. 108:1–24 |
| IDW interpolation | Shepard, 1968. *A two-dimensional interpolation function for irregularly-spaced data*. ACM '68 |
| Perfil logarítmico viento | Monin & Obukhov, 1954. *Basic laws of turbulent mixing in the surface layer*. Tr. Geofiz. Inst. Akad. Nauk SSSR 24:163–187 |
