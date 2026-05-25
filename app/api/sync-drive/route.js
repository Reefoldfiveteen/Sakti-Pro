import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 🌟 1. ENDPOINT UNTUK SIMPAN DATA (POST) - DENGAN LOGIKA AUTOMATIC MULTIPLATFORM MERGE
export async function POST(request) {
  try {
    const { dataTransaksi, accessToken } = await request.json();

    if (!dataTransaksi) return NextResponse.json({ success: false, error: "Data transaksi kosong." }, { status: 400 });
    if (!accessToken) return NextResponse.json({ success: false, error: "Token tidak terdeteksi." }, { status: 401 });

    // Parsing data kiriman dari device yang sedang sync (bisa HP / PC)
    const dataIncoming = typeof dataTransaksi === 'string' ? JSON.parse(dataTransaksi) : dataTransaksi;

    const oauth2Client = new google.auth.OAuth2(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const namaFolderBackup = "SAKTI_Backup_Cloud";
    let folderId = null;

    const listFolder = await drive.files.list({
      q: `name='${namaFolderBackup}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (listFolder.data.files.length > 0) {
      folderId = listFolder.data.files[0].id;
    } else {
      const buatFolder = await drive.files.create({
        resource: { name: namaFolderBackup, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id',
      });
      folderId = buatFolder.data.id;
    }

    const namaFileDb = "sakti_database.json";
    const listFile = await drive.files.list({
      q: `name='${namaFileDb}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    let dataFinalToBeSaved = dataIncoming;
    let fileIdExist = null;

    // 🌟 ENGINE MERGE MULTIPLATFORM MULAI DI SINI
    if (listFile.data.files.length > 0) {
      fileIdExist = listFile.data.files[0].id;

      try {
        // 1. Download data yang sudah ada di Cloud Drive sebelumnya (misal kiriman dari PC)
        const downloadExisting = await drive.files.get({ fileId: fileIdExist, alt: 'media' });
        
        let dataExistingInCloud = downloadExisting.data;
        if (typeof dataExistingInCloud === 'string') {
          dataExistingInCloud = JSON.parse(dataExistingInCloud);
        }

        if (Array.isArray(dataExistingInCloud) && Array.isArray(dataIncoming)) {
          // 2. Gabungkan data Cloud Lama dan data Device Baru menggunakan Map agar tidak saling tindih
          const mapGabungan = new Map();

          // Masukkan data cloud lama terlebih dahulu
          dataExistingInCloud.forEach(item => {
            const uniqueKey = item.id || `${item.tanggal}-${item.jam}-${item.grand_total}`;
            mapGabungan.set(uniqueKey, item);
          });

          // Timpa atau tambahkan dengan data masuk dari device yang sedang sync sekarang
          dataIncoming.forEach(item => {
            const uniqueKey = item.id || `${item.tanggal}-${item.jam}-${item.grand_total}`;
            mapGabungan.set(uniqueKey, item);
          });

          // 3. Kembalikan Map menjadi Array bersih dan urutkan dari transaksi terbaru
          dataFinalToBeSaved = Array.from(mapGabungan.values()).sort((a, b) => {
            return new Date(`${b.tanggal.replace(/\//g, '-')}T${b.jam}`) - new Date(`${a.tanggal.replace(/\//g, '-')}T${a.jam}`);
          });
          
          console.log(`[SAKTI Sync] Sinkronisasi sukses. Total data setelah digabung: ${dataFinalToBeSaved.length} baris.`);
        }
      } catch (errDownload) {
        console.error("Gagal otomatisasi merge, fallback menggunakan data incoming device.", errDownload);
      }
    }

    // Ubah data final kembali ke format string JSON untuk dikirim ke Drive
    const payloadStream = JSON.stringify(dataFinalToBeSaved);
    const mediaStream = { mimeType: 'application/json', body: payloadStream };

    let hasilUpload;
    if (fileIdExist) {
      hasilUpload = await drive.files.update({
        fileId: fileIdExist,
        media: mediaStream,
        fields: 'id, name, webViewLink',
      });
    } else {
      hasilUpload = await drive.files.create({
        resource: { name: namaFileDb, parents: [folderId] },
        media: mediaStream,
        fields: 'id, name, webViewLink',
      });
    }

    return NextResponse.json({ 
      success: true, 
      sync_time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      file_link: hasilUpload.data.webViewLink 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌟 2. ENDPOINT UNTUK AMBIL DATA (GET) - 100% AMAN SESUAI KODE AWALMU
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) return NextResponse.json({ success: false, error: "Token kosong." }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Cari file sakti_database.json
    const listFile = await drive.files.list({
      q: "name='sakti_database.json' and trashed=false",
      fields: 'files(id)',
    });

    if (listFile.data.files.length === 0) {
      return NextResponse.json({ success: false, error: "Belum ada backup di akun Drive ini." }, { status: 404 });
    }

    // Download kontennya
    const fileId = listFile.data.files[0].id;
    const kontenFile = await drive.files.get({ fileId, alt: 'media' });

    return NextResponse.json({ success: true, data: kontenFile.data });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}