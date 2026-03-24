// api/publish-video.js — Đăng video lên Facebook Page (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pageId, accessToken, message, videoUrl, publishMode, scheduledTime } = req.body || {};

  if (!pageId || !accessToken || !message || !videoUrl) {
    return res.status(400).json({ error: "Thiếu pageId, accessToken, message hoặc videoUrl" });
  }

  try {
    // Facebook API: đăng video qua URL (video phải public)
    const endpoint = `https://graph.facebook.com/v21.0/${pageId}/videos`;

    const body = {
      file_url: videoUrl,      // URL video public (Pexels hoặc URL thủ công)
      description: message,
      access_token: accessToken,
    };

    if (publishMode === "scheduled" && scheduledTime) {
      const ts = Math.floor(new Date(scheduledTime).getTime() / 1000);
      body.published = false;
      body.scheduled_publish_time = ts;
    } else {
      body.published = true;
    }

    const fbRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const fbData = await fbRes.json();

    if (fbData.error) {
      return res.status(400).json({
        error: fbData.error.message,
        code: fbData.error.code,
      });
    }

    return res.status(200).json({
      success: true,
      postId: fbData.id || fbData.video_id,
      mode: publishMode,
    });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
