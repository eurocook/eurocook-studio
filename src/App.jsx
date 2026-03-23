import { useState, useCallback } from "react";

const BRANDS = [
  { id: "bosch",    name: "BOSCH",    color: "#C8102E", icon: "⚙️", tagline: "Invented for life" },
  { id: "siemens",  name: "Siemens",  color: "#009999", icon: "🔵", tagline: "Ingenuity for life" },
  { id: "miele",    name: "Miele",    color: "#4a4a8a", icon: "🏆", tagline: "Immer Besser" },
  { id: "vzug",     name: "V-Zug",    color: "#8B0000", icon: "🇨🇭", tagline: "Swiss Perfection" },
  { id: "gaggenau", name: "Gaggenau", color: "#5a5a5a", icon: "✨", tagline: "Exceptional by Tradition" },
  { id: "liebherr", name: "Liebherr", color: "#0066CC", icon: "❄️", tagline: "Quality — Tradition — Innovation" },
];

const POST_TYPES = [
  { id: "product_highlight", label: "✨ Giới thiệu sản phẩm", desc: "Tính năng độc đáo" },
  { id: "tips_tricks",       label: "💡 Mẹo nhà bếp",        desc: "Dễ viral" },
  { id: "brand_story",       label: "🏛️ Câu chuyện thương hiệu", desc: "Xây dựng trust" },
  { id: "lifestyle",         label: "🍽️ Lifestyle / Cảm hứng", desc: "Kéo engagement" },
  { id: "promotion",         label: "🎁 Ưu đãi / Khuyến mãi", desc: "Chuyển đổi doanh số" },
  { id: "comparison",        label: "⚖️ So sánh / Tư vấn",   desc: "Giáo dục khách hàng" },
];

const TONES = [
  { id: "luxury",       label: "💎 Sang trọng" },
  { id: "friendly",     label: "😊 Thân thiện" },
  { id: "expert",       label: "🎓 Chuyên gia" },
  { id: "storytelling", label: "📖 Kể chuyện" },
];

const TABS = ["generator", "publish", "saved", "guide"];

export default function EurocookTool() {
  const [activeTab, setActiveTab]       = useState("generator");
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [postType, setPostType]         = useState(null);
  const [tone, setTone]                 = useState("luxury");
  const [topic, setTopic]               = useState("");
  const [generating, setGenerating]     = useState(false);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [genError, setGenError]         = useState(null);

  const [fbPageId, setFbPageId]         = useState("");
  const [fbToken, setFbToken]           = useState("");
  const [imageUrl, setImageUrl]         = useState("");
  const [productLink, setProductLink]   = useState("");
  const [publishMode, setPublishMode]   = useState("now");
  const [scheduleTime, setScheduleTime] = useState("");
  const [publishing, setPublishing]     = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [showToken, setShowToken]       = useState(false);

  const [savedPosts, setSavedPosts]     = useState([]);
  const [copied, setCopied]             = useState(false);

  const brand       = BRANDS.find((b) => b.id === selectedBrand);
  const postTypeObj = POST_TYPES.find((p) => p.id === postType);

  const buildPostText = (post) =>
    `${post.emoji_hook} ${post.headline}\n\n${post.body}\n\n👉 ${post.cta}\n\n${post.hashtags.join(" ")}`;

  // ── GENERATE ────────────────────────────────────────────────────────────────
  const generatePost = useCallback(async () => {
    if (!selectedBrand || !postType) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedPost(null);

    const bi = BRANDS.find((b) => b.id === selectedBrand);
    const pi = POST_TYPES.find((p) => p.id === postType);
    const ti = TONES.find((t) => t.id === tone);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Bạn là chuyên gia marketing cho Eurocook — nhà phân phối thiết bị nhà bếp cao cấp châu Âu tại Việt Nam. Phân phối: BOSCH, Siemens, Miele, V-Zug, Gaggenau, Liebherr. Target: gia đình thu nhập cao, kiến trúc sư, designer.
Trả về JSON hợp lệ duy nhất, không có markdown hay backticks:
{"headline":"<dưới 15 chữ, gây tò mò>","body":"<150-250 chữ tiếng Việt cuốn hút>","cta":"<call-to-action mạnh>","hashtags":["#tag",...],"emoji_hook":"<2-3 emoji phù hợp>","best_time":"<gợi ý khung giờ đăng tốt nhất>"}`,
          messages: [{
            role: "user",
            content: `Thương hiệu: ${bi.name} (${bi.tagline})\nLoại bài: ${pi.label}\nGiọng điệu: ${ti.label}\n${topic ? `Chủ đề cụ thể: ${topic}` : ""}\nTạo bài đăng Facebook cho fanpage Eurocook Vietnam.`,
          }],
        }),
      });

      const data = await res.json();
      const text = data.content?.map((i) => i.text || "").join("") || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setGeneratedPost({ ...parsed, brand: selectedBrand, postType, timestamp: new Date() });
    } catch {
      setGenError("Lỗi khi tạo bài. Vui lòng thử lại.");
    } finally {
      setGenerating(false);
    }
  }, [selectedBrand, postType, tone, topic]);

  // ── PUBLISH ─────────────────────────────────────────────────────────────────
  // Gọi qua /api/publish (Vercel serverless) để tránh CORS
  const publishToFacebook = async () => {
    if (!generatedPost || !fbPageId || !fbToken) return;
    setPublishing(true);
    setPublishResult(null);
    setPublishError(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: fbPageId,
          accessToken: fbToken,
          message: buildPostText(generatedPost),
          imageUrl: imageUrl || null,
          productLink: productLink || null,
          publishMode,
          scheduledTime: publishMode === "scheduled" ? scheduleTime : null,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setPublishError(`❌ ${result.error || "Lỗi không xác định"}`);
      } else {
        setPublishResult(result.postId);
        setSavedPosts((prev) => [{
          ...generatedPost,
          id: Date.now(),
          published: true,
          fbPostId: result.postId,
          publishedAt: new Date(),
          mode: publishMode,
          scheduledFor: publishMode === "scheduled" ? scheduleTime : null,
        }, ...prev]);
      }
    } catch {
      setPublishError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setPublishing(false);
    }
  };

  const copyPost = () => {
    if (!generatedPost) return;
    navigator.clipboard.writeText(buildPostText(generatedPost));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savePost = () => {
    if (!generatedPost) return;
    setSavedPosts((prev) => [{ ...generatedPost, id: Date.now(), published: false }, ...prev]);
  };

  const tabLabels = {
    generator: "✍️ Tạo bài",
    publish:   `📤 Đăng FB${generatedPost ? " ●" : ""}`,
    saved:     `💾 Lưu (${savedPosts.length})`,
    guide:     "📖 Hướng dẫn",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#08080f,#111122 60%,#0a0a18)", fontFamily: "Georgia,'Times New Roman',serif", color: "#e8e0d0" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(90deg,#111122,#0f3460)", borderBottom: "1px solid #c9a84c33", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#c9a84c,#f0d080)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🍽️</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f0d080", letterSpacing: 3 }}>EUROCOOK</div>
            <div style={{ fontSize: 9, color: "#c9a84c77", letterSpacing: 3, textTransform: "uppercase" }}>AI Social Media Studio</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${activeTab === tab ? "#c9a84c" : "#ffffff1a"}`, background: activeTab === tab ? "#c9a84c1a" : "transparent", color: activeTab === tab ? "#f0d080" : "#666", cursor: "pointer", fontSize: 12, fontFamily: "Georgia,serif" }}>{tabLabels[tab]}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "26px 20px" }}>

        {/* ══ TAB 1 — GENERATOR ══ */}
        {activeTab === "generator" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Card title="01 — Chọn thương hiệu">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {BRANDS.map((b) => (
                    <button key={b.id} onClick={() => setSelectedBrand(b.id)} style={{ padding: "10px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center", border: `1px solid ${selectedBrand === b.id ? b.color : "#ffffff1a"}`, background: selectedBrand === b.id ? `${b.color}20` : "#ffffff07" }}>
                      <div style={{ fontSize: 19, marginBottom: 3 }}>{b.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: selectedBrand === b.id ? "#f0d080" : "#888" }}>{b.name}</div>
                    </button>
                  ))}
                </div>
                {brand && <div style={{ marginTop: 9, padding: "7px 11px", background: `${brand.color}12`, border: `1px solid ${brand.color}2e`, borderRadius: 6, fontSize: 12, color: "#c9a84c", fontStyle: "italic" }}>❝ {brand.tagline} ❞</div>}
              </Card>

              <Card title="02 — Loại nội dung">
                {POST_TYPES.map((p) => (
                  <button key={p.id} onClick={() => setPostType(p.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "9px 12px", marginBottom: 6, borderRadius: 7, cursor: "pointer", border: `1px solid ${postType === p.id ? "#c9a84c" : "#ffffff12"}`, background: postType === p.id ? "#c9a84c14" : "#ffffff05" }}>
                    <span style={{ color: postType === p.id ? "#f0d080" : "#bbb", fontSize: 13 }}>{p.label}</span>
                    <span style={{ color: "#555", fontSize: 11 }}>{p.desc}</span>
                  </button>
                ))}
              </Card>

              <Card title="03 — Giọng điệu & Chủ đề">
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
                  {TONES.map((t) => (
                    <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: "7px 13px", borderRadius: 20, cursor: "pointer", fontSize: 12, border: `1px solid ${tone === t.id ? "#c9a84c" : "#ffffff1c"}`, background: tone === t.id ? "#c9a84c1e" : "transparent", color: tone === t.id ? "#f0d080" : "#888" }}>{t.label}</button>
                  ))}
                </div>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Chủ đề cụ thể (tùy chọn) — vd: lò hơi nước, tủ lạnh âm tủ..." style={IS} />
              </Card>

              <GoldBtn onClick={generatePost} disabled={!selectedBrand || !postType || generating}>
                {generating ? <Spin /> : "✨ TẠO BÀI ĐĂNG"}
              </GoldBtn>
              {genError && <div style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center" }}>⚠️ {genError}</div>}
            </div>

            <Card title="04 — Xem trước">
              {!generatedPost && !generating && <EmptyState icon="📝" text="Chọn thương hiệu và loại nội dung rồi nhấn Tạo bài" />}
              {generating && <LoadState label={`Đang tạo bài cho ${brand?.name}...`} />}
              {generatedPost && !generating && <>
                <FBPreview post={generatedPost} productLink={productLink} imageUrl={imageUrl} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "11px 0" }}>
                  <InfoBadge label="⏰ Giờ đăng tốt nhất" value={generatedPost.best_time} />
                  <InfoBadge label="🏷️ Thương hiệu" value={brand?.name} />
                </div>
                <HashtagRow tags={generatedPost.hashtags} />
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <GoldBtn small onClick={copyPost}>{copied ? "✅ Đã sao chép!" : "📋 Sao chép"}</GoldBtn>
                  <OtlBtn small onClick={savePost}>💾 Lưu</OtlBtn>
                  <GoldBtn small onClick={() => setActiveTab("publish")}>📤 Đăng FB →</GoldBtn>
                </div>
                <button onClick={generatePost} style={{ marginTop: 8, width: "100%", padding: "9px", background: "transparent", border: "1px solid #ffffff13", borderRadius: 7, cursor: "pointer", color: "#666", fontSize: 12, fontFamily: "Georgia,serif" }}>🔄 Tạo lại bài khác</button>
              </>}
            </Card>
          </div>
        )}

        {/* ══ TAB 2 — PUBLISH ══ */}
        {activeTab === "publish" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <Card title="🔑 Kết nối Facebook Page">
                <Lbl>Page ID</Lbl>
                <input value={fbPageId} onChange={(e) => setFbPageId(e.target.value)} placeholder="VD: 123456789012345" style={IS} />
                <Lbl style={{ marginTop: 11 }}>Page Access Token</Lbl>
                <div style={{ position: "relative" }}>
                  <input value={fbToken} onChange={(e) => setFbToken(e.target.value)} type={showToken ? "text" : "password"} placeholder="EAAxxxxx..." style={{ ...IS, paddingRight: 60 }} />
                  <button onClick={() => setShowToken(!showToken)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#777", cursor: "pointer", fontSize: 11 }}>{showToken ? "Ẩn" : "Hiện"}</button>
                </div>
                {fbPageId && fbToken && <OkBox msg="✅ Đã nhập thông tin kết nối" />}
                <button onClick={() => setActiveTab("guide")} style={{ marginTop: 9, background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>❓ Cách lấy Page ID và Access Token →</button>
              </Card>

              <Card title="📎 Đính kèm (ảnh + link)">
                <Lbl>URL ảnh sản phẩm</Lbl>
                <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... (bỏ trống nếu chỉ đăng text)" style={IS} />
                {imageUrl && (
                  <img src={imageUrl} alt="preview" onError={(e) => e.target.style.display = "none"}
                    style={{ marginTop: 8, width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 6, border: "1px solid #ffffff15" }} />
                )}
                <Lbl style={{ marginTop: 11 }}>Link sản phẩm Eurocook</Lbl>
                <input value={productLink} onChange={(e) => setProductLink(e.target.value)} placeholder="https://eurocook.vn/san-pham/..." style={IS} />
              </Card>

              <Card title="⚡ Chế độ đăng">
                <div style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                  {[["now", "⚡ Đăng ngay lập tức"], ["scheduled", "📅 Lên lịch"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setPublishMode(val)} style={{ flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontSize: 13, border: `1px solid ${publishMode === val ? "#c9a84c" : "#ffffff1a"}`, background: publishMode === val ? "#c9a84c18" : "#ffffff07", color: publishMode === val ? "#f0d080" : "#888" }}>{lbl}</button>
                  ))}
                </div>
                {publishMode === "scheduled" && (
                  <div style={{ marginTop: 11 }}>
                    <Lbl>Thời gian đăng bài</Lbl>
                    <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={{ ...IS, colorScheme: "dark" }} />
                    <div style={{ fontSize: 11, color: "#555", marginTop: 5 }}>* Tối thiểu 10 phút từ bây giờ. Fanpage cần ≥ 2,000 người thích.</div>
                  </div>
                )}
              </Card>

              <GoldBtn onClick={publishToFacebook} disabled={!generatedPost || !fbPageId || !fbToken || publishing || (publishMode === "scheduled" && !scheduleTime)}>
                {publishing ? <Spin /> : publishMode === "now" ? "🚀 ĐĂNG LÊN FACEBOOK NGAY" : "📅 LÊN LỊCH ĐĂNG BÀI"}
              </GoldBtn>

              {publishError && <ErrBox msg={publishError} />}
              {publishResult && (
                <div style={{ padding: "13px 15px", background: "#2d8a4e18", border: "1px solid #2d8a4e44", borderRadius: 10 }}>
                  <div style={{ color: "#4caf50", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                    {publishMode === "now" ? "✅ Đăng thành công!" : "📅 Đã lên lịch thành công!"}
                  </div>
                  <div style={{ color: "#666", fontSize: 12, marginBottom: 5 }}>Post ID: {publishResult}</div>
                  <a href={`https://www.facebook.com/${publishResult.replace("_", "/posts/")}`} target="_blank" rel="noopener noreferrer" style={{ color: "#4a9eff", fontSize: 13 }}>→ Xem bài trên Facebook ↗</a>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card title="👁️ Xem trước trước khi đăng">
                {!generatedPost
                  ? <EmptyState icon="⬅️" text="Tạo bài ở tab 'Tạo bài' trước" />
                  : <>
                    <FBPreview post={generatedPost} productLink={productLink} imageUrl={imageUrl} />
                    {publishMode === "scheduled" && scheduleTime && (
                      <div style={{ marginTop: 10, padding: "9px 13px", background: "#4a9eff0e", border: "1px solid #4a9eff20", borderRadius: 7 }}>
                        <div style={{ color: "#4a9eff", fontSize: 12 }}>📅 Sẽ đăng lúc: <strong>{new Date(scheduleTime).toLocaleString("vi-VN")}</strong></div>
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}><HashtagRow tags={generatedPost.hashtags} /></div>
                  </>
                }
              </Card>

              <Card title="📊 Lịch sử đăng bài">
                {savedPosts.filter((p) => p.published).length === 0
                  ? <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 18 }}>Chưa có bài nào đăng qua tool này</div>
                  : savedPosts.filter((p) => p.published).slice(0, 4).map((post) => {
                    const b = BRANDS.find((x) => x.id === post.brand);
                    return (
                      <div key={post.id} style={{ padding: "9px 11px", background: "#ffffff06", borderRadius: 7, marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ color: "#f0d080", fontSize: 12 }}>{post.emoji_hook} {post.headline}</div>
                          <div style={{ color: "#555", fontSize: 11 }}>{b?.name} · {new Date(post.publishedAt).toLocaleString("vi-VN")}</div>
                        </div>
                        <Pill text={post.mode === "scheduled" ? "📅 Lịch" : "✅ Đăng"} color="#2d8a4e" />
                      </div>
                    );
                  })}
              </Card>
            </div>
          </div>
        )}

        {/* ══ TAB 3 — SAVED ══ */}
        {activeTab === "saved" && (
          <Card title={`💾 Kho bài — ${savedPosts.length} bài`}>
            {savedPosts.length === 0
              ? <EmptyState icon="📝" text="Chưa có bài nào. Tạo bài ở tab đầu tiên." />
              : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                {savedPosts.map((post) => {
                  const b  = BRANDS.find((x) => x.id === post.brand);
                  const pt = POST_TYPES.find((x) => x.id === post.postType);
                  return (
                    <div key={post.id} style={{ background: "#ffffff06", border: "1px solid #ffffff11", borderRadius: 10, padding: 15 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9, flexWrap: "wrap", gap: 5 }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <Pill text={b?.name} color={b?.color} />
                          {post.published && <Pill text="✅ Đã đăng" color="#2d8a4e" />}
                        </div>
                        <span style={{ color: "#444", fontSize: 10 }}>{new Date(post.timestamp).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div style={{ color: "#f0d080", fontWeight: 700, marginBottom: 5, fontSize: 13 }}>{post.emoji_hook} {post.headline}</div>
                      <div style={{ color: "#999", fontSize: 12, lineHeight: 1.6, marginBottom: 11 }}>{post.body.substring(0, 110)}...</div>
                      <div style={{ display: "flex", gap: 7 }}>
                        <OtlBtn small onClick={() => navigator.clipboard.writeText(buildPostText(post))}>📋 Sao chép</OtlBtn>
                        {!post.published && <OtlBtn small onClick={() => { setGeneratedPost(post); setActiveTab("publish"); }}>📤 Đăng</OtlBtn>}
                      </div>
                    </div>
                  );
                })}
              </div>}
          </Card>
        )}

        {/* ══ TAB 4 — GUIDE ══ */}
        {activeTab === "guide" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Card title="📖 Cách lấy Facebook Page Access Token">
              {[
                ["1","Truy cập Meta for Developers","Vào developers.facebook.com → đăng nhập tài khoản quản trị fanpage Eurocook.","🔗"],
                ["2","Tạo ứng dụng","My Apps → Create App → Business → đặt tên (VD: Eurocook Publisher).","📱"],
                ["3","Mở Graph API Explorer","Tools → Graph API Explorer → chọn ứng dụng vừa tạo.","🛠️"],
                ["4","Generate Access Token","Chọn Page Eurocook → Generate Token → cấp quyền: pages_manage_posts, pages_read_engagement, publish_pages.","🎫"],
                ["5","Lấy Page ID","Vào fanpage → Giới thiệu → Minh bạch trang → Page ID ở phía dưới.","🆔"],
                ["6","Token dài hạn (khuyên dùng)","Dùng endpoint /oauth/access_token?grant_type=fb_exchange_token để đổi sang long-lived token (60 ngày).","⏳"],
              ].map(([num, title, desc, icon]) => (
                <div key={num} style={{ display: "flex", gap: 11, padding: "11px 13px", background: "#ffffff06", borderRadius: 8, border: "1px solid #ffffff0f", marginBottom: 9 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#f0d080)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1a1a1a", flexShrink: 0 }}>{num}</div>
                  <div>
                    <div style={{ color: "#f0d080", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{icon} {title}</div>
                    <div style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card title="⚡ Quyền cần thiết (Permissions)">
                {[
                  ["pages_manage_posts","Đăng, sửa, xóa bài viết"],
                  ["pages_read_engagement","Đọc thống kê engagement"],
                  ["pages_show_list","Xem danh sách pages"],
                  ["publish_pages","Đăng bài lên page"],
                ].map(([perm, desc]) => (
                  <div key={perm} style={{ display: "flex", justifyContent: "space-between", padding: "8px 11px", background: "#ffffff06", borderRadius: 6, marginBottom: 6 }}>
                    <code style={{ color: "#4a9eff", fontSize: 12 }}>{perm}</code>
                    <span style={{ color: "#777", fontSize: 12 }}>{desc}</span>
                  </div>
                ))}
              </Card>

              <Card title="⚠️ Lưu ý quan trọng">
                {[
                  "Token có thời hạn — kiểm tra định kỳ và gia hạn kịp thời",
                  "Lên lịch bài: Fanpage cần tối thiểu 2,000 người thích",
                  "Không chia sẻ Access Token cho bất kỳ ai",
                  "Nên tạo System User trong Business Manager cho môi trường sản xuất",
                  "Rate limit: Facebook giới hạn ~200 posts/ngày/page",
                ].map((note, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12, color: "#999" }}>
                    <span style={{ color: "#c9a84c" }}>›</span>{note}
                  </div>
                ))}
              </Card>

              <Card title="🔗 Links hữu ích">
                {[
                  ["Meta for Developers","https://developers.facebook.com"],
                  ["Graph API Explorer","https://developers.facebook.com/tools/explorer"],
                  ["Access Token Tool","https://developers.facebook.com/tools/accesstoken"],
                ].map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "9px 12px", background: "#4a9eff0d", borderRadius: 7, marginBottom: 7, textDecoration: "none", color: "#4a9eff", fontSize: 13 }}>↗ {label}</a>
                ))}
              </Card>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input { color-scheme: dark; }
        input::placeholder { color: #444; }
        button { transition: all .18s; }
        button:not(:disabled):hover { opacity: .87; transform: translateY(-1px); }
        button:active { transform: translateY(0) !important; }
      `}</style>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#ffffff08,#ffffff04)", border: "1px solid #ffffff10", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 10, color: "#c9a84c", letterSpacing: 2, textTransform: "uppercase", marginBottom: 13 }}>{title}</div>
      {children}
    </div>
  );
}
function GoldBtn({ onClick, disabled, children, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: small ? undefined : "100%", padding: small ? "9px 16px" : "14px 20px", background: disabled ? "#252525" : "linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c)", border: "none", borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#555" : "#1a1a1a", fontSize: small ? 12 : 13, fontWeight: 700, letterSpacing: 1.5, fontFamily: "Georgia,serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>{children}</button>
  );
}
function OtlBtn({ onClick, children, small }) {
  return (
    <button onClick={onClick} style={{ padding: small ? "8px 14px" : "12px 20px", background: "transparent", border: "1px solid #c9a84c55", borderRadius: 9, cursor: "pointer", color: "#c9a84c", fontSize: small ? 12 : 13, fontFamily: "Georgia,serif", fontWeight: 700 }}>{children}</button>
  );
}
function Spin() {
  return <span style={{ width: 14, height: 14, border: "2px solid #55550088", borderTopColor: "#888", borderRadius: "50%", display: "inline-block", animation: "spin .8s linear infinite" }} />;
}
function Lbl({ children, style }) {
  return <div style={{ fontSize: 11, color: "#777", letterSpacing: 1, marginBottom: 5, ...style }}>{children}</div>;
}
function EmptyState({ icon, text }) {
  return (
    <div style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ fontSize: 40, opacity: .25 }}>{icon}</div>
      <div style={{ fontSize: 13, textAlign: "center", lineHeight: 1.7, color: "#555" }}>{text}</div>
    </div>
  );
}
function LoadState({ label }) {
  return (
    <div style={{ minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 13 }}>
      <div style={{ width: 44, height: 44, border: "3px solid #c9a84c20", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#c9a84c", fontSize: 13, letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
function InfoBadge({ label, value }) {
  return (
    <div style={{ padding: "7px 11px", background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 6 }}>
      <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#c9a84c", fontSize: 12, fontWeight: 700 }}>{value || "—"}</div>
    </div>
  );
}
function HashtagRow({ tags }) {
  return (
    <div style={{ padding: "8px 11px", background: "#4a9eff0d", border: "1px solid #4a9eff18", borderRadius: 7 }}>
      <div style={{ color: "#555", fontSize: 10, letterSpacing: 1, marginBottom: 5 }}>HASHTAGS</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {tags.map((tag) => <span key={tag} style={{ padding: "2px 7px", background: "#4a9eff18", borderRadius: 4, color: "#4a9eff", fontSize: 11 }}>{tag}</span>)}
      </div>
    </div>
  );
}
function Pill({ text, color }) {
  return <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10, border: `1px solid ${color ? color + "44" : "#ffffff1e"}`, background: color ? color + "18" : "#ffffff0d", color: color ? "#c9a84c" : "#777" }}>{text}</span>;
}
function OkBox({ msg }) {
  return <div style={{ marginTop: 7, padding: "6px 10px", background: "#2d8a4e18", border: "1px solid #2d8a4e40", borderRadius: 6, color: "#4caf50", fontSize: 12 }}>{msg}</div>;
}
function ErrBox({ msg }) {
  return <div style={{ padding: "11px 13px", background: "#ff6b6b10", border: "1px solid #ff6b6b30", borderRadius: 8, color: "#ff6b6b", fontSize: 13 }}>{msg}</div>;
}
function FBPreview({ post, productLink, imageUrl }) {
  return (
    <div style={{ background: "#18191a", border: "1px solid #3a3b3c", borderRadius: 11, overflow: "hidden" }}>
      <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#f0d080)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🍽️</div>
        <div>
          <div style={{ color: "#e4e6eb", fontSize: 13, fontWeight: 700 }}>Eurocook Vietnam</div>
          <div style={{ color: "#666", fontSize: 11 }}>Vừa xong · 🌐</div>
        </div>
      </div>
      <div style={{ padding: "0 13px 11px", color: "#e4e6eb", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <strong style={{ color: "#f0d080", fontSize: 14 }}>{post.emoji_hook} {post.headline}</strong>
        {"\n\n"}{post.body}
        {"\n\n"}<span style={{ color: "#c9a84c" }}>👉 {post.cta}</span>
        {productLink && <><br /><span style={{ color: "#4a9eff" }}>🔗 {productLink}</span></>}
        {"\n\n"}<span style={{ color: "#4a9eff", fontSize: 11 }}>{post.hashtags.join(" ")}</span>
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="preview"
          style={{ width: "100%", maxHeight: 200, objectFit: "cover" }}
          onError={(e) => { e.target.style.display = "none"; }} />
      )}
      <div style={{ padding: "7px 13px", borderTop: "1px solid #3a3b3c20", display: "flex", gap: 14 }}>
        {["👍 Thích", "💬 Bình luận", "↗️ Chia sẻ"].map((a) => <span key={a} style={{ color: "#555", fontSize: 12 }}>{a}</span>)}
      </div>
    </div>
  );
}

const IS = { width: "100%", padding: "11px 13px", background: "#ffffff08", border: "1px solid #ffffff1e", borderRadius: 7, color: "#e8e0d0", fontSize: 13, outline: "none", fontFamily: "Georgia,serif" };
