# Análisis de viabilidad y diferenciación — Meteo Huéscar

## 1. Viabilidad técnica ✅ Alta

Estado actual del producto:

- Web app (Next.js 16, Turbopack) → ✅ Funcionando
- API de datos (Open-Meteo + AEMET) → ✅ Integrada
- Miniestaciones locales → ❌ Pendiente
- Radar con marcador Huéscar → ✅ Funcionando
- Versión gratuita pública (/tiempo) → ✅ Publicada
- Panel completo (/meteo) → ✅ Publicado
- Widget Ayuntamiento (/widget) → ✅ Publicado
- PWA instalable → ✅ Configurada
- Propuesta Ayuntamiento (1.200 €/año) → 📄 Documentada
- Textos para Facebook → 📄 Preparados

Riesgos técnicos:
- Dependencia de APIs gratuitas (Open-Meteo, AEMET) – pueden cambiar términos o tener límites
- AEMET tiene retardo de ~30-90 min incluso en automáticas → las miniestaciones propias como solución
- Hosting en Vercel Hobby: suficiente pero cron limitado a 1 ejecución/día
- Sin tests de integración para las APIs externas

Veredicto técnico: El producto funciona y es estable. Riesgo técnico bajo.

---

## 2. Viabilidad de mercado ✅ Media-alta

Fortalezas:
- Hiperlocal: Huéscar y comarca no tienen servicio meteorológico propio
- Agricultura y ganadería relevantes (cereal, almendro, ovino segureño)
- Turismo rural creciente (Geoparque, La Sagra, casas cueva)
- Alcalde ha mostrado interés
- Producto gratuito público funciona como escaparate

Debilidades:
- Población pequeña: Huéscar ~7.200 hab., comarca ~15.000 hab.
- Cultura de "el tiempo lo miro en Google/AEMET"
- Sin tráfico orgánico significativo al principio
- Agricultores pueden ser reacios a pagar por datos meteorológicos

Oportunidades:
- Extensión a los 6 municipios de la comarca (~15.000 hab.)
- Posible expansión a comarca de Baza (+37.000 hab.)
- Datos de miniestaciones como diferenciador real frente a AEMET/Google
- Patrocinio local (agrotiendas, cooperativas, talleres, seguros)
- Colaboración con asociaciones agrícolas/ganaderas

Amenazas:
- AEMET es gratuita y "suficiente" para público general
- Apps móviles establecidas (elTiempo.es, Weather.com, AEMET)
- Ayuntamiento puede decir que no hay presupuesto
- Dependencia de APIs externas gratuitas

---

## 3. Modelos de ingresos

### Escenario 1: Solo Ayuntamiento (mínimo)
| Concepto | Ingreso anual |
|---|---|
| Licencia anual Ayuntamiento Huéscar | 1.200 € |
| Total | 1.200 € |

### Escenario 2: Ayuntamiento + 1 patrocinador local
| Concepto | Ingreso anual |
|---|---|
| Licencia anual Ayuntamiento | 1.200 € |
| Patrocinador local (100 €/mes) | 1.200 € |
| Total | 2.400 € |

### Escenario 3: Ayuntamiento + patrocinio + comarca
| Concepto | Ingreso anual |
|---|---|
| Licencia anual Ayuntamiento | 1.200 € |
| Patrocinador local (100 €/mes) | 1.200 € |
| 2 municipios comarca (600 €/año c/u) | 1.200 € |
| Total | 3.600 € |

### Escenario 4: Completo (con suscripciones Pro)
| Concepto | Ingreso anual |
|---|---|
| Licencia anual Ayuntamiento | 1.200 € |
| 1 patrocinador local (100 €/mes) | 1.200 € |
| 3 municipios comarca (600 €/año) | 1.800 € |
| 30 suscriptores Pro (5 €/mes) | 1.800 € |
| 1 cooperativa/asociación (600 €/año) | 600 € |
| Total | 6.600 € |

---

## 4. Costes estimados

| Concepto | Coste anual |
|---|---|
| Dominio (.com o .es) | ~15 € |
| Vercel Hobby (gratuito) | 0 € |
| API AEMET (gratuita con key) | 0 € |
| API Open-Meteo (gratuita) | 0 € |
| Miniestación (coste único ~30-80 €/ud) | 0-80 € |
| Tiempo de mantenimiento (~2-4 h/mes) | Variable |
| Total costes directos | ~15-100 €/año |

Gastos casi nulos. El 100% de los ingresos es margen.

---

## 5. Rentabilidad por escenario

| Escenario | Ingreso | Coste | Margen | Horas/mes |
|---|---|---|---|---|
| Mínimo (solo Ayto) | 1.200 € | 15 € | 98.7% | ~2-3 h |
| Medio (Ayto + patrocinio) | 2.400 € | 15 € | 99.4% | ~3-5 h |
| Crecimiento (comarca + Pro) | 3.600 € | 50 € | 98.6% | ~5-8 h |
| Completo | 6.600 € | 100 € | 98.5% | ~8-12 h |

Ratio hora/trabajo: ~40-55 €/hora en todos los escenarios.

---

## 6. Riesgos reales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Ayuntamiento no paga | Media | Alto | Versión gratuita + patrocinio |
| Agricultores no pagan suscripción | Alta | Medio | Cooperativas mejor que individual |
| APIs gratuitas caen | Baja | Alto | Miniestaciones propias |
| Poco tráfico | Media | Alto | Redes sociales, contacto local |
| Competencia AEMET/Google | Alta | Bajo | Somos hiperlocal, ellos no |

---

## 7. Veredicto económico

¿Puede ser rentable? Sí, como micro-negocio local.

- Con 1.200 €/año del Ayuntamiento ya cubre costes y deja margen.
- Con 2.400-3.600 €/año es ingreso complementario sólido.
- Con 6.000+ €/año empieza a tener recorrido serio.

¿Merece la pena?
1. Ingreso complementario de 100-300 €/mes con poco mantenimiento.
2. Carta de presentación profesional.
3. Servicio útil para tu pueblo que además se paga solo.
4. Base técnica vendible a otros municipios.

No merece la pena si esperas: hacerte rico, miles de suscriptores, crecimiento exponencial. Es negocio de proximidad, no SaaS global.

---

## 8. Lo que las apps generales NO hacen (diferenciación)

### Microclima real del municipio
Las apps usan el punto de rejilla del modelo meteorológico (~9 km²). Ignoran:
- El embalse de San Clemente a 0.28 km de la estación 5051X
- La inversión térmica nocturna en la vega (hasta 4-5°C menos)
- El efecto valle que canaliza el viento
- La altitud real (953 m casco urbano, 1101 m estación)
- El relieve local (La Sagra, sierra Encantada)

Ninguna app general hace corrección microclimática local. Nosotros ya la tenemos implementada.

### Interpretación para agricultura y ganadería local
> "Riesgo de helada en la vega esta noche. Almendro en flor: proteger. Oveja segureña: sin estrés térmico."

Eso no lo hace nadie. Y es lo que un agricultor/ganadero local necesita realmente.

### Tabla comparativa

| Característica | AEMET | elTiempo.es | Google Weather | Meteo Huéscar |
|---|---|---|---|---|
| Datos para Huéscar | ✅ | ✅ | ✅ | ✅ |
| Microclima local | ❌ | ❌ | ❌ | ✅ |
| Corrección por embalse | ❌ | ❌ | ❌ | ✅ |
| Inversión nocturna por zona | ❌ | ❌ | ❌ | ✅ |
| Aviso agrícola local | ❌ | ❌ | ❌ | ✅ (potencial) |
| Estrés térmico ganadero | ❌ | ❌ | ❌ | ✅ (implementado) |
| Radar con marcador local | ❌ | ❌ | ❌ | ✅ |
| Panel para Ayuntamiento | ❌ | ❌ | ❌ | ✅ |
| Datos por zona/pedanía | ❌ | ❌ | ❌ | ✅ (potencial) |
| Mini estaciones locales | ❌ | ❌ | ❌ | ✅ (futuro) |
| PWA instalable | ❌ | ✅ (app nativa) | ❌ | ✅ |
| Personalización municipal | ❌ | ❌ | ❌ | ✅ |
| Gratuito | ✅ | ✅ | ✅ | ✅ |

### Dónde está el valor real
El valor no está en más datos. Está en:
1. **Datos interpretados** – "helada en la vega" no es lo mismo que "2°C a las 7:00"
2. **Datos locales reales** – Miniestaciones, corrección por altitud, inversión, embalse
3. **Datos accionables** – "Hoy puedes labrar", "protege los almendros", "el ganado no sufre estrés"
4. **Datos institucionales** – El Ayuntamiento tiene su propio panel, su propio servicio
5. **Datos comarcales** – Castilléjar, Castril, Galera, Orce, Puebla de Don Fadrique

### Estrategia de posicionamiento
No competir con elTiempo.es. Competir en el nicho donde ellos no pueden ganar:

> "El tiempo explicado para quien vive en Huéscar, trabaja en el campo, y necesita saber qué implica, no solo cuántos grados hace."

Temperatura, viento, radar es commodity. La interpretación local es lo que ninguna app general tiene.

---

## 9. Hoja de ruta para rentabilidad

- Fase 1 (ahora): Versión gratuita pública + redes sociales. Coste: 0 €. Ingreso: 0 €.
- Fase 2 (1-3 meses): Propuesta Ayuntamiento (1.200 €/año) + 1 patrocinador local (100 €/mes). Coste: 15 €. Ingreso: 1.200-2.400 €/año.
- Fase 3 (3-6 meses): 1ª miniestación propia + lista de espera Pro agrícola. Coste: 50 €. Ingreso: 2.400-3.600 €/año.
- Fase 4 (6-12 meses): 1-2 municipios comarca + 5-10 suscriptores Pro. Coste: 80 €. Ingreso: 3.600-5.000 €/año.
