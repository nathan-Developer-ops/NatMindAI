export const config = {
 api: {
 bodyParser: {
 sizeLimit: '25mb',
 },
 },
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
 const _b837 = process.env.GROQ_API_KEY;
 const _c424 = process.env.GITHUB_TOKEN;
 if (req.body.whisper) {
 if (!_b837) return res.status(500).json({ error: 'GROQ_API_KEY tidak ditemukan' });
 try {
 const { audioBase64, mimeType } = req.body;
 const audioBuffer = Buffer.from(audioBase64, 'base64');
 const _e277 = new FormData();
 const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
 _e277.append('file', blob, 'audio.webm');
 _e277.append('model', 'whisper-large-v3-turbo');
 _e277.append('language', 'id');
 _e277.append('response_format', 'json');
 const _d518 = await fetch('https:
 method: 'POST',
 headers: { 'Authorization': `Bearer ${_b837}` },
 body: _e277
 });
 const data = await _d518.json();
 if (!_d518.ok) return res.status(_d518.status).json({ error: data?.error?.message || 'Whisper error' });
 return res.status(200).json({ text: data.text });
 } catch(e) {
 return res.status(500).json({ error: e.message });
 }
 }
 try {
 const { _f945, system, mode } = req.body;
 const _g869 = _f945.some(m => Array.isArray(m.content));
 if (mode === '4.1') {
 if (!_c424) return res.status(500).json({ error: 'GITHUB_TOKEN tidak ditemukan di Vercel' });
 const _i936 = [
 { role: 'system', content: system },
 ..._f945.map(m => {
 if (Array.isArray(m.content)) {
 return {
 role: m.role,
 content: m.content.map(c => {
 if (c.type === 'text') return { type: 'text', text: c.text };
 if (c.type === 'image') return {
 type: 'image_url',
 image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` }
 };
 return null;
 }).filter(Boolean)
 };
 }
 return { role: m.role, content: m.content };
 })
 ];
 const _d518 = await fetch('https:
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${_c424}`
 },
 body: JSON.stringify({ model: 'gpt-4o', _f945: _i936, max_tokens: 2048 })
 });
 const data = await _d518.json();
 if (!_d518.ok) return res.status(_d518.status).json({ error: data?.error?.message || 'GitHub Models error' });
 const text = data?.choices?.[0]?.message?.content || 'Tidak ada respons';
 return res.status(200).json({ content: [{ text }] });
 }
 if (!_b837) return res.status(500).json({ error: 'GROQ_API_KEY tidak ditemukan' });
 const model = _g869 ? 'openai/gpt-oss-120b' : (GROQ_MODELS[mode] || GROQ_MODELS['2.1']);
 const _h148 = [
 { role: 'system', content: system || 'Kamu adalah NatMind, asisten AI yang cerdas dan membantu.' },
 ..._f945.map(m => {
 if (Array.isArray(m.content)) {
 return {
 role: m.role,
 content: m.content.map(c => {
 if (c.type === 'text') return { type: 'text', text: c.text };
 if (c.type === 'image') return {
 type: 'image_url',
 image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` }
 };
 return null;
 }).filter(Boolean)
 };
 }
 return { role: m.role, content: m.content };
 })
 ];
 const _d518 = await fetch('https:
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${_b837}`
 },
 body: JSON.stringify({ model, _f945: _h148, max_tokens: 2048 })
 });
 const data = await _d518.json();
 if (!_d518.ok) return res.status(_d518.status).json({ error: data?.error?.message || 'Groq error' });
 let text = data?.choices?.[0]?.message?.content || 'Tidak ada respons';
 text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
 return res.status(200).json({ content: [{ text }] });
 } catch(e) {
 return res.status(500).json({ error: e.message });
 }
}