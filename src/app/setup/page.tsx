import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SetupForm } from "@/components/setup-form";
import { hasServerAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** First run: create the server admin. Closed for good once one exists. */
export default async function SetupPage() {
  if (await hasServerAdmin()) redirect("/login");
  return <AuthShell><SetupForm /></AuthShell>;
}
