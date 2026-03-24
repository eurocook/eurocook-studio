import { useState, useCallback, useEffect } from "react";

// ── CONSTANTS ───────────────────────────────────────────────
const BRANDS = [
  { id: "bosch",    name: "BOSCH",    color: "#C8102E", light: "#fff0f0", icon: "⚙️", tagline: "Invented for life" },
  { id: "siemens",  name: "Siemens",  color: "#007B83", light: "#f0fbfb", icon: "◈",  tagline: "Ingenuity for life" },
  { id: "miele",    name: "Miele",    color: "#2D2D6E", light: "#f0f0fb", icon: "🏆", tagline: "Immer Besser" },
  { id: "vzug",     name: "V-Zug",    color: "#8B1A1A", light: "#fff0f0", icon: "✦",  tagline: "Swiss Perfection" },
  { id: "gaggenau", name: "Gaggenau", color: "#2C2C2C", light: "#f5f5f5", icon: "◆",  tagline: "Exceptional by Tradition" },
  { id: "liebherr", name: "Liebherr", color: "#005BAC", light: "#f0f5ff", icon: "❄️", tagline: "Quality — Tradition — Innovation" },
];
const POST_TYPES = [
  { id: "product_highlight", label: "✨ Giới thiệu sản phẩm", desc: "Tính năng độc đáo" },
  { id: "tips_tricks",       label: "💡 Mẹo nhà bếp",         desc: "Dễ viral" },
  { id: "brand_story",       label: "🏛️ Câu chuyện thương hiệu", desc: "Xây dựng trust" },
  { id: "lifestyle",         label: "🍽️ Lifestyle / Cảm hứng", desc: "Kéo engagement" },
  { id: "promotion",         label: "🎁 Ưu đãi / Khuyến mãi",  desc: "Chuyển đổi doanh số" },
  { id: "comparison",        label: "⚖️ So sánh / Tư vấn",     desc: "Giáo dục khách hàng" },
];
const TONES = [
  { id: "luxury",       label: "💎 Sang trọng" },
  { id: "friendly",     label: "😊 Thân thiện" },
  { id: "expert",       label: "🎓 Chuyên gia" },
  { id: "storytelling", label: "📖 Kể chuyện" },
];
const TABS = ["generator", "publish", "saved", "settings"];

const C = {
  bg:"#F7F6F3", surface:"#FFFFFF", border:"#E5E1D8", border2:"#CCC8BE",
  text:"#1C1C1C", textSub:"#6A6560", textMute:"#A09B94",
  gold:"#B8924A", goldDk:"#8C6D32", goldLt:"#F5ECD9", goldBg:"#FDF6EC",
  green:"#2E7D52", greenBg:"#EDF7F2",
  red:"#C0392B", redBg:"#FDF0EE",
  blue:"#1A5C9E", blueBg:"#EEF4FC",
};

// ── SAFE localStorage ──────────────────────────────────────
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return parsed;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
// Clear any old incompatible data on startup
function getSavedPosts() {
  try {
    const raw = lsGet("ec_saved", []);
    if (!Array.isArray(raw)) return [];
    // Filter out old format posts (had dataUrl, no body field)
    return raw.filter(p => p && typeof p.body === "string" && typeof p.headline === "string");
  } catch { return []; }
}

// ── HELPERS ────────────────────────────────────────────────
function buildPostText(post) {
  if (!post) return "";
  const tags = Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "";
  return `${post.emoji_hook || ""} ${post.headline || ""}\n\n${post.body || ""}\n\n👉 ${post.cta || ""}\n\n${tags}`;
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function EurocookTool() {
  const [tab, setTab]               = useState("generator");
  // Generator
  const [brand, setBrand]           = useState(null);
  const [postType, setPostType]     = useState(null);
  const [tone, setTone]             = useState("luxury");
  const [topic, setTopic]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [post, setPost]             = useState(null);
  const [genErr, setGenErr]         = useState(null);
  // Media
  const [mediaMode, setMediaMode]   = useState("none"); // "none"|"image"|"video"
  const [imageUrls, setImageUrls]   = useState([{ id: 1, url: "" }]);
  const [videoUrl, setVideoUrl]     = useState("");
  const [productLink, setPLink]     = useState("");
  // Publish
  const [pageId, setPageId]         = useState(() => lsGet("ec_pid",""));
  const [token, setToken]           = useState(() => lsGet("ec_tok",""));
  const [pageName, setPageName]     = useState(() => lsGet("ec_pname",""));
  const [pubMode, setPubMode]       = useState("now");
  const [schedTime, setSchedTime]   = useState("");
  const [publishing, setPublishing] = useState(false);
  const [pubResult, setPubResult]   = useState(null);
  const [pubErr, setPubErr]         = useState(null);
  const [showTok, setShowTok]       = useState(false);
  // Saved
  const [saved, setSaved]           = useState(() => getSavedPosts());
  const [copied, setCopied]         = useState(false);
  const [settOk, setSettOk]         = useState(false);

  useEffect(() => { lsSet("ec_saved", saved); }, [saved]);

  const brandObj = BRANDS.find(b => b.id === brand);
  const isConn   = !!(pageId && token);
  const validImgs = imageUrls.filter(i => i && typeof i.url === "string" && i.url.trim().startsWith("http"));

  // ── GENERATE ──────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!brand || !postType) return;
    setGenerating(true); setGenErr(null); setPost(null);
    const bi = BRANDS.find(b => b.id === brand);
    const pi = POST_TYPES.find(p => p.id === postType);
    const ti = TONES.find(t => t.id === tone);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: bi.name, brandTagline: bi.tagline, postTypeLabel: pi.label, toneLabel: ti.label, topic: topic || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi server");
      if (!data.headline) throw new Error("Phản hồi không hợp lệ từ AI");
      if (!Array.isArray(data.hashtags)) data.hashtags = ["#Eurocook","#EurocookGlobal"];
      setPost({ ...data, brand, postType, timestamp: new Date().toISOString() });
    } catch (e) {
      setGenErr(e.message || "Lỗi không xác định");
    } finally { setGenerating(false); }
  }, [brand, postType, tone, topic]);

  // ── PUBLISH ────────────────────────────────────────────────
  const publish = async () => {
    if (!post || !pageId || !token) return;
    setPublishing(true); setPubResult(null); setPubErr(null);
    try {
      let endpoint = "/api/publish";
      let body = {};
      if (mediaMode === "video" && videoUrl.trim()) {
        endpoint = "/api/publish-video";
        body = { pageId, accessToken: token, message: buildPostText(post) + (productLink ? `\n\n🔗 ${productLink}` : ""), videoUrl: videoUrl.trim(), publishMode: pubMode, scheduledTime: pubMode === "scheduled" ? schedTime : null };
      } else {
        body = { pageId, accessToken: token, message: buildPostText(post), images: mediaMode === "image" ? validImgs.map(i => i.url) : [], productLink: productLink || null, publishMode: pubMode, scheduledTime: pubMode === "scheduled" ? schedTime : null };
      }
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Lỗi không xác định");
      setPubResult(result.postId);
      setSaved(prev => [{ ...post, id: Date.now(), published: true, fbPostId: result.postId, publishedAt: new Date().toISOString(), pubMode, imgCount: validImgs.length, previewImg: validImgs[0]?.url || null }, ...prev]);
    } catch (e) {
      setPubErr(e.message || "Lỗi kết nối");
    } finally { setPublishing(false); }
  };

  const copy = () => { navigator.clipboard.writeText(buildPostText(post)); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const save = () => { if (!post) return; setSaved(prev => [{ ...post, id: Date.now(), published: false, previewImg: validImgs[0]?.url || null }, ...prev]); };
  const saveSett = () => { lsSet("ec_pid", pageId); lsSet("ec_tok", token); lsSet("ec_pname", pageName); setSettOk(true); setTimeout(() => setSettOk(false), 2500); };

  const addImgRow = () => { if (imageUrls.length < 6) setImageUrls(p => [...p, { id: Date.now(), url: "" }]); };
  const removeImgRow = (id) => setImageUrls(p => p.filter(i => i.id !== id));
  const updateImg = (id, url) => setImageUrls(p => p.map(i => i.id === id ? { ...i, url } : i));

  const tabLabel = { generator: "✍️ Tạo bài", publish: `📤 Đăng FB${post ? " ●" : ""}`, saved: `💾 Lưu (${saved.length})`, settings: "⚙️ Cài đặt" };

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg}}
        input,button,textarea{font-family:'DM Sans',sans-serif}
        input::placeholder{color:${C.textMute}}
        input:focus,textarea:focus{outline:none;border-color:${C.gold}!important;box-shadow:0 0 0 3px ${C.goldLt}}
        button{cursor:pointer;transition:all .15s}
        button:not(:disabled):hover{transform:translateY(-1px)}
        button:active{transform:translateY(0)!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn .35s ease}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:3px}
      `}</style>

      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text }}>

        {/* HEADER */}
        <header style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", height:68, display:"flex", alignItems:"center" }}>
            {/* Nav trái */}
            <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"5px 12px", background:isConn?C.greenBg:C.redBg, borderRadius:20, border:`1px solid ${isConn?C.green:C.red}22` }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:isConn?C.green:C.red }} />
                <span style={{ fontSize:12, fontWeight:500, color:isConn?C.green:C.red }}>{isConn?(pageName||"Đã kết nối"):"Chưa kết nối"}</span>
              </div>
              <nav style={{ display:"flex", gap:2 }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding:"8px 16px", borderRadius:7, border:"none", fontSize:13, fontWeight:500, background:tab===t?C.goldBg:"transparent", color:tab===t?C.goldDk:C.textSub, borderBottom:`2px solid ${tab===t?C.gold:"transparent"}` }}>{tabLabel[t]}</button>
                ))}
              </nav>
            </div>
            {/* Logo phải */}
            <a href="https://eurocook-studio-o3yc.vercel.app/" style={{ display:"flex", alignItems:"center", textDecoration:"none", flexShrink:0 }}>
              <img src="/eurocook-logo.png" alt="Eurocook Global" style={{ height:48, width:"auto", maxWidth:200, objectFit:"contain" }} />
            </a>
          </div>
        </header>

        <main style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px" }}>

          {/* ══ TAB: TẠO BÀI ══ */}
          {tab === "generator" && (
            <div style={{ display:"grid", gridTemplateColumns:"400px 1fr", gap:22 }}>
              {/* Cột trái */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <Card step="01" title="Chọn thương hiệu">
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {BRANDS.map(b => (
                      <button key={b.id} onClick={() => setBrand(b.id)} style={{ padding:"11px 6px", borderRadius:9, textAlign:"center", border:`1.5px solid ${brand===b.id?b.color:C.border}`, background:brand===b.id?b.light:C.surface, boxShadow:brand===b.id?`0 2px 10px ${b.color}22`:"none" }}>
                        <div style={{ fontSize:20, marginBottom:4 }}>{b.icon}</div>
                        <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1, color:brand===b.id?b.color:C.textSub, textTransform:"uppercase" }}>{b.name}</div>
                      </button>
                    ))}
                  </div>
                  {brandObj && <div style={{ marginTop:10, padding:"8px 13px", background:brandObj.light, border:`1px solid ${brandObj.color}28`, borderRadius:8, fontSize:13, color:brandObj.color, fontStyle:"italic", fontFamily:"'Playfair Display',serif" }}>❝ {brandObj.tagline} ❞</div>}
                </Card>

                <Card step="02" title="Loại nội dung">
                  {POST_TYPES.map(p => (
                    <button key={p.id} onClick={() => setPostType(p.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", padding:"9px 12px", marginBottom:6, borderRadius:8, border:`1.5px solid ${postType===p.id?C.gold:C.border}`, background:postType===p.id?C.goldBg:C.surface, textAlign:"left" }}>
                      <span style={{ fontSize:13, fontWeight:postType===p.id?600:400, color:postType===p.id?C.goldDk:C.text }}>{p.label}</span>
                      <span style={{ fontSize:11, color:C.textMute }}>{p.desc}</span>
                    </button>
                  ))}
                </Card>

                <Card step="03" title="Giọng điệu & Chủ đề">
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:11 }}>
                    {TONES.map(t => (
                      <button key={t.id} onClick={() => setTone(t.id)} style={{ padding:"6px 13px", borderRadius:20, fontSize:12.5, fontWeight:500, border:`1.5px solid ${tone===t.id?C.gold:C.border}`, background:tone===t.id?C.goldBg:C.surface, color:tone===t.id?C.goldDk:C.textSub }}>{t.label}</button>
                    ))}
                  </div>
                  <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chủ đề cụ thể (tùy chọn)..." style={IS} />
                </Card>

                <PrimBtn onClick={generate} disabled={!brand||!postType||generating}>
                  {generating?<><Spin/> Đang tạo bài...</>:"✨  Tạo bài đăng"}
                </PrimBtn>
                {genErr && <Alert type="error" msg={genErr} />}
              </div>

              {/* Cột phải */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {!post && !generating && (
                  <Card step="" title="Kết quả">
                    <Empty icon="✍️" text={"Chọn thương hiệu và loại nội dung\nrồi nhấn Tạo bài đăng"} />
                  </Card>
                )}
                {generating && <Card step="" title="Đang tạo..."><Loading label={`Đang tạo nội dung cho ${brandObj?.name}...`}/></Card>}

                {post && !generating && (
                  <div className="fi" style={{ display:"flex", flexDirection:"column", gap:16 }}>

                    {/* Media */}
                    <Card step="04" title="Đính kèm ảnh / video">
                      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                        {[["none","📝 Chỉ text"],["image","🖼️ Ảnh (tối đa 6)"],["video","🎬 Video"]].map(([v,l]) => (
                          <button key={v} onClick={() => setMediaMode(v)} style={{ flex:1, padding:"9px 6px", borderRadius:8, fontSize:12.5, fontWeight:500, border:`1.5px solid ${mediaMode===v?C.gold:C.border}`, background:mediaMode===v?C.goldBg:C.surface, color:mediaMode===v?C.goldDk:C.textSub }}>{l}</button>
                        ))}
                      </div>

                      {mediaMode === "image" && (
                        <div>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                            <span style={{ fontSize:12, color:C.textSub }}>Dán link ảnh · tối đa 6</span>
                            <div style={{ display:"flex", gap:7 }}>
                              {imageUrls.length < 6 && <button onClick={addImgRow} style={{ background:"none", border:`1px solid ${C.gold}`, borderRadius:6, color:C.goldDk, fontSize:12, padding:"4px 10px" }}>+ Thêm ảnh</button>}
                              {imageUrls.length > 1 && <button onClick={() => setImageUrls([{id:1,url:""}])} style={{ background:"none", border:"none", color:C.textMute, fontSize:12 }}>Xóa tất cả</button>}
                            </div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {imageUrls.map((item, idx) => (
                              <div key={item.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
                                <div style={{ width:46, height:46, borderRadius:7, overflow:"hidden", border:`1.5px solid ${item.url?C.gold:C.border}`, flexShrink:0, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  {item.url && item.url.startsWith("http")
                                    ? <img src={item.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.style.display="none"; }} />
                                    : <span style={{ fontSize:18, color:C.textMute }}>🖼️</span>}
                                </div>
                                <div style={{ flex:1, position:"relative" }}>
                                  {idx === 0 && <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:9, fontWeight:700, color:C.gold, background:C.goldBg, padding:"1px 5px", borderRadius:3 }}>CHÍNH</span>}
                                  <input value={item.url} onChange={e => updateImg(item.id, e.target.value)} placeholder={`Ảnh ${idx+1} — dán link ảnh...`} style={{ ...IS, paddingLeft:idx===0?58:13 }} />
                                </div>
                                {imageUrls.length > 1 && <button onClick={() => removeImgRow(item.id)} style={{ width:32, height:38, border:`1px solid ${C.border}`, borderRadius:7, background:C.surface, color:C.textMute, fontSize:14, flexShrink:0 }}>✕</button>}
                              </div>
                            ))}
                          </div>
                          {validImgs.length > 0 && <div style={{ marginTop:9, padding:"7px 11px", background:C.goldBg, border:`1px solid ${C.gold}33`, borderRadius:7, fontSize:12, color:C.goldDk, fontWeight:500 }}>✅ {validImgs.length}/6 ảnh đã có link</div>}
                        </div>
                      )}

                      {mediaMode === "video" && (
                        <div>
                          <Lbl>URL Video (.mp4 hoặc link video public)</Lbl>
                          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://... (.mp4)" style={IS} />
                          {videoUrl.trim() && (
                            <video src={videoUrl} controls style={{ width:"100%", maxHeight:180, borderRadius:8, border:`1px solid ${C.border}`, marginTop:8 }} onError={e => { e.target.style.display="none"; }} />
                          )}
                          <div style={{ marginTop:9, padding:"9px 12px", background:C.blueBg, border:`1px solid ${C.blue}18`, borderRadius:8, fontSize:12, color:C.textSub, lineHeight:1.7 }}>
                            💡 Video cần là URL public có thể truy cập không cần đăng nhập. Định dạng: MP4, MOV.
                          </div>
                        </div>
                      )}

                      {mediaMode === "none" && (
                        <div style={{ textAlign:"center", padding:"16px 0", color:C.textMute, fontSize:13 }}>Bài đăng dạng text thuần không kèm ảnh/video</div>
                      )}
                    </Card>

                    {/* Link sản phẩm */}
                    <Card step="05" title="Link sản phẩm (tùy chọn)">
                      <input value={productLink} onChange={e => setPLink(e.target.value)} placeholder="https://eurocook.com.vn/san-pham/..." style={IS} />
                    </Card>

                    {/* Preview */}
                    <Card step="06" title="Xem trước & Xuất bài">
                      <FBPreview post={post} productLink={productLink} images={mediaMode==="image"?validImgs:[]} videoUrl={mediaMode==="video"?videoUrl:""} />
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, margin:"12px 0" }}>
                        <IBadge label="⏰ Giờ đăng tốt" value={post.best_time} />
                        <IBadge label="🏷️ Thương hiệu" value={brandObj?.name} />
                      </div>
                      <HTagRow tags={post.hashtags} />
                      <div style={{ display:"flex", gap:8, marginTop:12 }}>
                        <PrimBtn small onClick={copy}>{copied?"✅ Đã sao chép!":"📋 Sao chép"}</PrimBtn>
                        <SecBtn small onClick={save}>💾 Lưu bài</SecBtn>
                        <PrimBtn small onClick={() => setTab("publish")}>📤 Đăng FB →</PrimBtn>
                      </div>
                      <button onClick={generate} style={{ marginTop:8, width:"100%", padding:"9px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, color:C.textMute, fontSize:13 }}>🔄 Tạo lại bài khác</button>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB: ĐĂNG FACEBOOK ══ */}
          {tab === "publish" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {isConn ? (
                  <div style={{ padding:"13px 16px", background:C.greenBg, border:`1px solid ${C.green}33`, borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div><div style={{ color:C.green, fontWeight:600, fontSize:14 }}>✅ Đã kết nối fanpage</div><div style={{ color:C.textSub, fontSize:12, marginTop:2 }}>{pageName||"Eurocook Global"} · ID: {pageId.slice(0,8)}...</div></div>
                    <button onClick={() => setTab("settings")} style={{ background:"none", border:`1px solid ${C.green}55`, borderRadius:7, padding:"6px 12px", color:C.green, fontSize:12 }}>Đổi kết nối</button>
                  </div>
                ) : (
                  <Alert type="error" msg={<span>⚠️ Chưa kết nối. <button onClick={() => setTab("settings")} style={{ background:"none", border:"none", color:C.red, textDecoration:"underline", cursor:"pointer", fontSize:13 }}>Vào Cài đặt →</button></span>} />
                )}

                <Card step="01" title="Media đính kèm">
                  <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                    {[["none","📝 Text"],["image","🖼️ Ảnh"],["video","🎬 Video"]].map(([v,l]) => (
                      <button key={v} onClick={() => setMediaMode(v)} style={{ flex:1, padding:"9px 6px", borderRadius:8, fontSize:12.5, fontWeight:500, border:`1.5px solid ${mediaMode===v?C.gold:C.border}`, background:mediaMode===v?C.goldBg:C.surface, color:mediaMode===v?C.goldDk:C.textSub }}>{l}</button>
                    ))}
                  </div>
                  {mediaMode === "image" && validImgs.length > 0 && (
                    <div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:7 }}>
                        {validImgs.map((img,i) => <img key={img.id} src={img.url} alt="" style={{ width:50, height:50, objectFit:"cover", borderRadius:6, border:i===0?`2px solid ${C.gold}`:`1px solid ${C.border}` }} onError={e => e.target.style.opacity="0.2"} />)}
                      </div>
                      <div style={{ fontSize:12, color:C.textSub }}>{validImgs.length} ảnh · <button onClick={() => setTab("generator")} style={{ background:"none", border:"none", color:C.gold, textDecoration:"underline", cursor:"pointer", fontSize:12 }}>Thay đổi →</button></div>
                    </div>
                  )}
                  {mediaMode === "image" && validImgs.length === 0 && <Alert type="info" msg={<span>Chưa có ảnh. <button onClick={() => setTab("generator")} style={{ background:"none",border:"none",color:C.blue,textDecoration:"underline",cursor:"pointer",fontSize:13 }}>Nhập link ảnh →</button></span>} />}
                  {mediaMode === "video" && videoUrl.trim() && <div style={{ padding:"8px 12px", background:C.blueBg, border:`1px solid ${C.blue}18`, borderRadius:7, fontSize:12, color:C.blue }}>🎬 Video đã chọn · <button onClick={() => setTab("generator")} style={{ background:"none",border:"none",color:C.blue,textDecoration:"underline",cursor:"pointer",fontSize:12 }}>Thay đổi →</button></div>}
                  {mediaMode === "video" && !videoUrl.trim() && <Alert type="info" msg={<span>Chưa có video. <button onClick={() => setTab("generator")} style={{ background:"none",border:"none",color:C.blue,textDecoration:"underline",cursor:"pointer",fontSize:13 }}>Nhập URL video →</button></span>} />}
                </Card>

                <Card step="02" title="Link sản phẩm">
                  <input value={productLink} onChange={e => setPLink(e.target.value)} placeholder="https://eurocook.com.vn/san-pham/..." style={IS} />
                </Card>

                <Card step="03" title="Chế độ đăng">
                  <div style={{ display:"flex", gap:8 }}>
                    {[["now","⚡ Đăng ngay"],["scheduled","📅 Lên lịch"]].map(([v,l]) => (
                      <button key={v} onClick={() => setPubMode(v)} style={{ flex:1, padding:"10px", borderRadius:8, fontSize:13, fontWeight:500, border:`1.5px solid ${pubMode===v?C.gold:C.border}`, background:pubMode===v?C.goldBg:C.surface, color:pubMode===v?C.goldDk:C.textSub }}>{l}</button>
                    ))}
                  </div>
                  {pubMode === "scheduled" && (
                    <div style={{ marginTop:12 }}>
                      <Lbl>Thời gian đăng bài</Lbl>
                      <input type="datetime-local" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={IS} />
                      <p style={{ fontSize:11.5, color:C.textMute, marginTop:5 }}>* Tối thiểu 10 phút. Fanpage cần ≥ 2,000 người thích.</p>
                    </div>
                  )}
                </Card>

                <PrimBtn onClick={publish} disabled={!post||!isConn||publishing||(pubMode==="scheduled"&&!schedTime)||(mediaMode==="video"&&!videoUrl.trim())}>
                  {publishing?<><Spin/> Đang đăng...</>:mediaMode==="video"?"🎬  Đăng Video":mediaMode==="image"&&validImgs.length>0?`🖼️  Đăng ${validImgs.length} ảnh`:"📝  Đăng bài"}
                </PrimBtn>
                {pubErr && <Alert type="error" msg={pubErr} />}
                {pubResult && (
                  <div style={{ padding:"14px 16px", background:C.greenBg, border:`1px solid ${C.green}33`, borderRadius:10 }}>
                    <div style={{ color:C.green, fontWeight:600, fontSize:14, marginBottom:4 }}>{pubMode==="now"?"✅ Đăng thành công!":"📅 Đã lên lịch!"}</div>
                    <div style={{ color:C.textSub, fontSize:12, marginBottom:4 }}>Post ID: {pubResult}</div>
                    <a href={`https://www.facebook.com/${pubResult.replace("_","/posts/")}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:C.blue }}>→ Xem trên Facebook ↗</a>
                  </div>
                )}
              </div>

              <Card step="" title="Xem trước trước khi đăng">
                {!post ? <Empty icon="⬅️" text="Tạo bài ở tab 'Tạo bài' trước" /> : (
                  <>
                    <FBPreview post={post} productLink={productLink} images={mediaMode==="image"?validImgs:[]} videoUrl={mediaMode==="video"?videoUrl:""} />
                    {pubMode === "scheduled" && schedTime && (
                      <div style={{ marginTop:10, padding:"9px 13px", background:C.blueBg, border:`1px solid ${C.blue}22`, borderRadius:8 }}>
                        <span style={{ color:C.blue, fontSize:13 }}>📅 Sẽ đăng lúc: <strong>{new Date(schedTime).toLocaleString("vi-VN")}</strong></span>
                      </div>
                    )}
                    <div style={{ marginTop:10 }}><HTagRow tags={post.hashtags} /></div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* ══ TAB: ĐÃ LƯU ══ */}
          {tab === "saved" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:600 }}>Kho bài — {saved.length} bài</h2>
                {saved.length > 0 && <SecBtn small onClick={() => { if (window.confirm("Xóa tất cả bài đã lưu?")) setSaved([]); }}>🗑️ Xóa tất cả</SecBtn>}
              </div>
              {saved.length === 0 ? (
                <Card step="" title=""><Empty icon="📝" text="Chưa có bài nào." /></Card>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                  {saved.map(p => {
                    const b = BRANDS.find(x => x.id === p.brand);
                    return (
                      <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
                        {p.previewImg && <img src={p.previewImg} alt="" style={{ width:"100%", height:90, objectFit:"cover", borderRadius:7, marginBottom:10 }} onError={e => e.target.style.display="none"} />}
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:5 }}>
                          <div style={{ display:"flex", gap:5 }}>
                            {b && <Chip text={b.name} color={b.color} bg={b.light} />}
                            {p.published && <Chip text="✅ Đăng" color={C.green} bg={C.greenBg} />}
                          </div>
                          <span style={{ color:C.textMute, fontSize:11 }}>{p.timestamp ? new Date(p.timestamp).toLocaleDateString("vi-VN") : ""}</span>
                        </div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13, fontWeight:600, marginBottom:6 }}>{p.emoji_hook || ""} {p.headline || ""}</div>
                        <div style={{ color:C.textSub, fontSize:12, lineHeight:1.6, marginBottom:11 }}>{(p.body||"").substring(0,100)}...</div>
                        <div style={{ display:"flex", gap:6 }}>
                          <SecBtn small onClick={() => navigator.clipboard.writeText(buildPostText(p))}>📋 Copy</SecBtn>
                          {!p.published && <SecBtn small onClick={() => { setPost(p); setTab("publish"); }}>📤 Đăng</SecBtn>}
                          <button onClick={() => setSaved(prev => prev.filter(x => x.id !== p.id))} style={{ marginLeft:"auto", background:"none", border:"none", color:C.textMute, fontSize:13, cursor:"pointer" }}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ TAB: CÀI ĐẶT ══ */}
          {tab === "settings" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
              <Card step="" title="🔑 Kết nối Facebook Page">
                <div style={{ padding:"10px 13px", background:C.blueBg, border:`1px solid ${C.blue}22`, borderRadius:8, marginBottom:14, fontSize:13, color:C.textSub, lineHeight:1.7 }}>
                  Thông tin được lưu trên trình duyệt. Không cần nhập lại mỗi lần.
                </div>
                <Lbl>Tên fanpage</Lbl>
                <input value={pageName} onChange={e => setPageName(e.target.value)} placeholder="VD: Eurocook Global" style={{ ...IS, marginBottom:12 }} />
                <Lbl>Page ID</Lbl>
                <input value={pageId} onChange={e => setPageId(e.target.value)} placeholder="VD: 494852260642531" style={{ ...IS, marginBottom:12 }} />
                <Lbl>Page Access Token</Lbl>
                <div style={{ position:"relative", marginBottom:14 }}>
                  <input value={token} onChange={e => setToken(e.target.value)} type={showTok?"text":"password"} placeholder="EAAxxxxx..." style={{ ...IS, paddingRight:60 }} />
                  <button onClick={() => setShowTok(!showTok)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:C.textMute, fontSize:12, padding:0 }}>{showTok?"Ẩn":"Hiện"}</button>
                </div>
                <PrimBtn onClick={saveSett}>{settOk?"✅ Đã lưu!":"💾  Lưu cài đặt"}</PrimBtn>
                {isConn && <Alert type="success" msg={`✅ Đang kết nối: ${pageName||pageId}`} />}
                <div style={{ marginTop:14, fontSize:12, color:C.textMute, lineHeight:1.8 }}>
                  Lấy Page Token:<br />
                  <code style={{ fontSize:11, background:C.bg, padding:"2px 6px", borderRadius:4, color:C.blue }}>graph.facebook.com/me/accounts?access_token=TOKEN</code>
                </div>
              </Card>
              <Card step="" title="ℹ️ Thông tin tool">
                {[["Tên pháp nhân","EUROCOOK GLOBAL"],["Hashtag cố định","#Eurocook · #EurocookGlobal"],["Ảnh/bài","Tối đa 6 ảnh (nhập link URL)"],["Video","Upload URL .mp4 public"],["AI model","Claude Sonnet 4"],["Lên lịch","Fanpage cần ≥ 2,000 likes"]].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 12px", background:C.bg, borderRadius:7, marginBottom:7, border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:12, color:C.textSub }}>{k}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{v}</span>
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

// ── SHARED COMPONENTS ──────────────────────────────────────
function Card({ step, title, children }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:20, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      {title && (
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:16, borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
          {step && <span style={{ fontSize:10, fontWeight:700, color:C.gold, letterSpacing:2, background:C.goldBg, padding:"2px 7px", borderRadius:4 }}>{step}</span>}
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:C.text }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
function PrimBtn({ onClick, disabled, children, small }) {
  return <button onClick={onClick} disabled={disabled} style={{ width:small?undefined:"100%", padding:small?"9px 16px":"13px 20px", background:disabled?C.border:`linear-gradient(135deg,${C.gold},#D4A85A)`, border:"none", borderRadius:8, color:disabled?C.textMute:"#fff", fontSize:small?13:14, fontWeight:600, letterSpacing:0.3, display:"flex", alignItems:"center", justifyContent:"center", gap:8, cursor:disabled?"not-allowed":"pointer", boxShadow:disabled?"none":`0 2px 12px ${C.gold}44` }}>{children}</button>;
}
function SecBtn({ onClick, children, small }) {
  return <button onClick={onClick} style={{ padding:small?"8px 13px":"11px 18px", background:C.surface, border:`1.5px solid ${C.border2}`, borderRadius:8, color:C.text, fontSize:small?12.5:13, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>{children}</button>;
}
function Lbl({ children, style }) { return <div style={{ fontSize:12, fontWeight:600, color:C.textSub, marginBottom:6, ...style }}>{children}</div>; }
function Chip({ text, color, bg }) { return <span style={{ padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:500, color:color||C.textSub, background:bg||C.bg, border:`1px solid ${color||C.border}22` }}>{text}</span>; }
function Alert({ type, msg }) {
  const s = { error:[C.redBg,C.red], success:[C.greenBg,C.green], info:[C.blueBg,C.blue] }[type]||[C.bg,C.textSub];
  return <div style={{ padding:"10px 13px", background:s[0], border:`1px solid ${s[1]}33`, borderRadius:8, color:s[1], fontSize:13, marginTop:6 }}>{msg}</div>;
}
function Spin() { return <span style={{ width:14, height:14, border:`2px solid ${C.goldLt}`, borderTopColor:C.gold, borderRadius:"50%", display:"inline-block", animation:"spin .8s linear infinite", flexShrink:0 }} />; }
function Empty({ icon, text }) { return <div style={{ minHeight:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}><div style={{ fontSize:36, opacity:.2 }}>{icon}</div><div style={{ fontSize:13, textAlign:"center", lineHeight:1.8, color:C.textMute, whiteSpace:"pre-line" }}>{text}</div></div>; }
function Loading({ label }) { return <div style={{ minHeight:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:13 }}><div style={{ width:40, height:40, border:`3px solid ${C.goldLt}`, borderTopColor:C.gold, borderRadius:"50%", animation:"spin 1s linear infinite" }} /><div style={{ color:C.gold, fontSize:13, fontWeight:500 }}>{label}</div></div>; }
function IBadge({ label, value }) { return <div style={{ padding:"8px 12px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8 }}><div style={{ fontSize:10.5, color:C.textMute, marginBottom:3 }}>{label}</div><div style={{ fontSize:13, fontWeight:600, color:C.gold }}>{value||"—"}</div></div>; }
function HTagRow({ tags }) {
  const list = Array.isArray(tags) ? tags : [];
  return (
    <div style={{ padding:"10px 12px", background:C.blueBg, border:`1px solid ${C.blue}18`, borderRadius:8 }}>
      <div style={{ fontSize:10, color:C.textMute, letterSpacing:1, marginBottom:6, textTransform:"uppercase" }}>Hashtags</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
        {list.map((tag,i) => <span key={i} style={{ padding:"3px 8px", background:"#fff", border:`1px solid ${C.blue}22`, borderRadius:4, color:C.blue, fontSize:11, fontWeight:500 }}>{tag}</span>)}
      </div>
    </div>
  );
}
function FBPreview({ post, productLink, images, videoUrl }) {
  if (!post) return null;
  const validImgs = Array.isArray(images) ? images.filter(i => i && i.url && i.url.startsWith("http")) : [];
  const cols = validImgs.length === 1 ? "1fr" : validImgs.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr";
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "";
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
      <div style={{ padding:"10px 13px", display:"flex", alignItems:"center", gap:9, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.gold},#D4A85A)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🍽️</div>
        <div><div style={{ fontSize:13, fontWeight:600 }}>Eurocook Global</div><div style={{ color:"#9A9A9A", fontSize:11 }}>Vừa xong · 🌐</div></div>
      </div>
      {validImgs.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:cols, gap:2 }}>
          {validImgs.slice(0,6).map((img,i) => (
            <img key={i} src={img.url} alt="" style={{ width:"100%", height:validImgs.length===1?220:100, objectFit:"cover", display:"block" }} onError={e => { e.target.style.display="none"; }} />
          ))}
        </div>
      )}
      {!validImgs.length && videoUrl && videoUrl.trim() && (
        <video src={videoUrl} style={{ width:"100%", maxHeight:200, display:"block" }} onError={e => { e.target.style.display="none"; }} />
      )}
      <div style={{ padding:"12px 14px", fontSize:13.5, lineHeight:1.75, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        <strong style={{ fontFamily:"'Playfair Display',serif", fontSize:15, color:C.goldDk }}>{post.emoji_hook||""} {post.headline||""}</strong>
        {"\n\n"}{post.body||""}
        {"\n\n"}<span style={{ color:C.gold, fontWeight:600 }}>👉 {post.cta||""}</span>
        {productLink && <><br /><span style={{ color:C.blue }}>🔗 {productLink}</span></>}
        {hashtags && <><br /><br /><span style={{ color:C.blue, fontSize:12 }}>{hashtags}</span></>}
      </div>
      <div style={{ padding:"8px 14px", borderTop:`1px solid ${C.border}`, display:"flex", gap:16 }}>
        {["👍 Thích","💬 Bình luận","↗️ Chia sẻ"].map(a => <span key={a} style={{ color:"#9A9A9A", fontSize:12 }}>{a}</span>)}
      </div>
    </div>
  );
}

const IS = { width:"100%", padding:"10px 13px", background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:"none", transition:"border-color .15s" };
