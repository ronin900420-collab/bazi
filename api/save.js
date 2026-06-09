export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'KV not configured' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { payload, expireDays } = body;

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];

    const ttl = expireDays > 0 ? expireDays * 86400 : 60 * 86400;
    const value = JSON.stringify(payload);

    const kvRes = await fetch(`${url}/set/report:${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, ex: ttl }),
    });

    if (!kvRes.ok) {
      const err = await kvRes.text();
      throw new Error('KV set failed: ' + err);
    }

    return res.status(200).json({ id });
  } catch (error) {
    console.error('save error:', error);
    return res.status(500).json({ error: error.message });
  }
}
