// api/publish.js — Vercel Serverless Function (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { pageId, accessToken, message, imageUrl, productLink, publishMode, scheduledTime } =
    req.body || {};

  if (!pageId || !accessToken || !message)
    return res.status(400).json({ error: "Thiếu pageId, accessToken hoặc message" });

  try {
    let fbEndpoint, fbBody;
    const fullMessage = message + (productLink ? `\n\n🔗 ${productLink}` : "");

    if (imageUrl) {
      fbEndpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
      fbBody = { url: imageUrl, caption: fullMessage, access_token: accessToken };
    } else {
      fbEndpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
      fbBody = { message: fullMessage, access_token: accessToken };
      if (productLink) fbBody.link = productLink;
    }

    if (publishMode === "scheduled" && scheduledTime) {
      const ts = Math.floor(new Date(scheduledTime).getTime() / 1000);
      fbBody.published = false;
      fbBody.scheduled_publish_time = ts;
    }

    const fbRes = await fetch(fbEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbBody),
    });

    const fbData = await fbRes.json();

    if (fbData.error)
      return res.status(400).json({
        error: fbData.error.message,
        code: fbData.error.code,
      });

    return res.status(200).json({
      success: true,
      postId: fbData.id || fbData.post_id,
      mode: publishMode,
    });
  } catch (err) {
    return res.status(500).json({ error: "Lỗi server: " + err.message });
  }
};
