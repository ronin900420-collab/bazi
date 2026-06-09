export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const kvUrl = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !token) return res.status(500).json({ error: 'KV not configured' });

  try {
    const key = 'report:' + id;
    const kvRes = await fetch(`${kvUrl}/get/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const kvData = await kvRes.json();
    console.log('KV get response status:', kvRes.status, 'result type:', typeof kvData.result);

    if (!kvRes.ok) throw new Error('KV get failed: ' + kvRes.status);
    if (kvData.result === null || kvData.result === undefined) {
      return res.status(404).json({ error: 'not_found' });
    }

    const data = typeof kvData.result === 'string'
      ? JSON.parse(kvData.result)
      : kvData.result;

    if (data.expireAt && data.expireAt > 0 && Date.now() > data.expireAt) {
      await fetch(`${kvUrl}/del/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status(410).json({ error: 'expired', expireDays: data.expireDays });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('report error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
