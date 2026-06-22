# NatMind AI — Deploy ke Vercel

## Struktur Project
```
novamind/
├── index.html        ← Frontend (UI chat)
├── api/
│   └── chat.js       ← Backend proxy (menyembunyikan API key)
├── vercel.json       ← Konfigurasi Vercel
└── README.md
```

## Cara Deploy (5 menit)

### 1. Upload ke GitHub
- Buat repo baru di github.com
- Upload semua file ini ke repo tersebut

### 2. Connect ke Vercel
- Buka vercel.com → Login → "Add New Project"
- Import repo GitHub yang baru dibuat
- Klik Deploy (biarkan semua pengaturan default)

### 3. Tambahkan API Key
- Di dashboard Vercel → Project → Settings → Environment Variables
- Tambahkan:
  - **Name:** `ANTHROPIC_API_KEY`
  - **Value:** `sk-ant-xxxxxxxx` (API key kamu dari console.anthropic.com)
- Klik Save

### 4. Redeploy
- Deployments → klik titik tiga → Redeploy
- Selesai! Website langsung bisa dipakai siapa saja tanpa isi API key.

## Catatan
- API key tersimpan aman di server Vercel, tidak terlihat pengunjung
- Gratis untuk traffic kecil-menengah (Vercel free tier)
- Biaya API Anthropic ditanggung pemilik (kamu) per penggunaan
