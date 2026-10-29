# Análisis de resultados

Datos tomados de `data/metrics.json` (última medición de cada página y dispositivo, 28/10/2026).

## Resultados

| Página | Dispositivo | FCP | LCP | Speed Index | Performance |
|---|---|---|---|---|---|
| Noticias | Móvil | 2,72 s | 3,47 s | 3,41 s | 76 |
| Desarrollo humano y bienestar | Móvil | 2,76 s | 3,89 s | 3,41 s | 71 |
| Aspirantes | Móvil | 2,58 s | 3,10 s | 6,31 s | 56 |
| Noticias | Escritorio | 0,85 s | 1,08 s | 0,85 s | 97 |
| Desarrollo humano y bienestar | Escritorio | 0,85 s | 0,94 s | 0,95 s | 98 |
| Aspirantes | Escritorio | 0,72 s | 0,92 s | 1,74 s | 96 |

## Mejor y peor rendimiento

- **Mejor:** Desarrollo humano y bienestar en escritorio (98 puntos). Todas sus métricas están en "Bueno".
- **Peor:** Aspirantes en móvil (56 puntos). Es el único caso con una métrica "Deficiente": su Speed Index de 6,31 s supera el límite de 5,8 s.

## Diferencias entre dispositivos

- En escritorio las tres páginas obtienen "Bueno" en todas las métricas (96 a 98 puntos).
- En móvil todas quedan en "Por mejorar" (56 a 76 puntos).
- La brecha de Performance entre escritorio y móvil es de +21 (Noticias), +27 (Bienestar) y +40 puntos (Aspirantes).
- El LCP en móvil es entre 2,2 y 3,0 s más lento. Esto es esperable: el perfil móvil simula una red 4G lenta y un procesador 4 veces más lento que el escritorio.
- Aspirantes es la página con mayor diferencia entre dispositivos, lo que indica que su carga depende mucho de recursos pesados que la conexión móvil penaliza.

## Recomendaciones de mejora

Son hipótesis a validar con la sección "Oportunidades" del reporte de Lighthouse de cada página:

1. **Imágenes:** usar formatos modernos (WebP/AVIF), servirlas al tamaño en que se muestran y cargar con *lazy loading* las que están bajo el pliegue. La imagen principal (la del LCP) debe cargarse con prioridad, no diferida.
2. **Aspirantes (Speed Index alto):** el contenido visible se pinta progresivamente tarde. Revisar sliders, videos o bloques que se cargan después del primer render y priorizar el contenido de la parte superior.
3. **JavaScript y CSS:** reducir y diferir scripts de terceros, minificar y eliminar CSS sin uso.
4. **Fuentes:** precargar las fuentes críticas y usar `font-display: swap`.
5. **Servidor:** activar compresión (gzip/brotli), caché de recursos estáticos y, si es posible, una CDN.

## Variabilidad y limitaciones

Una misma página puede variar entre mediciones. Por ejemplo, Noticias en móvil dio FCP de 1,29 s y 1,37 s en las primeras corridas, y 2,72 s en la última. Por eso se conserva el historial y las conclusiones deben apoyarse en varias ejecuciones, no en una sola.