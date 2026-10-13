import { isAdminConfigured } from "@/infrastructure/admin/session";
import { AdminLoginForm } from "@/ui/features/admin/login-form";

export const metadata = {
  title: "Ingreso · Administración",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginForm configured={isAdminConfigured()} />;
}
