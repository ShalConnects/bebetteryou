import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class lists so a caller's utility wins over a component default. */
export const cn = (...inputs) => twMerge(clsx(inputs))
