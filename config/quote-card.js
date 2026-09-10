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

/** next/image sizes — tuned to grid / hero scatter / detail layouts. */
export const quoteImageSizes = {
  grid: '(max-width:399px) 100vw, (max-width:768px) 50vw, 33vw',
  hero: '(max-width:640px) 136px, (max-width:1024px) 176px, 232px',
  detail: '(max-width:576px) 75vw, 384px',
}
