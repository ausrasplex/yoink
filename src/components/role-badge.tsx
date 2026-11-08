import { Server, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { roleLabel, type Role } from "@/lib/format";

export function RoleBadge({ role }: { role: Role }) {
  const Icon = role === "SERVER_ADMIN" ? Server : role === "ADMIN" ? ShieldCheck : UserRound;
  return (
    <Badge variant={role === "SERVER_ADMIN" ? "lime" : role === "ADMIN" ? "lilac" : "secondary"}>
      <Icon /> {roleLabel(role)}
    </Badge>
  );
}
