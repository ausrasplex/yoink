import { AuthShell } from "@/components/auth-shell";
import { PasswordForm } from "@/components/password-form";
import { requireUser } from "@/lib/auth";

export default async function PasswordPage() {
  const user = await requireUser("/account/password");
  return <AuthShell><PasswordForm forced={user.mustChangePassword} /></AuthShell>;
}
