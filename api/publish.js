// api/publish.js — Đăng ảnh (URL) / multi-ảnh / text lên Facebook (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pageId, accessToken, message, images, productLink, publishMode, scheduledTime } = req.body || {};
  if (!pageId || !accessToken || !message) return res.status(400).json({ error: "Thiếu thông tin" });

  const fullMessage = message + (productLink ? `\n\n🔗 ${productLink}` : "");
  const validImages = (images || []).filter(url => url && url.trim().startsWith("http"));

  try {
    let result;

    if (validImages.length > 1) {
      // ── MULTI-PHOTO: upload từng ảnh unpublished rồi gộp vào 1 post ──
      const photoIds = [];
      for (const imgUrl of validImages) {
        const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imgUrl, access_token: accessToken, published: false }),
        });
        const d = await r.json();
        if (d.id) photoIds.push(d.id);
      }

      const feedBody = {
        message: fullMessage,
        attached_media: JSON.stringify(photoIds.map(id => ({ media_fbid: id }))),
        access_token: accessToken,
      };
      if (publishMode === "scheduled" && scheduledTime) {
        feedBody.published = false;
        feedBody.scheduled_publish_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
      }
      const feedRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedBody),
      });
      result = await feedRes.json();

    } else if (validImages.length === 1) {
      // ── SINGLE PHOTO ──
      const body = { url: validImages[0], caption: fullMessage, access_token: accessToken };
      if (publishMode === "scheduled" && scheduledTime) {
        body.published = false;
        body.scheduled_publish_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
      }
      const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      result = await r.json();

    } else {
      // ── TEXT ONLY ──
      const body = { message: fullMessage, access_token: accessToken };
      if (productLink) body.link = productLink;
      if (publishMode === "scheduled" && scheduledTime) {
        body.published = false;
        body.scheduled_publish_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
      }
      const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      result = await r.json();
    }

    if (result.error) return res.status(400).json({ error: result.error.message, code: result.error.code });
    return res.status(200).json({ success: true, postId: result.id || result.post_id, mode: publishMode });

  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
