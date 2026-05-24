'use client';

export default function LogoSakti({ isDark }) {
  // Warna utama Indigo/Biru untuk SAKTI dan Background Badge
  const brandColor = '#4F46E5'; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* LOGO ICON .WEBP DARI FOLDER PUBLIC */}
        <img 
          src="/logo.webp"
          alt="Logo" 
          style={{ 
            width: '56px', 
            height: '56px', 
            objectFit: 'contain'
          }} 
        />
        
        {/* GRUP TEXT BRANDING */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          fontFamily: "'Inter', 'system-ui', sans-serif", 
          lineHeight: '1' 
        }}>
          {/* SAKTI: Bold, Besar, Uppercase */}
          <span style={{ 
            fontSize: '46px', 
            fontWeight: '800', 
            letterSpacing: '-1.5px', 
            color: isDark ? '#F8FAFC' : brandColor,
            textTransform: 'uppercase'
          }}>
            SAKTI
          </span>

          {/* CONTAINER BINGKAI/BADGE UNTUK PRO ENTERPRISE */}
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            marginTop: '3px' 
          }}>
            <span style={{ 
              backgroundColor: brandColor, 
              color: '#FFFFFF', 
              borderRadius: '20px', 
              padding: '3px 10px', 
              fontSize: '11px', 
              fontWeight: '600', 
              letterSpacing: '3.5px', 
              textTransform: 'uppercase'
            }}>
              PRO ENTERPRISE
            </span>
          </div>
        </div>
      </div>
      
      {/* Sub-text Jurnal UMKM */}
      <p style={{ 
        margin: '0', 
        marginTop: '6px',
        fontSize: '13px', 
        fontWeight: '500', 
        fontFamily: 'system-ui, sans-serif', 
        color: isDark ? '#94A3B8' : '#64748B', 
        letterSpacing: '0.2px',
        opacity: 0.8
      }}>
        Sistem Akuntansi POS Toko UMKM — Android APK & Web Build Ready
      </p>
    </div>
  );
}