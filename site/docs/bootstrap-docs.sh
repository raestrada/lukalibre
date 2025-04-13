#!/bin/bash

echo "Inicializando estructura de documentación LukaLibre con Just the Docs..."

# Crear carpetas principales
mkdir -p conceptos/{ahorro,deuda,estafas,derechos,finanzas_basicas,afp_apv,bancos,simuladores,herramientas,fomo,trading_magico}

# Configuración mínima para Just the Docs
cat <<EOF > _config.yml
title: "LukaLibre Docs"
remote_theme: just-the-docs/just-the-docs
search_enabled: true
color_scheme: light
EOF

# Página principal
cat <<EOF > index.md
# 📚 Centro de Conocimiento LukaLibre

Bienvenido al centro de información financiera realista en lenguaje chileno.

## Secciones sugeridas:

- [Ahorro](conceptos/ahorro/index.md)
- [Deuda](conceptos/deuda/index.md)
- [Estafas](conceptos/estafas/index.md)
- [Tus derechos](conceptos/derechos/index.md)
- [Finanzas básicas](conceptos/finanzas_basicas/index.md)
- [AFP, APV y pensiones](conceptos/afp_apv/index.md)
- [Cómo funcionan los bancos](conceptos/bancos/index.md)
- [Simuladores y calculadoras](conceptos/simuladores/index.md)
- [Herramientas recomendadas](conceptos/herramientas/index.md)
- [FOMO y promesas falsas](conceptos/fomo/index.md)
- [Trading mágico y pseudociencia](conceptos/trading_magico/index.md)
EOF

# Placeholder general para carpetas principales
for section in ahorro deuda estafas derechos finanzas_basicas afp_apv bancos simuladores herramientas fomo; do
  cat <<EOF > conceptos/$section/index.md
# ${section^}

Este contenido está en desarrollo. Pronto encontrarás aquí información útil, clara y sin chamullo sobre **$section**.

✍️ *Puedes contribuir en GitHub si quieres ayudarnos a completarlo.*
EOF
done

# Sección especial para Trading Mágico
cat <<EOF > conceptos/trading_magico/index.md
# Trading mágico y predicciones pseudocientíficas

Algunos te venden que con triángulos, líneas doradas, retrocesos místicos o indicadores "secretos" pueden predecir el mercado.

Este tipo de análisis se basa en patrones geométricos sin validez científica, ilusiones visuales y mucha fe. A menudo son parte de cursos caros o estafas que alimentan el FOMO.

📌 *Este documento te ayudará a identificar prácticas de "análisis técnico" sin sustento y evitar caer en trampas bien disfrazadas.*

📚 Ejemplos a cubrir:
- Figuras geométricas tipo "banderas", "tazas con asa" y "hombros-cabeza-hombros"
- "Canales" y "retrocesos de Fibonacci"
- Supuestas predicciones basadas en ciclos lunares, astrología financiera o magia numérica
- Influencers de TikTok y YouTube con promesas vacías

✍️ *Contribuye con ejemplos reales, explicaciones simples y argumentos racionales.*
EOF

# FOMO temas adicionales
cat <<EOF > conceptos/fomo/bitcoin.md
# Bitcoin y criptomonedas

Mucho se habla de Bitcoin como libertad financiera total. Pero también hay mucho verso.

📌 *Por implementar.*
EOF

cat <<EOF > conceptos/fomo/libertad-financiera.md
# El mito de la libertad financiera rápida

¿Dejar todo y vivir de rentas a los 30? ¿Y si en realidad solo te quieren vender cursos?

📌 *Por implementar.*
EOF

cat <<EOF > conceptos/fomo/mentores-y-estafas.md
# Mentores, coaches y otras estafas con corbata

Algunos creen que te ayudan. Otros directamente te sacan plata. Acá aprenderás a distinguirlos.

📌 *Por implementar.*
EOF

echo "✅ Documentación LukaLibre inicial generada con secciones completas, incluyendo 'Trading mágico' como sección separada."
