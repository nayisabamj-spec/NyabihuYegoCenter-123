import { BRAND_CONFIG } from '../constants/branding';

interface LoadedLogoResult {
  base64: string; // raw base64 string without data:image/... prefix
  dataUrl: string; // full data:image/png;base64,... URL
  extension: 'png' | 'jpeg';
  width: number;
  height: number;
}

// In-memory cache for fast repeated exports
let cachedLogo: LoadedLogoResult | null = null;
let lastLogoUrl: string | null = null;

/**
 * Creates an in-memory high-res vector canvas fallback of the official Nyabihu YEGO emblem
 */
function createFallbackLogoDataUrl(): LoadedLogoResult {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Background transparent
    ctx.clearRect(0, 0, 240, 240);

    // Outer Circle (Primary Navy #23285E)
    ctx.fillStyle = '#23285E';
    ctx.beginPath();
    ctx.arc(120, 120, 110, 0, Math.PI * 2);
    ctx.fill();

    // Yellow Sunburst Rays (#E6E65A)
    ctx.strokeStyle = '#E6E65A';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = 120 + Math.cos(angle) * 75;
      const y1 = 120 + Math.sin(angle) * 75;
      const x2 = 120 + Math.cos(angle) * 98;
      const y2 = 120 + Math.sin(angle) * 98;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Secondary Teal Mountain Peak (#3591C8)
    ctx.fillStyle = '#3591C8';
    ctx.beginPath();
    ctx.moveTo(50, 190);
    ctx.lineTo(110, 125);
    ctx.lineTo(170, 175);
    ctx.lineTo(200, 140);
    ctx.lineTo(205, 190);
    ctx.closePath();
    ctx.fill();

    // Yellow Sun (#E6E65A)
    ctx.fillStyle = '#E6E65A';
    ctx.beginPath();
    ctx.arc(120, 95, 18, 0, Math.PI * 2);
    ctx.fill();

    // White Arch of Empowerment (#FFFFFF)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(120, 155, 45, 20, 0, 0, Math.PI);
    ctx.fill();

    // Small Gold Stars
    ctx.fillStyle = '#E6E65A';
    ctx.beginPath();
    ctx.arc(175, 75, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

  return {
    base64,
    dataUrl,
    extension: 'png',
    width: 240,
    height: 240,
  };
}

/**
 * Loads an image from a URL and converts it to a clean base64 string
 */
function loadImageAsBase64(url: string): Promise<LoadedLogoResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 200;
        canvas.height = img.naturalHeight || 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        ctx.drawImage(img, 0, 0);
        const isJpeg = url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg');
        const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType);
        const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

        resolve({
          base64,
          dataUrl,
          extension: isJpeg ? 'jpeg' : 'png',
          width: canvas.width,
          height: canvas.height,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Master logo resolver with 3-tier fallback to guarantee image availability in exports
 */
export async function getOfficialLogoBase64(customUrl?: string | null): Promise<LoadedLogoResult> {
  const targetUrl = customUrl?.trim() || BRAND_CONFIG.logoUrl;

  if (cachedLogo && lastLogoUrl === targetUrl) {
    return cachedLogo;
  }

  // Tier 1: Try configured URL
  if (targetUrl) {
    try {
      const result = await loadImageAsBase64(targetUrl);
      cachedLogo = result;
      lastLogoUrl = targetUrl;
      return result;
    } catch {
      // Proceed to next tier
    }
  }

  // Tier 2: Try local bundled favicon/app icon
  try {
    const localResult = await loadImageAsBase64('/icon-192.png');
    cachedLogo = localResult;
    lastLogoUrl = targetUrl;
    return localResult;
  } catch {
    // Proceed to fallback canvas
  }

  // Tier 3: Vector Canvas Emblem
  const fallback = createFallbackLogoDataUrl();
  cachedLogo = fallback;
  lastLogoUrl = targetUrl;
  return fallback;
}
