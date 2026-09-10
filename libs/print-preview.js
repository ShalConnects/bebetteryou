/**
 * Preview-only cylinder wrap. The print file stays a flat unwrap; this mapping
 * is how a round mug looks in a photo, not how Printful is sent the art.
 *
 * Dest x is sin(theta) (the front of a cylinder); source u is theta (the unwrap).
 */
export function cylinderU(x, width, arc = 1.2) {
  const half = arc / 2
  const s = (((x + 0.5) / width) * 2 - 1) * Math.sin(half)
  if (s <= -1 || s >= 1) return null
  return (Math.asin(s) / half + 1) / 2
}

export function paintCylinder(ctx, img, w, h, arc = 1.2) {
  ctx.clearRect(0, 0, w, h)
  const half = arc / 2
  const sw = Math.max(1, img.width / w)
  for (let x = 0; x < w; x++) {
    const u = cylinderU(x, w, arc)
    if (u == null) continue
    const theta = (u * 2 - 1) * half
    const dh = h * (0.88 + 0.12 * Math.cos(theta))
    ctx.drawImage(img, u * (img.width - sw), 0, sw, img.height, x, (h - dh) / 2, 1, dh)
  }
}
