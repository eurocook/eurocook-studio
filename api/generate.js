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
  "hashtags": ["#Eurocook", "#EurocookVietnam", "<hashtag brand>", "<hashtag sản phẩm>", "<hashtag ngành>", ...],
  "emoji_hook": "<2-3 emoji>",
  "best_time": "<khung giờ đăng tốt nhất>",
  "product_model": "<mã model sản phẩm nếu có, ví dụ: HQA514ES3 — null nếu không có>",
  "product_name": "<tên đầy đủ sản phẩm tiếng Anh nếu có — null nếu không có>",
  "image_queries": ["<query ảnh Pexels tiếng Anh 1>", "<query 2>", "<query 3>"],
  "video_queries": ["<query video tiếng Anh 1 - cụ thể về nấu ăn/nhà bếp>", "<query 2>", "<query 3>"]
}

Quy tắc hashtags:
- LUÔN bắt đầu bằng #Eurocook và #EurocookVietnam (thương hiệu đã đăng ký bản quyền)
- Tiếp theo là hashtag thương hiệu: #BOSCH, #Siemens, #Miele, #VZug, #Gaggenau, #Liebherr
- Thêm hashtag sản phẩm, ngành bếp, lifestyle: #BếpCaoCapf, #ThietBiNhaBep, #NhaDepVietNam...
- Tổng 10-15 hashtag

Quy tắc image_queries: tiếng Anh, luôn kèm "kitchen"/"appliance"/"cooking", không dùng: car, sport, nature, bathroom.
Quy tắc video_queries: tiếng Anh, về nấu ăn hoặc sử dụng thiết bị bếp, ví dụ: "cooking with induction hob", "steam oven baking bread", "luxury kitchen tour".`,
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

    // Đảm bảo #Eurocook luôn có mặt dù AI có quên
    if (!parsed.hashtags) parsed.hashtags = [];
    if (!parsed.hashtags.includes("#Eurocook")) parsed.hashtags.unshift("#Eurocook");
    if (!parsed.hashtags.includes("#EurocookVietnam")) parsed.hashtags.splice(1, 0, "#EurocookVietnam");

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
