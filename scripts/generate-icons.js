import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const publicDir = path.resolve('public');
  const iconsDir = path.resolve('public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Source image from local asset or fetch remote if available
  const localSource = path.resolve('src/assets/images/yego_logo_branding_1786814482141.jpg');
  let sourceBuffer;

  try {
    const res = await fetch('https://i.ibb.co/zTL4DCKf/download-Ny-C-logo-removebg-preview.png');
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      sourceBuffer = Buffer.from(arrayBuffer);
      console.log('Fetched high-res transparent logo from remote');
    }
  } catch (e) {
    console.log('Falling back to local source image');
  }

  if (!sourceBuffer && fs.existsSync(localSource)) {
    sourceBuffer = fs.readFileSync(localSource);
  }

  if (!sourceBuffer) {
    console.error('No source logo available!');
    return;
  }

  const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512];

  for (const size of sizes) {
    // Generate clean padded transparent icon
    const padding = Math.round(size * 0.08); // 8% padding to ensure perfect fit without clipping
    const innerSize = size - padding * 2;

    const resizedLogo = await sharp(sourceBuffer)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Also create maskable icon with solid #23285E background for Android adaptive icons
  const maskable512Inner = await sharp(sourceBuffer)
    .resize(380, 380, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 35, g: 40, b: 94, alpha: 1 }, // #23285E
    },
  })
    .composite([{ input: maskable512Inner, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  const maskable192Inner = await sharp(sourceBuffer)
    .resize(140, 140, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 35, g: 40, b: 94, alpha: 1 }, // #23285E
    },
  })
    .composite([{ input: maskable192Inner, gravity: 'center' }])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  // Copy standard key icons to /public for direct accessibility
  fs.copyFileSync(path.join(iconsDir, 'icon-32x32.png'), path.join(publicDir, 'favicon.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-180x180.png'), path.join(publicDir, 'apple-touch-icon.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-192x192.png'), path.join(publicDir, 'icon-192.png'));
  fs.copyFileSync(path.join(iconsDir, 'icon-512x512.png'), path.join(publicDir, 'icon-512.png'));

  // Generate Open Graph 1200x630 branded card
  const ogLogo = await sharp(sourceBuffer)
    .resize(400, 400, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // Create SVG banner background with title
  const svgOverlay = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#23285E"/>
      <circle cx="1050" cy="150" r="300" fill="#3591C8" opacity="0.2"/>
      <circle cx="150" cy="550" r="250" fill="#E6E65A" opacity="0.15"/>
      <text x="520" y="240" font-family="Arial, sans-serif" font-size="52" font-weight="bold" fill="#FFFFFF">NYABIHU YEGO CENTER</text>
      <text x="520" y="310" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="#E6E65A">Youth Services &amp; Attendance Platform</text>
      <text x="520" y="380" font-family="Arial, sans-serif" font-size="22" fill="#DFF8F5">Digital Attendance, Statistical Reporting &amp; Youth Services</text>
      <text x="520" y="440" font-family="Arial, sans-serif" font-size="20" fill="#A0AEC0">Nyabihu District, Western Province, Rwanda</text>
    </svg>
  `);

  await sharp(svgOverlay)
    .composite([{ input: ogLogo, top: 115, left: 70 }])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('All icons and Open Graph image generated successfully!');
}

generateIcons().catch(console.error);
