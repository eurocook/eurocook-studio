// api/publish.js — Đăng ảnh / multi-ảnh / text lên Facebook (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { pageId, accessToken, message, images, productLink, publishMode, scheduledTime } = req.body || {};
  if (!pageId || !accessToken || !message) return res.status(400).json({ error: "Thiếu pageId, accessToken hoặc message" });

  const fullMessage = message + (productLink ? `\n\n🔗 ${productLink}` : "");

  try {
    let result;

    if (images && images.length > 1) {
      // ── MULTI-PHOTO POST (2-6 ảnh) ─────────────────────────────
      // Bước 1: Upload từng ảnh chưa publish
      const photoIds = await Promise.all(
        images.map(async (img) => {
          const body = { access_token: accessToken, published: false };
          if (img.startsWith("data:")) {
            // base64 → form upload
            const base64Data = img.split(",")[1];
            const mimeType = img.split(";")[0].split(":")[1];
            body.source = base64Data; // Facebook accepts base64 for unpublished photos
            const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...body, url: img }),
            });
            const d = await r.json();
            return d.id;
          } else {
            // URL
            const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: img, access_token: accessToken, published: false }),
            });
            const d = await r.json();
            return d.id;
          }
        })
      );

      // Bước 2: Đăng feed post đính kèm nhiều ảnh
      const attachedMedia = photoIds.filter(Boolean).map((id) => ({ media_fbid: id }));
      const feedBody = {
        message: fullMessage,
        attached_media: JSON.stringify(attachedMedia),
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

    } else if (images && images.length === 1) {
      // ── SINGLE PHOTO POST ────────────────────────────────────────
      const photoBody = { caption: fullMessage, access_token: accessToken };
      photoBody.url = images[0];
      if (publishMode === "scheduled" && scheduledTime) {
        photoBody.published = false;
        photoBody.scheduled_publish_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
      }
      const photoRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoBody),
      });
      result = await photoRes.json();

    } else {
      // ── TEXT ONLY POST ────────────────────────────────────────────
      const feedBody = { message: fullMessage, access_token: accessToken };
      if (productLink) feedBody.link = productLink;
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
    }

    if (result.error) return res.status(400).json({ error: result.error.message, code: result.error.code });
    return res.status(200).json({ success: true, postId: result.id || result.post_id, mode: publishMode });

  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
