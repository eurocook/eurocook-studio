// api/images.js — Tìm ảnh từ Pexels API (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chưa cấu hình PEXELS_API_KEY" });

  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: "Thiếu query" });

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    );
    const data = await response.json();

    const photos = (data.photos || []).map((p) => ({
      id: p.id,
      url: p.src.large,        // full size for posting
      thumb: p.src.medium,     // thumbnail for preview
      tiny: p.src.tiny,
      photographer: p.photographer,
      alt: p.alt || query,
    }));

    return res.status(200).json({ photos });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi tìm ảnh: " + err.message });
  }
};
