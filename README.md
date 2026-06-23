# Meteo Huéscar

Aplicación Next.js para observación y estimación meteorológica local de Huéscar y su entorno, con foco en microclima, uso móvil y producto municipal/agro.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest

## Rutas principales

- `/huescar`: portada móvil y resumen local
- `/huescar/agricultura`: capa agronómica
- `/huescar/visualizacion`: gráficas y series
- `/meteo`: panel meteorológico general
- `/motor-climatico`: transparencia del modelo local
- `/admin`: consola operativa

## Arquitectura

- `src/app`: rutas, layouts y endpoints API
- `src/components`: dashboards y paneles UI
- `src/hooks`: consumo cliente con caché de sesión
- `src/services`: fusión de fuentes, correcciones y lógica meteorológica
- `src/lib`: utilidades, caché en memoria y persistencia
- `public/sw.js`: PWA y estrategia offline

## Fuentes de datos

- AEMET
- Open-Meteo
- Miniestaciones locales
- Radar y nowcast
- RIA y servicios auxiliares del modelo

## Comandos

```bash
npm run dev
npm run build
npm run test
npm exec eslint src
```

## Variables de entorno

Revisa `.env.example`. Las más relevantes para ejecutar el modelo completo son:

- `AEMET_API_KEY`
- `AEMET_TIMEOUT_MS`
- `GROUND_TRUTH_NODE_CODE`
- credenciales de base de datos y persistencia local

## Estrategia de renderizado

- La home de `/huescar` hidrata datos iniciales en servidor para reducir espera en móvil.
- Los hooks cliente reutilizan `sessionStorage` para evitar refetch inmediato.
- La API `/api/weather/current` devuelve `503` cuando no hay datos operativos, en vez de inventar ceros.

## Offline y PWA

- Precarga de rutas clave e iconos
- `network-first` para `/api/weather/*`
- `network-first` para navegación con fallback offline a `/huescar`
- `cache-first` para assets estáticos

## Estado actual

- Build de producción operativa
- Suite de tests con Vitest
- Deuda de lint todavía existente en áreas antiguas del proyecto, sobre todo tipado `any` y algunos componentes legacy
