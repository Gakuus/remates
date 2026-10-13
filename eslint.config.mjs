import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/**
 * Reglas de dependencia entre capas — Arquitectura Hexagonal.
 * docs/PLAN.md §16 "Reglas de dependencia".
 *
 * domain ← application ← (adapters | infrastructure) ← platform ← ui ← app
 */
const POLICIES = {
  default: "disallow",
  policies: [
    // Dominio: aislado. Solo conoce sus propios archivos.
    {
      from: { element: { type: "domain" } },
      allow: { to: { element: { types: ["domain"] } } },
      message: "domain/ no puede depender de otras capas ni de frameworks.",
    },
    // Aplicación: solo domain + sus propios casos de uso/puertos.
    {
      from: { element: { type: "application" } },
      allow: { to: { element: { types: ["domain", "application"] } } },
      message: "application/ solo puede depender de domain/ y de sus propios puertos.",
    },
    // Adaptadores e infraestructura: conocen el núcleo, nunca la UI.
    {
      from: { element: { type: ["adapters", "infrastructure"] } },
      allow: {
        to: {
          element: {
            types: [
              "domain",
              "application",
              "adapters",
              "presentation",
              "infrastructure",
              "platform",
            ],
          },
        },
      },
      message: "adapters/ e infrastructure/ no pueden depender de ui/ ni de app/.",
    },
    // Presenters: traducen dominio → view models para la UI.
    {
      from: { element: { type: "presentation" } },
      allow: {
        to: { element: { types: ["domain", "application", "presentation"] } },
      },
    },
    // Plataforma: punto de composición (ensambla adaptadores y casos de uso).
    {
      from: { element: { type: "platform" } },
      allow: {
        to: {
          element: {
            types: [
              "domain",
              "application",
              "adapters",
              "presentation",
              "infrastructure",
              "platform",
            ],
          },
        },
      },
    },
    // UI: presenta. Accede al núcleo vía casos de uso o presenters
    // (adapters/presentation); nunca a persistencia ni infraestructura.
    {
      from: { element: { type: "ui" } },
      allow: {
        to: { element: { types: ["domain", "application", "platform", "ui", "presentation"] } },
      },
      message:
        "ui/ no debe importar adapters de persistencia ni infrastructure/ (usá presenters o casos de uso).",
    },
    // App (rutas Next): capa de composición, puede orquestar todo lo interno.
    {
      from: { element: { type: "app" } },
      allow: {
        to: {
          element: {
            types: [
              "domain",
              "application",
              "adapters",
              "presentation",
              "infrastructure",
              "platform",
              "ui",
              "app",
            ],
          },
        },
      },
    },
  ],
};

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores(["node_modules/**", ".next/**", "out/**", "build/**", "coverage/**", "*.config.*"]),
  {
    name: "project/architecture",
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        // El orden importa: el presentador es una capa propia y compartible con UI.
        { type: "presentation", pattern: "src/adapters/presentation/**" },
        { type: "domain", pattern: "src/domain/**" },
        { type: "application", pattern: "src/application/**" },
        { type: "adapters", pattern: "src/adapters/**" },
        { type: "infrastructure", pattern: "src/infrastructure/**" },
        { type: "platform", pattern: "src/platform/**" },
        { type: "ui", pattern: "src/ui/**" },
        { type: "app", pattern: "src/app/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": ["error", POLICIES],
    },
  },
  {
    name: "project/application-framework-ban",
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next/*", "react", "react/*", "pg"],
              message:
                "Los casos de uso no conocen frameworks: usá los puertos de application/ports.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "project/domain-framework-ban",
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next/*", "react", "react/*", "pg", "zod"],
              message: "El dominio es puro: cero dependencias externas.",
            },
          ],
        },
      ],
    },
  },
]);
