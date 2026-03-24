// api/images.js — Tìm ảnh từ Pexels API (CommonJS)

// Danh sách từ khóa bị cấm — ảnh không liên quan
const BLOCKED_TERMS = ["car","race","sport","forest","mushroom","bathroom","person","portrait","face","animal","dog","cat","beach","mountain","wedding"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chưa cấu hình PEXELS_API_KEY" });

  // Nhận queries (mảng) hoặc query (chuỗi đơn)
  const { queries, query } = req.body || {};

  // Ưu tiên dùng queries (mảng từ AI), fallback về query đơn
  const searchList = queries?.length ? queries : [query || "luxury kitchen appliance"];

  try {
    // Tìm song song tất cả queries, lấy 3 ảnh mỗi query
    const results = await Promise.all(
      searchList.map(async (q) => {
        const response = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape`,
          { headers: { Authorization: apiKey } }
        );
        const data = await response.json();
        return data.photos || [];
      })
    );

    // Gộp tất cả ảnh, loại bỏ trùng lặp
    const seen = new Set();
    let allPhotos = results.flat().filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Lọc bỏ ảnh không liên quan dựa vào alt text
    allPhotos = allPhotos.filter((p) => {
      const alt = (p.alt || "").toLowerCase();
      return !BLOCKED_TERMS.some((term) => alt.includes(term));
    });

    const photos = allPhotos.slice(0, 6).map((p) => ({
      id: p.id,
      url: p.src.large2x || p.src.large,
      thumb: p.src.medium,
      tiny: p.src.tiny,
      photographer: p.photographer,
      alt: p.alt || searchList[0],
    }));

    return res.status(200).json({ photos, queriesUsed: searchList });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi tìm ảnh: " + err.message });
  }
};
