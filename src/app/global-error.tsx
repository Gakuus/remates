"use client";

/**
 * Error raíz (fallas del root layout, p. ej. CSS o fuentes): renderiza su
 * propio documento HTML porque el layout original quedó inutilizable.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-UY">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Georgia, serif",
          background: "#f6f1e7",
          color: "#1b2a23",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", margin: "0 0 12px" }}>No pudimos cargar el sitio</h1>
          <p style={{ color: "#6f675f", margin: "0 0 24px" }}>
            El problema es temporario. Probá de nuevo en unos minutos.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#2f4a3c",
              color: "#f6f1e7",
              border: 0,
              borderRadius: "8px",
              padding: "12px 24px",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
