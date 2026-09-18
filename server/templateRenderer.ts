import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getTemplateById } from './templates/definitions';
import { TemplateDefinition, TemplateZone, RenderTemplateInput } from './templates/types';

// In-memory cache for fonts to guarantee zero repeated I/O latency
let fontRegularBuffer: Buffer | null = null;
let fontBoldBuffer: Buffer | null = null;

function loadFontBuffers(): { regular: Buffer; bold: Buffer } {
  if (fontRegularBuffer && fontBoldBuffer) {
    return { regular: fontRegularBuffer, bold: fontBoldBuffer };
  }

  const candidatePathsRegular = [
    path.join(process.cwd(), 'server', 'fonts', 'LiberationSans-Regular.ttf'),
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ];

  const candidatePathsBold = [
    path.join(process.cwd(), 'server', 'fonts', 'LiberationSans-Bold.ttf'),
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
  ];

  for (const p of candidatePathsRegular) {
    if (fs.existsSync(p)) {
      fontRegularBuffer = fs.readFileSync(p);
      break;
    }
  }

  for (const p of candidatePathsBold) {
    if (fs.existsSync(p)) {
      fontBoldBuffer = fs.readFileSync(p);
      break;
    }
  }

  if (!fontRegularBuffer) {
    throw new Error('Could not locate a TTF font for Satori rendering.');
  }
  if (!fontBoldBuffer) {
    fontBoldBuffer = fontRegularBuffer;
  }

  return { regular: fontRegularBuffer, bold: fontBoldBuffer };
}

/**
 * Resolves an image URL (local file path, data URI, or remote HTTP URL) into a base64 Data URI.
 * Safely falls back to null if unreachable or invalid, preventing 500s or crashes.
 */
async function resolveImageToDataUri(inputUrl?: string): Promise<string | null> {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;

  // Already a data URI
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Local uploads path: e.g. /uploads/comp_123/asset_456.jpg
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    try {
      const cleanPath = trimmed.replace(/^\//, '');
      const fullDiskPath = path.join(process.cwd(), cleanPath);
      if (fs.existsSync(fullDiskPath)) {
        const fileBuffer = await fs.promises.readFile(fullDiskPath);
        const ext = path.extname(fullDiskPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${fileBuffer.toString('base64')}`;
      }
    } catch (diskErr: any) {
      console.warn('[templateRenderer] Warning resolving local disk image:', diskErr?.message);
    }
  }

  // Remote HTTP(S) URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast rendering

      const res = await fetch(trimmed, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Aaditech-Social-Renderer/1.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return `data:${contentType};base64,${base64}`;
      }
    } catch (netErr: any) {
      console.warn('[templateRenderer] Network fetch for image failed, falling back:', netErr?.message);
    }
  }

  return null;
}

/**
 * Creates a clean SVG placeholder Data URI when genuine images are missing or broken
 */
function createFallbackImageUri(primaryColor: string, label: string): string {
  const safeLabel = label.replace(/[<>&"]/g, '');
  const svg = `<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor || '#3b82f6'}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <circle cx="400" cy="360" r="80" fill="#ffffff" fill-opacity="0.1"/>
    <path d="M360 380 L400 330 L440 380 Z" fill="#ffffff" fill-opacity="0.3"/>
    <text x="400" y="490" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">
      ${safeLabel}
    </text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Creates a stylish monogram logo Data URI if company has no uploaded logo
 */
function createMonogramLogoUri(businessName: string, primaryColor: string): string {
  const initials = (businessName || 'Business')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'B';

  const svg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" rx="40" fill="${primaryColor || '#4f46e5'}"/>
    <text x="100" y="125" font-family="sans-serif" font-size="75" font-weight="bold" fill="#ffffff" text-anchor="middle">
      ${initials}
    </text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function resolveColor(
  rawColor: string | undefined,
  primary: string,
  secondary: string,
  fallback: string,
  accent?: string
): string {
  if (!rawColor) return fallback;
  if (rawColor === 'primary') return primary;
  if (rawColor === 'secondary') return secondary;
  if (rawColor === 'accent') return accent || secondary;
  return rawColor;
}

/**
 * Translates a template zone into a Satori-compatible VNode object
 */
function buildZoneNode(
  zone: TemplateZone,
  data: RenderTemplateInput,
  resolvedPhotoUri: string | null,
  resolvedLogoUri: string | null,
  primaryColor: string,
  secondaryColor: string,
  accentColor?: string
): any {
  const { position, style, type, contentKey, staticText } = zone;

  const resolvedBg = resolveColor(style.backgroundColor, primaryColor, secondaryColor, 'transparent', accentColor);
  const resolvedColor = resolveColor(style.color, primaryColor, secondaryColor, '#ffffff', accentColor);
  const resolvedBorder = resolveColor(style.borderColor, primaryColor, secondaryColor, 'transparent', accentColor);

  const baseContainerStyle: any = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    display: 'flex',
    overflow: 'hidden',
  };

  if (resolvedBg !== 'transparent') baseContainerStyle.backgroundColor = resolvedBg;
  if (style.borderRadius) baseContainerStyle.borderRadius = style.borderRadius;
  if (style.opacity !== undefined) baseContainerStyle.opacity = style.opacity;
  if (style.borderWidth) {
    baseContainerStyle.borderWidth = style.borderWidth;
    baseContainerStyle.borderStyle = 'solid';
    baseContainerStyle.borderColor = resolvedBorder;
  }
  if (style.padding) baseContainerStyle.padding = style.padding;

  // 1. Shape Zone
  if (type === 'shape') {
    return {
      type: 'div',
      props: {
        style: baseContainerStyle,
      },
    };
  }

  // 2. Image / Photo Zone
  if (type === 'image') {
    const photoSrc = resolvedPhotoUri || createFallbackImageUri(primaryColor, data.businessName || 'Business Showcase');
    return {
      type: 'div',
      props: {
        style: {
          ...baseContainerStyle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        children: [
          {
            type: 'img',
            props: {
              src: photoSrc,
              style: {
                width: '100%',
                height: '100%',
                objectFit: style.objectFit || 'cover',
                borderRadius: style.borderRadius || 0,
              },
            },
          },
        ],
      },
    };
  }

  // 3. Logo Zone
  if (type === 'logo') {
    const logoSrc = resolvedLogoUri || createMonogramLogoUri(data.businessName || 'Brand', primaryColor);
    return {
      type: 'div',
      props: {
        style: {
          ...baseContainerStyle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        children: [
          {
            type: 'img',
            props: {
              src: logoSrc,
              style: {
                width: '100%',
                height: '100%',
                objectFit: style.objectFit || 'contain',
                borderRadius: style.borderRadius || 0,
              },
            },
          },
        ],
      },
    };
  }

  // 4. Text Zone
  let textContent = '';
  if (contentKey === 'headline') {
    textContent = data.headline || 'Premier Business Solutions';
  } else if (contentKey === 'caption') {
    textContent = data.caption || 'Delivering trusted high-quality service tailored to your growth.';
  } else if (contentKey === 'ctaText') {
    textContent = data.ctaText || 'Learn More';
  } else if (contentKey === 'businessName') {
    textContent = data.businessName || 'Aaditech Solution';
  } else if (contentKey === 'tag') {
    textContent = data.tag || staticText || 'FEATURED';
  } else if (staticText) {
    textContent = staticText;
  }

  // Formatting & scaling
  const textStyle: any = {
    ...baseContainerStyle,
    flexDirection: 'column',
    justifyContent: style.textAlign === 'center' ? 'center' : 'center',
    alignItems: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
    textAlign: style.textAlign || 'left',
    color: resolvedColor,
    fontSize: style.fontSize || 24,
    fontWeight: style.fontWeight === 'bold' || Number(style.fontWeight) >= 700 ? 700 : 400,
    lineHeight: style.lineHeight || 1.25,
  };

  if (style.textTransform) textStyle.textTransform = style.textTransform;
  if (style.letterSpacing) textStyle.letterSpacing = style.letterSpacing;

  return {
    type: 'div',
    props: {
      style: textStyle,
      children: textContent,
    },
  };
}

/**
 * Core rendering engine: composites a template definition and data into a high-res PNG Buffer.
 */
export async function renderTemplateToImage(
  templateId: string,
  data: RenderTemplateInput
): Promise<Buffer> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found for id: "${templateId}"`);
  }

  const primaryColor = data.primaryColor || '#4f46e5';
  const secondaryColor = data.secondaryColor || '#06b6d4';
  const accentColor = data.accentColor || secondaryColor;

  // Pre-fetch images to base64 data URIs in parallel with timeout safeguards
  const [resolvedPhotoUri, resolvedLogoUri] = await Promise.all([
    resolveImageToDataUri(data.photoUrl),
    resolveImageToDataUri(data.logoUrl),
  ]);

  // Load TTF fonts (cached in-memory)
  const fonts = loadFontBuffers();

  // Construct Satori VNode tree
  const zoneNodes = template.zones.map((zone) =>
    buildZoneNode(zone, data, resolvedPhotoUri, resolvedLogoUri, primaryColor, secondaryColor, accentColor)
  );

  const rootElement = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: template.canvas.width,
        height: template.canvas.height,
        backgroundColor: template.defaultBackground || '#0f172a',
        overflow: 'hidden',
        fontFamily: 'Liberation Sans',
      },
      children: zoneNodes,
    },
  };

  // Render to SVG via Satori
  const svg = await satori(rootElement, {
    width: template.canvas.width,
    height: template.canvas.height,
    fonts: [
      {
        name: 'Liberation Sans',
        data: fonts.regular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Liberation Sans',
        data: fonts.bold,
        weight: 700,
        style: 'normal',
      },
    ],
  });

  // Rasterize SVG to PNG Buffer via Resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: template.canvas.width,
    },
  });

  const pngData = resvg.render();
  return pngData.asPng();
}
