/** Bump on every card redesign. The public site shows only quotes rendered at
    this revision, so restyled cards surface as they are re-rendered. */
export const cardRevision = 7

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
  /** Soft geometric artwork behind the quote (keyed by tag via quote-motifs). */
  motif: {
    color: '#e4f7ec',
    opacity: 0.11,
    /** Fraction of card width. */
    sizeRatio: 0.48,
    lineWidth: 3.5,
  },
  /** Thin rule + number tint from scripture/social theme (not a full style swap). */
  themeAccent: {
    perseverance: '#e8c547',
    clarity: '#8ecae6',
    growth: '#95d5b2',
    love: '#f4a6a6',
    'self-worth': '#c9b1ff',
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
  /** Longer last readable beat for screenshot / rewatch. */
  hold: 4.8,
  hook: 0.7,
  /** Brief #N / series plate before the hook. */
  series: 0.85,
  seriesTexts: ['Daily quote', 'BeBetterYou', 'One line today'],
  end: 1.4,
  endText: 'Follow for daily quotes.',
  endTexts: [
    'Follow for daily quotes.',
    'Save this for a hard day.',
    'Share with someone who needs it.',
    'Quote #{n} — full on site.',
  ],
  maxSeconds: 20,
  /** Week-in-review Short hard cap (YouTube Shorts ~60s). */
  weekMaxSeconds: 55,
  fallbackSeconds: 8,
  /** Fade-through-black on layout changes (hook → quote, quote → end). */
  crossfade: 0.3,
  /** Short dissolve while lines accumulate in the same layout. */
  lineFade: 0.15,
  /** Licensed instrumentals (no vocals). Tagged quotes pick a stable bed; untagged → random. Missing → drone. */
  musicDir: 'assets/shorts',
}

/** next/image sizes — tuned to grid / hero scatter / detail layouts. */
export const quoteImageSizes = {
  grid: '(max-width:399px) 100vw, (max-width:768px) 50vw, 33vw',
  hero: '(max-width:640px) 136px, (max-width:1024px) 176px, 232px',
  detail: '(max-width:576px) 75vw, 384px',
  shop: '80px',
}
