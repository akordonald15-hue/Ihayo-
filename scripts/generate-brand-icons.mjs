import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('../public/', import.meta.url);
const brand = new URL('brand/', base);
const source = await readFile(new URL('ihayo-app-icon.svg', brand));
for (const [name, size] of [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['app-icon-192.png', 192],
  ['app-icon-512.png', 512],
]) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(name, base)));
}
const original = await readFile(new URL('ihayo-symbol-dark.svg', brand), 'utf8');
const contents = original
  .replace(/^<svg[^>]*>/, '')
  .replace(/<title>.*?<\/title>/, '')
  .replace(/<\/svg>\s*$/, '');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#071D2D"/><g transform="translate(12 12) scale(.625)">${contents}</g></svg>`;
await sharp(Buffer.from(maskable))
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL('app-icon-maskable-512.png', base)));
const variants = await Promise.all(
  ['light', 'dark', 'mono'].map(async (name) => ({
    name,
    svg: (await readFile(new URL(`ihayo-horizontal-${name}.svg`, brand), 'utf8'))
      .replace(/^<svg[^>]*>/, '')
      .replace(/<title>.*?<\/title>/, '')
      .replace(/<\/svg>\s*$/, ''),
  })),
);
const symbols = await Promise.all(
  ['light', 'mono', 'mono-white'].map(async (name) =>
    (await readFile(new URL(`ihayo-symbol-${name}.svg`, brand), 'utf8'))
      .replace(/^<svg[^>]*>/, '')
      .replace(/<title>.*?<\/title>/, '')
      .replace(/<\/svg>\s*$/, ''),
  ),
);
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#EEECE3"/><text x="48" y="52" font-family="Arial" font-size="22" fill="#071D2D">IHAYO / Contours and seed</text><text x="48" y="84" font-family="Arial" font-size="16" fill="#59635E">Original vector identity. Cultivated land, emerging growth, a connected path.</text><rect x="32" y="112" width="560" height="255" rx="4" fill="#F7F4EC"/><rect x="608" y="112" width="560" height="255" rx="4" fill="#071D2D"/><g transform="translate(85 159) scale(2)">${variants[0].svg}</g><g transform="translate(663 159) scale(2)">${variants[1].svg}</g><text x="56" y="342" font-family="Arial" font-size="16" fill="#59635E">PRIMARY / LIGHT</text><text x="632" y="342" font-family="Arial" font-size="16" fill="#D8DFDA">PRIMARY / DARK</text><rect x="32" y="385" width="560" height="335" rx="4" fill="#FFFFFF"/><rect x="608" y="385" width="560" height="335" rx="4" fill="#E2E7DA"/><g transform="translate(85 425) scale(1.9)">${variants[2].svg}</g><g transform="translate(90 570) scale(1.5)">${symbols[0]}</g><g transform="translate(237 570) scale(1.5)">${symbols[1]}</g><rect x="384" y="570" width="96" height="96" rx="4" fill="#071D2D"/><g transform="translate(384 570) scale(1.5)">${symbols[2]}</g><text x="56" y="698" font-family="Arial" font-size="16" fill="#59635E">MONOCHROME / SYMBOL</text><g transform="translate(677 429) scale(2.2)">${source
  .toString()
  .replace(/^<svg[^>]*>/, '')
  .replace(/<title>.*?<\/title>/, '')
  .replace(
    /<\/svg>\s*$/,
    '',
  )}</g><g transform="translate(885 440) scale(.25)">${symbols[1]}</g><g transform="translate(939 436) scale(.375)">${symbols[1]}</g><g transform="translate(1001 432) scale(.5)">${symbols[1]}</g><text x="885" y="490" font-family="Arial" font-size="16" fill="#59635E">16 / 24 / 32 px</text><text x="646" y="632" font-family="Arial" font-size="18" fill="#245A43">Three cultivated contours.</text><text x="646" y="662" font-family="Arial" font-size="18" fill="#245A43">One emerging seed.</text><text x="632" y="698" font-family="Arial" font-size="16" fill="#59635E">APP ICON / SMALL-SIZE CHECK</text></svg>`;
await writeFile(new URL('brand-review.svg', brand), board);
await sharp(Buffer.from(board))
  .png()
  .toFile(fileURLToPath(new URL('brand-review.png', brand)));
console.log('Generated favicon, app icons, maskable icon, and brand review board.');
