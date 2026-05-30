![Android Ready](https://img.shields.io/badge/Platform-Android_APK-green?logo=android&logoColor=white)
# SAKTI PRO (Sistem Asisten Kasir Pintar Berbasis AI)

SAKTI PRO adalah aplikasi kasir (Point of Sale) modern yang dirancang untuk UMKM dan retail dengan memanfaatkan kecerdasan buatan (Generative AI) untuk memproses transaksi secara instan melalui suara (**Voice Dictation**) dan foto nota fisik (**Vision Recognition**). 

Aplikasi ini mendisrupsi metode kasir konvensional yang kaku dengan memberikan kebebasan kepada pemilik usaha untuk mencatat transaksi secepat mereka berbicara atau memotret lembaran nota grosir.

## 🌟 Fitur Utama
* 📱 **Native APK Distribution:** Tersedia dalam format paket aplikasi Android (`.apk`) siap pakai. Memanfaatkan komponen WebView optimal yang terintegrasi langsung dengan ekosistem perangkat keras ponsel cerdas untuk performa operasional kasir yang lebih *portable*.
* 🎙️ **Voice Transaction Command:** Catat puluhan transaksi sekaligus hanya dengan mendikte kalimat alami (Contoh: *"Gorengan 5 harga seribu, Bakso 2 mangkok satunya 6 ribu..."*). AI akan otomatis mengekstrak nama barang, kuantitas, dan nominal harga menjadi JSON terstruktur secara real-time.
* 📸 **Vision Nota Parser:** Ambil foto nota pembelian atau struk belanja fisik, unggah ke sistem, dan biarkan AI mengekstrak data tabel barang belanjaan secara otomatis untuk dimasukkan ke sistem kasir.
* 📈 **Dashboard Metrik UMKM:** Perhitungan otomatis omset harian, margin keuntungan, dan ringkasan performa toko murni secara real-time.
* 🔄 **Smart Background Auto-Sync:** Sistem sinkronisasi otomatis yang berjalan di latar belakang untuk memastikan data lokal di browser selalu konsisten dengan pangkalan data cloud (Google Drive API / Cloud database) tanpa mengganggu aktivitas kasir.
* 📱 **Android WebView Ready (Hybrid Bridge):** Dilengkapi dengan *JavaScript Bridge* (`window.AndroidJSInterface`) yang membuatnya siap dibungkus menjadi aplikasi Android APK murni yang responsif dan mendukung integrasi hardware internal.
* 📊 **Advanced Excel Reporting (Automated Accounting):** Ekspor seluruh jurnal rincian transaksi harian dan detail barang menjadi file spreadsheet (`.xlsx`) secara instan. Dilengkapi dengan formula laporan dinamis tiga segmen untuk visualisasi perbandingan cashflow toko (*Cashflow Ratio Chart*) menggunakan karakter blok murni (`█`) yang kompatibel di Microsoft Excel maupun Google Sheets.

## 🏗️ Arsitektur Teknologi

* **Front-End / Core Engine:** Next.js (React) - App Router
* **Styling & UI:** Tailwind CSS
* **AI Integration:** Vercel AI SDK / Google Gemini API (Vision & Structured JSON Output)
* **Local Storage Management:** React `useRef` Pointers & LocalStorage Core untuk performa rendering ultra-cepat tanpa lag saat entri data massal.
* **Mobile Framework:** Android Studio WebView Component dengan custom JS-Bridge channel.
* **Reporting Utilities:** `exceljs` & `file-saver` (Pengolah data arsitektur spreadsheet mutakhir)

## 📱 Panduan Instalasi APK Android

Bagi pengguna atau reviewer yang ingin menguji langsung aplikasi **SAKTI PRO** di perangkat Android asli (HP/Tablet) tanpa perlu menjalankan server Next.js lokal, Anda dapat mengikuti langkah berikut:

1. **Unduh File APK:**
   * Ambil berkas `sakti-pro-release.apk` yang tersedia di dalam folder `/dist` atau melalui tab *Releases* di repositori ini.
2. **Aktifkan Izinkan Sumber Tidak Dikenal:**
   * Sebelum menginstal, pastikan Anda telah mengaktifkan opsi *"Install Unknown Apps"* atau *"Izinkan Sumber Tidak Dikenal"* di pengaturan keamanan HP Android Anda (karena APK ini dirilis murni untuk kebutuhan *challenge* & distribusi mandiri).
3. **Instal & Jalankan:**
   * Buka file APK yang telah diunduh, klik **Install**, lalu buka aplikasi.
   * Aplikasi akan otomatis terhubung ke sistem backend produksi dan siap memproses transaksi via suara (*Voice*) maupun foto nota (*Vision*) langsung dari genggaman Anda!

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
