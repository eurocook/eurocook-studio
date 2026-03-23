module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "Chưa cấu hình ANTHROPIC_API_KEY" });

  const { brandName, brandTagline, postTypeLabel, toneLabel, topic } = req.body || {};

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
        max_tokens: 1000,
        system: `Bạn là chuyên gia marketing cho Eurocook — nhà phân phối thiết bị nhà bếp cao cấp châu Âu tại Việt Nam. Phân phối: BOSCH, Siemens, Miele, V-Zug, Gaggenau, Liebherr. Target: gia đình thu nhập cao, kiến trúc sư, designer.\nTrả về JSON hợp lệ duy nhất, không có markdown hay backticks:\n{"headline":"<dưới 15 chữ, gây tò mò>","body":"<150-250 chữ tiếng Việt cuốn hút>","cta":"<call-to-action mạnh>","hashtags":["#tag",...],"emoji_hook":"<2-3 emoji phù hợp>","best_time":"<gợi ý khung giờ đăng tốt nhất>"}`,
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
```

5. Nhấn **"Commit new file"**

---

## File 2 — Sửa `src/App.jsx`

1. Click vào file `src/App.jsx` trong repo
2. Nhấn biểu tượng **bút chì** (Edit)
3. Tìm dòng này (khoảng dòng 72):
```
const res = await fetch("https://api.anthropic.com/v1/messages", {
