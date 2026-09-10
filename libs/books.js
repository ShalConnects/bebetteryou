import { booksPageSize } from '@/config/books'
import { readBooks } from '@/libs/books-store'
import { paginate } from '@/libs/paging'

const byTitle = (a, b) => String(a.title).localeCompare(String(b.title))

export function listBooks(tag) {
  const all = readBooks().sort(byTitle)
  return tag ? all.filter((b) => b.tags?.includes(tag)) : all
}

export function pageBooks(tag, page) {
  return paginate(listBooks(tag), page, booksPageSize)
}

export function getBook(slug) {
  return readBooks().find((b) => b.slug === slug)
}

/** Catalog tags in use (stable alpha). */
export function bookTags() {
  const used = new Set(listBooks().flatMap((b) => b.tags || []))
  return [...used].sort((a, b) => a.localeCompare(b))
}
