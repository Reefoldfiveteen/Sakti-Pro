# SAKTI PRO (Sistem Asisten Kasir Pintar Berbasis AI)

SAKTI PRO adalah aplikasi kasir (Point of Sale) modern yang dirancang untuk UMKM dan retail dengan memanfaatkan kecerdasan buatan (Generative AI) untuk memproses transaksi secara instan melalui suara (**Voice Dictation**) dan foto nota fisik (**Vision Recognition**). 

Aplikasi ini mendisrupsi metode kasir konvensional yang kaku dengan memberikan kebebasan kepada pemilik usaha untuk mencatat transaksi secepat mereka berbicara atau memotret lembaran nota grosir.

## 🌟 Fitur Utama

* 🎙️ **Voice Transaction Command:** Catat puluhan transaksi sekaligus hanya dengan mendikte kalimat alami (Contoh: *"Gorengan 5 harga seribu, Bakso 2 mangkok satunya 6 ribu..."*). AI akan otomatis mengekstrak nama barang, kuantitas, dan nominal harga menjadi JSON terstruktur secara real-time.
* 📸 **Vision Nota Parser:** Ambil foto nota pembelian atau struk belanja fisik, unggah ke sistem, dan biarkan AI mengekstrak data tabel barang belanjaan secara otomatis untuk dimasukkan ke sistem kasir.
* 📈 **Dashboard Metrik UMKM:** Perhitungan otomatis omset harian, margin keuntungan, dan ringkasan performa toko murni secara real-time.
* 🔄 **Smart Background Auto-Sync:** Sistem sinkronisasi otomatis yang berjalan di latar belakang untuk memastikan data lokal di browser selalu konsisten dengan pangkalan data cloud (Google Drive API / Cloud database) tanpa mengganggu aktivitas kasir.
* 📱 **Android WebView Ready (Hybrid Bridge):** Dilengkapi dengan *JavaScript Bridge* (`window.AndroidJSInterface`) yang membuatnya siap dibungkus menjadi aplikasi Android APK murni yang responsif dan mendukung integrasi hardware internal.

## 🏗️ Arsitektur Teknologi

* **Front-End / Core Engine:** Next.js (React) - App Router
* **Styling & UI:** Tailwind CSS
* **AI Integration:** Vercel AI SDK / Google Gemini API (Vision & Structured JSON Output)
* **Local Storage Management:** React `useRef` Pointers & LocalStorage Core untuk performa rendering ultra-cepat tanpa lag saat entri data massal.
* **Mobile Framework:** Android Studio WebView Component dengan custom JS-Bridge channel.

## 🚀 Cara Menjalankan Project (Lokal)

1.  **Clone Repositori:**
    ```bash
    git clone https://github.com/username/sakti-pro.git
    cd sakti-pro
    ```

2.  **Instalasi Dependencies:**
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variables (`.env.local`):**
    Buat file `.env.local` di root folder dan masukkan API Key yang dibutuhkan:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    NEXT_PUBLIC_BASE_URL=http://localhost:3000
    ```

4.  **Jalankan Server Development:**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:3000` di browser Anda untuk melihat aplikasi berjalan.

## 🛠️ Kontribusi

Kontribusi selalu terbuka! Jika Anda ingin meningkatkan performa regex parser, memperbaiki performa audio handling, atau menambahkan integrasi printer thermal, silakan lakukan fork pada repositori ini dan kirimkan Pull Request (PR).

---
Developed with ❤️ for Indonesian UMKM Digitalization.
