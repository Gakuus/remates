"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/ui/components/button";
import { IconPower } from "@/ui/icons";

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setPending(false);
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={pending}>
      <IconPower size={15} aria-hidden="true" />
      Salir
    </Button>
  );
}
