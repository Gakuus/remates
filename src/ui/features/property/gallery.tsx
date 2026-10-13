"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconChevronLeft, IconChevronRight, IconPhotos, IconX } from "@/ui/icons";

export interface GalleryImage {
  url: string;
  alt: string;
}

interface GalleryProps {
  images: GalleryImage[];
  name: string;
}

/**
 * Galería de la ficha (PLAN §8.1): imagen principal + thumbnails en
 * desktop, tira deslizable en mobile y lightbox a pantalla completa.
 */
export function PropertyGallery({ images, name }: GalleryProps) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const total = images.length;
  const showLightbox = useCallback((index: number) => {
    setActive(index);
    setLightbox(true);
  }, []);

  const go = useCallback(
    (delta: number) => setActive((i) => (total > 0 ? (i + delta + total) % total : 0)),
    [total],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, go]);

  if (total === 0) {
    return (
      <div className="rounded-mas border-arena bg-crema-50 text-gris-calido-600 flex aspect-[4/3] items-center justify-center border">
        <span className="flex flex-col items-center gap-3 text-sm">
          <IconPhotos size={28} />
          Sin fotografías publicadas
        </span>
      </div>
    );
  }

  const current = images[Math.min(Math.max(active, 0), total - 1)] ?? images[0];
  if (!current) return null; // inalcanzable: total > 0

  return (
    <div className="space-y-3">
      {/* Desktop: principal + thumbnails */}
      <div className="hidden md:block">
        <div className="group rounded-mas border-arena bg-beige-200 relative overflow-hidden border">
          <button
            type="button"
            onClick={() => showLightbox(active)}
            className="block w-full cursor-zoom-in"
            aria-label={`Ampliar foto: ${current.alt || name}`}
          >
            <Image
              src={current.url}
              alt={current.alt || name}
              width={1600}
              height={1000}
              priority={active === 0}
              sizes="(max-width: 768px) 100vw, 66vw"
              className="aspect-[16/10] w-full object-cover"
            />
          </button>
          <span className="bg-tinta/75 text-crema-50 absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <IconPhotos size={14} />
            {active + 1} / {total}
          </span>
        </div>

        {total > 1 ? (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver foto ${index + 1} de ${total}`}
                aria-current={index === active}
                className={`rounded-mas shrink-0 overflow-hidden border transition-opacity ${
                  index === active
                    ? "border-monte ring-monte/40 ring-1"
                    : "border-arena hover:opacity-80"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.alt || name}
                  width={112}
                  height={80}
                  sizes="112px"
                  className="h-20 w-28 object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Mobile: tira deslizable (swipe) */}
      <div className="md:hidden">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => showLightbox(index)}
              className="rounded-mas border-arena relative shrink-0 snap-center overflow-hidden border"
              aria-label={`Ampliar foto ${index + 1} de ${total}: ${image.alt || name}`}
            >
              <Image
                src={image.url}
                alt={image.alt || name}
                width={800}
                height={600}
                sizes="85vw"
                priority={index === 0}
                className="aspect-[4/3] w-[85vw] max-w-xl object-cover"
              />
              <span className="bg-tinta/75 text-crema-50 absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-xs">
                {index + 1} / {total}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotografías de ${name}`}
          className="bg-tinta/95 fixed inset-0 z-50 flex flex-col"
        >
          <div className="text-crema-50 flex items-center justify-between px-4 py-3">
            <span className="tabular text-sm">
              {active + 1} / {total}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setLightbox(false)}
              className="hover:bg-crema-50/10 rounded-full p-2 transition-colors"
              aria-label="Cerrar galería"
            >
              <IconX size={24} />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-6">
            {total > 1 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                className="bg-crema-50/10 text-crema-50 hover:bg-crema-50/20 absolute left-2 z-10 rounded-full p-3 transition-colors md:left-6"
                aria-label="Foto anterior"
              >
                <IconChevronLeft size={24} />
              </button>
            ) : null}

            <Image
              src={current.url}
              alt={current.alt || name}
              width={1600}
              height={1200}
              sizes="100vw"
              className="h-auto max-h-[75vh] w-auto max-w-full object-contain"
            />

            {total > 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                className="bg-crema-50/10 text-crema-50 hover:bg-crema-50/20 absolute right-2 z-10 rounded-full p-3 transition-colors md:right-6"
                aria-label="Foto siguiente"
              >
                <IconChevronRight size={24} />
              </button>
            ) : null}
          </div>

          {total > 1 ? (
            <div className="flex justify-center gap-2 pb-5">
              {images.map((image, index) => (
                <button
                  key={`dot-${image.url}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Ir a la foto ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === active ? "bg-crema-50 w-6" : "bg-crema-50/40 w-2"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
