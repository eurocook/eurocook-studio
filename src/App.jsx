import { useState, useCallback, useEffect } from "react";

const BRANDS = [
  { id: "bosch",    name: "BOSCH",    color: "#C8102E", light: "#fff0f0", icon: "⚙️", tagline: "Invented for life" },
  { id: "siemens",  name: "Siemens",  color: "#007B83", light: "#f0fbfb", icon: "◈",  tagline: "Ingenuity for life" },
  { id: "miele",    name: "Miele",    color: "#2D2D6E", light: "#f0f0fb", icon: "🏆", tagline: "Immer Besser" },
  { id: "vzug",     name: "V-Zug",    color: "#8B1A1A", light: "#fff0f0", icon: "✦",  tagline: "Swiss Perfection" },
  { id: "gaggenau", name: "Gaggenau", color: "#2C2C2C", light: "#f5f5f5", icon: "◆",  tagline: "Exceptional by Tradition" },
  { id: "liebherr", name: "Liebherr", color: "#005BAC", light: "#f0f5ff", icon: "❄️", tagline: "Quality — Tradition — Innovation" },
];

const POST_TYPES = [
  { id: "product_highlight", label: "✨ Giới thiệu sản phẩm",    desc: "Tính năng độc đáo" },
  { id: "tips_tricks",       label: "💡 Mẹo nhà bếp",            desc: "Dễ viral" },
  { id: "brand_story",       label: "🏛️ Câu chuyện thương hiệu", desc: "Xây dựng trust" },
  { id: "lifestyle",         label: "🍽️ Lifestyle / Cảm hứng",   desc: "Kéo engagement" },
  { id: "promotion",         label: "🎁 Ưu đãi / Khuyến mãi",   desc: "Chuyển đổi doanh số" },
  { id: "comparison",        label: "⚖️ So sánh / Tư vấn",       desc: "Giáo dục khách hàng" },
];

const TONES = [
  { id: "luxury",       label: "💎 Sang trọng" },
  { id: "friendly",     label: "😊 Thân thiện" },
  { id: "expert",       label: "🎓 Chuyên gia" },
  { id: "storytelling", label: "📖 Kể chuyện" },
];

const TABS = ["generator", "publish", "saved", "settings"];

const C = {
  bg: "#F7F6F3", surface: "#FFFFFF", border: "#E5E1D8", border2: "#CCC8BE",
  text: "#1C1C1C", textSub: "#6A6560", textMute: "#A09B94",
  gold: "#B8924A", goldDk: "#8C6D32", goldLt: "#F5ECD9", goldBg: "#FDF6EC",
  green: "#2E7D52", greenBg: "#EDF7F2",
  red: "#C0392B", redBg: "#FDF0EE",
  blue: "#1A5C9E", blueBg: "#EEF4FC",
};

const LS = {
  get: (key, fallback = null) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

export default function EurocookTool() {
  const [activeTab, setActiveTab]         = useState("generator");

  // Generator
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [postType, setPostType]           = useState(null);
  const [tone, setTone]                   = useState("luxury");
  const [topic, setTopic]                 = useState("");
  const [generating, setGenerating]       = useState(false);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [genError, setGenError]           = useState(null);

  // Media — ảnh (tối đa 6) + video
  const [imageUrls, setImageUrls] = useState([{ id: 1, url: '' }]); // [{id, url}] tối đa 6
  const [videoUrl, setVideoUrl]           = useState("");
  const [mediaMode, setMediaMode]         = useState("image"); // "image" | "video" | "none"

  // Publish
  const [fbPageId, setFbPageId]           = useState(() => LS.get("ec_pageId", ""));
  const [fbToken, setFbToken]             = useState(() => LS.get("ec_token", ""));
  const [pageName, setPageName]           = useState(() => LS.get("ec_pageName", ""));
  const [productLink, setProductLink]     = useState("");
  const [publishMode, setPublishMode]     = useState("now");
  const [scheduleTime, setScheduleTime]   = useState("");
  const [publishing, setPublishing]       = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError]   = useState(null);
  const [showToken, setShowToken]         = useState(false);

  const [savedPosts, setSavedPosts]       = useState(() => LS.get("ec_saved", []));
  const [copied, setCopied]               = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const brand = BRANDS.find((b) => b.id === selectedBrand);

  useEffect(() => { LS.set("ec_saved", savedPosts); }, [savedPosts]);

  const buildPostText = (post) => {
    const tags = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : '';
    return `${post.emoji_hook || ''} ${post.headline || ''}\n\n${post.body || ''}\n\n👉 ${post.cta || ''}\n\n${tags}`;
  };

  // ── GENERATE ─────────────────────────────────────────────────
  const generatePost = useCallback(async () => {
    if (!selectedBrand || !postType) return;
    setGenerating(true); setGenError(null); setGeneratedPost(null);
    const bi = BRANDS.find((b) => b.id === selectedBrand);
    const pi = POST_TYPES.find((p) => p.id === postType);
    const ti = TONES.find((t) => t.id === tone);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: bi.name, brandTagline: bi.tagline, postTypeLabel: pi.label, toneLabel: ti.label, topic: topic || "" }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Lỗi server");
      // Đảm bảo các field bắt buộc tồn tại
      if (!parsed.headline || !parsed.body) throw new Error("Dữ liệu bài trả về không hợp lệ");
      if (!Array.isArray(parsed.hashtags)) parsed.hashtags = ["#Eurocook", "#EurocookGlobal"];
      setGeneratedPost({ ...parsed, brand: selectedBrand, postType, timestamp: new Date() });
    } catch (err) {
      setGenError(err.message || "Lỗi khi tạo bài.");
    } finally { setGenerating(false); }
  }, [selectedBrand, postType, tone, topic]);

  // ── PUBLISH ─────────────────────────────────────────────────
  const publishToFacebook = async () => {
    if (!generatedPost || !fbPageId || !fbToken) return;
    setPublishing(true); setPublishResult(null); setPublishError(null);

    try {
      let endpoint, body;

      if (mediaMode === "video" && videoUrl) {
        // Đăng video
        endpoint = "/api/publish-video";
        body = {
          pageId: fbPageId, accessToken: fbToken,
          message: buildPostText(generatedPost) + (productLink ? `\n\n🔗 ${productLink}` : ""),
          videoUrl,
          publishMode,
          scheduledTime: publishMode === "scheduled" ? scheduleTime : null,
        };
      } else {
        // Đăng ảnh (1-6) hoặc text only
        endpoint = "/api/publish";
        body = {
          pageId: fbPageId, accessToken: fbToken,
          message: buildPostText(generatedPost),
          images: mediaMode === "image" ? imageUrls.map(i => i.url).filter(u => u.trim()) : [],
          productLink: productLink || null,
          publishMode,
          scheduledTime: publishMode === "scheduled" ? scheduleTime : null,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        setPublishError(result.error || "Lỗi không xác định");
      } else {
        setPublishResult(result.postId);
        setSavedPosts((prev) => [{
          ...generatedPost, id: Date.now(), published: true,
          fbPostId: result.postId, publishedAt: new Date(),
          mode: publishMode, mediaMode,
          imageCount: imageUrls.filter(i => i.url.trim()).length,
          previewImage: imageUrls[0]?.url || null,
        }, ...prev]);
      }
    } catch { setPublishError("Lỗi kết nối server."); }
    finally { setPublishing(false); }
  };

  const copyPost  = () => { if (!generatedPost) return; navigator.clipboard.writeText(buildPostText(generatedPost)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const savePost  = () => { if (!generatedPost) return; setSavedPosts((prev) => [{ ...generatedPost, id: Date.now(), published: false, previewImage: imageUrls[0]?.url || null }]); };
  const saveSettings = () => { LS.set("ec_pageId", fbPageId); LS.set("ec_token", fbToken); LS.set("ec_pageName", pageName); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); };

  const isConnected = !!(fbPageId && fbToken);
  const tabLabels = {
    generator: "✍️ Tạo bài",
    publish:   `📤 Đăng FB${generatedPost ? " ●" : ""}`,
    saved:     `💾 Lưu (${savedPosts.length})`,
    settings:  "⚙️ Cài đặt",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        input, textarea, button { font-family: 'DM Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: ${C.textMute}; }
        input:focus, textarea:focus { outline: none; border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.goldLt}; }
        button { cursor: pointer; transition: all .15s ease; }
        button:not(:disabled):hover { transform: translateY(-1px); }
        button:active { transform: translateY(0) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .35s ease; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>

        {/* HEADER */}
        <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 16px rgba(0,0,0,0.06)" }}>
          {/* Căn theo maxWidth 1200px giống main content */}
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20 }}>

            {/* Nav + trạng thái — bên trái */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", background: isConnected ? C.greenBg : C.redBg, borderRadius: 20, border: `1px solid ${isConnected ? C.green : C.red}22` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: isConnected ? C.green : C.red }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: isConnected ? C.green : C.red }}>
                  {isConnected ? (pageName || "Đã kết nối") : "Chưa kết nối"}
                </span>
              </div>
              <nav style={{ display: "flex", gap: 2 }}>
                {TABS.map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 500, background: activeTab === tab ? C.goldBg : "transparent", color: activeTab === tab ? C.goldDk : C.textSub, borderBottom: `2px solid ${activeTab === tab ? C.gold : "transparent"}` }}>{tabLabels[tab]}</button>
                ))}
              </nav>
            </div>

            {/* Logo — bên phải, thẳng hàng với edge của content */}
            <a href="https://eurocook-studio-o3yc.vercel.app/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
              <img
                src="/eurocook-logo.png"
                alt="Eurocook Global"
                style={{ height: 48, width: "auto", maxWidth: 200, objectFit: "contain" }}
              />
            </a>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

          {/* ══ TAB 1 — GENERATOR ══ */}
          {activeTab === "generator" && (
            <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 22 }}>

              {/* Cột trái — Cấu hình bài */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card step="01" title="Chọn thương hiệu">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {BRANDS.map((b) => (
                      <button key={b.id} onClick={() => setSelectedBrand(b.id)} style={{ padding: "11px 6px", borderRadius: 9, textAlign: "center", border: `1.5px solid ${selectedBrand === b.id ? b.color : C.border}`, background: selectedBrand === b.id ? b.light : C.surface, boxShadow: selectedBrand === b.id ? `0 2px 10px ${b.color}22` : "none" }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{b.icon}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: selectedBrand === b.id ? b.color : C.textSub, textTransform: "uppercase" }}>{b.name}</div>
                      </button>
                    ))}
                  </div>
                  {brand && <div style={{ marginTop: 10, padding: "8px 13px", background: brand.light, border: `1px solid ${brand.color}28`, borderRadius: 8, fontSize: 13, color: brand.color, fontStyle: "italic", fontFamily: "'Playfair Display',serif" }}>❝ {brand.tagline} ❞</div>}
                </Card>

                <Card step="02" title="Loại nội dung">
                  {POST_TYPES.map((p) => (
                    <button key={p.id} onClick={() => setPostType(p.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "9px 12px", marginBottom: 6, borderRadius: 8, border: `1.5px solid ${postType === p.id ? C.gold : C.border}`, background: postType === p.id ? C.goldBg : C.surface, textAlign: "left" }}>
                      <span style={{ fontSize: 13, fontWeight: postType === p.id ? 600 : 400, color: postType === p.id ? C.goldDk : C.text }}>{p.label}</span>
                      <span style={{ fontSize: 11, color: C.textMute }}>{p.desc}</span>
                    </button>
                  ))}
                </Card>

                <Card step="03" title="Giọng điệu & Chủ đề">
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
                    {TONES.map((t) => (
                      <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: "6px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, border: `1.5px solid ${tone === t.id ? C.gold : C.border}`, background: tone === t.id ? C.goldBg : C.surface, color: tone === t.id ? C.goldDk : C.textSub }}>{t.label}</button>
                    ))}
                  </div>
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Chủ đề cụ thể (tùy chọn)..." style={IS} />
                </Card>

                <PrimBtn onClick={generatePost} disabled={!selectedBrand || !postType || generating}>
                  {generating ? <><Spin /> Đang tạo bài...</> : "✨  Tạo bài đăng"}
                </PrimBtn>
                {genError && <Alert type="error" msg={genError} />}
              </div>

              {/* Cột phải — Kết quả + Media */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {!generatedPost && !generating && (
                  <Card step="" title="Kết quả">
                    <Empty icon="✍️" text={"Chọn thương hiệu và loại nội dung\nrồi nhấn Tạo bài đăng"} />
                  </Card>
                )}
                {generating && <Card step="" title="Đang tạo..."><Loading label={`Đang tạo nội dung cho ${brand?.name}...`} /></Card>}

                {generatedPost && !generating && (
                  <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    {/* ── UPLOAD MEDIA ── */}
                    <Card step="04" title="Đính kèm ảnh / video">

                      {/* Tab chọn loại media */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        {[["none","📝 Chỉ text"],["image","🖼️ Ảnh (tối đa 6)"],["video","🎬 Video"]].map(([val,lbl]) => (
                          <button key={val} onClick={() => setMediaMode(val)} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: `1.5px solid ${mediaMode === val ? C.gold : C.border}`, background: mediaMode === val ? C.goldBg : C.surface, color: mediaMode === val ? C.goldDk : C.textSub }}>{lbl}</button>
                        ))}
                      </div>

                      {/* ── ẢNH — Nhập URL ── */}
                      {mediaMode === "image" && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <span style={{ fontSize: 12, color: C.textSub }}>Dán link ảnh · tối đa 6 ảnh</span>
                            <div style={{ display: "flex", gap: 7 }}>
                              {imageUrls.length < 6 && (
                                <button onClick={() => setImageUrls(prev => [...prev, { id: Date.now(), url: "" }])} style={{ background: "none", border: `1px solid ${C.gold}`, borderRadius: 6, color: C.goldDk, fontSize: 12, padding: "4px 10px" }}>+ Thêm ảnh</button>
                              )}
                              {imageUrls.length > 1 && (
                                <button onClick={() => setImageUrls([{ id: 1, url: "" }])} style={{ background: "none", border: "none", color: C.textMute, fontSize: 12 }}>Xóa tất cả</button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {imageUrls.map((item, idx) => (
                              <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {/* Preview thumbnail */}
                                <div style={{ width: 48, height: 48, borderRadius: 7, overflow: "hidden", border: `1.5px solid ${item.url ? C.gold : C.border}`, flexShrink: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {item.url ? (
                                    <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; if (e.target.nextSibling) e.target.nextSibling.style.display = "flex"; }} />
                                  ) : null}
                                  <div style={{ display: item.url ? "none" : "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: C.textMute, fontSize: 18 }}>🖼️</div>
                                </div>

                                {/* Input URL */}
                                <div style={{ flex: 1, position: "relative" }}>
                                  {idx === 0 && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontWeight: 700, color: C.gold, background: C.goldBg, padding: "1px 5px", borderRadius: 3, letterSpacing: 0.5 }}>CHÍNH</span>}
                                  <input
                                    value={item.url}
                                    onChange={(e) => setImageUrls(prev => prev.map(i => i.id === item.id ? { ...i, url: e.target.value } : i))}
                                    placeholder={`Ảnh ${idx + 1} — dán link ảnh vào đây...`}
                                    style={{ ...IS, paddingLeft: idx === 0 ? 60 : 13 }}
                                  />
                                </div>

                                {/* Xóa */}
                                {imageUrls.length > 1 && (
                                  <button onClick={() => setImageUrls(prev => prev.filter(i => i.id !== item.id))} style={{ width: 32, height: 38, border: `1px solid ${C.border}`, borderRadius: 7, background: C.surface, color: C.textMute, fontSize: 14, flexShrink: 0 }}>✕</button>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Summary */}
                          {imageUrls.filter(i => i.url.trim()).length > 0 && (
                            <div style={{ marginTop: 10, padding: "7px 11px", background: C.goldBg, border: `1px solid ${C.gold}33`, borderRadius: 7, fontSize: 12, color: C.goldDk, fontWeight: 500 }}>
                              ✅ {imageUrls.filter(i => i.url.trim()).length}/6 ảnh đã có link
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── VIDEO ── */}
                      {mediaMode === "video" && (
                        <div>
                          <Lbl>URL Video (.mp4 hoặc link video public)</Lbl>
                          <input
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://... (.mp4, link Dropbox, Google Drive public...)"
                            style={IS}
                          />
                          {videoUrl && (
                            <div style={{ marginTop: 10 }}>
                              <video src={videoUrl} controls style={{ width: "100%", maxHeight: 200, borderRadius: 8, border: `1px solid ${C.border}` }}
                                onError={(e) => e.target.style.display = "none"} />
                            </div>
                          )}
                          <div style={{ marginTop: 10, padding: "10px 13px", background: C.blueBg, border: `1px solid ${C.blue}18`, borderRadius: 8, fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
                            💡 <strong>Lưu ý:</strong> Video cần là URL public (có thể truy cập không cần đăng nhập). Định dạng hỗ trợ: MP4, MOV. Dung lượng tối đa Facebook: 10GB, tối đa 240 phút.
                          </div>
                        </div>
                      )}

                      {/* ── CHỈ TEXT ── */}
                      {mediaMode === "none" && (
                        <div style={{ textAlign: "center", padding: "20px 0", color: C.textMute, fontSize: 13 }}>
                          Bài sẽ được đăng dạng text thuần không kèm ảnh/video
                        </div>
                      )}
                    </Card>

                    {/* Link sản phẩm */}
                    <Card step="05" title="Link sản phẩm (tùy chọn)">
                      <input value={productLink} onChange={(e) => setProductLink(e.target.value)} placeholder="https://eurocook.com.vn/san-pham/..." style={IS} />
                    </Card>

                    {/* Preview */}
                    <Card step="06" title="Xem trước & Xuất bài">
                      <FBPreview
                        post={generatedPost}
                        productLink={productLink}
                        images={mediaMode === "image" ? uploadedImages : []}
                        videoUrl={mediaMode === "video" ? videoUrl : null}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0" }}>
                        <IBadge label="⏰ Giờ đăng tốt nhất" value={generatedPost.best_time} />
                        <IBadge label="🏷️ Thương hiệu" value={brand?.name} />
                      </div>
                      <HTagRow tags={generatedPost.hashtags} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <PrimBtn small onClick={copyPost}>{copied ? "✅ Đã sao chép!" : "📋 Sao chép"}</PrimBtn>
                        <SecBtn small onClick={savePost}>💾 Lưu bài</SecBtn>
                        <PrimBtn small onClick={() => setActiveTab("publish")}>📤 Đăng FB →</PrimBtn>
                      </div>
                      <button onClick={generatePost} style={{ marginTop: 8, width: "100%", padding: "9px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMute, fontSize: 13 }}>🔄 Tạo lại bài khác</button>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 2 — PUBLISH ══ */}
          {activeTab === "publish" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Trạng thái kết nối */}
                {isConnected ? (
                  <div style={{ padding: "13px 16px", background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: C.green, fontWeight: 600, fontSize: 14 }}>✅ Đã kết nối fanpage</div>
                      <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>{pageName || "Eurocook Global"} · ID: {fbPageId.substring(0,8)}...</div>
                    </div>
                    <button onClick={() => setActiveTab("settings")} style={{ background: "none", border: `1px solid ${C.green}55`, borderRadius: 7, padding: "6px 12px", color: C.green, fontSize: 12 }}>Đổi kết nối</button>
                  </div>
                ) : (
                  <Alert type="error" msg={<span>⚠️ Chưa kết nối fanpage. <button onClick={() => setActiveTab("settings")} style={{ background: "none", border: "none", color: C.red, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Vào Cài đặt →</button></span>} />
                )}

                {/* Tóm tắt media */}
                <Card step="01" title="Media đính kèm">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["none","📝 Text"],["image","🖼️ Ảnh"],["video","🎬 Video"]].map(([val,lbl]) => (
                      <button key={val} onClick={() => setMediaMode(val)} style={{ flex:1, padding:"9px 6px", borderRadius:8, fontSize:12.5, fontWeight:500, border:`1.5px solid ${mediaMode===val ? C.gold : C.border}`, background:mediaMode===val ? C.goldBg : C.surface, color:mediaMode===val ? C.goldDk : C.textSub }}>{lbl}</button>
                    ))}
                  </div>

                  {mediaMode === "image" && (
                    <div style={{ marginTop: 10 }}>
                      {imageUrls.filter(i => i.url.trim()).length > 0 ? (
                        <div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {imageUrls.filter(i => i.url.trim()).map((img, i) => (
                              <img key={img.id} src={img.url} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: i === 0 ? `2px solid ${C.gold}` : `1px solid ${C.border}` }} onError={(e) => e.target.style.opacity = "0.3"} />
                            ))}
                          </div>
                          <div style={{ marginTop: 7, fontSize: 12, color: C.textSub }}>
                            {imageUrls.filter(i => i.url.trim()).length} ảnh · <button onClick={() => setActiveTab("generator")} style={{ background: "none", border: "none", color: C.gold, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>Thay đổi →</button>
                          </div>
                        </div>
                      ) : (
                        <Alert type="info" msg={<span>Chưa có ảnh. <button onClick={() => setActiveTab("generator")} style={{ background: "none", border: "none", color: C.blue, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Quay lại nhập link ảnh →</button></span>} />
                      )}
                    </div>
                  )}

                  {mediaMode === "video" && (
                    <div style={{ marginTop: 10 }}>
                      {videoUrl ? (
                        <div style={{ padding: "8px 12px", background: C.blueBg, border: `1px solid ${C.blue}18`, borderRadius: 7, fontSize: 12, color: C.blue }}>
                          🎬 Video đã chọn · <button onClick={() => setActiveTab("generator")} style={{ background: "none", border: "none", color: C.blue, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}>Thay đổi →</button>
                        </div>
                      ) : (
                        <Alert type="info" msg={<span>Chưa có video. <button onClick={() => setActiveTab("generator")} style={{ background: "none", border: "none", color: C.blue, textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>Quay lại nhập URL video →</button></span>} />
                      )}
                    </div>
                  )}
                </Card>

                <Card step="02" title="Link sản phẩm">
                  <input value={productLink} onChange={(e) => setProductLink(e.target.value)} placeholder="https://eurocook.com.vn/san-pham/..." style={IS} />
                </Card>

                <Card step="03" title="Chế độ đăng">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["now","⚡ Đăng ngay"],["scheduled","📅 Lên lịch"]].map(([val,lbl]) => (
                      <button key={val} onClick={() => setPublishMode(val)} style={{ flex:1, padding:"10px", borderRadius:8, fontSize:13, fontWeight:500, border:`1.5px solid ${publishMode===val ? C.gold : C.border}`, background:publishMode===val ? C.goldBg : C.surface, color:publishMode===val ? C.goldDk : C.textSub }}>{lbl}</button>
                    ))}
                  </div>
                  {publishMode === "scheduled" && (
                    <div style={{ marginTop: 12 }}>
                      <Lbl>Thời gian đăng bài</Lbl>
                      <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={IS} />
                      <p style={{ fontSize: 11.5, color: C.textMute, marginTop: 5 }}>* Tối thiểu 10 phút. Fanpage cần ≥ 2,000 người thích.</p>
                    </div>
                  )}
                </Card>

                <PrimBtn
                  onClick={publishToFacebook}
                  disabled={!generatedPost || !isConnected || publishing
                    || (publishMode === "scheduled" && !scheduleTime)
                    || (mediaMode === "video" && !videoUrl)}
                >
                  {publishing ? <><Spin /> Đang đăng...</>
                    : mediaMode === "video" ? "🎬  Đăng Video lên Facebook"
                    : mediaMode === "image" && imageUrls.filter(i => i.url.trim()).length > 0 ? `🖼️  Đăng ${imageUrls.filter(i => i.url.trim()).length} ảnh lên Facebook`
                    : "📝  Đăng bài lên Facebook"}
                </PrimBtn>

                {publishError && <Alert type="error" msg={publishError} />}
                {publishResult && (
                  <div style={{ padding: "14px 16px", background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10 }}>
                    <div style={{ color: C.green, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{publishMode === "now" ? "✅ Đăng thành công!" : "📅 Đã lên lịch!"}</div>
                    <div style={{ color: C.textSub, fontSize: 12, marginBottom: 4 }}>Post ID: {publishResult}</div>
                    <a href={`https://www.facebook.com/${publishResult.replace("_","/posts/")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.blue }}>→ Xem trên Facebook ↗</a>
                  </div>
                )}
              </div>

              {/* Preview */}
              <Card step="" title="Xem trước trước khi đăng">
                {!generatedPost
                  ? <Empty icon="⬅️" text="Tạo bài ở tab 'Tạo bài' trước" />
                  : <>
                    <FBPreview post={generatedPost} productLink={productLink} images={mediaMode === "image" ? uploadedImages : []} videoUrl={mediaMode === "video" ? videoUrl : null} />
                    {publishMode === "scheduled" && scheduleTime && (
                      <div style={{ marginTop: 10, padding: "9px 13px", background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 8 }}>
                        <span style={{ color: C.blue, fontSize: 13 }}>📅 Sẽ đăng lúc: <strong>{new Date(scheduleTime).toLocaleString("vi-VN")}</strong></span>
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}><HTagRow tags={generatedPost.hashtags} /></div>
                  </>
                }
              </Card>
            </div>
          )}

          {/* ══ TAB 3 — SAVED ══ */}
          {activeTab === "saved" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 600 }}>Kho bài — {savedPosts.length} bài</h2>
                {savedPosts.length > 0 && <SecBtn small onClick={() => { if (confirm("Xóa tất cả bài đã lưu?")) setSavedPosts([]); }}>🗑️ Xóa tất cả</SecBtn>}
              </div>
              {savedPosts.length === 0 ? (
                <Card step="" title=""><Empty icon="📝" text="Chưa có bài nào." /></Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {savedPosts.map((post) => {
                    const b = BRANDS.find((x) => x.id === post.brand);
                    return (
                      <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        {post.previewImage && <img src={post.previewImage} alt="" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 7, marginBottom: 10 }} />}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 5 }}>
                          <div style={{ display: "flex", gap: 5 }}>
                            <Chip text={b?.name} color={b?.color} bg={b?.light} />
                            {post.published && <Chip text="✅ Đăng" color={C.green} bg={C.greenBg} />}
                            {post.imageCount > 0 && <Chip text={`🖼️ ${post.imageCount}`} />}
                            {post.isVideo && <Chip text="🎬 Video" />}
                          </div>
                          <span style={{ color: C.textMute, fontSize: 11 }}>{new Date(post.timestamp).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{post.emoji_hook} {post.headline}</div>
                        <div style={{ color: C.textSub, fontSize: 12, lineHeight: 1.6, marginBottom: 11 }}>{post.body.substring(0,100)}...</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <SecBtn small onClick={() => navigator.clipboard.writeText(buildPostText(post))}>📋 Copy</SecBtn>
                          {!post.published && <SecBtn small onClick={() => { setGeneratedPost(post); setActiveTab("publish"); }}>📤 Đăng</SecBtn>}
                          <button onClick={() => setSavedPosts((prev) => prev.filter((p) => p.id !== post.id))} style={{ marginLeft: "auto", background: "none", border: "none", color: C.textMute, fontSize: 13, cursor: "pointer" }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB 4 — SETTINGS ══ */}
          {activeTab === "settings" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <Card step="" title="🔑 Kết nối Facebook Page">
                <div style={{ padding: "10px 13px", background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 8, marginBottom: 14, fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
                  Thông tin được lưu trên trình duyệt. Không cần nhập lại mỗi lần.
                </div>
                <Lbl>Tên fanpage</Lbl>
                <input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="VD: Eurocook Global" style={{ ...IS, marginBottom: 12 }} />
                <Lbl>Page ID</Lbl>
                <input value={fbPageId} onChange={(e) => setFbPageId(e.target.value)} placeholder="VD: 494852260642531" style={{ ...IS, marginBottom: 12 }} />
                <Lbl>Page Access Token</Lbl>
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <input value={fbToken} onChange={(e) => setFbToken(e.target.value)} type={showToken ? "text" : "password"} placeholder="EAAxxxxx..." style={{ ...IS, paddingRight: 60 }} />
                  <button onClick={() => setShowToken(!showToken)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMute, fontSize: 12, padding: 0 }}>{showToken ? "Ẩn" : "Hiện"}</button>
                </div>
                <PrimBtn onClick={saveSettings}>{settingsSaved ? "✅ Đã lưu!" : "💾  Lưu cài đặt"}</PrimBtn>
                {isConnected && <Alert type="success" msg={`✅ Đang kết nối: ${pageName || fbPageId}`} />}
                <div style={{ marginTop: 14, fontSize: 12, color: C.textMute, lineHeight: 1.7 }}>
                  Lấy Page Token:<br />
                  <code style={{ fontSize: 11, background: C.bg, padding: "2px 6px", borderRadius: 4, color: C.blue }}>graph.facebook.com/me/accounts?access_token=USER_TOKEN</code>
                </div>
              </Card>

              <Card step="" title="ℹ️ Thông tin tool">
                {[["Tên pháp nhân","EUROCOOK GLOBAL"],["Hashtag cố định","#Eurocook · #EurocookGlobal"],["Ảnh/bài","Tối đa 6 ảnh"],["Video","Upload URL .mp4"],["AI model","Claude claude-sonnet-4-20250514"],["Đăng lịch","Fanpage cần ≥ 2,000 likes"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: C.bg, borderRadius: 7, marginBottom: 7, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12, color: C.textSub }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ── COMPONENTS ─────────────────────────────────────────────────
function Card({ step, title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      {title && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
          {step && <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 2, background: C.goldBg, padding: "2px 7px", borderRadius: 4 }}>{step}</span>}
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontWeight: 600, color: C.text }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
function PrimBtn({ onClick, disabled, children, small }) {
  return <button onClick={onClick} disabled={disabled} style={{ width: small ? undefined : "100%", padding: small ? "9px 16px" : "13px 20px", background: disabled ? C.border : `linear-gradient(135deg,${C.gold},#D4A85A)`, border: "none", borderRadius: 8, color: disabled ? C.textMute : "#fff", fontSize: small ? 13 : 14, fontWeight: 600, letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : `0 2px 12px ${C.gold}44` }}>{children}</button>;
}
function SecBtn({ onClick, children, small }) {
  return <button onClick={onClick} style={{ padding: small ? "8px 13px" : "11px 18px", background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 8, color: C.text, fontSize: small ? 12.5 : 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>{children}</button>;
}
function Lbl({ children, style }) { return <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6, ...style }}>{children}</div>; }
function Chip({ text, color, bg }) { return <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: color || C.textSub, background: bg || C.bg, border: `1px solid ${color || C.border}22` }}>{text}</span>; }
function Alert({ type, msg }) {
  const s = { error: [C.redBg, C.red], success: [C.greenBg, C.green], info: [C.blueBg, C.blue] }[type] || [C.bg, C.textSub];
  return <div style={{ padding: "10px 13px", background: s[0], border: `1px solid ${s[1]}33`, borderRadius: 8, color: s[1], fontSize: 13, marginTop: 6 }}>{msg}</div>;
}
function Spin() { return <span style={{ width: 14, height: 14, border: `2px solid ${C.goldLt}`, borderTopColor: C.gold, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite", flexShrink: 0 }} />; }
function Empty({ icon, text }) { return <div style={{ minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}><div style={{ fontSize: 36, opacity: .2 }}>{icon}</div><div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.8, color: C.textMute, whiteSpace: "pre-line" }}>{text}</div></div>; }
function Loading({ label }) { return <div style={{ minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 13 }}><div style={{ width: 40, height: 40, border: `3px solid ${C.goldLt}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 1s linear infinite" }} /><div style={{ color: C.gold, fontSize: 13, fontWeight: 500 }}>{label}</div></div>; }
function IBadge({ label, value }) { return <div style={{ padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}><div style={{ fontSize: 10.5, color: C.textMute, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{value || "—"}</div></div>; }
function HTagRow({ tags }) { const safeTags = Array.isArray(tags) ? tags : []; return <div style={{ padding: "10px 12px", background: C.blueBg, border: `1px solid ${C.blue}18`, borderRadius: 8 }}><div style={{ fontSize: 10, color: C.textMute, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Hashtags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{safeTags.map((tag) => <span key={tag} style={{ padding: "3px 8px", background: "#fff", border: `1px solid ${C.blue}22`, borderRadius: 4, color: C.blue, fontSize: 11, fontWeight: 500 }}>{tag}</span>)}</div></div>; }

function ImageGrid({ images }) {
  if (!images || !images.length) return null;
  const valid = images.filter(i => i.url?.trim());
  if (!valid.length) return null;
  const cols = valid.length === 1 ? "1fr" : valid.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr";
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 2 }}>
      {valid.slice(0, 6).map((img, i) => (
        <img key={img.id || i} src={img.url} alt="" style={{ width: "100%", height: valid.length === 1 ? 220 : 100, objectFit: "cover", display: "block" }} onError={(e) => { e.target.style.display = "none"; }} />
      ))}
    </div>
  );
}

function FBPreview({ post, productLink, images, videoUrl }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 9, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#D4A85A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Eurocook Global</div>
          <div style={{ color: "#9A9A9A", fontSize: 11 }}>Vừa xong · 🌐</div>
        </div>
      </div>

      {/* Multi-image preview */}
      <ImageGrid images={images} />

      {/* Video preview */}
      {videoUrl && (
        <div style={{ background: "#000", position: "relative" }}>
          <video src={videoUrl} style={{ width: "100%", maxHeight: 200, display: "block" }}
            onError={(e) => e.target.style.display = "none"} />
        </div>
      )}

      <div style={{ padding: "12px 14px", fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <strong style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.goldDk }}>{post.emoji_hook} {post.headline}</strong>
        {"\n\n"}{post.body}
        {"\n\n"}<span style={{ color: C.gold, fontWeight: 600 }}>👉 {post.cta}</span>
        {productLink && <><br /><span style={{ color: C.blue }}>🔗 {productLink}</span></>}
        {"\n\n"}<span style={{ color: C.blue, fontSize: 12 }}>{post.hashtags.join(" ")}</span>
      </div>
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 16 }}>
        {["👍 Thích","💬 Bình luận","↗️ Chia sẻ"].map((a) => <span key={a} style={{ color: "#9A9A9A", fontSize: 12 }}>{a}</span>)}
      </div>
    </div>
  );
}

const IS = { width: "100%", padding: "10px 13px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", transition: "border-color .15s" };
