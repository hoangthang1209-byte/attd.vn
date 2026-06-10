export default function Section({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <section
        style={{
          padding: "64px 0",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
          }}
        >
          <h2
            style={{
              marginBottom: "32px",
            }}
          >
            {title}
          </h2>
  
          {children}
        </div>
      </section>
    );
  }