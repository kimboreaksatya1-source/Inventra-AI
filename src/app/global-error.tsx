"use client";

// Only renders when the root layout itself throws — it must ship its own <html>/<body>
// and cannot rely on app styles or providers.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#f8fafc",
          color: "#111827",
        }}
      >
        <div style={{ maxWidth: 400, padding: 24, textAlign: "center" }}>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            Inventra<span style={{ color: "#0f766e" }}> AI</span>
          </p>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px" }}>
            The app failed to load. Your data is safe — please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              borderRadius: 8,
              background: "#0f766e",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 16 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
