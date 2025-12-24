export default async function handler (req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { text = '' } = (await req.body)
      ? req
      : await new Promise(resolve => {
          let body = ''
          req.on('data', c => (body += c))
          req.on('end', () => resolve({ body: JSON.parse(body || '{}') }))
        })
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
      }
    )
    const j = await r.json()
    const reply = j?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
    res.status(200).json({ text: reply })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}
