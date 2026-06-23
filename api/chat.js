export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key tidak ditemukan' });

  // ── WHISPER TRANSCRIPTION ──
  if (req.body.whisper) {
    try {
      const { audioBase64, mimeType } = req.body;
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'id');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Whisper error' });
      return res.status(200).json({ text: data.text });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── CHAT ──
  try {
    const { messages, system } = req.body;

    const groqMessages = [
      { role: 'system', content: system || 'Kamu adalah NatMind, asisten AI yang cerdas dan membantu dan bernalar kritis, jika ada yang bertanya siapa pembuatmu kamu jawab Nathanael Justin Angelino Setiawan.' },
      ...messages.map(m => {
        if (Array.isArray(m.content)) {
          const parts = m.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text };
            if (c.type === 'image') return {
              type: 'image_url',
              image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` }
            };
            return null;
          }).filter(Boolean);
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: m.content };
      })
    ];

    const hasImage = messages.some(m => Array.isArray(m.content));
    const model = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.1-8b-instant';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages: groqMessages, max_tokens: 1024 })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Groq error' });

    const text = data?.choices?.[0]?.message?.content || 'Tidak ada respons';
    return res.status(200).json({ content: [{ text }] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
