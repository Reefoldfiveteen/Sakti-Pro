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

    // =================================================================
    // 🌟 STRATEGI ANTREAN ROTASI BERDASARKAN RATE LIMIT AKTUAL AKUN ARIF
    // =================================================================
    let antreanModel = [];

    if (tipe === 'suara_file') {
      antreanModel = [
        "gemini-2.5-flash-native-audio-latest", 
        "gemini-3.5-flash",                      
        "gemini-3-flash-preview",                
        "gemini-2.5-flash"                       
      ];
    } else if (tipe === 'foto') {
      antreanModel = [
        "gemini-3.5-flash",                      
        "gemini-3-flash-preview",                
        "gemini-3.1-flash-lite",                 
        "gemini-2.5-flash"                       
      ];
    } else {
      antreanModel = [
        "gemini-3.5-flash",                      
        "gemini-3-flash-preview",                
        "gemini-2.5-flash-lite",                 
        "gemini-3.1-flash-lite"                  
      ];
    }

    // =================================================================
    // 2. STRUKTURISASI PAYLOAD PROMPT (JSON STRICT MODE)
    // =================================================================
    let bodyPayload = {};

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
    } else {
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
    }

    // =================================================================
    // 🌟 3. AUTOMATIC FAILOVER ENGINE (ROTASI REAL-TIME JIKA LIMIT 429)
    // =================================================================
    let response;
    let resData;
    let suksesKoneksi = false;
    let errorTerakhir = "";

    for (const namaModel of antreanModel) {
      console.log(`[SAKTI Optimizer] Melempar job [${tipe.toUpperCase()}] ke model: ${namaModel}...`);
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
          console.log(`✅ [SAKTI Optimizer] BERHASIL ditangani oleh model: ${namaModel}`);
          break; 
        } else {
          errorTerakhir = resData.error?.message || "Eror kuota Google Studio.";
          console.warn(`⚠️ [SAKTI Optimizer] Model ${namaModel} menolak/limit (Status ${response.status}): ${errorTerakhir}`);
          
          if (response.status === 429 || response.status === 444 || response.status === 400) {
            continue;
          }
        }
      } catch (err) {
        errorTerakhir = err.message;
        console.warn(`❌ [SAKTI Optimizer] Masalah request ke model ${namaModel}: ${errorTerakhir}`);
      }
    }

    if (!suksesKoneksi) {
      throw new Error(`Seluruh skuad model spesialis ${tipe} kehabisan token harian. Pesan Google: ${errorTerakhir}`);
    }

    const rawText = resData.candidates[0].content.parts[0].text.trim();
    return NextResponse.json({ success: true, data: JSON.parse(rawText) });

  } catch (error) {
    console.error("Fatal Error SAKTI Core Engine:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}