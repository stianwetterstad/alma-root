(async () => {
  const sharp = require('sharp');
  const fs = require('fs');
  const path = require('path');

  const width = 1200;
  const height = 240;

  // Create SVG matching delingsduellen.png style with better color and wider canvas
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
          <stop offset="25%" style="stop-color:#ffbf00;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ffa500;stop-opacity:1" />
          <stop offset="75%" style="stop-color:#ff8c00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff6b35;stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-opacity="0.7" flood-color="#000000"/>
          <feDropShadow dx="0" dy="10" stdDeviation="8" flood-opacity="0.4" flood-color="#1a1a1a"/>
        </filter>
      </defs>
      <!-- Main text with stroke and shadow -->
      <text x="${width/2}" y="${height * 0.68}" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="900" text-anchor="middle" fill="url(#titleGradient)" stroke="#1a1a1a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" filter="url(#shadow)" letter-spacing="-3">Delingsduellen</text>
    </svg>
  `;

  try {
    const outputPath = path.join(__dirname, 'laering/delingsduellen/assets/delingsduellen-title.png');
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log('✓ Title image regenerated with better colors and wider canvas: ' + outputPath);
  } catch (err) {
    console.error('Error generating image:', err.message);
  }
})();
