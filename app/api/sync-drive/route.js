import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 🌟 ENDPOINT POST: REKONSILIASI MULTIPLATFORM (TAMBAH, EDIT, HAPUS)
export async function POST(request) {
  try {
    const { dataTransaksi, accessToken } = await request.json();

    if (!dataTransaksi) return NextResponse.json({ success: false, error: "Data transaksi kosong." }, { status: 400 });
    if (!accessToken) return NextResponse.json({ success: false, error: "Token tidak terdeteksi." }, { status: 401 });

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
      q: `name='sakti_database.json' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, webViewLink)',
    });

    // 🌟 Jangan langsung di-filter di awal agar bendera isDeleted dari HP bisa dibaca oleh Map
    let dataFinalToBeSaved = dataIncoming; 
    let fileIdExist = null;
    let webViewLink = null;

    if (listFile.data.files.length > 0) {
      fileIdExist = listFile.data.files[0].id;
      webViewLink = listFile.data.files[0].webViewLink;

      try {
        const downloadExisting = await drive.files.get({ fileId: fileIdExist, alt: 'media' });
        let dataExistingInCloud = downloadExisting.data;
        if (typeof dataExistingInCloud === 'string') {
          dataExistingInCloud = JSON.parse(dataExistingInCloud);
        }

        if (Array.isArray(dataExistingInCloud) && Array.isArray(dataIncoming)) {
          const mapGabungan = new Map();

          // 1. Amankan pangkalan data lama dari Cloud ke dalam Map
          dataExistingInCloud.forEach(item => {
            const uniqueKey = item.id || `${item.tanggal}-${item.jam}-${item.grand_total}`;
            mapGabungan.set(uniqueKey, item);
          });

          // 2. Tabrakkan dengan data Incoming (HP/PC) menggunakan Hakim Timestamp 'updatedAt'
          dataIncoming.forEach(itemIncoming => {
            const uniqueKey = itemIncoming.id || `${itemIncoming.tanggal}-${itemIncoming.jam}-${itemIncoming.grand_total}`;
            const itemExisting = mapGabungan.get(uniqueKey);

            if (itemExisting) {
              // Jika di device ditandai hapus, dan instruksi hapusnya lebih baru/setara -> Valid Hapus
              if (itemIncoming.isDeleted && (itemIncoming.updatedAt >= (itemExisting.updatedAt || 0))) {
                mapGabungan.set(uniqueKey, itemIncoming); 
              } 
              // Jika di device ada update data biasa (edit) dan waktunya lebih baru -> Terima Perubahan
              else if (itemIncoming.updatedAt >= (itemExisting.updatedAt || 0)) {
                mapGabungan.set(uniqueKey, itemIncoming);
              }
            } else {
              // Jika barang baru dan tidak dalam kondisi terhapus -> Masukkan tabel
              if (!itemIncoming.isDeleted) {
                mapGabungan.set(uniqueKey, itemIncoming);
              }
            }
          });

          // 3. Eksekusi pembersihan total barang bertanda isDeleted sebelum disimpan ke file JSON Drive
          dataFinalToBeSaved = Array.from(mapGabungan.values()).filter(item => !item.isDeleted);
        }
      } catch (errDownload) {
        console.error("Gagal melakukan merging cloud.", errDownload);
      }
    }

    const payloadStream = JSON.stringify(dataFinalToBeSaved);
    const mediaStream = { mimeType: 'application/json', body: payloadStream };

    if (fileIdExist) {
      // 🌟 FIX POP-UP: Paksa Google API mengembalikan webViewLink saat update file
      const hasilUpdate = await drive.files.update({
        fileId: fileIdExist,
        media: mediaStream,
        fields: 'id, name, webViewLink',
      });
      if (hasilUpdate.data.webViewLink) webViewLink = hasilUpdate.data.webViewLink;
    } else {
      const hasilCreate = await drive.files.create({
        resource: { name: namaFileDb, parents: [folderId] },
        media: mediaStream,
        fields: 'id, name, webViewLink',
      });
      webViewLink = hasilCreate.data.webViewLink;
    }

    return NextResponse.json({ 
      success: true, 
      sync_time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      file_link: webViewLink // Tautan dijamin terisi penuh!
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌟 ENDPOINT GET: AMBIL DATA DARI CLOUD
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    if (!accessToken) return NextResponse.json({ success: false, error: "Token kosong." }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const listFile = await drive.files.list({ q: "name='sakti_database.json' and trashed=false", fields: 'files(id)' });
    if (listFile.data.files.length === 0) return NextResponse.json({ success: false, error: "Belum ada backup." }, { status: 404 });

    const fileId = listFile.data.files[0].id;
    const kontenFile = await drive.files.get({ fileId, alt: 'media' });
    return NextResponse.json({ success: true, data: kontenFile.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}