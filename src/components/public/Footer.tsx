export default function Footer() {
    return (
      <footer
        style={{
          borderTop: "1px solid #e5e7eb",
          marginTop: "80px",
          padding: "48px 24px",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr",
            gap: "32px",
          }}
        >
          <div>
            <h3>ATTD.VN</h3>
  
            <p>
              Kho sỉ đồng phục và quà tặng
              doanh nghiệp.
            </p>
          </div>
  
          <div>
            <h4>Danh mục</h4>
  
            <p>Áo thun</p>
            <p>Áo polo</p>
            <p>Nón</p>
            <p>Tote</p>
          </div>
  
          <div>
            <h4>Hỗ trợ</h4>
  
            <p>Đại lý</p>
            <p>Liên hệ</p>
            <p>OEM</p>
          </div>
        </div>
      </footer>
    );
  }