"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/ui/components/button";
import { MobileMenu } from "@/ui/features/layout/mobile-menu";

export const headerNav = [
  { href: "/campos", label: "Campos" },
  { href: "/remates", label: "Remates" },
  { href: "/maquinaria", label: "Maquinaria" },
  { href: "/departamentos", label: "Zonas" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

/**
 * Header de la marca: transparente (texto crema) sobre el hero de la portada,
 * sólido (fondo crema, texto monte) en el resto de las páginas.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  const wrapper = onHome
    ? "absolute inset-x-0 top-0 z-40"
    : "sticky top-0 z-40 border-b border-monte/10 bg-crema/90 backdrop-blur";
  const brand = onHome ? "text-crema-50 hover:opacity-80" : "text-monte hover:opacity-80";
  const navLink = onHome
    ? "text-crema-50/85 hover:text-crema-50"
    : "text-gris-calido-600 hover:text-monte";

  return (
    <header className={wrapper}>
      <div className="contenedor flex h-16 items-center justify-between gap-6 md:h-20">
        <Link
          href="/"
          className={`font-display text-lg font-semibold tracking-tight transition-opacity ${brand} md:text-xl`}
        >
          Campos del Uruguay
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {headerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition-colors ${navLink}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/publicar">
            <Button
              variant="secondary"
              size="sm"
              className={
                onHome
                  ? "border-crema-50/40 text-crema-50 hover:border-crema-50/70 hover:bg-crema-50/10"
                  : ""
              }
            >
              Publicá tu campo
            </Button>
          </Link>
        </div>

        <MobileMenu nav={headerNav} tone={onHome ? "cream" : "monte"} />
      </div>
    </header>
  );
}
