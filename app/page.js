'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import LogoSakti from './components/LogoSakti'; // 🌟 IMPORT LOGO BARU DARI FOLDER COMPONENTS

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [daftarTransaksi, setDaftarTransaksi] = useState([]);
  const [errorPesan, setErrorPesan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 🌟 ENGINE DETEKTOR RESPONSIVE LIVE WINDOW WIDTH
  const [lebarLayar, setLebarLayar] = useState(typeof window !== 'undefined' ? window.innerWidth : 1150);
  const isMobile = lebarLayar <= 768;

  // 🌟 AMUNISI FALLBACK STATE: Token cadangan jika localStorage diblokir sistem WebView Android
  const [tokenCadangan, setTokenCadangan] = useState(null);

  useEffect(() => {
    const handleResize = () => setLebarLayar(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // MANAGEMENT STATE GOOGLE CLOUD & LOGIN (COMPATIBLE APK/WEB)
  const [isLoggedInGDrive, setIsLoggedInGDrive] = useState(false);
  const [statusSync, setStatusSync] = useState('Belum Terhubung Cloud');
  const [isSyncing, setIsSyncing] = useState(false);
  const [intervalSync, setIntervalSync] = useState('manual'); 

  // STATE ENGINE NIGHT MODE MODERN (Light, Dark, System)
  const [modeTema, setModeTema] = useState('system'); 
  const [isMurniGelap, setIsMurniGelap] = useState(false);

  // Instance Ref Kendali Mikrofon & Background Timer
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoSyncTimerRef = useRef(null);

  // 🌟 JEMBATAN AKUN (JAVASCRIPT BRIDGE) UNTUK LOGIN AUTOMATIS NATIVE PERANGKAT ANDROID
  useEffect(() => {
    window.terimaTokenDariAndroid = async (idToken) => {
      if (!idToken) {
        setErrorPesan("Gagal menerima kredensial login dari perangkat Android.");
        return;
      }
      setIsSyncing(true);
      setErrorPesan('');
      try {
        console.log("[SAKTI Bridge] Token Akun Native Android Berhasil Dikunci!");
        try {
          localStorage.setItem('sakti_token_gdrive', idToken);
        } catch (e) {
          console.warn("localStorage.setItem diblokir sistem WebView, beralih penuh ke In-Memory State Cadangan.");
        }
        
        setTokenCadangan(idToken);
        setIsLoggedInGDrive(true);
        await ambilDataDariDrive(idToken);
      } catch (err) {
        console.error("Error pemrosesan token jembatan Android:", err);
        setErrorPesan("Jembatan otentikasi perangkat gagal merespon.");
      } finally {
        setIsSyncing(false);
      }
    };

    return () => {
      if (typeof window !== 'undefined') {
        delete window.terimaTokenDariAndroid;
      }
    };
  }, [daftarTransaksi]);

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

    const tokenLokal = localStorage.getItem('sakti_token_gdrive');
    const savedInterval = localStorage.getItem('sakti_interval_sync') || 'manual';
    const savedStatus = localStorage.getItem('sakti_sync_status') || 'Belum Terhubung Cloud';
    const savedTema = localStorage.getItem('sakti_mode_tema') || 'system';
    
    if (tokenLokal) {
      setIsLoggedInGDrive(true);
      setTokenCadangan(tokenLokal);
      setStatusSync(savedStatus);
    }
    setIntervalSync(savedInterval);
    setModeTema(savedTema);
  }, []);

  // ENGINE DETEKTOR GENERASI MODE TEMA SISTEM AKTUAL
  useEffect(() => {
    localStorage.setItem('sakti_mode_tema', modeTema);
    
    if (modeTema === 'system') {
      const mediaSistem = window.matchMedia('(prefers-color-scheme: dark)');
      setIsMurniGelap(mediaSistem.matches);
      
      const listenerSistem = (e) => setIsMurniGelap(e.matches);
      mediaSistem.addEventListener('change', listenerSistem);
      return () => mediaSistem.removeEventListener('change', listenerSistem);
    } else {
      setIsMurniGelap(modeTema === 'dark');
    }
  }, [modeTema]);

  // RUNNER DETEKTOR AUTO-SYNC BACKGROUND (TIAP JAM / MINGGU)
  useEffect(() => {
    if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
    if (!isLoggedInGDrive || intervalSync === 'manual') return;

    let waktuInterval = 3600000; 
    if (intervalSync === 'minggu') {
      waktuInterval = 3600000 * 24 * 7; 
    }

    autoSyncTimerRef.current = setInterval(() => {
      console.log("[SAKTI Cloud] Memicu sinkronisasi terjadwal otomatis...");
      execSyncToDriveSilently();
    }, waktuInterval);

    localStorage.setItem('sakti_interval_sync', intervalSync);
    return () => clearInterval(autoSyncTimerRef.current);
  }, [intervalSync, isLoggedInGDrive, daftarTransaksi, tokenCadangan]);

  // PALET WARNA DYNAMIC VARIABLE
  const theme = {
    bgApp: isMurniGelap ? '#0F172A' : '#FAFAFA',
    bgCard: isMurniGelap ? '#1E293B' : '#FFFFFF',
    bgGrupRow: isMurniGelap ? '#334155' : '#E2E8F0',
    bgItemRow: isMurniGelap ? '#1E293B' : '#FFFFFF',
    textUtama: isMurniGelap ? '#F8FAFC' : '#1E293B',
    textMuted: isMurniGelap ? '#94A3B8' : '#64748B',
    border: isMurniGelap ? '#334155' : '#E2E8F0',
    inputBg: isMurniGelap ? '#0F172A' : '#FFFFFF',
    inputText: isMurniGelap ? '#FFFFFF' : '#1E293B', 
    thBg: isMurniGelap ? '#1E293B' : '#F1F5F9',
    thText: isMurniGelap ? '#CBD5E1' : '#334155',
  };

  // ENGINE ANALISIS DATA DASBOR UMKM (REAL-TIME COMPUTATION)
  const hitungMetrikUMKM = () => {
    let omzet = 0;
    let pengeluaran = 0;
    let pemasukanLain = 0;
    const petaProduk = {};

    daftarTransaksi.forEach((t) => {
      const totalGrup = Number(t.grand_total) || 0;
      if (t.jenis === 'Penjualan') {
        omzet += totalGrup;
        if (t.items) {
          t.items.forEach((item) => {
            if (item.barang) {
              petaProduk[item.barang] = (petaProduk[item.barang] || 0) + (Number(item.qty) || 0);
            }
          });
        }
      } else if (t.jenis === 'Pengeluaran') {
        pengeluaran += totalGrup;
      } else if (t.jenis === 'Pemasukan') {
        pemasukanLain += totalGrup;
      }
    });

    const produkTerlaris = Object.keys(petaProduk)
      .map((nama) => ({ nama, qty: petaProduk[nama] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    const untungBersih = (omzet + pemasukanLain) - pengeluaran;
    const totalTransaksiCount = omzet + pengeluaran + pemasukanLain;

    const persenJual = totalTransaksiCount > 0 ? Math.round((omzet / totalTransaksiCount) * 100) : 0;
    const persenKeluar = totalTransaksiCount > 0 ? Math.round((pengeluaran / totalTransaksiCount) * 100) : 0;
    const persenMasuk = totalTransaksiCount > 0 ? Math.round((pemasukanLain / totalTransaksiCount) * 100) : 0;

    return { omzet, pengeluaran, pemasukanLain, untungBersih, produkTerlaris, persenJual, persenKeluar, persenMasuk, totalTransaksiCount };
  };

  const metrik = hitungMetrikUMKM();

  const simpanKeMemoriLokal = (dataTerbaru) => {
    setDaftarTransaksi(dataTerbaru);
    try {
      localStorage.setItem('sakti_riwayat_data', JSON.stringify(dataTerbaru));
    } catch (e) {}
    if (isLoggedInGDrive) {
      setStatusSync('Perubahan Belum Disinkronkan');
      try {
        localStorage.setItem('sakti_sync_status', 'Perubahan Belum Disinkronkan');
      } catch (e) {}
    }
  };

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
          try {
            localStorage.setItem('sakti_token_gdrive', token);
          } catch (e) {}
          setTokenCadangan(token);
          setIsLoggedInGDrive(true);
          await ambilDataDariDrive(token);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setErrorPesan(err.message || "Gagal mematangkan komponen OAuth Google.");
      setIsSyncing(false);
    }
  };

  // 🌟 MULTI-TOKEN RESOLVER SINKRONISASI
  const ambilDataDariDrive = async (tokenAktif) => {
    const token = tokenAktif || tokenCadangan || localStorage.getItem('sakti_token_gdrive');
    if (!token) return;
    try {
      setStatusSync('Memeriksa backup cloud...');
      const response = await fetch('/api/sync-drive', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const res = await response.json();
      if (res.success && res.data) {
        const dataCloud = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        setDaftarTransaksi(dataCloud);
        try {
          localStorage.setItem('sakti_riwayat_data', JSON.stringify(dataCloud));
          localStorage.setItem('sakti_sync_status', '✨ Data Sinkron dengan Cloud');
        } catch (e) {}
        setStatusSync('✨ Data Sinkron dengan Cloud');
        alert("Sukses Terhubung! Data rekap akuntansi lama Anda di Google Drive berhasil dipulihkan.");
      } else {
        setStatusSync('Terhubung (Backup Kosong)');
        try {
          localStorage.setItem('sakti_sync_status', 'Terhubung (Backup Kosong)');
        } catch (e) {}
        alert("Sukses Terhubung! Belum ada data backup di akun Drive ini. Menggunakan data tabel saat ini.");
      }
    } catch (err) {
      setErrorPesan("Gagal memulihkan database dari cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncToGoogleDrive = async () => {
    const token = tokenCadangan || localStorage.getItem('sakti_token_gdrive');
    if (!token) { handleLoginGDrive(); return; }
    if (daftarTransaksi.length === 0) { setErrorPesan("Tidak ada data tabel yang bisa dikirim!"); return; }
    setErrorPesan('');
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataTransaksi: JSON.stringify(daftarTransaksi), accessToken: token }),
      });
      const resData = await response.json();
      if (resData.success) {
        const pesanSukses = `☁️ Disinkronkan (${resData.sync_time})`;
        setStatusSync(pesanSukses);
        try {
          localStorage.setItem('sakti_sync_status', pesanSukses);
        } catch (e) {}
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

  const execSyncToDriveSilently = async () => {
    const token = tokenCadangan || localStorage.getItem('sakti_token_gdrive');
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
        try {
          localStorage.setItem('sakti_sync_status', pesanAuto);
        } catch (e) {}
      }
    } catch (e) {
      console.error("Background auto sync terhambat jaringan.");
    }
  };

  const handleLogoutGDrive = () => {
    if (confirm("Apakah Anda yakin ingin memutuskan akun Google Drive? Seluruh data tabel lokal akan dikosongkan demi keamanan privasi.")) {
      if (autoSyncTimerRef.current) clearInterval(autoSyncTimerRef.current);
      try {
        localStorage.removeItem('sakti_token_gdrive');
        localStorage.removeItem('sakti_interval_sync');
        localStorage.removeItem('sakti_sync_status');
        localStorage.setItem('sakti_riwayat_data', JSON.stringify([]));
      } catch (e) {}
      setDaftarTransaksi([]);
      setTokenCadangan(null);
      setIsLoggedInGDrive(false);
      setIntervalSync('manual');
      setStatusSync('Belum Terhubung Cloud');
      alert("Akun Drive berhasil dilepas. Sistem kembali steril.");
    }
  };

  const handleMulaiRekam = async (e) => {
    e.preventDefault();
    setErrorPesan(''); setInputText(''); setAudioUrlPreview(''); setAudioBase64('');
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
        setInputText(Array.from(event.results).map(result => result[0].transcript).join(''));
      };
      mediaRecorderRef.current.start();
      recognitionRef.current.start();
    } catch (err) {
      setErrorPesan("Gagal mengakses mikrofon.");
    }
  };

  const handleStopRekam = (e) => {
    e.preventDefault(); setIsRecording(false);
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
  };

  const handleUploadAudio = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setErrorPesan(''); setAudioUrlPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => { setAudioBase64(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleKirimData = async (e) => {
    e.preventDefault();
    if (audioBase64) {
      await kirimKeBackend('suara_file', audioBase64);
      setAudioUrlPreview(''); setAudioBase64('');
    } else if (inputText.trim()) {
      await kirimKeBackend('teks', inputText);
    } else {
      setErrorPesan("Tidak ada data untuk diproses.");
    }
  };

  const handleUploadFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorPesan('');
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const MAX_WIDTH = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        console.log("[SAKTI Optimizer] Foto berhasil dikompresi untuk kestabilan Vercel.");
        kirimKeBackend('foto', compressedBase64);
      };
    };
    
    reader.readAsDataURL(file);
  };

  const kirimKeBackend = async (tipe, data) => {
    try {
      setErrorPesan(''); setIsLoading(true); 
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
    setEditBarang(item.barang); setEditQty(item.qty); setEditHarga(item.harga);
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
    setEditTanggal(transaksi.tanggal); setEditJam(transaksi.jam); setEditJenis(transaksi.jenis);
  };

  const simpanEditGrup = (tIdx) => {
    const dataBaru = [...daftarTransaksi];
    dataBaru[tIdx].tanggal = editTanggal; dataBaru[tIdx].jam = editJam; dataBaru[tIdx].jenis = editJenis;
    simpanKeMemoriLokal(dataBaru);
    setEditingGroupIdx(null); 
  };

  const handleHapusGrup = (tIdx) => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh grup transaksi ini beserta item di dalamnya?")) {
      const dataBaru = daftarTransaksi.filter((_, idx) => idx !== tIdx);
      simpanKeMemoriLokal(dataBaru);
    }
  };

  const handleHapusItem = (tIdx, iIdx) => {
    if (confirm("Hapus item barang ini dari detail rekapitulasi transaksi?")) {
      const dataBaru = [...daftarTransaksi];
      dataBaru[tIdx].items = dataBaru[tIdx].items.filter((_, idx) => idx !== iIdx);
      
      if (dataBaru[tIdx].items.length === 0) {
        dataBaru.splice(tIdx, 1);
      } else {
        dataBaru[tIdx].grand_total = dataBaru[tIdx].items.reduce((acc, curr) => acc + curr.jumlah, 0);
      }
      simpanKeMemoriLokal(dataBaru);
    }
  };

  const handleHapusSemuaData = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh isi tabel rekap?")) {
      simpanKeMemoriLokal([]);
      setStatusSync('Belum Sinkron');
      try {
        localStorage.setItem('sakti_sync_status', 'Belum Sinkron');
      } catch (e) {}
    }
  };

  const handleExportExcel = async () => {
    if (daftarTransaksi.length === 0) return;

    try {
      const ExcelJS = require('exceljs');
      const saveAs = require('file-saver');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekap SAKTI UMKM');

      const barisData = [];
      barisData.push(["LAPORAN KEUANGAN KASIR UMKM — SAKTI PRO ENTERPRISE"]);
      barisData.push([`Tanggal Cetak Dokumen: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`]);
      barisData.push([]); 

      barisData.push(["📊 RINGKASAN KINERJA TOKO (DASBOR UTAMA)"]);
      barisData.push(["Metrik Keuangan", "Nilai Nominal", "Status Evaluasi Bisnis"]);
      barisData.push(["💰 Total Omzet Penjualan", metrik.omzet, "Pendapatan Kotor Toko"]);
      barisData.push(["💸 Total Biaya / Pengeluaran", metrik.pengeluaran, "Biaya Operasional & Kulakan"]);
      barisData.push(["💎 Total Pemasukan Tambahan", metrik.pemasukanLain, "Suntikan Modal / Investasi Non-Jualan"]); 
      barisData.push([
        "📈 Profit Bersih Toko", 
        metrik.untungBersih, 
        metrik.untungBersih >= 0 ? "🟢 SURPLUS (UNTUNG)" : "🔴 DEFISIT (RUGI LABA)"
      ]);
      barisData.push([]); 

      barisData.push(["📦 DAFTAR PRODUK PALING LARIS (TOP Fast-Moving)"]);
      barisData.push(["Peringkat", "Nama Barang/Produk", "Total Volume Terjual"]);
      if (metrik.produkTerlaris.length === 0) {
        barisData.push(["-", "Belum ada produk terjual", "0 Pcs"]);
      } else {
        metrik.produkTerlaris.forEach((p, idx) => {
          barisData.push([`Top ${idx + 1}`, p.nama, `${p.qty} Pcs`]);
        });
      }
      barisData.push([]); 
      barisData.push(["------------------------------------------------------------"]); 
      barisData.push([]); 

      barisData.push(["📋 JURNAL RINCIAN DETAIL HISTORI TRANSAKSI TOKO"]);
      barisData.push(["KATEGORI / WAKTU TRANSAKSI", "RINCIAN ITEM BARANG", "QUANTITY (QTY)", "HARGA SATUAN (Rp)", "TOTAL SUBTOTAL (Rp)"]);

      daftarTransaksi.forEach((transaksi) => {
        barisData.push([
          `📅 ${transaksi.tanggal} (${transaksi.jam} WIB)`, 
          `🔹 [${transaksi.jenis.toUpperCase()}]`, 
          "", 
          "", 
          `GRAND TOTAL: Rp ${Number(transaksi.grand_total).toLocaleString('id-ID')}`
        ]);
        
        if (transaksi.items) {
          transaksi.items.forEach((item) => {
            barisData.push([
              "↳ detail item", 
              `📦 ${item.barang}`, 
              Number(item.qty), 
              Number(item.harga), 
              Number(item.jumlah)
            ]);
          });
        }
      });

      worksheet.addRows(barisData);

      worksheet.columns = [
        { width: 32 }, { width: 30 }, { width: 18 }, { width: 20 }, { width: 25 }, { width: 24 }, { width: 35 }
      ];

      ['B6', 'B7', 'B8', 'B9'].forEach(cellRef => {
        const cell = worksheet.getCell(cellRef);
        if (cell.value !== undefined) {
          cell.numFormat = '#,##0';
        }
      });

      worksheet.getCell('F4').value = "📊 VISUALISASI CASHFLOW RATIO (DINAMIS TIGA SEGMEN)";
      worksheet.getCell('F4').font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };

      worksheet.getCell('F6').value = "🟢 Penjualan (Omzet) :";
      worksheet.getCell('F6').font = { fontWeight: '600' };
      worksheet.getCell('G6').value = { 
        formula: '=IF((B6+B7+B8)>0, REPT("█", ROUND((B6/(B6+B7+B8))*25, 0)) & " " & TEXT(B6/(B6+B7+B8), "0%"), "0%")' 
      };
      worksheet.getCell('G6').font = { color: { argb: 'FF10B981' }, bold: true };

      worksheet.getCell('F7').value = "🔴 Pengeluaran (Biaya) :";
      worksheet.getCell('F7').font = { fontWeight: '600' };
      worksheet.getCell('G7').value = { 
        formula: '=IF((B6+B7+B8)>0, REPT("█", ROUND((B7/(B6+B7+B8))*25, 0)) & " " & TEXT(B7/(B6+B7+B8), "0%"), "0%")' 
      };
      worksheet.getCell('G7').font = { color: { argb: 'FFEF4444' }, bold: true };

      worksheet.getCell('F8').value = "🔵 Pemasukan (Suntikan Modal) :";
      worksheet.getCell('F8').font = { fontWeight: '600' };
      worksheet.getCell('G8').value = { 
        formula: '=IF((B6+B7+B8)>0, REPT("█", ROUND((B8/(B6+B7+B8))*25, 0)) & " " & TEXT(B8/(B6+B7+B8), "0%"), "0%")' 
      };
      worksheet.getCell('G8').font = { color: { argb: 'FF3F51B5' }, bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const fileDate = new Date().toISOString().split('T')[0];
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Laporan_SAKTI_UMKM_Komprehensif_${fileDate}.xlsx`);

    } catch (error) {
      console.error("Gagal melakukan ekspor data:", error);
      alert("Terjadi kesalahan teknis saat memproses laporan Excel.");
    }
  };

  // 🌟 PERBAIKAN PRERENDER: Hitung variabel derajat secara lokal dan pastikan safety value di luar template literal global
  const dJual = metrik.totalTransaksiCount > 0 ? (metrik.omzet / metrik.totalTransaksiCount) * 360 : 120;
  const dKeluar = metrik.totalTransaksiCount > 0 ? (metrik.pengeluaran / metrik.totalTransaksiCount) * 360 : 120;

  return (
    <div style={{ maxWidth: '1150px', margin: isMobile ? '10px auto' : '40px auto', padding: isMobile ? '12px' : '24px', fontFamily: 'system-ui, sans-serif', backgroundColor: theme.bgApp, minHeight: '100vh', transition: 'background-color 0.3s ease' }}>
      
      {/* HEADER LOGO COMPONENT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexDirection: isMobile ? 'column' : 'row', gap: '15px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '2px', marginLeft: isMobile ? '0px' : '-15px' }}>
            <LogoSakti id="LogoUtamaSakti" isDark={isMurniGelap} />
          </div>
          <p style={{ color: theme.textMuted, marginTop: '-5px', marginLeft: isMobile ? '0px' : '15px', margin: '0', fontSize: '13px', fontWeight: '700', letterSpacing: '0.3px', fontStyle: 'italic' }}>
            "Dikte Transaksinya, Amankan Keuangannya, Kuasai Pasarnya."
          </p>
        </div>

        {/* CONTROLLER SWITCH TEMA */}
        <div style={{ display: 'flex', backgroundColor: theme.thBg, padding: '4px', borderRadius: '10px', border: `1px solid ${theme.border}`, width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
          {['light', 'dark', 'system'].map((t) => (
            <button key={t} onClick={() => setModeTema(t)} style={{ flex: isMobile ? 1 : 'none', padding: '6px 12px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textTransform: 'capitalize', backgroundColor: modeTema === t ? '#4F46E5' : 'transparent', color: modeTema === t ? '#FFFFFF' : theme.textMuted, transition: 'all 0.2s ease' }}>
              {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}
            </button>
          ))}
        </div>
      </div>


      {/* PANEL KARTU METRIK UTAMA TOKO (RESPONSIVE GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobile ? '10px' : '20px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: isMurniGelap ? '#065F46' : '#E6F4EA', padding: isMobile ? '12px' : '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, gridColumn: isMobile ? '1 / span 2' : 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: isMurniGelap ? '#A7F3D0' : '#137333', textTransform: 'uppercase' }}>💰 Total Omzet Penjualan</span>
          <h2 style={{ margin: '4px 0 0 0', color: isMurniGelap ? '#FFFFFF' : '#137333', fontSize: isMobile ? '20px' : '22px', fontWeight: '800' }}>Rp {metrik.omzet.toLocaleString('id-ID')}</h2>
        </div>
        <div style={{ backgroundColor: isMurniGelap ? '#991B1B' : '#FCE8E6', padding: isMobile ? '12px' : '20px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: isMurniGelap ? '#FCA5A5' : '#C5221F', textTransform: 'uppercase' }}>💸 Biaya / Keluar</span>
          <h2 style={{ margin: '4px 0 0 0', color: isMurniGelap ? '#FFFFFF' : '#C5221F', fontSize: isMobile ? '16px' : '22px', fontWeight: '800' }}>Rp {metrik.pengeluaran.toLocaleString('id-ID')}</h2>
        </div>
        <div style={{ backgroundColor: isMurniGelap ? '#1E3A8A' : '#E0E7FF', padding: isMobile ? '12px' : '20px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: isMurniGelap ? '#93C5FD' : '#3730A3', textTransform: 'uppercase' }}>💎 Pemasukan Lain</span>
          <h2 style={{ margin: '4px 0 0 0', color: isMurniGelap ? '#FFFFFF' : '#3730A3', fontSize: isMobile ? '16px' : '22px', fontWeight: '800' }}>Rp {metrik.pemasukanLain.toLocaleString('id-ID')}</h2>
        </div>
        <div style={{ backgroundColor: metrik.untungBersih >= 0 ? (isMurniGelap ? '#312E81' : '#F3F4F6') : (isMurniGelap ? '#7F1D1D' : '#FFF0F0'), padding: isMobile ? '12px' : '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, gridColumn: isMobile ? '1 / span 2' : 'auto' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: metrik.untungBersih >= 0 ? '#4F46E5' : '#D93025', textTransform: 'uppercase' }}>📈 Profit Bersih Toko</span>
          <h2 style={{ margin: '4px 0 0 0', color: theme.textUtama, fontSize: isMobile ? '20px' : '22px', fontWeight: '800' }}>Rp {metrik.untungBersih.toLocaleString('id-ID')}</h2>
        </div>
      </div>

      {/* VISUALISASI GRAFIK TOKO UMKM */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}` }}>
          <h4 style={{ margin: '0 0 16px 0', color: theme.textUtama, fontWeight: '700', fontSize: '14px' }}>📦 TOP 3 PRODUK TERLARIS (STOK FAST-MOVING)</h4>
          {metrik.produkTerlaris.length === 0 ? (
            <p style={{ fontSize: '13px', color: theme.textMuted, fontStyle: 'italic' }}>Belum ada data barang terjual.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {metrik.produkTerlaris.map((p, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme.textUtama, fontWeight: '600' }}>
                    <span>{idx + 1}. {p.nama}</span>
                    <span>{p.qty} Pcs</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: isMurniGelap ? '#334155' : '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min((p.qty / metrik.produkTerlaris[0].qty) * 100, 100)}%`, height: '100%', backgroundColor: '#4F46E5', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderRadius: '16px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ margin: '0 0 12px 0', color: theme.textUtama, fontWeight: '700', fontSize: '14px' }}>📊 PROPORSI KEUANGAN (CASHFLOW RATIO TIGA SEGMEN)</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
            {/* 🌟 FIX REFERENCE ERROR: Inline Injection String Conic Gradient yang aman dari Prerender Crash */}
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: `conic-gradient(#10B981 0deg ${dJual}deg, #EF4444 ${dJual}deg ${dJual + dKeluar}deg, #3F51B5 ${dJual + dKeluar}deg 360deg)`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              boxShadow: 'inset 0 0 0 20px ' + theme.bgCard, 
              flexShrink: 0 
            }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: theme.textUtama }}>
                {metrik.totalTransaksiCount > 0 ? 'Kasir' : '0%'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: theme.textUtama, display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isMobile ? 'center' : 'flex-start' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#10B981', borderRadius: '3px' }}></div>Omzet Dagang ({metrik.persenJual}%)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isMobile ? 'center' : 'flex-start' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#EF4444', borderRadius: '3px' }}></div>Operasional / Keluar ({metrik.persenKeluar}%)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isMobile ? 'center' : 'flex-start' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#3F51B5', borderRadius: '3px' }}></div>Suntikan Modal / Masuk ({metrik.persenMasuk}%)</div>
            </div>
          </div>
        </div>
      </div>

      {/* CLOUD MANAGER */}
      <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, padding: '16px', borderRadius: '16px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', gap: '15px', textAlign: isMobile ? 'center' : 'left' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', color: theme.textUtama, fontWeight: '700', fontSize: '15px' }}>☁️ Cloud Synchronizer Storage</h4>
          <p style={{ margin: '0', fontSize: '12px', color: theme.textMuted }}>Status: <strong style={{ color: statusSync.includes('✨') || statusSync.includes('☁️') ? '#10B981' : '#F59E0B' }}>{statusSync}</strong></p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          {isLoggedInGDrive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: isMurniGelap ? '#0F172A' : '#F1F5F9', padding: '6px 12px', borderRadius: '8px', color: theme.textUtama, fontWeight: '600', border: `1px solid ${theme.border}`, width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
              <label htmlFor="sync-select">⏰ Auto Sync:</label>
              <select id="sync-select" value={intervalSync} onChange={(e) => setIntervalSync(e.target.value)} style={{ padding: '4px', fontWeight: '700', border: `1px solid ${theme.border}`, borderRadius: '4px', backgroundColor: theme.bgCard, color: theme.textUtama }}>
                <option value="manual">Manual Only</option>
                <option value="jam">Tiap 1 Jam</option>
                <option value="minggu">Tiap 1 Minggu</option>
              </select>
            </div>
          )}

          {!isLoggedInGDrive ? (
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && window.AndroidJSInterface) {
                  window.AndroidJSInterface.pemicuLoginNativeGoogle();
                } else {
                  handleLoginGDrive();
                }
              }} 
              disabled={isSyncing} 
              style={{ width: isMobile ? '100%' : 'auto', padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              {isSyncing ? '🔄 Menghubungkan...' : '🔗 Hubungkan Google Drive'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={handleSyncToGoogleDrive} disabled={isSyncing} style={{ flex: 1, padding: '10px 18px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                {isSyncing ? '🔄 Menyinkronkan...' : '🔄 Sync Sekarang'}
              </button>
              <button onClick={handleLogoutGDrive} style={{ flex: 1, padding: '10px 18px', backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: '24px', marginBottom: '40px' }}>
        <div style={{ border: `1px solid ${theme.border}`, padding: isMobile ? '16px' : '24px', borderRadius: '16px', backgroundColor: theme.bgCard, opacity: isLoading ? 0.6 : 1 }}>
          <label style={{ display: 'block', fontWeight: '700', color: theme.textUtama, fontSize: '13px', marginBottom: '14px' }}>🎙️ AUDIO WORKSTATION (KENDALI MANUAL TOTAL)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <button type="button" disabled={isLoading} onClick={isRecording ? handleStopRekam : handleMulaiRekam} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #6366F1', backgroundColor: isRecording ? '#EF4444' : (isMurniGelap ? '#312E81' : '#EEF2FF'), color: isRecording ? '#FFF' : '#6366F1', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
              {isRecording ? '🛑 Kunci Suara' : '🎙️ Rekam Mic'}
            </button>
            <label htmlFor="upload-audio" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', border: '1px dashed #10B981', backgroundColor: isMurniGelap ? '#064E3B' : '#F0FDF4', color: isMurniGelap ? '#A7F3D0' : '#047857', fontWeight: '700', cursor: 'pointer', fontSize: '13px', opacity: isLoading ? 0.5 : 1 }}>📁 Berkas Audio</label>
            <input id="upload-audio" type="file" accept="audio/*" onChange={handleUploadAudio} disabled={isLoading} style={{ display: 'none' }} />
          </div>
          {audioUrlPreview && <audio src={audioUrlPreview} controls style={{ width: '100%', marginBottom: '14px' }} />}
          <input type="text" placeholder="Hasil dikte muncul di sini..." value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '14px', boxSizing: 'border-box', backgroundColor: theme.inputBg, color: theme.textUtama }} />
          
          <button type="button" onClick={handleKirimData} disabled={isLoading} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: isLoading ? '#94A3B8' : (isMurniGelap ? '#4F46E5' : '#1E293B'), color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Sedang memproses...' : '⚡ Proses Masuk Tabel'}
          </button>
        </div>

        <div style={{ border: `1px solid ${theme.border}`, padding: isMobile ? '24px 16px' : '24px', borderRadius: '16px', backgroundColor: theme.bgCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: isLoading ? 0.6 : 1 }}>
          <label style={{ display: 'block', fontWeight: '700', color: theme.textUtama, fontSize: '13px', textAlign: 'center', marginBottom: '16px' }}>📷 SCAN NOTA BELANJA FISIK (VISION)</label>
          <label htmlFor="upload-nota" style={{ display: 'block', textAlign: 'center', padding: '16px', borderRadius: '8px', backgroundColor: isLoading ? '#94A3B8' : '#10B981', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
            {isLoading ? '⏳ Sedang memproses...' : '📂 Pilih / Foto Nota Belanja'}
          </label>
          <input 
            id="upload-nota" 
            type="file" 
            accept="image/*" 
            capture={isMobile ? "environment" : undefined}
            onChange={handleUploadFoto} 
            disabled={isLoading} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>

      {/* MAIN DATA TABLE WORKBENCH */}
      <div style={{ backgroundColor: theme.bgCard, borderRadius: '16px', border: `1px solid ${theme.border}`, padding: isMobile ? '14px' : '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px', flexDirection: isMobile ? 'column' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: isMobile ? '100%' : 'auto' }}>
            <h3 style={{ color: theme.textUtama, margin: '0', fontSize: '16px', fontWeight: '700' }}>📋 Rekapitulasi Rincian Barang Transaksi</h3>
            <span style={{ fontSize: '12px', color: theme.textMuted }}>Jumlah Baris Tabel Saat Ini: {daftarTransaksi.length}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
            {daftarTransaksi.length > 0 && (
              <button type="button" onClick={handleHapusSemuaData} disabled={isLoading} style={{ flex: 1, padding: '10px 18px', borderRadius: '8px', border: '1px solid #EF4444', backgroundColor: 'transparent', color: '#EF4444', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>🗑️ Kosongkan</button>
            )}
            <button type="button" onClick={handleExportExcel} disabled={isLoading} style={{ flex: 1, padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#FFFFFF', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>📊 Export Excel</button>
          </div>
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            {daftarTransaksi.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted, fontSize: '13px' }}>Belum ada data transaksi.</div>
            ) : (
              daftarTransaksi.map((transaksi, tIdx) => {
                const isGrupSedangEdit = editingGroupIdx === tIdx;
                return (
                  <div key={`card-grup-${tIdx}`} style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ backgroundColor: theme.bgGrupRow, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        {isGrupSedangEdit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <input type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)} style={{ padding: '4px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }} />
                            <input type="text" value={editJam} placeholder="HH:MM" onChange={(e) => setEditJam(e.target.value)} style={{ padding: '4px', fontSize: '12px', width: '60px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: '700', color: theme.textUtama }}>📅 {transaksi.tanggal} ({transaksi.jam})</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isGrupSedangEdit ? (
                          <select value={editJenis} onChange={(e) => setEditJenis(e.target.value)} style={{ padding: '4px', fontWeight: '700', borderRadius: '4px', fontSize: '12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }}>
                            <option value="Penjualan">PENJUALAN</option>
                            <option value="Pengeluaran">PENGELUARAN</option>
                            <option value="Pemasukan">PEMASUKAN</option>
                          </select>
                        ) : (
                          <span style={{ backgroundColor: transaksi.jenis === 'Penjualan' ? '#10B981' : transaksi.jenis === 'Pemasukan' ? '#3F51B5' : '#F59E0B', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{transaksi.jenis?.toUpperCase()}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(transaksi.items || []).map((item, iIdx) => {
                        const isSedangEdit = editingItemKey === `${tIdx}-${iIdx}`;
                        return (
                          <div key={`card-item-${tIdx}-${iIdx}`} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '8px', borderBottom: `1px dashed ${theme.border}`, fontSize: '13px', color: theme.textUtama }}>
                            {isSedangEdit ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: theme.bgApp, padding: '8px', borderRadius: '6px' }}>
                                <input type="text" value={editBarang} onChange={(e) => setEditBarang(e.target.value)} style={{ padding: '6px', borderRadius: '4px', fontSize: '12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }} />
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <input type="number" placeholder="Qty" value={editQty} onChange={(e) => setEditQty(e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '4px', fontSize: '12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }} />
                                  <input type="number" placeholder="Harga" value={editHarga} onChange={(e) => setEditHarga(e.target.value)} style={{ flex: 1, padding: '6px', borderRadius: '4px', fontSize: '12px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }} />
                                </div>
                                <button type="button" onClick={() => simpanHasilEdit(tIdx, iIdx)} style={{ padding: '6px', backgroundColor: '#6366F1', color: '#FFF', fontSize: '11px', borderRadius: '4px', border: 'none' }}>💾 Simpan Barang</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, paddingRight: '8px' }}>
                                  <div style={{ fontWeight: '600' }}>📦 {item.barang}</div>
                                  <div style={{ fontSize: '11px', color: theme.textMuted }}>{item.qty} Pcs x Rp{Number(item.harga).toLocaleString('id-ID')}</div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontWeight: '700' }}>Rp{Number(item.jumlah).toLocaleString('id-ID')}</span>
                                  <button type="button" onClick={() => mulaiModeEdit(tIdx, iIdx, item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="Edit">✏️</button>
                                  <button type="button" onClick={() => handleHapusItem(tIdx, iIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="Hapus">🗑️</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ padding: '10px 12px', backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: theme.textUtama }}>Total: Rp{Number(transaksi.grand_total).toLocaleString('id-ID')}</span>
                      <div>
                        {isGrupSedangEdit ? (
                          <button type="button" onClick={() => simpanEditGrup(tIdx)} style={{ padding: '4px 10px', backgroundColor: '#4F46E5', color: '#FFF', fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none' }}>💾 Simpan</button>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button type="button" onClick={() => mulaiEditGrup(tIdx, transaksi)} style={{ padding: '4px 8px', backgroundColor: theme.bgGrupRow, color: theme.textUtama, fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none' }}>⚙️ Edit</button>
                            <button type="button" onClick={() => handleHapusGrup(tIdx)} style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#EF4444', fontSize: '11px', fontWeight: '700', borderRadius: '4px', border: 'none' }}>❌ Hapus</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Tampilan Tabel Tradisional Desktop */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ backgroundColor: theme.thBg, borderBottom: `2px solid ${theme.border}`, color: theme.thText, fontSize: '12px', fontWeight: '800' }}>
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
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Belum ada data transaksi.</td></tr>
                ) : (
                  daftarTransaksi.map((transaksi, tIdx) => {
                    const isGrupSedangEdit = editingGroupIdx === tIdx;
                    return [
                      <tr key={`grup-${tIdx}`} style={{ backgroundColor: theme.bgGrupRow, borderBottom: `1px solid ${theme.border}`, fontWeight: '700', fontSize: '13px', color: theme.textUtama }}>
                        <td style={{ padding: '10px 12px' }}>
                          {isGrupSedangEdit ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <input type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)} style={{ padding: '6px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontWeight: '600' }} />
                              <input type="text" value={editJam} placeholder="HH:MM" onChange={(e) => setEditJam(e.target.value)} style={{ padding: '6px', fontSize: '12px', width: '60px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontWeight: '600' }} />
                            </div>
                          ) : (<>📅 {transaksi.tanggal} <br/><span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '500' }}>({transaksi.jam} WIB)</span></>)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isGrupSedangEdit ? (
                            <select value={editJenis} onChange={(e) => setEditJenis(e.target.value)} style={{ padding: '6px', fontWeight: '700', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText }}>
                              <option value="Penjualan">PENJUALAN</option>
                              <option value="Pengeluaran">PENGELUARAN</option>
                              <option value="Pemasukan">PEMASUKAN</option>
                            </select>
                          ) : (
                            <>
                              <span style={{ 
                                backgroundColor: transaksi.jenis === 'Penjualan' ? '#10B981' : transaksi.jenis === 'Pemasukan' ? '#3F51B5' : '#F59E0B', 
                                color: '#FFFFFF', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                marginRight: '10px' 
                              }}>
                                {transaksi.jenis ? AppendedJenis(transaksi.jenis) : 'UNKNOWN'}
                              </span>
                              <span>{transaksi.items?.length || 0} Macam</span>
                            </>
                          )}
                        </td>
                        <td></td><td></td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: isMurniGelap ? '#E0E7FF' : '#1E1B4B', fontSize: '14px' }}>Total: Rp {Number(transaksi.grand_total).toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {isGrupSedangEdit ? (
                            <button type="button" onClick={() => simpanEditGrup(tIdx)} style={{ padding: '6px 12px', backgroundColor: '#4F46E5', color: '#FFF', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>💾 Simpan</button>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button type="button" onClick={() => mulaiEditGrup(tIdx, transaksi)} disabled={isLoading} style={{ padding: '6px 10px', backgroundColor: isMurniGelap ? '#475569' : '#FFF', color: theme.textUtama, fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: `1px solid ${theme.border}`, cursor: 'pointer' }}>⚙️ Edit</button>
                              <button type="button" onClick={() => handleHapusGrup(tIdx)} disabled={isLoading} style={{ padding: '6px 10px', backgroundColor: '#FEF2F2', color: '#EF4444', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #FCA5A5', cursor: 'pointer' }}>❌ Hapus</button>
                            </div>
                          )}
                        </td>
                      </tr>,
                      ...(transaksi.items || []).map((item, iIdx) => {
                        const isSedangEdit = editingItemKey === `${tIdx}-${iIdx}`;
                        return (
                          <tr key={`item-${tIdx}-${iIdx}`} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '14px', backgroundColor: theme.bgItemRow, color: theme.textUtama }}>
                            <td style={{ padding: '12px 14px', color: theme.textMuted, fontSize: '12px', fontStyle: 'italic' }}>↳ detail item</td>
                            <td style={{ padding: '8px 14px' }}>{isSedangEdit ? <input type="text" value={editBarang} onChange={(e) => setEditBarang(e.target.value)} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontWeight: '600' }} /> : <span>📦 {item.barang}</span>}</td>
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>{isSedangEdit ? <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} style={{ width: '50px', textAlign: 'center', padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontWeight: '600' }} /> : <span>{item.qty}</span>}</td>
                            <td style={{ padding: '8px 14px', textAlign: 'right' }}>{isSedangEdit ? <input type="number" value={editHarga} onChange={(e) => setEditHarga(e.target.value)} style={{ width: '90px', textAlign: 'right', padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontWeight: '600' }} /> : <span>Rp {Number(item.harga).toLocaleString('id-ID')}</span>}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>Rp {Number(item.jumlah).toLocaleString('id-ID')}</td>
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              {isSedangEdit ? (
                                <button type="button" onClick={() => simpanHasilEdit(tIdx, iIdx)} style={{ padding: '4px 8px', backgroundColor: '#6366F1', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}>💾 Simpan</button>
                              ) : (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button type="button" onClick={() => mulaiModeEdit(tIdx, iIdx, item)} disabled={isLoading} style={{ padding: '4px 8px', backgroundColor: isMurniGelap ? '#334155' : '#F8FAFC', color: theme.textUtama, fontSize: '12px', cursor: 'pointer' }}>✏️ Edit</button>
                                  <button type="button" onClick={() => handleHapusItem(tIdx, iIdx)} disabled={isLoading} style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#EF4444', fontSize: '12px', border: 'none', cursor: 'pointer' }} title="Hapus Barang">🗑️</button>
                                </div>
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
        )}
      </div>

    </div>
  );
}

function AppendedJenis(val) {
  return String(val).toUpperCase();
}