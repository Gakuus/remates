import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP (PLAN §15, Sprint 7).
 *
 * `script-src` mantiene `'unsafe-inline'` en producción de forma deliberada:
 * Next App Router inyecta scripts inline (`self.__next_f`) en las páginas
 * prerenderizadas estáticas (varias en este sitio), y un CSP con nonce
 * exige rendering dinámico en TODAS las rutas — incompatible con estáticas
 * e ISR, y con bugs abiertos en Turbopack (Next 16) que dejan los scripts
 * sin nonce y rompen la hidratación. El riesgo que cubriría el nonce ya
 * está mitigado: React escapa todo contenido de usuario y el único
 * `dangerouslySetInnerHTML` (JSON-LD) escapa `<` antes de serializar.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  const connect = "'self'";

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
