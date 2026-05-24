import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request) {
  try {
    const { dataTransaksi, accessToken } = await request.json();

    if (!dataTransaksi) {
      return NextResponse.json({ success: false, error: "Data transaksi kosong." }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Akses token tidak terdeteksi." }, { status: 401 });
    }

    // 🌟 ARSITEKTUR UNIVERSAL: Mengunci token OAuth2 dinamis langsung dari handshake perangkat user
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const namaFolderBackup = "SAKTI_Backup_Cloud";
    let folderId = null;

    // 1. Ambil folder backup atau buat baru otomatis di Drive User
    const listFolder = await drive.files.list({
      q: `name='${namaFolderBackup}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    if (listFolder.data.files.length > 0) {
      folderId = listFolder.data.files[0].id;
    } else {
      const buatFolder = await drive.files.create({
        resource: {
          name: namaFolderBackup,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = buatFolder.data.id;
    }

    // 2. Tulis data transaksi hibrida ke file internal user
    const namaFileDb = "sakti_database.json";
    const listFile = await drive.files.list({
      q: `name='${namaFileDb}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    let hasilUpload;
    const mediaStream = { mimeType: 'application/json', body: dataTransaksi };

    if (listFile.data.files.length > 0) {
      const fileIdLama = listFile.data.files[0].id;
      hasilUpload = await drive.files.update({
        fileId: fileIdLama,
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

    const waktuSync = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    return NextResponse.json({ 
      success: true, 
      sync_time: waktuSync,
      file_name: hasilUpload.data.name,
      file_link: hasilUpload.data.webViewLink 
    });

  } catch (error) {
    console.error("OAuth GDrive Engine Error:", error);
    return NextResponse.json({ success: false, error: `Gagal mencadangkan ke Drive: ${error.message}` }, { status: 500 });
  }
}

// Tambahkan ini di app/api/sync-drive/route.js
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) return NextResponse.json({ success: false, error: "Token tidak ada" }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Cari file
    const res = await drive.files.list({
      q: "name='sakti_database.json' and trashed=false",
      fields: 'files(id)',
    });

    if (res.data.files.length === 0) return NextResponse.json({ success: false, error: "File tidak ditemukan" });

    // Download konten file
    const fileId = res.data.files[0].id;
    const content = await drive.files.get({ fileId, alt: 'media' });

    return NextResponse.json({ success: true, data: content.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}