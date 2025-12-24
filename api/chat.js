// export default async function handler (req, res) {
//   if (req.method !== 'POST')
//     return res.status(405).json({ error: 'Method not allowed' })
//   try {
//     const { text = '' } = (await req.body)
//       ? req
//       : await new Promise(resolve => {
//           let body = ''
//           req.on('data', c => (body += c))
//           req.on('end', () => resolve({ body: JSON.parse(body || '{}') }))
//         })
//     const r = await fetch(
//       'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-goog-api-key': process.env.GEMINI_API_KEY
//         },
//         body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
//       }
//     )
//     const j = await r.json()
//     const reply = j?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
//     res.status(200).json({ text: reply })
//   } catch (e) {
//     console.error(e)
//     res.status(500).json({ error: 'Server error' })
//   }
// }


// Secure Gemini proxy for your static site on Vercel.
// Keep GEMINI_API_KEY in Vercel env vars; DO NOT expose it in the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text = '' } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text in body' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const body = {
      contents: [{ role: 'user', parts: [{ text }]}],
      generationConfig: { temperature: 0.7, maxOutputTokens: 768 }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body)
    });

    const status = r.status;
    const ct = r.headers.get('content-type') || '';
    const raw = await r.text();
    console.log('Gemini status:', status, 'ct:', ct, 'preview:', raw.slice(0, 200));

    if (!ct.includes('application/json')) {
      return res.status(status >= 400 ? status : 502).json({
        error: 'Upstream returned non-JSON',
        status,
        contentType: ct,
        preview: raw.slice(0, 200)
      });
    }

    const j = JSON.parse(raw);
    if (!r.ok) return res.status(status).json({ error: 'Gemini error', details: j });

    const cand   = j?.candidates?.[0];
    const parts  = cand?.content?.parts || [];
    const reply  = parts.map(p => p.text || p.inlineData?.data || '').join('').trim();
    const finish = cand?.finishReason || 'UNKNOWN';

    if (!reply) return res.status(200).json({ text: '', finishReason: finish, note: 'Empty/blocked reply' });
    return res.status(200).json({ text: reply, finishReason: finish });
  } catch (e) {
    console.error('Server error:', e);
    return res.status(500).json({ error: 'Server error', message: e.message });
  }
}
