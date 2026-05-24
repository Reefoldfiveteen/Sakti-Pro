'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [daftarTransaksi, setDaftarTransaksi] = useState([]);
  const [errorPesan, setErrorPesan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State Manajemen Preview Audio
  const [audioUrlPreview, setAudioUrlPreview] = useState('');
  const [audioBase64, setAudioBase64] = useState('');

  // State Fitur Inline Editing DETAIL BARANG
  const [editingItemKey, setEditingItemKey] = useState(''); 
  const [editBarang, setEditBarang] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editHarga, setEditHarga] = useState('');

  // State Fitur Inline Editing GROUP TRANSAKSI
  const [editingGroupIdx, setEditingGroupIdx] = useState(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editJam, setEditJam] = useState('');
  const [editJenis, setEditJenis] = useState('');

  // 🌟 MANAGEMENT STATE GOOGLE CLOUD & LOGIN (COMPATIBLE APK/WEB)
  const [isLoggedInGDrive, setIsLoggedInGDrive] = useState(false);
  const [statusSync, setStatusSync] = useState('Belum Terhubung Cloud');
  const [isSyncing, setIsSyncing] = useState(false);
  const [intervalSync, setIntervalSync] = useState('manual'); // manual, jam, minggu

  // Instance Ref Kendali Mikrofon & Background Timer
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoSyncTimerRef = useRef(null);

  // Ambil data riwayat lama dari memori lokal komputer saat aplikasi pertama dibuka
  useEffect(() => {
    const dataLokal = localStorage.getItem('sakti_riwayat_data');
    if (dataLokal) {
      try {
        setDaftarTransaksi(JSON.parse(dataLokal));
      } catch (e) {
        console.error("Gagal memuat cache lokal.");
      }
    }

    // Load status kredensial Google Drive dari memori perangkat
    const tokenLokal = localStorage.getItem('sakti_token_gdrive');
    const savedInterval = localStorage.getItem('sakti_interval_sync') || 'manual';
    const savedStatus = localStorage.getItem('sakti_sync_status') || 'Belum Terhubung Cloud';
    
    if (tokenLokal) {
      setIsLoggedInGDrive(true);
      setStatusSync(savedStatus);
    }
    setIntervalSync(savedInterval);
  }, []);

  // 🌟 RUNNER DETEKTOR AUTO-SYNC BACKGROUND (TIAP JAM / MINGGU)
  useEffect(() => {
    if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);

    if (!isLoggedInGDrive || intervalSync === 'manual') return;

    let waktuInterval = 3600000; // Default 1 Jam (dalam ms)
    if (intervalSync === 'minggu') {
      waktuInterval = 3600000 * 24 * 7; // 1 Minggu
    }

    autoSyncTimerRef.current = setInterval(() => {
      console.log("[SAKTI Cloud] Memicu sinkronisasi terjadwal otomatis...");
      execSyncToDriveSilently();
    }, waktuInterval);

    localStorage.setItem('sakti_interval_sync', intervalSync);

    return () => clearInterval(autoSyncTimerRef.current);
  }, [intervalSync, isLoggedInGDrive, daftarTransaksi]);

  // Helper untuk menyimpan data secara otomatis ke memori internal browser
  const simpanKeMemoriLokal = (dataTerbaru) => {
    setDaftarTransaksi(dataTerbaru);
    localStorage.setItem('sakti_riwayat_data', JSON.stringify(dataTerbaru));
    if (isLoggedInGDrive) {
      setStatusSync('Perubahan Belum Disinkronkan');
      localStorage.setItem('sakti_sync_status', 'Perubahan Belum Disinkronkan');
    }
  };

  // 🌟 FUNGSI CLOUD 1: HUBUNGKAN GDRIVE & AUTO-LOAD BACKEND JIKA ADA DATA LAMA
  const handleLoginGDrive = () => {
    setErrorPesan('');
    setIsSyncing(true);

    try {
      if (typeof window === 'undefined' || !window.google) {
        throw new Error("SDK Google tidak termuat. Periksa koneksi internet Anda.");
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        ux_mode: 'popup',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setErrorPesan(`Akses ditolak: ${tokenResponse.error_description || tokenResponse.error}`);
            setIsSyncing(false);
            return;
          }

          const token = tokenResponse.access_token;
          localStorage.setItem('sakti_token_gdrive', token);
          setIsLoggedInGDrive(true);

          // Tarik data backup lama dari Google Drive
          await ambilDataDariDrive(token);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });

    } catch (err) {
      setErrorPesan(err.message || "Gagal mematangkan komponen OAuth Google.");
      setIsSyncing(false);
    }
  };

  // FUNGSI UTILITY: PULL DATABASE DARI GDRIVE USER
  const ambilDataDariDrive = async (token) => {
    try {
      setStatusSync('Memeriksa backup cloud...');
      const response = await fetch('/api/sync-drive', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const res = await response.json();
      if (res.success && res.data) {
        // Jika ada data di Drive, overwrite tabel lokal
        const dataCloud = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        setDaftarTransaksi(dataCloud);
        localStorage.setItem('sakti_riwayat_data', JSON.stringify(dataCloud));
        
        const statusSukses = '✨ Data Sinkron dengan Cloud';
        setStatusSync(statusSukses);
        localStorage.setItem('sakti_sync_status', statusSukses);
        alert("Sukses Terhubung! Data rekap akuntansi lama Anda di Google Drive berhasil dipulihkan.");
      } else {
        // Jika file di Drive belum ada
        const statusKosong = 'Terhubung (Backup Kosong)';
        setStatusSync(statusKosong);
        localStorage.setItem('sakti_sync_status', statusKosong);
        alert("Sukses Terhubung! Belum ada data backup di akun Drive ini. Menggunakan data tabel saat ini.");
      }
    } catch (err) {
      setErrorPesan("Gagal memulihkan database dari cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 🌟 FUNGSI CLOUD 2: MANUAL SINKRONISASI (SAVE MANUALLY)
  const handleSyncToGoogleDrive = async () => {
    const token = localStorage.getItem('sakti_token_gdrive');
    if (!token) {
      handleLoginGDrive();
      return;
    }

    if (daftarTransaksi.length === 0) {
      setErrorPesan("Tidak ada data tabel yang bisa dikirim!");
      return;
    }

    setErrorPesan('');
    setIsSyncing(true);

    try {
      const response = await fetch('/api/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dataTransaksi: JSON.stringify(daftarTransaksi),
          accessToken: token 
        }),
      });

      const resData = await response.json();
      
      if (resData.success) {
        const pesanSukses = `☁️ Disinkronkan (${resData.sync_time})`;
        setStatusSync(pesanSukses);
        localStorage.setItem('sakti_sync_status', pesanSukses);
        
        if(confirm(`Sukses terunggah ke Google Drive Anda!\nApakah Anda ingin membuka folder backup sekarang?`)) {
          window.open(resData.file_link, '_blank');
        }
      } else {
        setErrorPesan(resData.error || "Gagal melakukan enkripsi data cloud.");
      }
    } catch (err) {
      setErrorPesan("Server lokal backend terputus saat transmisi.");
    } finally {
      setIsSyncing(false);
    }
  };

  // FUNGSI CLOUD 3: BACKING UP SILENTLY (AUTO BACKGROUND RUNNER)
  const execSyncToDriveSilently = async () => {
    const token = localStorage.getItem('sakti_token_gdrive');
    if (!token || daftarTransaksi.length === 0) return;
    try {
      const response = await fetch('/api/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataTransaksi: JSON.stringify(daftarTransaksi), accessToken: token })
      });
      const resData = await response.json();
      if (resData.success) {
        const pesanAuto = `☁️ Auto Sync Aktif (${resData.sync_time})`;
        setStatusSync(pesanAuto);
        localStorage.setItem('sakti_sync_status', pesanAuto);
      }
    } catch (e) {
      console.error("Background auto sync terhambat jaringan.");
    }
  };

  // 🌟 FUNGSI CLOUD 4: LOGOUT (UNLINK AKUN / RESET TOTAL)
  const handleLogoutGDrive = () => {
    if (confirm("Apakah Anda yakin ingin memutuskan akun Google Drive? Seluruh data tabel lokal akan dikosongkan demi keamanan privasi.")) {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      localStorage.removeItem('sakti_token_gdrive');
      localStorage.removeItem('sakti_interval_sync');
      localStorage.removeItem('sakti_sync_status');
      
      setDaftarTransaksi([]);
      localStorage.setItem('sakti_riwayat_data', JSON.stringify([]));
      
      setIsLoggedInGDrive(false);
      setIntervalSync('manual');
      setStatusSync('Belum Terhubung Cloud');
      alert("Akun Drive berhasil dilepas. Sistem kembali steril.");
    }
  };

  // 1. FUNGSI START RECORDING MANUAL
  const handleMulaiRekam = async (e) => {
    e.preventDefault();
    setErrorPesan('');
    setInputText('');
    setAudioUrlPreview('');
    setAudioBase64('');
    audioChunksRef.current = [];

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setErrorPesan("Browser tidak mendukung Web Speech API. Gunakan Google Chrome.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrlPreview(url);

        const reader = new FileReader();
        reader.onloadend = () => { setAudioBase64(reader.result); };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'id-ID';
      recognitionRef.current.interimResults = true;
      recognitionRef.current.continuous = true;

      recognitionRef.current.onstart = () => { setIsRecording(true); };
      recognitionRef.current.onerror = (evt) => { if (evt.error !== 'no-speech') console.error(evt.error); };
      
      recognitionRef.current.onend = () => {
        if (isRecording) { try { recognitionRef.current.start(); } catch (err) {} }
      };

      recognitionRef.current.onresult = (event) => {
        const hasilSementara = Array.from(event.results).map(result => result[0].transcript).join('');
        setInputText(hasilSementara);
      };

      mediaRecorderRef.current.start();
      recognitionRef.current.start();

    } catch (err) {
      setErrorPesan("Gagal mengakses mikrofon.");
    }
  };

  const handleStopRekam = (e) => {
    e.preventDefault();
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUploadAudio = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErrorPesan('');
    setAudioUrlPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => { setAudioBase64(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleKirimData = async (e) => {
    e.preventDefault();
    if (audioBase64) {
      await kirimKeBackend('suara_file', audioBase64);
      setAudioUrlPreview('');
      setAudioBase64('');
    } else if (inputText.trim()) {
      await kirimKeBackend('teks', inputText);
    } else {
      setErrorPesan("Tidak ada data untuk diproses.");
    }
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
        const dataBaru = [resData.data, ...daftarTransaksi];
        simpanKeMemoriLokal(dataBaru);
        setInputText('');
      } else {
        setErrorPesan(resData.error || "Gagal memproses transaksi.");
      }
    } catch (err) {
      setErrorPesan("Gagal menghubungi server lokal backend.");
    } finally {
      setIsLoading(false); 
    }
  };

  const mulaiModeEdit = (tIdx, iIdx, item) => {
    setEditingItemKey(`${tIdx}-${iIdx}`);
    setEditBarang(item.barang);
    setEditQty(item.qty);
    setEditHarga(item.harga);
  };

  const simpanHasilEdit = (tIdx, iIdx) => {
    const q = parseInt(editQty) || 0;
    const h = parseInt(editHarga) || 0;
    const dataBaru = [...daftarTransaksi];
    
    dataBaru[tIdx].items[iIdx] = { barang: editBarang, qty: q, harga: h, jumlah: q * h };
    dataBaru[tIdx].grand_total = dataBaru[tIdx].items.reduce((acc, curr) => acc + curr.jumlah, 0);
    
    simpanKeMemoriLokal(dataBaru);
    setEditingItemKey(''); 
  };

  const mulaiEditGrup = (tIdx, transaksi) => {
    setEditingGroupIdx(tIdx);
    setEditTanggal(transaksi.tanggal);
    setEditJam(transaksi.jam);
    setEditJenis(transaksi.jenis);
  };

  const simpanEditGrup = (tIdx) => {
    const dataBaru = [...daftarTransaksi];
    dataBaru[tIdx].tanggal = editTanggal;
    dataBaru[tIdx].jam = editJam;
    dataBaru[tIdx].jenis = editJenis;

    simpanKeMemoriLokal(dataBaru);
    setEditingGroupIdx(null); 
  };

  const handleHapusSemuaData = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh isi tabel rekap?")) {
      simpanKeMemoriLokal([]);
      setStatusSync('Belum Sinkron');
      localStorage.setItem('sakti_sync_status', 'Belum Sinkron');
    }
  };

  const handleExportExcel = () => {
    if (daftarTransaksi.length === 0) return;
    const barisData = [["KATEGORI / WAKTU TRANSAKSI", "RINCIAN ITEM BARANG", "QUANTITY", "HARGA SATUAN", "TOTAL SUBTOTAL"]];
    daftarTransaksi.forEach((transaksi) => {
      barisData.push([`📅 ${transaksi.tanggal} (${transaksi.jam} WIB)`, `🔹 [${transaksi.jenis.toUpperCase()}]`, "", "", `GRAND TOTAL: Rp ${Number(transaksi.grand_total).toLocaleString('id-ID')}`]);
      transaksi.items.forEach((item) => {
        barisData.push(["↳ detail item", `📦 ${item.barang}`, Number(item.qty), Number(item.harga), Number(item.jumlah)]);
      });
    });
    const worksheet = XLSX.utils.aoa_to_sheet(barisData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap SAKTI");
    worksheet['!cols'] = barisData[0].map((_, colIdx) => ({ wch: 25 }));
    XLSX.writeFile(workbook, `Laporan_SAKTI_Cloud_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '40px auto', padding: '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '35px' }}>
        <h1 style={{ color: '#1E293B', margin: '0', fontSize: '32px', fontWeight: '800' }}>✨ SAKTI <span style={{ fontSize: '14px', backgroundColor: '#4F46E5', color: '#FFF', padding: '2px 8px', borderRadius: '20px' }}>PRO ENTERPRISE</span></h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Sistem Manajemen Akuntansi POS Universal — Android APK & Web Build Ready</p>
      </div>

      {/* 🌟 MANAGEMENT PANEL ATAS: GOOGLE DRIVE MANAGER */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '20px', borderRadius: '16px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', color: '#1E293B', fontWeight: '700', fontSize: '15px' }}>☁️ Cloud Synchronizer Storage</h4>
          <p style={{ margin: '0', fontSize: '12px', color: '#64748B' }}>Status Terkini: <strong style={{ color: statusSync.includes('✨') || statusSync.includes('☁️') ? '#10B981' : '#F59E0B' }}>{statusSync}</strong></p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isLoggedInGDrive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', color: '#334155', fontWeight: '600' }}>
              <label htmlFor="sync-select">⏰ Auto Sync:</label>
              <select id="sync-select" value={intervalSync} onChange={(e) => setIntervalSync(e.target.value)} style={{ padding: '4px', fontWeight: '700', border: '1px solid #CBD5E1', borderRadius: '4px' }}>
                <option value="manual">Manual Only</option>
                <option value="jam">Tiap 1 Jam</option>
                <option value="minggu">Tiap 1 Minggu</option>
              </select>
            </div>
          )}

          {!isLoggedInGDrive ? (
            <button onClick={handleLoginGDrive} disabled={isSyncing} style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
              {isSyncing ? '🔄 Menghubungkan...' : '🔗 Hubungkan Google Drive'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSyncToGoogleDrive} disabled={isSyncing} style={{ padding: '10px 18px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {isSyncing ? '🔄 Menyinkronkan...' : '🔄 Sync Sekarang'}
              </button>
              <button onClick={handleLogoutGDrive} style={{ padding: '10px 18px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                🚪 Unlink Akun
              </button>
            </div>
          )}
        </div>
      </div>

      {errorPesan && (
        <div style={{ backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', color: '#991B1B', padding: '14px', borderRadius: '6px', marginBottom: '25px', fontWeight: '500' }}>
          ⚠️ {errorPesan}
        </div>
      )}

      {/* CONTROL INTERFACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '40px' }}>
        <div style={{ border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px', backgroundColor: '#FFFFFF', opacity: isLoading ? 0.6 : 1 }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1E293B', fontSize: '14px', marginBottom: '14px' }}>🎙️ AUDIO WORKSTATION (KENDALI MANUAL TOTAL)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <button type="button" disabled={isLoading} onClick={isRecording ? handleStopRekam : handleMulaiRekam} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #6366F1', backgroundColor: isRecording ? '#EF4444' : '#EEF2FF', color: isRecording ? '#FFF' : '#4F46E5', fontWeight: '700', cursor: 'pointer' }}>
              {isRecording ? '🛑 Selesai & Kunci Suara' : '🎙️ Mulai Rekam Mic'}
            </button>
            <label htmlFor="upload-audio" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', border: '1px dashed #10B981', backgroundColor: '#F0FDF4', color: '#047857', fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: isLoading ? 0.5 : 1 }}>📁 Berkas Audio (.mp3)</label>
            <input id="upload-audio" type="file" accept="audio/*" onChange={handleUploadAudio} disabled={isLoading} style={{ display: 'none' }} />
          </div>
          {audioUrlPreview && <audio src={audioUrlPreview} controls style={{ width: '100%', marginBottom: '14px' }} />}
          <input type="text" placeholder="Hasil dikte muncul di sini..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', marginBottom: '14px', boxSizing: 'border-box' }} />
          
          <button type="button" onClick={handleKirimData} disabled={isLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: isLoading ? '#94A3B8' : '#1E293B', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Sedang memproses data...' : '⚡ Proses Masuk Tabel'}
          </button>
        </div>

        <div style={{ border: '1px solid #E2E8F0', padding: '24px', borderRadius: '16px', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: isLoading ? 0.6 : 1 }}>
          <label style={{ display: 'block', fontWeight: '700', color: '#1E293B', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>📷 SCAN NOTA BELANJA FISIK (VISION)</label>
          <label htmlFor="upload-nota" style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: '8px', backgroundColor: isLoading ? '#94A3B8' : '#10B981', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Sedang memproses data...' : '📂 Pilih / Foto Nota Belanja'}
          </label>
          <input id="upload-nota" type="file" accept="image/*" onChange={handleUploadFoto} disabled={isLoading} style={{ display: 'none' }} />
        </div>
      </div>

      {/* MAIN DATA TABLE WORKBENCH */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h3 style={{ color: '#1E293B', margin: '0', fontSize: '16px', fontWeight: '700' }}>📋 Rekapitulasi Rincian Barang Transaksi</h3>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Jumlah Baris Tabel Saat Ini: {daftarTransaksi.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {daftarTransaksi.length > 0 && (
              <button type="button" onClick={handleHapusSemuaData} disabled={isLoading} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #EF4444', backgroundColor: '#FFF', color: '#EF4444', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>🗑️ Kosongkan Tabel</button>
            )}
            <button type="button" onClick={handleExportExcel} disabled={isLoading} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>📊 Export .xlsx Excel</button>
          </div>
        </div>

        {/* DATA TABLE ROWS GRID */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155', fontSize: '12px', fontWeight: '800' }}>
                <th style={{ padding: '14px', width: '22%' }}>WAKTU / GRUP</th>
                <th style={{ padding: '14px', width: '28%' }}>NAMA ITEM / BARANG</th>
                <th style={{ padding: '14px', width: '10%', textAlign: 'center' }}>QTY</th>
                <th style={{ padding: '14px', width: '15%', textAlign: 'right' }}>HARGA SATUAN</th>
                <th style={{ padding: '14px', width: '13%', textAlign: 'right' }}>SUBTOTAL</th>
                <th style={{ padding: '14px', width: '12%', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {daftarTransaksi.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Belum ada data transaksi.</td></tr>
              ) : (
                daftarTransaksi.map((transaksi, tIdx) => {
                  const isGrupSedangEdit = editingGroupIdx === tIdx;
                  return [
                    <tr key={`grup-${tIdx}`} style={{ backgroundColor: '#E2E8F0', borderBottom: '1px solid #CBD5E1', fontWeight: '700', fontSize: '13px' }}>
                      <td style={{ padding: '10px 12px' }}>
                        {isGrupSedangEdit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)} style={{ padding: '4px', fontSize: '11px' }} />
                            <input type="text" value={editJam} placeholder="HH:MM" onChange={(e) => setEditJam(e.target.value)} style={{ padding: '4px', fontSize: '11px', width: '60px' }} />
                          </div>
                        ) : (<>📅 {transaksi.tanggal} <br/><span style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>({transaksi.jam} WIB)</span></>)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isGrupSedangEdit ? (
                          <select value={editJenis} onChange={(e) => setEditJenis(e.target.value)} style={{ padding: '4px', fontWeight: '700' }}>
                            <option value="Penjualan">PENJUALAN</option>
                            <option value="Pengeluaran">PENGELUARAN</option>
                          </select>
                        ) : (<><span style={{ backgroundColor: transaksi.jenis === 'Penjualan' ? '#10B981' : '#F59E0B', color: '#FFFFFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', marginRight: '10px' }}>{transaksi.jenis.toUpperCase()}</span><span style={{ color: '#334155' }}>{transaksi.items?.length || 0} Macam</span></>)}
                      </td>
                      <td></td><td></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1E1B4B', fontSize: '14px' }}>Total: Rp {Number(transaksi.grand_total).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {isGrupSedangEdit ? (
                          <button type="button" onClick={() => simpanEditGrup(tIdx)} style={{ padding: '4px 8px', backgroundColor: '#4F46E5', color: '#FFF', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>💾 Simpan</button>
                        ) : (
                          <button type="button" onClick={() => mulaiEditGrup(tIdx, transaksi)} disabled={isLoading} style={{ padding: '4px 6px', backgroundColor: '#FFF', color: '#1E293B', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>⚙️ Edit Grup</button>
                        )}
                      </td>
                    </tr>,
                    ...(transaksi.items || []).map((item, iIdx) => {
                      const isSedangEdit = editingItemKey === `${tIdx}-${iIdx}`;
                      return (
                        <tr key={`item-${tIdx}-${iIdx}`} style={{ borderBottom: '1px solid #E2E8F0', fontSize: '14px', backgroundColor: '#FFFFFF' }}>
                          <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>↳ detail item</td>
                          <td style={{ padding: '8px 14px' }}>{isSedangEdit ? <input type="text" value={editBarang} onChange={(e) => setEditBarang(e.target.value)} style={{ width: '100%' }} /> : <span>📦 {item.barang}</span>}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>{isSedangEdit ? <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} style={{ width: '50px', textAlign: 'center' }} /> : <span>{item.qty}</span>}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>{isSedangEdit ? <input type="number" value={editHarga} onChange={(e) => setEditHarga(e.target.value)} style={{ width: '80px', textAlign: 'right' }} /> : <span>Rp {Number(item.harga).toLocaleString('id-ID')}</span>}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            {isSedangEdit ? (
                              <button type="button" onClick={() => simpanHasilEdit(tIdx, iIdx)} style={{ padding: '4px 8px', backgroundColor: '#6366F1', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}>💾 Simpan</button>
                            ) : (
                              <button type="button" onClick={() => mulaiModeEdit(tIdx, iIdx, item)} disabled={isLoading} style={{ padding: '4px 8px', backgroundColor: '#F8FAFC', color: '#475569', fontSize: '12px', cursor: 'pointer' }}>✏️ Edit</button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}