`cv-preview.jpg` is the rasterised first page of `../Resume.pdf`, used as the CV
tile preview. An inline `<object>` PDF was unreliable — a plugin paints its own
grey viewer ground, and iOS Safari does not render one inline at all.

Regenerate it whenever Resume.pdf changes:

    magick -density 150 "Resume.pdf[0]" -background white -alpha remove -alpha off \
      -resize 900x -quality 82 static/cv-preview.jpg
