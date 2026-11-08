import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/reset-forms";
import { getUser } from "@/lib/auth";

export default async function ForgotPage() {
  if (await getUser()) redirect("/account/password");
  return <AuthShell><ForgotForm /></AuthShell>;
}
