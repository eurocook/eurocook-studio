// api/videos.js — Tìm video từ Pexels (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chưa cấu hình PEXELS_API_KEY" });

  const { queries, query } = req.body || {};
  const searchList = queries?.length ? queries : [query || "luxury kitchen cooking"];

  try {
    // Tìm song song các queries, lấy 3 video mỗi query
    const results = await Promise.all(
      searchList.map(async (q) => {
        const res = await fetch(
          `https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape`,
          { headers: { Authorization: apiKey } }
        );
        const data = await res.json();
        return data.videos || [];
      })
    );

    // Gộp và loại trùng
    const seen = new Set();
    const allVideos = results.flat().filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    const videos = allVideos.slice(0, 6).map((v) => {
      // Lấy file video chất lượng HD (hd) hoặc sd
      const hdFile = v.video_files?.find((f) => f.quality === "hd" && f.width <= 1920) || v.video_files?.[0];
      const sdFile = v.video_files?.find((f) => f.quality === "sd") || v.video_files?.[0];
      return {
        id: v.id,
        url: hdFile?.link || sdFile?.link,        // URL video để đăng
        previewUrl: sdFile?.link || hdFile?.link,  // URL nhẹ hơn để preview
        thumbnail: v.image,                        // Thumbnail tĩnh
        duration: v.duration,
        width: hdFile?.width || v.width,
        height: hdFile?.height || v.height,
        photographer: v.user?.name || "Pexels",
        alt: v.url,
      };
    }).filter((v) => v.url); // Bỏ video không có URL

    return res.status(200).json({ videos, queriesUsed: searchList });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi tìm video: " + err.message });
  }
};
