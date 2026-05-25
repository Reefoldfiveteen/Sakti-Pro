import { NextResponse } from 'next/server';
import { google } from 'googleapis';

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
      q: `name='${namaFileDb}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    let dataFinalToBeSaved = dataIncoming.filter(item => !item.isDeleted); // Bersihkan data deleted bawaan dari device saat ini
    let fileIdExist = null;

    if (listFile.data.files.length > 0) {
      fileIdExist = listFile.data.files[0].id;

      try {
        const downloadExisting = await drive.files.get({ fileId: fileIdExist, alt: 'media' });
        let dataExistingInCloud = downloadExisting.data;
        if (typeof dataExistingInCloud === 'string') {
          dataExistingInCloud = JSON.parse(dataExistingInCloud);
        }

        if (Array.isArray(dataExistingInCloud) && Array.isArray(dataIncoming)) {
          const mapGabungan = new Map();

          // 1. Masukkan data dari Cloud ke Map terlebih dahulu
          dataExistingInCloud.forEach(item => {
            const uniqueKey = item.id || `${item.tanggal}-${item.jam}-${item.grand_total}`;
            mapGabungan.set(uniqueKey, item);
          });

          // 2. Bandingkan dengan data Incoming dari device (HP/PC)
          dataIncoming.forEach(itemIncoming => {
            const uniqueKey = itemIncoming.id || `${itemIncoming.tanggal}-${itemIncoming.jam}-${itemIncoming.grand_total}`;
            const itemExisting = mapGabungan.get(uniqueKey);

            if (itemExisting) {
              // Jika data di device ditandai hapus dan waktu hapusnya lebih baru, tandai untuk didelete
              if (itemIncoming.isDeleted && (itemIncoming.updatedAt >= (itemExisting.updatedAt || 0))) {
                mapGabungan.set(uniqueKey, { ...itemExisting, isDeleted: true });
              } 
              // Jika data di device diedit/diupdate dan waktunya lebih baru, terima perubahannya
              else if (itemIncoming.updatedAt >= (itemExisting.updatedAt || 0)) {
                mapGabungan.set(uniqueKey, itemIncoming);
              }
            } else {
              // Jika data belum ada di cloud, langsung masukkan (selama tidak ditandai isDeleted)
              if (!itemIncoming.isDeleted) {
                mapGabungan.set(uniqueKey, itemIncoming);
              }
            }
          });

          // 3. Filter keluar semua data yang sudah sah berstatus isDeleted: true
          dataFinalToBeSaved = Array.from(mapGabungan.values())
            .filter(item => !item.isDeleted)
            .sort((a, b) => {
              return new Date(`${b.tanggal.replace(/\//g, '-')}T${b.jam}`) - new Date(`${a.tanggal.replace(/\//g, '-')}T${a.jam}`);
            });
        }
      } catch (errDownload) {
        console.error("Gagal otomatisasi merge, fallback menggunakan data incoming device.", errDownload);
      }
    }

    const payloadStream = JSON.stringify(dataFinalToBeSaved);
    const mediaStream = { mimeType: 'application/json', body: payloadStream };

    if (fileIdExist) {
      await drive.files.update({ fileId: fileIdExist, media: mediaStream });
    } else {
      await drive.files.create({ resource: { name: namaFileDb, parents: [folderId] }, media: mediaStream });
    }

    return NextResponse.json({ 
      success: true, 
      sync_time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET ENDPOINT TETAP UTUH SAMA SEPERTI KEMARIN
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