/** Bump on every card redesign. The public site shows only quotes rendered at
    this revision, so restyled cards surface as they are re-rendered. */
export const cardRevision = 2

/** Quote card layout tokens (matches bby1–bby3: 600×750). */
export const quoteCard = {
  width: 600,
  height: 750,
  bg: '#0a140e',
  padX: 52,
  /** Matching top (#) and bottom (author + site) chrome bands. */
  sectionH: 150,
  /** Vignette + grain; Be mark = site `brand.mark` (top-left chip).
      `bg.png` is grayscale, so the wash color is what sets the card hue. */
  layers: {
    bg: 'bg.png',
    grain: 'grain.png',
    grainOpacity: 0.35,
    bgOverlay: 0.55,
    bgOverlayColor: '#0a2e1c',
  },
  /** Top bar: Be chip left, serial right — chip diameter tracks `number.size`. */
  number: {
    size: 45,
    font: 'BungeeShade',
    color: '#e4f7ec',
    circle: '#0a140e',
    circleScale: 1.35,
  },
  quote: {
    font: 'NovaRound',
    size: 34,
    firstCharSize: 64,
    color: '#e4f7ec',
    lineHeight: 1.39,
    maxChars: 180,
    maxLines: 8,
  },
  meta: {
    font: 'Jost',
    size: 17,
    color: '#e4f7ec',
    lineHeight: 1.4,
  },
}

/** 9:16 Short layout — same chrome as the card, scaled to 1080 wide. */
const shortScale = 1080 / quoteCard.width
export const quoteShort = {
  ...quoteCard,
  width: 1080,
  height: 1920,
  padX: Math.round(quoteCard.padX * shortScale),
  sectionH: Math.round(quoteCard.sectionH * shortScale),
  /** Extra footer so author/site sit above YouTube’s caption + audio pill. */
  footerH: 500,
  number: { ...quoteCard.number, size: Math.round(quoteCard.number.size * shortScale) },
  quote: {
    ...quoteCard.quote,
    size: Math.round(quoteCard.quote.size * shortScale),
    firstCharSize: Math.round(quoteCard.quote.firstCharSize * shortScale),
  },
  meta: { ...quoteCard.meta, size: Math.round(quoteCard.meta.size * shortScale) },
  fps: 30,
  beat: 1.15,
  hold: 3.6,
  hook: 0.7,
  end: 1.4,
  endText: 'Follow for daily quotes.',
  maxSeconds: 18,
  fallbackSeconds: 8,
  /** Fade-through-black on layout changes (hook → quote, quote → end). */
  crossfade: 0.3,
  /** Short dissolve while lines accumulate in the same layout. */
  lineFade: 0.15,
  /** Licensed instrumentals (no vocals). Tagged quotes pick a stable bed; untagged → random. Missing → drone. */
  musicDir: 'assets/shorts',
}

/**
 * Short presentation presets. Encode merges one onto `quoteShort`.
 * Same tags → same style (seeded); untagged → slug seed. Music uses a different salt.
 * Differences are intentionally loud (type + timing) so feeds don’t look identical.
 */
export const quoteShortStyles = [
  { id: 'classic' },
  {
    id: 'punch',
    hook: 1.4,
    beat: 0.9,
    hold: 2.8,
    end: 0.9,
    crossfade: 0.2,
    lineFade: 0.1,
    padX: Math.round(quoteShort.padX * 0.9),
    quote: {
      size: Math.round(quoteShort.quote.size * 1.15),
      firstCharSize: Math.round(quoteShort.quote.firstCharSize * 1.18),
      lineHeight: 1.3,
    },
    layers: {
      ...quoteShort.layers,
      bgOverlay: 0.45,
      bgOverlayColor: '#0f3d28',
    },
  },
  {
    id: 'soft',
    hook: 0.45,
    beat: 1.35,
    hold: 5,
    end: 1.8,
    crossfade: 0.5,
    lineFade: 0.25,
    padX: Math.round(quoteShort.padX * 1.1),
    quote: {
      size: Math.round(quoteShort.quote.size * 0.82),
      firstCharSize: Math.round(quoteShort.quote.firstCharSize * 0.85),
      lineHeight: 1.5,
    },
    layers: {
      ...quoteShort.layers,
      grainOpacity: 0.48,
    },
  },
]

/** next/image sizes — tuned to grid / hero scatter / detail layouts. */
export const quoteImageSizes = {
  grid: '(max-width:399px) 100vw, (max-width:768px) 50vw, 33vw',
  hero: '(max-width:640px) 136px, (max-width:1024px) 176px, 232px',
  detail: '(max-width:576px) 75vw, 384px',
  shop: '80px',
}
