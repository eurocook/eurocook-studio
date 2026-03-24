import { useState, useCallback } from "react";

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

const TABS = ["generator", "publish", "saved", "guide"];

const C = {
  bg:       "#F7F6F3",
  surface:  "#FFFFFF",
  border:   "#E5E1D8",
  border2:  "#CCC8BE",
  text:     "#1C1C1C",
  textSub:  "#6A6560",
  textMute: "#A09B94",
  gold:     "#B8924A",
  goldDk:   "#8C6D32",
  goldLt:   "#F5ECD9",
  goldBg:   "#FDF6EC",
  green:    "#2E7D52",
  greenBg:  "#EDF7F2",
  red:      "#C0392B",
  redBg:    "#FDF0EE",
  blue:     "#1A5C9E",
  blueBg:   "#EEF4FC",
};

export default function EurocookTool() {
  const [activeTab, setActiveTab]           = useState("generator");
  const [selectedBrand, setSelectedBrand]   = useState(null);
  const [postType, setPostType]             = useState(null);
  const [tone, setTone]                     = useState("luxury");
  const [topic, setTopic]                   = useState("");
  const [generating, setGenerating]         = useState(false);
  const [generatedPost, setGeneratedPost]   = useState(null);
  const [genError, setGenError]             = useState(null);
  const [fbPageId, setFbPageId]             = useState("");
  const [fbToken, setFbToken]               = useState("");
  const [imageUrl, setImageUrl]             = useState("");
  const [productLink, setProductLink]       = useState("");
  const [publishMode, setPublishMode]       = useState("now");
  const [scheduleTime, setScheduleTime]     = useState("");
  const [publishing, setPublishing]         = useState(false);
  const [publishResult, setPublishResult]   = useState(null);
  const [publishError, setPublishError]     = useState(null);
  const [showToken, setShowToken]           = useState(false);
  const [savedPosts, setSavedPosts]         = useState([]);
  const [copied, setCopied]                 = useState(false);

  const brand = BRANDS.find((b) => b.id === selectedBrand);

  const buildPostText = (post) =>
    `${post.emoji_hook} ${post.headline}\n\n${post.body}\n\n👉 ${post.cta}\n\n${post.hashtags.join(" ")}`;

  const generatePost = useCallback(async () => {
    if (!selectedBrand || !postType) return;
    setGenerating(true); setGenError(null); setGeneratedPost(null);
    const bi = BRANDS.find((b) => b.id === selectedBrand);
    const pi = POST_TYPES.find((p) => p.id === postType);
    const ti = TONES.find((t) => t.id === tone);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: bi.name, brandTagline: bi.tagline, postTypeLabel: pi.label, toneLabel: ti.label, topic: topic || "" }),
      });
      const parsed = await res.json();
      if (!res.ok) throw new Error(parsed.error || "Lỗi server");
      setGeneratedPost({ ...parsed, brand: selectedBrand, postType, timestamp: new Date() });
    } catch (err) {
      setGenError(err.message || "Lỗi khi tạo bài. Vui lòng thử lại.");
    } finally { setGenerating(false); }
  }, [selectedBrand, postType, tone, topic]);

  const publishToFacebook = async () => {
    if (!generatedPost || !fbPageId || !fbToken) return;
    setPublishing(true); setPublishResult(null); setPublishError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: fbPageId, accessToken: fbToken, message: buildPostText(generatedPost), imageUrl: imageUrl || null, productLink: productLink || null, publishMode, scheduledTime: publishMode === "scheduled" ? scheduleTime : null }),
      });
      const result = await res.json();
      if (!res.ok || result.error) setPublishError(result.error || "Lỗi không xác định");
      else {
        setPublishResult(result.postId);
        setSavedPosts((prev) => [{ ...generatedPost, id: Date.now(), published: true, fbPostId: result.postId, publishedAt: new Date(), mode: publishMode }, ...prev]);
      }
    } catch { setPublishError("Lỗi kết nối server."); }
    finally { setPublishing(false); }
  };

  const copyPost = () => { if (!generatedPost) return; navigator.clipboard.writeText(buildPostText(generatedPost)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const savePost = () => { if (!generatedPost) return; setSavedPosts((prev) => [{ ...generatedPost, id: Date.now(), published: false }, ...prev]); };

  const tabLabels = { generator: "Tạo bài", publish: `Đăng Facebook${generatedPost ? " ●" : ""}`, saved: `Đã lưu (${savedPosts.length})`, guide: "Hướng dẫn" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        input, textarea, button { font-family: 'DM Sans', sans-serif; }
        input::placeholder { color: ${C.textMute}; }
        input:focus { outline: none; border-color: ${C.gold} !important; box-shadow: 0 0 0 3px ${C.goldLt}; }
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
        <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 16px rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: `linear-gradient(135deg,${C.gold},#D4A85A)`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: `0 2px 8px ${C.gold}44` }}>🍽️</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, letterSpacing: 2.5, color: C.text, lineHeight: 1 }}>EUROCOOK</div>
              <div style={{ fontSize: 9.5, color: C.textMute, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 2 }}>AI Social Media Studio</div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 500, background: activeTab === tab ? C.goldBg : "transparent", color: activeTab === tab ? C.goldDk : C.textSub, borderBottom: `2px solid ${activeTab === tab ? C.gold : "transparent"}` }}>{tabLabels[tab]}</button>
            ))}
          </nav>
        </header>

        <main style={{ maxWidth: 1160, margin: "0 auto", padding: "32px 24px" }}>

          {/* TAB 1 — GENERATOR */}
          {activeTab === "generator" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <Card step="01" title="Chọn thương hiệu">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
                    {BRANDS.map((b) => (
                      <button key={b.id} onClick={() => setSelectedBrand(b.id)} style={{ padding: "12px 8px", borderRadius: 9, textAlign: "center", border: `1.5px solid ${selectedBrand === b.id ? b.color : C.border}`, background: selectedBrand === b.id ? b.light : C.surface, boxShadow: selectedBrand === b.id ? `0 2px 10px ${b.color}22` : "none" }}>
                        <div style={{ fontSize: 20, marginBottom: 5 }}>{b.icon}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, color: selectedBrand === b.id ? b.color : C.textSub, textTransform: "uppercase" }}>{b.name}</div>
                      </button>
                    ))}
                  </div>
                  {brand && <div style={{ marginTop: 10, padding: "9px 14px", background: brand.light, border: `1px solid ${brand.color}30`, borderRadius: 8, fontSize: 13, color: brand.color, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>❝ {brand.tagline} ❞</div>}
                </Card>

                <Card step="02" title="Loại nội dung">
                  {POST_TYPES.map((p) => (
                    <button key={p.id} onClick={() => setPostType(p.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 13px", marginBottom: 6, borderRadius: 8, border: `1.5px solid ${postType === p.id ? C.gold : C.border}`, background: postType === p.id ? C.goldBg : C.surface, textAlign: "left" }}>
                      <span style={{ fontSize: 13, fontWeight: postType === p.id ? 600 : 400, color: postType === p.id ? C.goldDk : C.text }}>{p.label}</span>
                      <span style={{ fontSize: 11, color: C.textMute }}>{p.desc}</span>
                    </button>
                  ))}
                </Card>

                <Card step="03" title="Giọng điệu & Chủ đề">
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
                    {TONES.map((t) => (
                      <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, border: `1.5px solid ${tone === t.id ? C.gold : C.border}`, background: tone === t.id ? C.goldBg : C.surface, color: tone === t.id ? C.goldDk : C.textSub }}>{t.label}</button>
                    ))}
                  </div>
                  <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Chủ đề cụ thể (tùy chọn) — vd: lò hơi nước, tủ lạnh âm tủ..." style={IS} />
                </Card>

                <PrimBtn onClick={generatePost} disabled={!selectedBrand || !postType || generating}>
                  {generating ? <><Spin /> Đang tạo bài...</> : "✨  Tạo bài đăng"}
                </PrimBtn>
                {genError && <Alert type="error" msg={genError} />}
              </div>

              <Card step="04" title="Xem trước bài đăng">
                {!generatedPost && !generating && <Empty icon="✍️" text={"Chọn thương hiệu và loại nội dung\nrồi nhấn Tạo bài đăng"} />}
                {generating && <Loading label={`Đang tạo nội dung cho ${brand?.name}...`} />}
                {generatedPost && !generating && (
                  <div className="fade-in">
                    <FBPreview post={generatedPost} productLink={productLink} imageUrl={imageUrl} />
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
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 2 — PUBLISH */}
          {activeTab === "publish" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card step="01" title="Kết nối Facebook Page">
                  <Lbl>Page ID</Lbl>
                  <input value={fbPageId} onChange={(e) => setFbPageId(e.target.value)} placeholder="VD: 123456789012345" style={IS} />
                  <Lbl style={{ marginTop: 12 }}>Page Access Token</Lbl>
                  <div style={{ position: "relative" }}>
                    <input value={fbToken} onChange={(e) => setFbToken(e.target.value)} type={showToken ? "text" : "password"} placeholder="EAAxxxxx..." style={{ ...IS, paddingRight: 58 }} />
                    <button onClick={() => setShowToken(!showToken)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.textMute, fontSize: 12, padding: 0 }}>{showToken ? "Ẩn" : "Hiện"}</button>
                  </div>
                  {fbPageId && fbToken && <Alert type="success" msg="✅ Đã nhập thông tin kết nối" />}
                  <button onClick={() => setActiveTab("guide")} style={{ marginTop: 10, background: "none", border: "none", color: C.gold, fontSize: 12.5, padding: 0, textDecoration: "underline" }}>❓ Cách lấy Page ID và Access Token →</button>
                </Card>

                <Card step="02" title="Đính kèm ảnh & link">
                  <Lbl>URL ảnh sản phẩm</Lbl>
                  <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... (để trống nếu chỉ đăng text)" style={IS} />
                  {imageUrl && <img src={imageUrl} alt="preview" onError={(e) => e.target.style.display = "none"} style={{ marginTop: 8, width: "100%", maxHeight: 130, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />}
                  <Lbl style={{ marginTop: 12 }}>Link sản phẩm Eurocook</Lbl>
                  <input value={productLink} onChange={(e) => setProductLink(e.target.value)} placeholder="https://eurocook.vn/san-pham/..." style={IS} />
                </Card>

                <Card step="03" title="Chế độ đăng">
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["now","⚡ Đăng ngay"],["scheduled","📅 Lên lịch"]].map(([val,lbl]) => (
                      <button key={val} onClick={() => setPublishMode(val)} style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: `1.5px solid ${publishMode === val ? C.gold : C.border}`, background: publishMode === val ? C.goldBg : C.surface, color: publishMode === val ? C.goldDk : C.textSub }}>{lbl}</button>
                    ))}
                  </div>
                  {publishMode === "scheduled" && (
                    <div style={{ marginTop: 12 }}>
                      <Lbl>Thời gian đăng bài</Lbl>
                      <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={IS} />
                      <p style={{ fontSize: 11.5, color: C.textMute, marginTop: 5 }}>* Tối thiểu 10 phút từ bây giờ. Fanpage cần ≥ 2,000 người thích.</p>
                    </div>
                  )}
                </Card>

                <PrimBtn onClick={publishToFacebook} disabled={!generatedPost || !fbPageId || !fbToken || publishing || (publishMode === "scheduled" && !scheduleTime)}>
                  {publishing ? <><Spin /> Đang đăng...</> : publishMode === "now" ? "🚀  Đăng lên Facebook ngay" : "📅  Lên lịch đăng bài"}
                </PrimBtn>
                {publishError && <Alert type="error" msg={publishError} />}
                {publishResult && (
                  <div style={{ padding: "14px 16px", background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10 }}>
                    <div style={{ color: C.green, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{publishMode === "now" ? "✅ Đăng thành công!" : "📅 Đã lên lịch thành công!"}</div>
                    <div style={{ color: C.textSub, fontSize: 12, marginBottom: 4 }}>Post ID: {publishResult}</div>
                    <a href={`https://www.facebook.com/${publishResult.replace("_","/posts/")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.blue }}>→ Xem bài trên Facebook ↗</a>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card step="04" title="Xem trước trước khi đăng">
                  {!generatedPost ? <Empty icon="⬅️" text="Tạo bài ở tab 'Tạo bài' trước" /> : (
                    <>
                      <FBPreview post={generatedPost} productLink={productLink} imageUrl={imageUrl} />
                      {publishMode === "scheduled" && scheduleTime && <div style={{ marginTop: 10, padding: "9px 13px", background: C.blueBg, border: `1px solid ${C.blue}22`, borderRadius: 8 }}><span style={{ color: C.blue, fontSize: 13 }}>📅 Sẽ đăng lúc: <strong>{new Date(scheduleTime).toLocaleString("vi-VN")}</strong></span></div>}
                      <div style={{ marginTop: 10 }}><HTagRow tags={generatedPost.hashtags} /></div>
                    </>
                  )}
                </Card>
                <Card step="" title="Lịch sử đăng bài">
                  {savedPosts.filter((p) => p.published).length === 0
                    ? <p style={{ color: C.textMute, fontSize: 13, textAlign: "center", padding: 16 }}>Chưa có bài nào đăng qua tool này</p>
                    : savedPosts.filter((p) => p.published).slice(0, 4).map((post) => {
                      const b = BRANDS.find((x) => x.id === post.brand);
                      return (
                        <div key={post.id} style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${C.border}` }}>
                          <div><div style={{ fontSize: 13, fontWeight: 500 }}>{post.emoji_hook} {post.headline}</div><div style={{ color: C.textMute, fontSize: 11 }}>{b?.name} · {new Date(post.publishedAt).toLocaleString("vi-VN")}</div></div>
                          <Chip text={post.mode === "scheduled" ? "📅 Lịch" : "✅ Đăng"} color={C.green} bg={C.greenBg} />
                        </div>
                      );
                    })}
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3 — SAVED */}
          {activeTab === "saved" && (
            <Card step="" title={`Kho bài — ${savedPosts.length} bài đã lưu`}>
              {savedPosts.length === 0 ? <Empty icon="📝" text="Chưa có bài nào. Tạo bài ở tab đầu tiên." /> : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {savedPosts.map((post) => {
                    const b = BRANDS.find((x) => x.id === post.brand);
                    return (
                      <div key={post.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 5 }}>
                          <div style={{ display: "flex", gap: 6 }}><Chip text={b?.name} color={b?.color} bg={b?.light} />{post.published && <Chip text="✅ Đã đăng" color={C.green} bg={C.greenBg} />}</div>
                          <span style={{ color: C.textMute, fontSize: 11 }}>{new Date(post.timestamp).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{post.emoji_hook} {post.headline}</div>
                        <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{post.body.substring(0, 110)}...</div>
                        <div style={{ display: "flex", gap: 7 }}>
                          <SecBtn small onClick={() => navigator.clipboard.writeText(buildPostText(post))}>📋 Sao chép</SecBtn>
                          {!post.published && <SecBtn small onClick={() => { setGeneratedPost(post); setActiveTab("publish"); }}>📤 Đăng</SecBtn>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4 — GUIDE */}
          {activeTab === "guide" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <Card step="" title="Cách lấy Facebook Page Access Token">
                {[["1","Truy cập Meta for Developers","Vào developers.facebook.com → đăng nhập tài khoản quản trị fanpage Eurocook.","🔗"],["2","Tạo ứng dụng","My Apps → Create App → Business → đặt tên (VD: Eurocook Publisher).","📱"],["3","Mở Graph API Explorer","Tools → Graph API Explorer → chọn ứng dụng vừa tạo.","🛠️"],["4","Generate Access Token","Chọn Page Eurocook → Generate Token → cấp quyền: pages_manage_posts, pages_read_engagement, publish_pages.","🎫"],["5","Lấy Page ID","Vào fanpage → Giới thiệu → Minh bạch trang → Page ID ở phía dưới.","🆔"],["6","Token dài hạn (khuyên dùng)","Dùng endpoint /oauth/access_token?grant_type=fb_exchange_token để đổi sang long-lived token (60 ngày).","⏳"]].map(([num,title,desc,icon]) => (
                  <div key={num} style={{ display: "flex", gap: 12, padding: "11px 13px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#D4A85A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{num}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 3 }}>{icon} {title}</div><div style={{ color: C.textSub, fontSize: 12.5, lineHeight: 1.6 }}>{desc}</div></div>
                  </div>
                ))}
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card step="" title="Quyền cần thiết">
                  {[["pages_manage_posts","Đăng, sửa, xóa bài"],["pages_read_engagement","Đọc thống kê"],["pages_show_list","Xem danh sách pages"],["publish_pages","Đăng bài lên page"]].map(([perm,desc]) => (
                    <div key={perm} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.bg, borderRadius: 7, marginBottom: 6, border: `1px solid ${C.border}` }}>
                      <code style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>{perm}</code>
                      <span style={{ color: C.textSub, fontSize: 12 }}>{desc}</span>
                    </div>
                  ))}
                </Card>
                <Card step="" title="Lưu ý quan trọng">
                  {["Token có thời hạn — kiểm tra định kỳ và gia hạn kịp thời","Lên lịch bài: Fanpage cần tối thiểu 2,000 người thích","Không chia sẻ Access Token cho bất kỳ ai","Nên dùng System User trong Business Manager cho môi trường thực tế","Rate limit: Facebook giới hạn ~200 posts/ngày/page"].map((note,i) => (
                    <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8, fontSize: 13, color: C.textSub, alignItems: "flex-start" }}>
                      <span style={{ color: C.gold, flexShrink: 0 }}>›</span>{note}
                    </div>
                  ))}
                </Card>
                <Card step="" title="Links hữu ích">
                  {[["Meta for Developers","https://developers.facebook.com"],["Graph API Explorer","https://developers.facebook.com/tools/explorer"],["Access Token Tool","https://developers.facebook.com/tools/accesstoken"]].map(([label,url]) => (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px", background: C.blueBg, borderRadius: 8, marginBottom: 7, textDecoration: "none", border: `1px solid ${C.blue}18` }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>↗ {label}</span>
                    </a>
                  ))}
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ── COMPONENTS ────────────────────────────────────

function Card({ step, title, children }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        {step && <span style={{ fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 2, textTransform: "uppercase", background: C.goldBg, padding: "2px 7px", borderRadius: 4 }}>{step}</span>}
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function PrimBtn({ onClick, disabled, children, small }) {
  return <button onClick={onClick} disabled={disabled} style={{ width: small ? undefined : "100%", padding: small ? "9px 16px" : "13px 20px", background: disabled ? C.border : `linear-gradient(135deg,${C.gold},#D4A85A)`, border: "none", borderRadius: 8, color: disabled ? C.textMute : "#fff", fontSize: small ? 13 : 14, fontWeight: 600, letterSpacing: 0.3, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : `0 2px 12px ${C.gold}44` }}>{children}</button>;
}
function SecBtn({ onClick, children, small }) {
  return <button onClick={onClick} style={{ padding: small ? "8px 14px" : "12px 20px", background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 8, color: C.text, fontSize: small ? 12.5 : 13, fontWeight: 500 }}>{children}</button>;
}
function Lbl({ children, style }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6, letterSpacing: 0.2, ...style }}>{children}</div>;
}
function Chip({ text, color, bg }) {
  return <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: color || C.textSub, background: bg || C.bg, border: `1px solid ${color || C.border}22` }}>{text}</span>;
}
function Alert({ type, msg }) {
  const s = { error: [C.redBg, C.red], success: [C.greenBg, C.green], info: [C.blueBg, C.blue] }[type] || [C.bg, C.textSub];
  return <div style={{ padding: "10px 13px", background: s[0], border: `1px solid ${s[1]}33`, borderRadius: 8, color: s[1], fontSize: 13, marginTop: 6 }}>{msg}</div>;
}
function Spin() {
  return <span style={{ width: 14, height: 14, border: `2px solid ${C.goldLt}`, borderTopColor: C.gold, borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />;
}
function Empty({ icon, text }) {
  return <div style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}><div style={{ fontSize: 36, opacity: .2 }}>{icon}</div><div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.8, color: C.textMute, whiteSpace: "pre-line" }}>{text}</div></div>;
}
function Loading({ label }) {
  return <div style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 13 }}><div style={{ width: 40, height: 40, border: `3px solid ${C.goldLt}`, borderTopColor: C.gold, borderRadius: "50%", animation: "spin 1s linear infinite" }} /><div style={{ color: C.gold, fontSize: 13, fontWeight: 500 }}>{label}</div></div>;
}
function IBadge({ label, value }) {
  return <div style={{ padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}><div style={{ fontSize: 10.5, color: C.textMute, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{value || "—"}</div></div>;
}
function HTagRow({ tags }) {
  return <div style={{ padding: "10px 12px", background: C.blueBg, border: `1px solid ${C.blue}18`, borderRadius: 8 }}><div style={{ fontSize: 10, color: C.textMute, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>Hashtags</div><div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{tags.map((tag) => <span key={tag} style={{ padding: "3px 8px", background: "#fff", border: `1px solid ${C.blue}22`, borderRadius: 4, color: C.blue, fontSize: 11, fontWeight: 500 }}>{tag}</span>)}</div></div>;
}
function FBPreview({ post, productLink, imageUrl }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 9, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},#D4A85A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
        <div><div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Eurocook Vietnam</div><div style={{ color: "#9A9A9A", fontSize: 11 }}>Vừa xong · 🌐</div></div>
      </div>
      <div style={{ padding: "12px 14px", fontSize: 13.5, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#1A1A1A" }}>
        <strong style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: C.goldDk }}>{post.emoji_hook} {post.headline}</strong>
        {"\n\n"}{post.body}
        {"\n\n"}<span style={{ color: C.gold, fontWeight: 600 }}>👉 {post.cta}</span>
        {productLink && <><br /><span style={{ color: C.blue }}>🔗 {productLink}</span></>}
        {"\n\n"}<span style={{ color: C.blue, fontSize: 12 }}>{post.hashtags.join(" ")}</span>
      </div>
      {imageUrl && <img src={imageUrl} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 16 }}>
        {["👍 Thích","💬 Bình luận","↗️ Chia sẻ"].map((a) => <span key={a} style={{ color: "#9A9A9A", fontSize: 12 }}>{a}</span>)}
      </div>
    </div>
  );
}
const IS = { width: "100%", padding: "10px 13px", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", transition: "border-color .15s" };
