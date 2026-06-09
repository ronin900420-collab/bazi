import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { payload, expireDays } = body;

    // 產生 6 碼短 ID
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];

    const ttl = expireDays > 0 ? expireDays * 86400 : 60 * 86400; // 預設 60 天
    await kv.set('report:' + id, JSON.stringify(payload), { ex: ttl });

    return res.status(200).json({ id });
  } catch (error) {
    console.error('save error:', error);
    return res.status(500).json({ error: error.message });
  }
}
