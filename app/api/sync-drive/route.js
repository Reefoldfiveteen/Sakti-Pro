import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// 🌟 1. ENDPOINT UNTUK SIMPAN DATA (POST)
export async function POST(request) {
  try {
    const { dataTransaksi, accessToken } = await request.json();

    if (!dataTransaksi) return NextResponse.json({ success: false, error: "Data transaksi kosong." }, { status: 400 });
    if (!accessToken) return NextResponse.json({ success: false, error: "Token tidak terdeteksi." }, { status: 401 });

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

    let hasilUpload;
    const mediaStream = { mimeType: 'application/json', body: dataTransaksi };

    if (listFile.data.files.length > 0) {
      hasilUpload = await drive.files.update({
        fileId: listFile.data.files[0].id,
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

// 🌟 2. ENDPOINT UNTUK AMBIL DATA (GET)
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