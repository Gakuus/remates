"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/ui/components/button";
import { IconX } from "@/ui/icons";

export interface MobileMenuLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  nav: MobileMenuLink[];
  tone: "cream" | "monte";
}

/**
 * Menú mobile (PLAN Sprint 6): panel deslizante con backdrop, cierre por
 * Escape/clic afuera, foco gestionado y bloqueo del scroll mientras está abierto.
 * Solo se ve bajo `md`; en escritorio el header usa el nav inline.
 */
export function MobileMenu({ nav, tone }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    firstLinkRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);

  const toggleColor =
    tone === "cream"
      ? "text-crema-50 focus-visible:outline-crema-50"
      : "text-monte focus-visible:outline-monte";

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        className={`rounded-suave grid size-10 place-items-center ${toggleColor}`}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <IconX className="size-6" /> : <BurgerIcon />}
      </button>

      {open ? (
        <>
          <div
            className="bg-tinta/40 fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div id={panelId} className="bg-crema-50 fixed inset-x-0 top-16 z-50 shadow-2xl">
            <nav aria-label="Menú móvil" className="contenedor flex flex-col gap-1 py-6">
              {nav.map((item, index) => (
                <Link
                  key={item.href}
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-suave text-monte hover:bg-salvia-100 px-3 py-3 text-lg font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/publicar" onClick={() => setOpen(false)} className="mt-4 block">
                <Button variant="primary" size="md" className="w-full">
                  Publicá tu campo
                </Button>
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BurgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
