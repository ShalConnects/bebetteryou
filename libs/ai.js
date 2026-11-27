/** Each provider takes { model, system, prompt, maxTokens } and returns the reply text. Keys stay server-side. */
const providers = {
  gemini: async ({ model, system, prompt, maxTokens }) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        // Room for the model's thinking tokens, which count against this cap.
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 4096), responseMimeType: 'application/json' },
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Gemini error ${res.status}`)
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
  },
  anthropic: async ({ model, system, prompt, maxTokens }) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Anthropic error ${res.status}`)
    return data.content?.map((c) => c.text || '').join('') || ''
  },
}

/** Ask whichever AI has a key (GEMINI_API_KEY first, else ANTHROPIC_API_KEY) and parse its JSON reply. */
export async function askJson({ models, system, prompt, maxTokens = 600 }) {
  const id = process.env.GEMINI_API_KEY ? 'gemini' : process.env.ANTHROPIC_API_KEY ? 'anthropic' : null
  if (!id) throw new Error('No AI key: set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY')
  const text = await providers[id]({ model: models[id], system, prompt, maxTokens })
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}
