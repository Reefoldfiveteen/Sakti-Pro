'use client';

import { useState } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [daftarTransaksi, setDaftarTransaksi] = useState([]);
  const [errorPesan, setErrorPesan] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. INPUT FILE AUDIO TESTING (Murni Tanpa Rekayasa)
  const handleUploadAudio = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorPesan('');
    setIsLoading(true);

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setErrorPesan("Browser tidak mendukung konversi audio otomatis.");
      setIsLoading(false);
      return;
    }

    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      setInputText(event.results[0][0].transcript);
    };

    recognition.onerror = () => {
      setErrorPesan("Gagal mengurai file audio. Pastikan suara rekaman jernih.");
    };

    recognition.onend = () => { setIsLoading(false); };

    recognition.start();
    audio.play();
  };

  // 2. LIVE RECORDING MIC LANGSUNG
  const handleMulaiRekam = (e) => {
    e.preventDefault();
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    recognition.onstart = () => { setIsRecording(true); setErrorPesan(''); };
    recognition.onerror = (evt) => { setIsRecording(false); setErrorPesan(`Mic Error: ${evt.error}`); };
    recognition.onend = () => { setIsRecording(false); };
    recognition.onresult = (event) => { setInputText(event.results[0][0].transcript); };
    recognition.start();
  };

  const handleSubmitTeks = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    await kirimKeBackend('suara', inputText);
  };

  const handleUploadFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { kirimKeBackend('foto', reader.result); };
    reader.readAsDataURL(file);
  };

  const kirimKeBackend = async (tipe, data) => {
    try {
      setErrorPesan('');
      setIsLoading(true);
      
      const response = await fetch('/api/sakti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipe, dataInput: data }),
      });

      const resData = await response.json();
      
      if (resData.success) {
        setDaftarTransaksi((prev) => [resData.data, ...prev]);
        if (tipe === 'suara') setInputText('');
      } else {
        setErrorPesan(resData.error || "Gagal memproses transaksi.");
      }
    } catch (err) {
      setErrorPesan("Gagal menghubungi server lokal backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '950px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h1 style={{ color: '#1E293B', margin: '0', fontSize: '32px', fontWeight: '800' }}>✨ SAKTI <span style={{ fontSize: '14px', backgroundColor: '#10B981', color: '#FFF', padding: '2px 8px', borderRadius: '20px' }}>FLASH 2.5</span></h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Sistem Akuntansi POS Terintegrasi Bebas Limit Quota</p>
      </div>

      {errorPesan && (
        <div style={{ backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', color: '#991B1B', padding: '14px', borderRadius: '6px', marginBottom: '25px', fontWeight: '500' }}>
          ⚠️ {errorPesan}
        </div>
      )}

      {/* DASHBOARD KONTROL INPUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
        
        {/* PANEL AUDIO & MANUAL TEKS */}
        <div style={{ border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1E293B', fontSize: '14px', marginBottom: '14px' }}>🎙️ MANAJEMEN TRANSAKSI AUDIO / TEKS</label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <button type="button" onClick={handleMulaiRekam} style={{ padding: '12px', borderRadius: '8px', border: '1px dashed #6366F1', backgroundColor: isRecording ? '#FEE2E2' : '#EEF2FF', color: isRecording ? '#991B1B' : '#4F46E5', fontWeight: '700', cursor: 'pointer' }}>
              {isRecording ? '🛑 Mendengarkan...' : '🎙️ Rekam dari Mic'}
            </button>

            <label htmlFor="upload-audio" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', border: '1px dashed #10B981', backgroundColor: '#F0FDF4', color: '#047857', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
              📁 Unggah File Rekaman Test
            </label>
            <input id="upload-audio" type="file" accept="audio/*" onChange={handleUploadAudio} style={{ display: 'none' }} />
          </div>

          <input 
            type="text" 
            placeholder="Kalimat transkrip murni otomatis masuk ke sini..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#0F172A', marginBottom: '14px', boxSizing: 'border-box' }}
          />

          <button type="button" onClick={handleSubmitTeks} disabled={isLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: isLoading ? '#94A3B8' : '#1E293B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Memilah Struktur Barang...' : '⚡ Proses Masuk Tabel'}
          </button>
        </div>

        {/* PANEL PURE OCR SCAN FOTO */}
        <div style={{ border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1E293B', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>📷 FOTO STRUK / NOTA BELANJA FISIK (VISION)</label>
          <label htmlFor="upload-nota" style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: '8px', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Gemini Flash Sedang Membaca Nota...' : '📂 Pilih / Foto Nota Belanja'}
          </label>
          <input id="upload-nota" type="file" accept="image/*" onChange={handleUploadFoto} disabled={isLoading} style={{ display: 'none' }} />
        </div>

      </div>

      {/* TABEL HASIL PECAHAN TRANSAKSI */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px' }}>
        <h3 style={{ color: '#1E293B', margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>📋 Rekapitulasi Rincian Barang Transaksi (Pure Real-time)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155', fontSize: '12px', fontWeight: '800' }}>
                <th style={{ padding: '14px' }}>WAKTU / GRUP</th>
                <th style={{ padding: '14px' }}>NAMA ITEM / BARANG</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>QTY</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>HARGA SATUAN</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              {daftarTransaksi.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Belum ada riwayat belanja yang diproses.</td>
                </tr>
              ) : (
                daftarTransaksi.map((transaksi, tIdx) => (
                  <g key={`grup-tr-${tIdx}`}>
                    <tr style={{ backgroundColor: '#E2E8F0', borderBottom: '1px solid #CBD5E1', fontWeight: '700', fontSize: '13px' }}>
                      <td style={{ padding: '12px', color: '#0F172A' }}>📅 {transaksi.tanggal} ({transaksi.jam} WIB)</td>
                      <td colSpan="3" style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: transaksi.jenis === 'Penjualan' ? '#10B981' : '#F59E0B', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginRight: '10px' }}>
                          {transaksi.jenis.toUpperCase()}
                        </span>
                        <span style={{ color: '#334155', fontWeight: '500' }}>{transaksi.items?.length || 0} Macam Barang</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1E1B4B', fontSize: '15px', fontWeight: '800' }}>Total: Rp {Number(transaksi.grand_total).toLocaleString('id-ID')}</td>
                    </tr>
                    {transaksi.items?.map((item, iIdx) => (
                      <tr key={`item-row-${tIdx}-${iIdx}`} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', backgroundColor: '#FFFFFF' }}>
                        <td></td> 
                        <td style={{ padding: '12px', fontWeight: '600' }}>📦 {item.barang}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Rp {Number(item.harga).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700' }}>Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </g>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}