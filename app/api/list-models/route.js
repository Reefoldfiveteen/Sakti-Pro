import { NextResponse } from 'next/server';
export const dynamic = "force-static";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key Gemini belum terpasang di .env.local" }, { status: 500 });
    }

    // Mengetuk pintu ModelService milik Google Gemini untuk meminta daftar model aktif
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error?.message || "Gagal mengambil daftar model dari Google.");
    }

    // Ambil nama model dan metode yang didukung agar daftarnya ringkas dan mudah dibaca
    const ringkasanModel = resData.models.map(m => ({
      name: m.name,
      displayName: m.displayName,
      supportedMethods: m.supportedMethods
    }));

    return NextResponse.json({ 
      success: true, 
      total_models: ringkasanModel.length,
      models: ringkasanModel 
    });

  } catch (error) {
    console.error("Detail Error List Models:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
