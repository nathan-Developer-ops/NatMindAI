export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

const GROQ_MODELS = {
  '2.1': 'openai/gpt-oss-20b',
  '2.5': 'qwen/qwen3.6-27b',
  '3.5': 'openai/gpt-oss-120b'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  const githubKey = process.env.GITHUB_TOKEN;

  if (req.body.whisper) {
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY tidak ditemukan' });
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
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Whisper error' });
      return res.status(200).json({ text: data.text });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  try {
    const { messages, system, mode } = req.body;
    const hasImage = messages.some(m => Array.isArray(m.content));

    if (mode === '4.1') {
      if (!githubKey) return res.status(500).json({ error: 'GITHUB_TOKEN tidak ditemukan' });
      const ghMessages = [
        { role: 'system', content: system },
        ...messages.map(m => {
          if (Array.isArray(m.content)) {
            return { role: m.role, content: m.content.map(c => {
              if (c.type === 'text') return { type: 'text', text: c.text };
              if (c.type === 'image') return { type: 'image_url', image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` } };
              return null;
            }).filter(Boolean) };
          }
          return { role: m.role, content: m.content };
        })
      ];
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${githubKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: ghMessages, max_tokens: 2048 })
      });
      const data = await response.json();
      if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'GitHub Models error' });
      const text = data?.choices?.[0]?.message?.content || 'Tidak ada respons';
      return res.status(200).json({ content: [{ text }] });
    }

    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY tidak ditemukan' });
    const model = hasImage ? 'openai/gpt-oss-120b' : (GROQ_MODELS[mode] || GROQ_MODELS['2.1']);
    const groqMessages = [
      { role: 'system', content: system || 'Kamu adalah NatMind, asisten AI yang cerdas.' },
      ...messages.map(m => {
        if (Array.isArray(m.content)) {
          return { role: m.role, content: m.content.map(c => {
            if (c.type === 'text') return { type: 'text', text: c.text };
            if (c.type === 'image') return { type: 'image_url', image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` } };
            return null;
          }).filter(Boolean) };
        }
        return { role: m.role, content: m.content };
      })
    ];
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({ model, messages: groqMessages, max_tokens: 2048 })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Groq error' });
    let text = data?.choices?.[0]?.message?.content || 'Tidak ada respons';
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return res.status(200).json({ content: [{ text }] });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
