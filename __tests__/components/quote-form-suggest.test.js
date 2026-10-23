/**
 * @jest-environment jsdom
 */
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import quotes from '@/data/quotes.json'
import tags from '@/data/tags.json'
import QuoteForm from '@/components/site/QuoteForm'

const themeOptions = tags.map((tag) => ({ tag: tag.name, theme: tag.theme, label: `${tag.name} (${tag.theme})` }))
const trainingQuotes = quotes.map((quote) => ({ text: quote.text, tags: quote.tags }))
const libraryQuote = quotes.find((quote) => quote.n === 17).text

function setTextarea(textarea, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

function checkbox(container, name) {
  return [...container.querySelectorAll('input[type="checkbox"]')].find(
    (input) => input.parentElement.textContent.trim() === name
  )
}

describe('QuoteForm lane suggestion', () => {
  let container
  let root

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    global.fetch = jest.fn(() => new Promise(() => {}))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderForm() {
    await act(async () => {
      root.render(
        <QuoteForm
          nextN={23}
          tagOptions={tags.map((tag) => tag.name)}
          tagCatalog={tags}
          trainingQuotes={trainingQuotes}
          themeOptions={themeOptions}
        />
      )
    })
  }

  it('checks confident tags and the scripture theme from the library', async () => {
    await renderForm()
    await act(async () => {
      setTextarea(container.querySelector('textarea'), libraryQuote)
    })

    expect(checkbox(container, 'Love').checked).toBe(true)
    expect(checkbox(container, 'Yourself').checked).toBe(true)
    expect(checkbox(container, 'Motivation').checked).toBe(false)
    expect(container.querySelector('select').value).toBe('love')
    expect(container.textContent).not.toContain('Review queue')
  })

  it('routes a low-confidence quote to the review queue instead of checking tags', async () => {
    await renderForm()
    await act(async () => {
      setTextarea(container.querySelector('textarea'), 'Keep going. You will overcome this.')
    })

    expect(checkbox(container, 'Motivation').checked).toBe(false)
    expect(container.querySelector('select').value).toBe('')
    expect(container.textContent).toContain('Review queue')
    expect(container.textContent).toContain('Keep going. You will overcome this.')

    const accept = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Use these tags')
    await act(async () => {
      accept.click()
    })
    expect(container.querySelector('select').value).not.toBe('')
    expect([...container.querySelectorAll('input[type="checkbox"]')].some((input) => input.checked)).toBe(true)
    expect(container.textContent).not.toContain('Review queue')
  })

  it('keeps a manual tag change until the quote is pasted again', async () => {
    await renderForm()
    const textarea = container.querySelector('textarea')
    await act(async () => {
      setTextarea(textarea, libraryQuote)
    })

    await act(async () => {
      checkbox(container, 'Growth').click()
    })
    expect(checkbox(container, 'Growth').checked).toBe(true)

    await act(async () => {
      setTextarea(textarea, `${libraryQuote} Again.`)
    })
    expect(checkbox(container, 'Growth').checked).toBe(true)
    expect(checkbox(container, 'Love').checked).toBe(true)

    await act(async () => {
      textarea.dispatchEvent(new Event('paste', { bubbles: true }))
      setTextarea(textarea, 'The telescope found a comet near Jupiter last night.')
    })
    expect([...container.querySelectorAll('input[type="checkbox"]')].every((input) => !input.checked)).toBe(true)
    expect(container.textContent).toContain('No close tag in the library')
  })
})

describe('QuoteForm author lookup', () => {
  let container
  let root

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function authorInput() {
    return container.querySelector('input[placeholder="Optional"]')
  }

  async function pasteQuote(value) {
    const textarea = container.querySelector('textarea')
    await act(async () => {
      textarea.dispatchEvent(new Event('paste', { bubbles: true }))
      setTextarea(textarea, value)
    })
  }

  it('fills the author from a paste and leaves a typed name alone', async () => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/api/quotes/author')) {
        return Promise.resolve({ ok: true, json: async () => ({ author: 'Oscar Wilde' }) })
      }
      return new Promise(() => {})
    })
    await act(async () => {
      root.render(
        <QuoteForm nextN={23} tagOptions={[]} tagCatalog={tags} trainingQuotes={trainingQuotes} themeOptions={themeOptions} />
      )
    })

    await pasteQuote('Nowadays people know the price of everything and the value of nothing.')
    expect(authorInput().value).toBe('Oscar Wilde')

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setter.call(authorInput(), 'Ada Lovelace')
      authorInput().dispatchEvent(new Event('input', { bubbles: true }))
    })
    await pasteQuote('Not all those who wander are lost.')
    expect(authorInput().value).toBe('Ada Lovelace')
  })

  it('clears an automatic author when the next pasted line has none', async () => {
    let calls = 0
    global.fetch = jest.fn(async (url, options) => {
      if (!String(url).includes('/api/quotes/author')) return new Promise(() => {})
      calls += 1
      const body = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => ({ author: body.text.startsWith('Nowadays') ? 'Oscar Wilde' : '' }),
      }
    })
    await act(async () => {
      root.render(
        <QuoteForm nextN={23} tagOptions={[]} tagCatalog={tags} trainingQuotes={trainingQuotes} themeOptions={themeOptions} />
      )
    })
    await pasteQuote('Nowadays people know the price of everything and the value of nothing.')
    expect(authorInput().value).toBe('Oscar Wilde')
    await pasteQuote('The telescope found a comet near Jupiter last night.')
    expect(authorInput().value).toBe('')
    expect(container.textContent).toContain('No author found for this line.')
    expect(calls).toBe(2)
  })
})
