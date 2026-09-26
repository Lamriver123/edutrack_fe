export default function OfflinePage() {
  return (
    <html lang="vi" className="h-full">
      <body
        className="flex min-h-full flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '420px',
          }}
        >
          <div
            style={{
              fontSize: '4rem',
              marginBottom: '1rem',
            }}
          >
            📡
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#5D4037',
              marginBottom: '0.75rem',
            }}
          >
            Không có kết nối mạng
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: '#795548',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            Vui lòng kiểm tra kết nối internet và thử lại. Một số tính năng đã
            được lưu trữ sẵn có thể vẫn hoạt động.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #F5A623, #F57C00)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(245,166,35,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 6px 20px rgba(245,166,35,0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 4px 14px rgba(245,166,35,0.4)';
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
