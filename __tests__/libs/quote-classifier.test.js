import { scoreQuote, tokenizeQuote, trainQuoteClassifier } from '@/libs/quote-classifier'

describe('quote classifier', () => {
  const examples = [
    { text: 'Be yourself and stay alone when you need to.', tags: ['Yourself'] },
    { text: 'Love and trust the people who respect you.', tags: ['Love'] },
    { text: 'Keep learning so you can grow from the lesson.', tags: ['Growth'] },
  ]
  const names = ['Yourself', 'Love', 'Growth', 'Motivation']

  it('drops stopwords and short tokens', () => {
    expect(tokenizeQuote('It is to be')).toEqual([])
    expect(tokenizeQuote('Be yourself today')).toEqual(['yourself', 'today'])
  })

  it('learns a tag from its examples instead of a fixed word list', () => {
    const model = trainQuoteClassifier([{ text: 'Quiet courage at dawn', tags: ['Courage'] }], ['Courage', 'Love'])
    const [top] = scoreQuote(model, 'Quiet courage at dawn')
    expect(top.tag).toBe('Courage')
    expect(top.confidence).toBeGreaterThan(0.9)
    expect(scoreQuote(model, 'The telescope found a comet near Jupiter')[0].confidence).toBe(0)
  })

  it('ranks the tag whose examples share the quote', () => {
    const scores = scoreQuote(trainQuoteClassifier(examples, names), 'Love and trust the people who respect you.')
    expect(scores[0].tag).toBe('Love')
    expect(scores[0].confidence).toBeGreaterThan(scores[1].confidence)
    expect(scores.find((row) => row.tag === 'Motivation').confidence).toBe(0)
  })
})
