`cv-preview.jpg` is the rasterised first page of `../Resume.pdf`, used as the CV
tile preview. An inline `<object>` PDF was unreliable — a plugin paints its own
grey viewer ground, and iOS Safari does not render one inline at all.

Regenerate it whenever Resume.pdf changes:

    magick -density 150 "Resume.pdf[0]" -background white -alpha remove -alpha off \
      -resize 900x -quality 82 static/cv-preview.jpg

The icons (`favicon.ico`, `favicon-256.png`, `apple-touch-icon.png`) are the
page's 3D glass logo, rendered by `tools/favicon.html` from the same material as
`logo3d.js`. To regenerate: open `tools/favicon.html` from the dev server, take
`window.__favicon` (a PNG data URL) and save it as `favicon-256.png`, then

    magick static/favicon-256.png -resize 180x180 static/apple-touch-icon.png
    magick static/favicon-256.png -define icon:auto-resize=48,32,16 static/favicon.ico
