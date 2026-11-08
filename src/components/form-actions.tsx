import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A form's main button + its status text. Rendered twice by each section form:
 * "header" — beside the section heading, desktop only (submits via the form="…" attribute, as it sits outside the form);
 * "footer" — at the end of the form, phones and tablets only.
 */
export function FormActions({ where, form, pending, label = "Save", pendingLabel = "Saving…", icon = <Save />, status, className }: {
  where: "header" | "footer"; form: string; pending: boolean;
  label?: string; pendingLabel?: string; icon?: React.ReactNode; status?: React.ReactNode; className?: string;
}) {
  const button = <Button type="submit" form={form} disabled={pending}>{icon} {pending ? pendingLabel : label}</Button>;
  return where === "header" ? (
    <div className="hidden min-w-0 items-center justify-end gap-3 lg:flex lg:max-w-[50%] lg:shrink-0">{status}{button}</div>
  ) : (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-3 lg:hidden", className)}>{button}{status}</div>
  );
}
