
// // /api/chat.js — Vercel serverless function for text-only chat
// const MODEL_PRIMARY = 'gemini-2.5-flash-lite';
// const MODEL_FALLBACK = 'gemini-3-flash';
// const endpoint = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

// function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
// function parseRetryAfter(h){
//   if (!h) return 0;
//   const s = Number(h);
//   return Number.isFinite(s) ? Math.max(0, Math.floor(s * 1000)) : 0;
// }

// async function callGemini({ model, text, apiKey, signal }) {
//   const body = {
//     contents: [{ role: 'user', parts: [{ text }]}],
//     generationConfig: {
//       temperature: 0.7,
//       maxOutputTokens: 512,          // smaller output to reduce quota usage
//       topP: 0.95,
//       candidateCount: 1
//     }
//   };
//   const r = await fetch(endpoint(model), {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'X-goog-api-key': apiKey
//     },
//     body: JSON.stringify(body),
//     signal
//   });
//   const ct = r.headers.get('content-type') || '';
//   const raw = await r.text();
//   let j = null;
//   if (ct.includes('application/json')) {
//     try { j = JSON.parse(raw); } catch { /* ignore parse errors */ }
//   }
//   return { r, j, raw, ct };
// }

// async function callWithRetries({ text, apiKey, signal }) {
//   const maxAttempts = 4;                   // 200ms, 400ms, 800ms, 1600ms rhythm
//   let attempt = 0;
//   let model = MODEL_PRIMARY;

//   while (attempt < maxAttempts) {
//     attempt++;
//     const { r, j, raw } = await callGemini({ model, text, apiKey, signal });
//     const status = r.status;

//     if (r.ok) return { model, j };

//     // Handle rate limit and transient server errors with backoff
//     if (status === 429 || (status >= 500 && status < 600)) {
//       const retryAfter = parseRetryAfter(r.headers.get('retry-after'));
//       const base = Math.min(2000, 200 * 2 ** (attempt - 1));
//       const jitter = Math.floor(Math.random() * 250);
//       const wait = Math.max(retryAfter, base + jitter);

//       // If hitting rate limits on primary, try the fallback model once
//       if (status === 429 && model === MODEL_PRIMARY && attempt >= 2) {
//         model = MODEL_FALLBACK;
//       }
//       await sleep(wait);
//       continue;
//     }

//     // Surface non-retriable upstream errors
//     const details = j || { error: raw.slice(0, 500) };
//     const err = new Error('Upstream error');
//     err.status = status;
//     err.details = details;
//     throw err;
//   }

//   const e = new Error('Exceeded retry attempts');
//   e.status = 429;
//   throw e;
// }

// export default async function handler(req, res) {
//   if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

//   try {
//     const { text = '' } = req.body || {};
//     if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text in body' });

//     const apiKey = process.env.GEMINI_API_KEY;
//     if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

//     // Keep within Vercel function time budget
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 25_000);

//     let result;
//     try {
//       result = await callWithRetries({ text, apiKey, signal: controller.signal });
//     } finally {
//       clearTimeout(timeout);
//     }

//     const cand   = result?.j?.candidates?.[0];
//     const parts  = cand?.content?.parts || [];
//     const reply  = parts.map(p => p.text || p.inlineData?.data || '').join('').trim();
//     const finish = cand?.finishReason || 'UNKNOWN';

//     return res.status(200).json({ text: reply || '', finishReason: finish, model: result?.model });
//   } catch (e) {
//     console.error('Server error:', e.status || '', e.details || e.message);
//     const status = e.status || 500;
//     return res.status(status).json({ error: 'Server error', status, details: e.details || e.message });
//   }
// }


///////////////////////////////////////////////


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text = '' } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text in body' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    const body = {
      contents: [{ role: 'user', parts: [{ text }]}],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
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


