// api/product-image.js — Tìm ảnh sản phẩm đúng model (CommonJS)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { model, brandName, productName } = req.body || {};
  if (!model && !productName) return res.status(400).json({ error: "Thiếu model hoặc productName" });

  const results = [];

  // 1. Tìm trên eurocook.com.vn
  try {
    const searchTerm = model || productName;
    const eurocookUrl = `https://eurocook.com.vn/?s=${encodeURIComponent(searchTerm)}`;
    const html = await fetchHtml(eurocookUrl);
    if (html) {
      const productImages = extractProductImages(html, searchTerm);
      results.push(...productImages.map((img) => ({
        ...img,
        source: "eurocook.com.vn",
        priority: 1,
      })));
    }
  } catch {}

  // 2. Tìm trên website thương hiệu gốc
  const brandSearchUrls = getBrandSearchUrl(brandName, model, productName);
  for (const { url, source } of brandSearchUrls) {
    try {
      const html = await fetchHtml(url);
      if (html) {
        const imgs = extractProductImages(html, model || productName);
        results.push(...imgs.map((img) => ({ ...img, source, priority: 2 })));
      }
    } catch {}
  }

  // 3. Fallback: Pexels với query cụ thể theo model
  if (results.length === 0) {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (pexelsKey) {
      const query = buildPexelsQuery(brandName, productName, model);
      try {
        const pRes = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`,
          { headers: { Authorization: pexelsKey } }
        );
        const pData = await pRes.json();
        (pData.photos || []).forEach((p) => {
          results.push({
            url: p.src.large2x || p.src.large,
            thumb: p.src.medium,
            alt: p.alt || query,
            source: "pexels.com",
            photographer: p.photographer,
            priority: 3,
          });
        });
      } catch {}
    }
  }

  // Sắp xếp theo priority, trả về tối đa 6 ảnh
  results.sort((a, b) => a.priority - b.priority);
  const unique = deduplicateByUrl(results).slice(0, 6);

  return res.status(200).json({
    images: unique,
    model: model || null,
    productName: productName || null,
    found: unique.length > 0,
  });
};

// ── HELPERS ──────────────────────────────────────────────────

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; EurocookBot/1.0)",
      "Accept": "text/html",
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  return res.text();
}

function extractProductImages(html, searchTerm) {
  const images = [];
  // Tìm thẻ img trong product cards
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2] || "";
    // Chỉ lấy ảnh sản phẩm (không lấy logo, icon, banner)
    if (isProductImage(src, alt, searchTerm)) {
      images.push({
        url: resolveUrl(src),
        thumb: resolveUrl(src),
        alt: alt || searchTerm,
      });
    }
  }
  return images.slice(0, 3);
}

function isProductImage(src, alt, searchTerm) {
  if (!src || src.length < 10) return false;
  if (src.includes("logo") || src.includes("icon") || src.includes("banner")) return false;
  if (src.includes(".svg") || src.includes("data:")) return false;
  if (src.includes("placeholder") || src.includes("spinner")) return false;
  // Ưu tiên ảnh có kích thước đủ lớn (URL thường chứa kích thước)
  const hasDimension = /\d{3,4}x\d{3,4}/.test(src) || src.includes("large") || src.includes("full") || src.includes("product");
  if (!hasDimension && src.includes("thumb")) return false;
  return src.startsWith("http") || src.startsWith("/");
}

function resolveUrl(src) {
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return "https:" + src;
  if (src.startsWith("/")) return "https://eurocook.com.vn" + src;
  return src;
}

function getBrandSearchUrl(brandName, model, productName) {
  const brand = (brandName || "").toLowerCase();
  const term = model || productName || "";
  const urls = [];

  if (brand.includes("bosch")) {
    urls.push({ url: `https://www.bosch-home.com/vn/search.html#/q=${encodeURIComponent(term)}`, source: "bosch-home.com" });
  } else if (brand.includes("siemens")) {
    urls.push({ url: `https://www.siemens-home.bsh-group.com/vn/search#q=${encodeURIComponent(term)}`, source: "siemens-home.com" });
  } else if (brand.includes("miele")) {
    urls.push({ url: `https://www.miele.com/en/vn/search.htm?q=${encodeURIComponent(term)}`, source: "miele.com" });
  } else if (brand.includes("liebherr")) {
    urls.push({ url: `https://home.liebherr.com/en/vn/refrigerators/search.html#q=${encodeURIComponent(term)}`, source: "liebherr.com" });
  }
  return urls;
}

function buildPexelsQuery(brandName, productName, model) {
  // Tạo query Pexels thông minh từ tên sản phẩm
  if (productName) {
    // Trích từ khóa chính từ tên sản phẩm
    const keywords = productName
      .replace(/\b(series|serie|model|type)\b/gi, "")
      .replace(/\d+/g, "")
      .trim()
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 4)
      .join(" ");
    return `${keywords} kitchen appliance`;
  }
  if (brandName) return `${brandName} kitchen appliance premium`;
  return "luxury kitchen appliance stainless steel";
}

function deduplicateByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
