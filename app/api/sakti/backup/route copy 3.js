import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { tipe, dataInput } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key Gemini tidak terbaca" }, { status: 500 });
    }

    const sekarang = new Date();
    const tanggalInput = sekarang.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); 
    const jamInput = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');

    // 🌟 FULL AUTO ROTATE: Memasukkan semua model Flash multimodal yang aktif di akunmu
    const antreanModel = [
      "gemini-2.5-flash",          // 1. Utama (Paling Matang)
      "gemini-2.0-flash",          // 2. Cadangan (Super Cepat)
      "gemini-3.5-flash",          // 3. Cadangan Lini Masa Depan
      "gemini-2.0-flash-001",      // 4. Cadangan Versi Spesifik 2.0
      "gemini-flash-latest",       // 2026 Alias Progresif
      "gemini-2.5-flash-lite"      // 6. Cadangan Versi Ringan Hemat Resource
    ];

    let bodyPayload = {};

    // 1. STRUKTURISASI PAYLOAD BERDASARKAN TIPE INPUT
    if (tipe === 'teks') {
      bodyPayload = {
        contents: [{
          parts: [{
            text: `Kamu adalah kasir akuntan pintar UMKM Indonesia. Analisis kalimat transaksi berikut: "${dataInput}"
            Tentukan secara cerdas klasifikasi jenis transaksinya (Penjualan atau Pengeluaran).
            
            FORMAT OUTPUT WAJIB (HANYA JSON OBJECT, TANPA MARKDOWN):
            {
              "tanggal": "${tanggalInput}",
              "jam": "${jamInput}",
              "jenis": "Penjualan atau Pengeluaran", 
              "items": [
                { "barang": "Nama barang asli", "qty": (angka), "harga": (angka), "jumlah": (qty dikali harga) }
              ],
              "grand_total": (hitung total keseluruhan subtotal item)
            }`
          }]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };
    } else if (tipe === 'suara_file' || tipe === 'foto') {
      const base64Murni = dataInput.split(',')[1];
      const mimeType = dataInput.split(',')[0].split(':')[1].split(';')[0];
      const konteksMedia = tipe === 'foto' ? "gambar nota belanja" : "suara rekaman transaksi";

      bodyPayload = {
        contents: [{
          parts: [
            {
              text: `Kamu adalah akuntan POS AI tingkat tinggi. Analisis berkas ${konteksMedia} ini secara murni dan teliti.
              Tentukan jenis transaksi secara otomatis (Penjualan jika laku/jual, Pengeluaran jika beli/nota belanja).
              
              FORMAT OUTPUT WAJIB (HANYA JSON OBJECT, TANPA MARKDOWN):
              {
                "tanggal": "${tanggalInput}",
                "jam": "${jamInput}",
                "jenis": "Penjualan atau Pengeluaran",
                "items": [
                  { "barang": "Nama barang", "qty": (angka), "harga": (angka), "jumlah": (subtotal item) }
                ],
                "grand_total": (ambil total nominal akhir paling bawah)
              }`
            },
            {
              inlineData: { mimeType: mimeType, data: base64Murni }
            }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };
    } else {
      return NextResponse.json({ success: false, error: "Tipe input tidak valid" }, { status: 400 });
    }

    // =================================================================
    // 🌟 ENGINE EKSEKUSI ROTASI 6 LAPIS SAKTI
    // =================================================================
    let response;
    let resData;
    let suksesKoneksi = false;
    let errorTerakhir = "";

    for (const namaModel of antreanModel) {
      console.log(`[SAKTI Engine] Mencoba hit server menggunakan model: ${namaModel}...`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${namaModel}:generateContent?key=${apiKey}`;
      
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        resData = await response.json();

        if (response.ok) {
          suksesKoneksi = true;
          console.log(`✅ [SAKTI Engine] SUKSES BESAR diproses oleh: ${namaModel}`);
          break; 
        } else {
          errorTerakhir = resData.error?.message || "Eror internal API Google.";
          console.warn(`⚠️ [SAKTI Engine] Model ${namaModel} terhambat limit/gagal: ${errorTerakhir}`);
          
          // Jika error-nya karena quota limit (429), lanjut ke perulangan berikutnya.
          // Tapi jika errornya fatal (misal API key dicabut/salah pasang), langsung stop biar gak boros loop.
          if (response.status !== 429) {
            break;
          }
        }
      } catch (err) {
        errorTerakhir = err.message;
        console.warn(`❌ [SAKTI Engine] Koneksi gagal pada model ${namaModel}: ${errorTerakhir}`);
      }
    }

    if (!suksesKoneksi) {
      throw new Error(`Seluruh 6 model tameng pertahanan kehabisan kuota harian. Pesan terakhir Google: ${errorTerakhir}`);
    }

    const rawText = resData.candidates[0].content.parts[0].text.trim();
    return NextResponse.json({ success: true, data: JSON.parse(rawText) });

  } catch (error) {
    console.error("Error SAKTI Failover System:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}