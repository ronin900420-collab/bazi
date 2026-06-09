export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(500).json({ error: 'KV not configured' });

  try {
    const kvRes = await fetch(`${url}/get/report:${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!kvRes.ok) throw new Error('KV get failed: ' + kvRes.status);

    const kvData = await kvRes.json();
    if (!kvData.result) return res.status(404).json({ error: 'not_found' });

    const data = typeof kvData.result === 'string'
      ? JSON.parse(kvData.result)
      : kvData.result;

    if (data.expireAt && data.expireAt > 0 && Date.now() > data.expireAt) {
      await fetch(`${url}/del/report:${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status(410).json({ error: 'expired', expireDays: data.expireDays });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('report error:', error);
    return res.status(500).json({ error: error.message });
  }
}
