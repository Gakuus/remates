import Link from "next/link";

const departamentos = [
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

const columns = [
  {
    title: "Explorar",
    links: [
      { href: "/campos", label: "Todos los campos" },
      { href: "/campos?tipo=agricola", label: "Campos agrícolas" },
      { href: "/campos?tipo=ganadero", label: "Campos ganaderos" },
      { href: "/campos?tipo=mixto", label: "Campos mixtos" },
      { href: "/campos?ha_min=500", label: "Más de 500 ha" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/nosotros", label: "Nosotros" },
      { href: "/publicar", label: "Publicá tu campo" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
  {
    title: "Contacto",
    links: [
      { href: "mailto:hola@camposdeluruguay.uy", label: "hola@camposdeluruguay.uy" },
      { href: "tel:+59829000000", label: "+598 2900 0000" },
      { href: "/contacto", label: "Montevideo, Uruguay" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-monte-950 text-salvia-300">
      <div className="contenedor py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-display text-crema-50 text-xl font-semibold">Campos del Uruguay</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Publicación y comercialización de campos y terrenos rurales en todo el territorio
              uruguayo.
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="md:col-span-2">
              <h3 className="text-salvia mb-4 text-xs font-semibold tracking-widest uppercase">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="hover:text-crema-50 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="Zonas" className="md:col-span-2">
            <h3 className="text-salvia mb-4 text-xs font-semibold tracking-widest uppercase">
              Zonas
            </h3>
            <ul className="space-y-2.5">
              {departamentos.slice(0, 6).map((d) => (
                <li key={d}>
                  <Link
                    href={`/departamentos/${d.toLowerCase().replace(/\s+/g, "-")}`}
                    className="hover:text-crema-50 text-sm transition-colors"
                  >
                    {d}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-crema-50/10 mt-14 flex flex-col gap-3 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p>© {new Date().getFullYear()} Campos del Uruguay. Todos los derechos reservados.</p>
            <p>Valores expresados en dólares estadounidenses (USD).</p>
          </div>
          <Link
            href="/admin"
            className="text-salvia-500 hover:text-salvia-300 transition-colors"
            aria-label="Acceso reservado al equipo"
          >
            Administración
          </Link>
        </div>
      </div>
    </footer>
  );
}
