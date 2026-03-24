// api/generate.js — CommonJS

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Chưa cấu hình ANTHROPIC_API_KEY" });

  const { brandName, brandTagline, postTypeLabel, toneLabel, topic } = req.body || {};
  if (!brandName || !postTypeLabel) return res.status(400).json({ error: "Thiếu thông tin" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1400,
        system: `Bạn là chuyên gia marketing cho Eurocook — nhà phân phối thiết bị nhà bếp cao cấp châu Âu tại Việt Nam. Phân phối: BOSCH, Siemens, Miele, V-Zug, Gaggenau, Liebherr.

Trả về JSON hợp lệ duy nhất, không markdown, không backticks:
{
  "headline": "<dưới 15 chữ, gây tò mò>",
  "body": "<150-250 chữ tiếng Việt, nếu đề cập sản phẩm hãy ghi rõ tên model cụ thể>",
  "cta": "<call-to-action mạnh>",
  "hashtags": ["#tag",...],
  "emoji_hook": "<2-3 emoji>",
  "best_time": "<khung giờ đăng tốt nhất>",
  "product_model": "<tên model sản phẩm nếu có trong bài, ví dụ: HQA514ES3, WM14N290, G7310, để null nếu không có>",
  "product_name": "<tên đầy đủ sản phẩm tiếng Anh nếu có, ví dụ: Bosch Serie 4 Steam Oven, để null nếu không có>",
  "image_queries": ["<query ảnh Pexels tiếng Anh 1 - cụ thể nhà bếp/thiết bị>", "<query 2>", "<query 3>"]
}

Quy tắc image_queries: tiếng Anh, luôn kèm "kitchen" hoặc "appliance", không dùng: car, sport, nature, bathroom, person.
Quy tắc product_model: chỉ điền khi bài đề cập sản phẩm cụ thể có mã model thật.`,
        messages: [{
          role: "user",
          content: `Thương hiệu: ${brandName} (${brandTagline})\nLoại bài: ${postTypeLabel}\nGiọng điệu: ${toneLabel}\n${topic ? `Chủ đề cụ thể: ${topic}` : ""}\nTạo bài đăng Facebook cho fanpage Eurocook Vietnam.`,
        }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const text = data.content?.map((i) => i.text || "").join("") || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
