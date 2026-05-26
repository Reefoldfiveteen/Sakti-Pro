import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 🌟 ENDPOINT POST: HAKIM TIME-MARK GLOBAL (Strategi Lintas Platform Aman & Akurat)
export async function POST(request) {
  try {
    const { dataTransaksi, accessToken, deviceSource, timeMark } = await request.json();

    if (!dataTransaksi) return NextResponse.json({ success: false, error: "Data transaksi kosong." }, { status: 400 });
    if (!accessToken) return NextResponse.json({ success: false, error: "Token tidak terdeteksi." }, { status: 401 });

    const dataIncoming = typeof dataTransaksi === 'string' ? JSON.parse(dataTransaksi) : dataTransaksi;
    const incomingTimeMark = Number(timeMark) || 0;

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
      fields: 'files(id, webViewLink, description)',
    });

    let dataFinalToBeSaved = dataIncoming;
    let fileIdExist = null;
    let webViewLink = null;
    let cloudTimeMark = 0;

    if (listFile.data.files.length > 0) {
      fileIdExist = listFile.data.files[0].id;
      webViewLink = listFile.data.files[0].webViewLink;
      
      // 🌟 EKSEKUSI HAKIM: Baca catatan metadata `timeMark` yang disimpan di deskripsi file Drive
      const cloudDescription = listFile.data.files[0].description || "";
      if (cloudDescription.includes("timeMark:")) {
        cloudTimeMark = Number(cloudDescription.split("timeMark:")[1]) || 0;
      }

      // Aturan Emas Ide Rif: Jika data di cloud ternyata memiliki jejak waktu LEBIH BARU daripada data perangkat ini,
      // Tolak overwrite, paksa frontend kembalikan status outdated agar layar otomatis memicu pembaruan (GET) data.
      if (cloudTimeMark > incomingTimeMark) {
        return NextResponse.json({ 
          success: true, 
          outdated: true, 
          message: "Data di Cloud lebih baru! Tampilan tabel otomatis diperbarui ke versi gres." 
        });
      }
    }

    const payloadStream = JSON.stringify(dataFinalToBeSaved);
    const mediaStream = { mimeType: 'application/json', body: payloadStream };

    // Bungkus metadata penanda modifikasi akhir ke properti deskripsi file di Drive
    const metaDescription = `device:${deviceSource || 'unknown'}|timeMark:${incomingTimeMark}`;

    if (fileIdExist) {
      const hasilUpdate = await drive.files.update({
        fileId: fileIdExist,
        media: mediaStream,
        resource: { description: metaDescription },
        fields: 'id, name, webViewLink',
      });
      if (hasilUpdate.data.webViewLink) webViewLink = hasilUpdate.data.webViewLink;
    } else {
      const hasilCreate = await drive.files.create({
        resource: { name: namaFileDb, parents: [folderId], description: metaDescription },
        media: mediaStream,
        fields: 'id, name, webViewLink',
      });
      webViewLink = hasilCreate.data.webViewLink;
    }

    return NextResponse.json({ 
      success: true, 
      outdated: false,
      sync_time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      file_link: webViewLink 
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 🌟 2. ENDPOINT UNTUK AMBIL DATA (GET) - 100% UTAH DAN STABIL
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    if (!accessToken) return NextResponse.json({ success: false, error: "Token kosong." }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const listFile = await drive.files.list({ q: "name='sakti_database.json' and trashed=false", fields: 'files(id)' });
    if (listFile.data.files.length === 0) return NextResponse.json({ success: false, error: "Belum ada backup di akun Drive ini." }, { status: 404 });

    const fileId = listFile.data.files[0].id;
    const kontenFile = await drive.files.get({ fileId, alt: 'media' });
    return NextResponse.json({ success: true, data: kontenFile.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}