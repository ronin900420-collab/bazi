export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const kvUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !token) return res.status(500).json({ error: 'KV not configured' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { payload, expireDays } = body;

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];

    const ttl = expireDays > 0 ? expireDays * 86400 : 60 * 86400;
    const value = JSON.stringify(payload);
    const key = 'report:' + id;

    // Upstash REST API 正確格式：SET key value EX ttl
    const kvRes = await fetch(`${kvUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${ttl}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const kvData = await kvRes.json();
    console.log('KV set response:', JSON.stringify(kvData));

    if (!kvRes.ok || kvData.error) {
      throw new Error('KV set failed: ' + (kvData.error || kvRes.status));
    }

    return res.status(200).json({ id });
  } catch (error) {
    console.error('save error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
