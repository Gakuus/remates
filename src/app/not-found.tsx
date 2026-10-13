import Link from "next/link";
import { IconSearch } from "@/ui/icons";

/** 404 del sitio (PLAN §8, Sprint 4): mantiene el tono editorial. */
export default function NotFound() {
  return (
    <div className="bg-crema flex min-h-[60vh] items-center pt-24">
      <div className="contenedor py-16 text-center">
        <p className="etiqueta mb-4">Error 404</p>
        <h1 className="text-titulo text-monte-950">Esta página no existe</h1>
        <p className="text-gris-calido-600 mx-auto mt-4 max-w-xl">
          Puede que el campo se haya vendido, retirado o que la dirección no sea correcta.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/campos"
            className="rounded-suave bg-monte text-crema-50 hover:bg-monte-600 inline-flex h-11 items-center justify-center gap-2 px-5 text-sm font-semibold transition-colors"
          >
            <IconSearch size={16} aria-hidden="true" />
            Explorar el catálogo
          </Link>
          <Link
            href="/"
            className="rounded-suave border-monte/30 text-monte hover:bg-salvia-100 inline-flex h-11 items-center justify-center border px-5 text-sm font-medium transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
