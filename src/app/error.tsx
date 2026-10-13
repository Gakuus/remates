"use client";

/**
 * Manejo de errores de render (PLAN §7 Sprint 7): pantalla de error
 * amigable con opción de reintentar, sin exponer stack traces.
 */
export default function Error({
  reset,
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-crema flex min-h-[60vh] items-center pt-24">
      <div className="contenedor py-16 text-center">
        <p className="etiqueta mb-4">Algo salió mal</p>
        <h1 className="text-titulo text-monte-950">No pudimos cargar esta página</h1>
        <p className="text-gris-calido-600 mx-auto mt-4 max-w-xl">
          El problema es temporario. Si vuelve a ocurrir, escribinos desde la página de contacto.
        </p>
        {error.digest ? (
          <p className="text-gris-calido-300 tabular mt-3 text-xs">Referencia: {error.digest}</p>
        ) : null}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => reset()}
            className="bg-monte text-crema-50 hover:bg-monte-600 rounded-suave inline-flex h-11 items-center justify-center px-5 text-sm font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
