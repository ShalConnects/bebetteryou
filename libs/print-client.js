/** Browser-side JSON post shared by the print steps. Never throws on a bad
 *  response, so callers branch on `ok` instead of wrapping every call. */
export async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
