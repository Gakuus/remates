import { cookies } from "next/headers";
import Link from "next/link";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/infrastructure/admin/session";
import { AdminLogoutButton } from "@/ui/features/admin/logout-button";

export const metadata = {
  title: "Administración · Campos del Uruguay",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const authed = await verifyAdminSessionToken(cookieStore.get(adminSessionCookieName())?.value);

  return (
    <div className="bg-crema min-h-dvh">
      <header className="border-arena bg-blanco-roto border-b">
        <div className="contenedor flex h-16 items-center justify-between gap-4">
          <Link href="/admin" className="font-display text-monte-950 text-lg">
            Administración
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-tinta-suave text-sm hover:underline">
              Ver sitio
            </Link>
            {authed ? <AdminLogoutButton /> : null}
          </div>
        </div>
      </header>
      <main className="contenedor py-10">{children}</main>
    </div>
  );
}
