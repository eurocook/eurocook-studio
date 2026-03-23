# 🍽️ Eurocook AI Social Media Studio

Tool tự động tạo và đăng bài Facebook cho fanpage Eurocook.

## Cấu trúc project

```
eurocook-vercel/
├── api/
│   └── publish.js        ← Serverless function (proxy Facebook API)
├── src/
│   ├── main.jsx
│   └── App.jsx           ← Toàn bộ giao diện tool
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🚀 Deploy lên Vercel (5 phút)

### Bước 1 — Tạo tài khoản Vercel
Vào https://vercel.com → Sign up bằng GitHub (miễn phí)

### Bước 2 — Upload code lên GitHub
1. Vào https://github.com/new → tạo repo tên `eurocook-studio`
2. Upload toàn bộ thư mục này lên repo

### Bước 3 — Deploy
1. Vào https://vercel.com/new
2. Import repo `eurocook-studio` từ GitHub
3. Framework Preset: chọn **Vite**
4. Nhấn **Deploy** → chờ ~2 phút

### Bước 4 — Truy cập
Vercel sẽ cấp URL dạng: `https://eurocook-studio-xxx.vercel.app`

---

## 💻 Chạy local (để test)

```bash
npm install
npm run dev
```
Mở http://localhost:5173

---

## 🔑 Lấy Facebook Page Access Token

1. Vào https://developers.facebook.com
2. My Apps → Create App → Business
3. Tools → Graph API Explorer
4. Chọn page Eurocook → Generate Token
5. Cấp quyền: `pages_manage_posts`, `pages_read_engagement`, `publish_pages`

---

## ⚙️ Tính năng

- ✅ Tạo bài AI cho 6 thương hiệu: BOSCH, Siemens, Miele, V-Zug, Gaggenau, Liebherr
- ✅ 6 loại nội dung + 4 giọng điệu
- ✅ Đăng ngay lập tức lên Facebook
- ✅ Đính kèm ảnh (URL) + link sản phẩm
- ✅ Kho lưu bài đăng
- ✅ Preview Facebook trước khi đăng
