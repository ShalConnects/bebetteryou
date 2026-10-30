import { revalidateTag, unstable_cache } from 'next/cache'
import { readyNetworks } from './index'

const TAG = 'social-status'

/** Network status probes Pinterest/YouTube over HTTP — the dashboard reuses it for a minute. */
export const cachedReadyNetworks = unstable_cache(readyNetworks, [TAG], { revalidate: 60, tags: [TAG] })

/** Call after connecting, saving or clearing a network so the overview shows it at once. */
export const refreshNetworkStatus = () => revalidateTag(TAG)
