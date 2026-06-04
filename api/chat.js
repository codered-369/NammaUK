
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


import fs from 'fs';
import path from 'path';

function kmDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function executePlanTrip(location, days, userOrigin) {
  let placesData;
  try {
    placesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'places.json'), 'utf8'));
  } catch(e) {
    return "Sorry, I can't access the places database right now.";
  }

  const dayCount = parseInt(days) || 1;
  if (dayCount < 1 || dayCount > 5) return "I can only plan trips between 1 and 5 days.";

  let startLatLng = null;
  const talukKey = Object.keys(placesData).find(k => k.toLowerCase() === location.toLowerCase() || k.toLowerCase().includes(location.toLowerCase()));
  if (talukKey) {
    const place = (placesData[talukKey] || []).find(pp => pp.lat && pp.lng);
    if (place) startLatLng = { lat: place.lat, lng: place.lng };
  }
  if (!startLatLng) {
    for (const key in placesData) {
      const place = placesData[key].find(p => p.name.toLowerCase().includes(location.toLowerCase()));
      if (place && place.lat) { startLatLng = { lat: place.lat, lng: place.lng }; break; }
    }
  }
  if (!startLatLng) return `I couldn't find the location "${location}" in Uttara Kannada. Please provide a valid starting point.`;

  let allPlaces = [];
  Object.keys(placesData).forEach(talukKey => {
    const arr = placesData[talukKey].map(p => ({ ...p, taluk: p.taluk || talukKey }));
    allPlaces = allPlaces.concat(arr);
  });
  
  const maxStops = dayCount * 4;
  let unvisited = allPlaces.filter(p => p.lat && p.lng);
  let route = [];
  let cur = startLatLng;
  
  for (let i = 0; i < maxStops; i++) {
    let bestIdx = -1, bestDist = Infinity;
    unvisited.forEach((p, idx) => {
      const d = kmDistance(cur.lat, cur.lng, p.lat, p.lng);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    });
    if (bestIdx === -1) break;
    const next = unvisited.splice(bestIdx, 1)[0];
    route.push(next);
    cur = { lat: next.lat, lng: next.lng };
  }
  
  if (route.length > 1) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 1; j < route.length; j++) {
          let p_prev = i === 0 ? startLatLng : route[i - 1];
          let p_i = route[i];
          let p_j = route[j];
          let p_next = j === route.length - 1 ? null : route[j + 1];

          if (p_prev.lat === undefined || p_i.lat === undefined || p_j.lat === undefined || (p_next && p_next.lat === undefined)) continue;

          let d1 = kmDistance(p_prev.lat, p_prev.lng, p_i.lat, p_i.lng);
          let d2 = p_next ? kmDistance(p_j.lat, p_j.lng, p_next.lat, p_next.lng) : 0;
          let currentDist = d1 + d2;

          let new_d1 = kmDistance(p_prev.lat, p_prev.lng, p_j.lat, p_j.lng);
          let new_d2 = p_next ? kmDistance(p_i.lat, p_i.lng, p_next.lat, p_next.lng) : 0;
          let newDist = new_d1 + new_d2;

          if (newDist < currentDist - 0.001) {
            let temp = route.slice(i, j + 1).reverse();
            route.splice(i, temp.length, ...temp);
            improved = true;
          }
        }
      }
    }
  }

  let output = `**Here is your optimized ${dayCount}-day trip plan from ${location}:**\n\n`;
  const perDay = Math.ceil(route.length / dayCount);
  
  for (let d = 0; d < dayCount; d++) {
    const start = d * perDay;
    const end = Math.min(start + perDay, route.length);
    if (start >= end) break;
    output += `**Day ${d + 1}**\n`;
    route.slice(start, end).forEach((p, idx) => {
      output += `${start + idx + 1}. ${p.name} (${p.taluk})\n`;
    });
    output += `\n`;
  }

  const coordOrName = (p) => {
    if (!p) return '';
    if (p.maps_url) {
      let match = p.maps_url.match(/\/search\/([^/?]+)/) || p.maps_url.match(/[?&]q=([^&]+)/) || p.maps_url.match(/\/place\/([^/?]+)/);
      if (match && match[1]) {
        try { 
          let query = decodeURIComponent(match[1]).replace(/\+/g, ' ');
          if (!query.toLowerCase().includes('uttara kannada') && !query.toLowerCase().includes(p.taluk?.toLowerCase() || 'dummy')) {
            query += `, ${p.taluk || ''}, Uttara Kannada`;
          }
          return query; 
        } catch (e) {}
      }
    }
    if (p.lat && p.lng) return `${p.lat},${p.lng}`;
    return '';
  };

  const originUrl = userOrigin ? userOrigin : `${startLatLng.lat},${startLatLng.lng}`;
  const destinationUrl = coordOrName(route[route.length - 1]);
  const waypointsUrl = route.slice(0, -1).map(coordOrName).filter(Boolean);
  
  const params = new URLSearchParams({ api: '1', origin: originUrl, destination: destinationUrl, travelmode: 'driving' });
  if (waypointsUrl.length) params.set('waypoints', waypointsUrl.join('|'));
  const gmapUrl = 'https://www.google.com/maps/dir/?' + params.toString();
  
  output += `[🗺️ Open Route in Google Maps](${gmapUrl})`;
  return output;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text = '', history = [] } = req.body || {};
    if (!text && history.length === 0) return res.status(400).json({ error: 'Missing text or history in body' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
    const body = {
      systemInstruction: {
        parts: [{ text: "You are an AI travel assistant for Namma UK, a tourism website dedicated exclusively to Uttara Kannada district in Karnataka. Answer briefly, warmly, and focus strictly on Uttara Kannada. If the user asks for a trip plan, ask where they are traveling from. If they provide a location OUTSIDE Uttara Kannada (like Bengaluru, Pune, Goa), intelligently choose the closest or most logical entry taluk IN Uttara Kannada (e.g. Sirsi for Bengaluru, Karwar for Goa, Hubli to Yellapur) and use THAT entry taluk as the 'location' for the generate_trip_plan tool, and pass their actual starting city (e.g., 'Bengaluru') as the 'userOrigin' parameter. If they provide a local taluk, use it directly for 'location' and leave 'userOrigin' empty." }]
      },
      tools: [{
        functionDeclarations: [{
          name: "generate_trip_plan",
          description: "Generates an optimized travel itinerary and Google Maps route for Uttara Kannada.",
          parameters: {
            type: "OBJECT",
            properties: {
              location: { type: "STRING", description: "Starting location in Uttara Kannada (e.g., Sirsi, Gokarna)." },
              days: { type: "INTEGER", description: "Number of days for the trip (1 to 5)." },
              userOrigin: { type: "STRING", description: "The actual city the user is traveling from (e.g. Bengaluru, Pune). Leave empty if they are already in Uttara Kannada." }
            },
            required: ["location", "days"]
          }
        }]
      }],
      contents: history && history.length > 0 ? history : [{ role: 'user', parts: [{ text }]}],
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
    
    // Check if Gemini decided to call our tool
    const funcCall = parts.find(p => p.functionCall)?.functionCall;
    if (funcCall && funcCall.name === 'generate_trip_plan') {
      const args = funcCall.args;
      const planText = executePlanTrip(args.location, args.days, args.userOrigin);
      return res.status(200).json({ text: planText, finishReason: "TOOL_CALL" });
    }

    const reply  = parts.map(p => p.text || p.inlineData?.data || '').join('').trim();
    const finish = cand?.finishReason || 'UNKNOWN';

    if (!reply) return res.status(200).json({ text: '', finishReason: finish, note: 'Empty/blocked reply' });
    return res.status(200).json({ text: reply, finishReason: finish });
  } catch (e) {
    console.error('Server error:', e);
    return res.status(500).json({ error: 'Server error', message: e.message });
  }
}


