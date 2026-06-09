import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const raw = await kv.get('report:' + id);
    if (!raw) return res.status(404).json({ error: 'not_found' });

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // 檢查過期
    if (data.expireAt && data.expireAt > 0 && Date.now() > data.expireAt) {
      await kv.del('report:' + id);
      return res.status(410).json({ error: 'expired', expireDays: data.expireDays });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('report error:', error);
    return res.status(500).json({ error: error.message });
  }
}
