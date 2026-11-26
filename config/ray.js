/** Ray Morrow — AI talking-avatar videos made with Higgsfield (Seedance 2.5 reference-to-video). */
export const ray = {
  model: 'bytedance/seedance-2.5/reference-to-video',
  /** Served from the site so Higgsfield can fetch it. */
  portrait: '/ray/ray.jpg',
  /** UTC weekdays of the 8 pm slot (0 = Sun): Mon, Wed, Sat. Must be card days. */
  weekdays: [1, 3, 6],
  seconds: 8,
  /** Spoken words that fit `seconds` (Ray talks about 2.5 words a second). */
  words: 20,
  /** Where each finished video posts. These networks skip the card's own image post that day. */
  networks: ['youtube', 'instagram', 'facebook', 'threads', 'pinterest'],
  resolution: '480p',
  /** Higgsfield's price for this model at 480p, USD per output second. */
  usdPerSecond: 0.1177,
  /** Rolling 7-day spend limit; a video that would cross it is not sent. */
  weeklyCapUsd: 5,
  /** Send to Higgsfield this many hours before the post slot (one cron run ahead). */
  leadHours: 48,
  voice: 'a warm, calm, slightly gravelly male voice, unhurried, with brief natural pauses',
  /** Rotated by quote so the backdrop changes from video to video. */
  settings: [
    'sits at his kitchen table in soft morning light',
    'sits on a wooden porch step at sunrise',
    'sits in the cab of an old pickup truck, window light on his face',
    'sits on a park bench under trees in late afternoon light',
    'stands in a small cluttered workshop with warm lamp light',
  ],
  /** Burned-in captions. `highlight` (lit word + hook) is ASS &HBBGGRR& — brand green #34D399. */
  captions: { font: 'BBY Caption', highlight: '&H99D334&', mark: 'bebetteryou.online', hookSeconds: 2 },
  aiNote: 'Ray is an AI character.',
}

/** The words Ray says plus the on-screen hook, as Higgsfield's prompt. */
export function rayPrompt({ script, setting }) {
  return `The man in the reference image ${setting} and talks directly to the camera, like a friend. Static camera, chest-up framing, natural small head movements and blinks, lips perfectly synced to his speech. He speaks in ${ray.voice}. He says: "${script}" Quiet room tone only, no music, no subtitles, no text on screen.`
}
