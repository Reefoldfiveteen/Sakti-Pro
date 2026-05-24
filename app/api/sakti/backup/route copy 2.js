import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { tipe, dataInput } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key Gemini tidak terbaca di .env.local" }, { status: 500 });
    }

    // Mengatur tanggal dan jam otomatis sesuai Waktu Indonesia Barat (WIB)
    const sekarang = new Date();
    const opsiTanggal = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Jakarta' };
    
    const tanggalInput = sekarang.toLocaleDateString('sv-SE', opsiTanggal); 
    // --- PERBAIKAN DI SINI: Kata 'Directory =' sudah dibuang total ---
    const jamInput = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');

    // MENGGUNAKAN GEMINI 2.5 FLASH (Aman dari limit quota 0, gratis, cepat, dan mendukung Vision OCR)
    const modelName = "gemini-2.5-flash";
    let bodyPayload = {};

    // =================================================================
    // SKENARIO 1: INPUT SUARA / MANUAL
    // =================================================================
    if (tipe === 'suara') {
      bodyPayload = {
        contents: [{
          parts: [{
            text: `Kamu adalah kasir pintar UMKM Indonesia. Ekstrak kalimat transaksi berikut menjadi data JSON detail barang belanjaan: "${dataInput}"
            
            FORMAT OUTPUT WAJIB (HANYA JSON OBJECT, TANPA MARKDOWN \`\`\`json):
            {
              "tanggal": "${tanggalInput}",
              "jam": "${jamInput}",
              "jenis": "Penjualan",
              "items": [
                {
                  "barang": "Nama barang asli",
                  "qty": (angka jumlah),
                  "harga": (angka harga satuan),
                  "jumlah": (hasil qty dikali harga)
                }
              ],
              "grand_total": (hitung total keseluruhan subtotal item)
            }`
          }]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };
    } 
    // =================================================================
    // SKENARIO 2: PURE OCR NOTA / STRUK BELANJA (Membaca Foto)
    // =================================================================
    else if (tipe === 'foto') {
      const base64Murni = dataInput.split(',')[1];
      const mimeType = dataInput.split(',')[0].split(':')[1].split(';')[0];

      bodyPayload = {
        contents: [{
          parts: [
            {
              text: `Kamu adalah akuntan POS tingkat tinggi. Analisis foto nota/struk belanja ini (bisa berupa tabel ketikan komputer atau tulisan tangan nota pasar biasa).
              Ekstrak secara PURE dan jujur setiap item barang, jumlah kuantitas, harga satuan, dan total akhirnya dari gambar nota tersebut.
              
              FORMAT OUTPUT WAJIB (HANYA JSON OBJECT, TANPA MARKDOWN \`\`\`json):
              {
                "tanggal": "${tanggalInput}",
                "jam": "${jamInput}",
                "jenis": "Pengeluaran",
                "items": [
                  {
                    "barang": "Nama menu/barang yang tertera jelas di nota",
                    "qty": (angka kuantitas barang),
                    "harga": (angka harga satuan barang),
                    "jumlah": (angka subtotal item tersebut di nota)
                  }
                ],
                "grand_total": (ambil total nominal paling bawah atau Grand Total dari nota)
              }`
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Murni
              }
            }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };
    } else {
      return NextResponse.json({ success: false, error: "Tipe input tidak dikenal" }, { status: 400 });
    }

    // Eksekusi request ke Google Gemini API menggunakan fetch murni
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    const resData = await response.json();
    
    if (!response.ok) {
      throw new Error(resData.error?.message || `Gagal memproses data menggunakan ${modelName}`);
    }

    const rawText = resData.candidates[0].content.parts[0].text.trim();
    const dataFinal = JSON.parse(rawText);

    return NextResponse.json({ success: true, data: dataFinal });

  } catch (error) {
    console.error("Detail Error Gemini Backend:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}