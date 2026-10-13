"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/field";
import { IconCheck, IconChevronLeft } from "@/ui/icons";

interface AdminLoginFormProps {
  configured: boolean;
}

export function AdminLoginForm({ configured }: AdminLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!configured) return;
    setStatus("sending");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.push("/admin");
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("idle");
      setError(
        data?.error ??
          (response.status === 429
            ? "Demasiados intentos. Probá de nuevo más tarde."
            : "No pudimos iniciar sesión."),
      );
    } catch {
      setStatus("idle");
      setError("No pudimos conectar. Revisá tu conexión y probá de nuevo.");
    }
  }

  return (
    <div className="bg-crema flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-tinta-suave inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <IconChevronLeft size={15} aria-hidden="true" />
          Volver al sitio
        </Link>

        <div className="rounded-mas border-arena bg-blanco-roto mt-6 border p-6 shadow-sm">
          <h1 className="font-display text-monte-950 text-2xl">Panel de administración</h1>
          <p className="text-tinta-suave mt-1.5 text-sm">Ingresá con la contraseña maestra.</p>

          {!configured ? (
            <p
              className="rounded-suave mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"
              role="alert"
            >
              El panel todavía no está configurado: definí la variable{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-xs">ADMIN_PASSWORD</code> en
              las variables de entorno (solo servidor) y reiniciás el proceso.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <Input
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={status === "sending"} className="w-full">
                {status === "sending" ? (
                  "Ingresando…"
                ) : (
                  <>
                    <IconCheck size={16} aria-hidden="true" />
                    Ingresar
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-gris-calido mt-4 text-center text-xs">
          Acceso restringido al equipo de Campos del Uruguay.
        </p>
      </div>
    </div>
  );
}
