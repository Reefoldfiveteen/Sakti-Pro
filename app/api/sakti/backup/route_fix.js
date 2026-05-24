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

    const modelName = "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    let bodyPayload = {};

    // =================================================================
    // SKENARIO 1: INPUT TEKS MANUAL / MIC TRANSCRIPT (PROMPT DINAMIS)
    // =================================================================
    if (tipe === 'teks') {
      bodyPayload = {
        contents: [{
          parts: [{
            text: `Kamu adalah kasir akuntan pintar UMKM Indonesia. Analisis kalimat transaksi berikut: "${dataInput}"
            
            Tentukan secara cerdas klasifikasi jenis transaksinya:
            - Jika ada kata "beli", "kulakan", "pengeluaran", "bayar", maka jenisnya adalah "Pengeluaran".
            - Jika ada kata "jual", "laku", "pendapatan", "diterima", maka jenisnya adalah "Penjualan".
            - Jika netral/kurang jelas, sesuaikan dengan makna kalimatnya.
            
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
    } 
    // =================================================================
    // SKENARIO 2: BERKAS AUDIO / FOTO NOTA (PROMPT DINAMIS)
    // =================================================================
    else if (tipe === 'suara_file' || tipe === 'foto') {
      const base64Murni = dataInput.split(',')[1];
      const mimeType = dataInput.split(',')[0].split(':')[1].split(';')[0];

      bodyPayload = {
        contents: [{
          parts: [
            {
              text: `Kamu adalah akuntan POS AI tingkat tinggi. Analisis berkas ${tipe === 'foto' ? 'gambar nota' : 'suara rekaman'} ini secara murni dan teliti.
              
              Tentukan klasifikasi jenis transaksi secara otomatis:
              - Jika ini adalah nota belanja/struk pembelian/orang mengatakan "beli", set jenis menjadi "Pengeluaran".
              - Jika ini nota penjualan kasir toko sendiri/orang mengatakan "jual", set jenis menjadi "Penjualan".
              
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

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error?.message || "Gagal memproses data.");

    const rawText = resData.candidates[0].content.parts[0].text.trim();
    return NextResponse.json({ success: true, data: JSON.parse(rawText) });

  } catch (error) {
    console.error("Error SAKTI Ultimate:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}