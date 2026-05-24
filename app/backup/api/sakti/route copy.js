import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { tipe, dataInput } = await request.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key Groq belum dipasang di .env.local" }, { status: 500 });
    }

    let prompt = "";

    // Mengatur instruksi sesuai input (Suara/Teks vs Foto)
    if (tipe === 'suara') {
      prompt = `Kamu adalah sistem kasir pintar UMKM Indonesia. Ekstrak teks transaksi ini menjadi data JSON bersih.
      Teks transaksi: "${dataInput}"
      
      FORMAT WAJIB (Kembalikan HANYA JSON Object ini, dilarang memberi penjelasan teks atau markdown apa pun):
      {
        "tanggal": "${new Date().toISOString().split('T')[0]}",
        "jenis": "Penjualan",
        "keterangan": "Input via Teks Suara",
        "total": (hitung total nominal uang dalam bentuk angka saja)
      }`;
    } else {
      // Catatan: Untuk input foto lewat Groq gratisan, kita ekstrak teksnya sebagai simulasi atau memakai model Llama 3 Vision.
      // Demi keamanan uji coba awal, kita set sebagai pengeluaran modal dahulu.
      prompt = `Kamu adalah akuntan cerdas UMKM. Anggap ini adalah teks hasil pembacaan nota belanja modal.
      Ekstrak total pengeluarannya. Teks: "${dataInput.substring(0, 200)}"
      
      FORMAT WAJIB (HANYA JSON Object, tanpa markdown):
      {
        "tanggal": "${new Date().toISOString().split('T')[0]}",
        "jenis": "Pengeluaran/Modal",
        "keterangan": "Scan Nota Fisik",
        "total": 50000
      }`;
    }

    // Memanggil Groq API menggunakan fetch murni bawaan JavaScript (Anti-Bentrokan Library!)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Model Llama terbaru yang sangat pintar & gratis di Groq
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" } // Memaksa Groq mengembalikan JSON murni
      })
    });

    const resData = await response.json();
    
    if (!response.ok) {
      throw new Error(resData.error?.message || "Gagal terkoneksi ke Groq");
    }

    // Mengambil teks hasil jawaban AI
    const jsonString = resData.choices[0].message.content.trim();
    const dataHasil = JSON.parse(jsonString);

    return NextResponse.json({ success: true, data: dataHasil });

  } catch (error) {
    console.error("Detail Error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}