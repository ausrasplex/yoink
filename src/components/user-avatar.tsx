import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Profile picture if the person uploaded one (served to signed-in users by /uploads), otherwise their initials. */
export function UserAvatar({ name, avatar, className, textClassName }: {
  name: string; avatar?: string | null; className?: string; textClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {avatar && <AvatarImage src={`/uploads/${avatar}`} alt="" className="object-cover" />}
      <AvatarFallback className={cn("bg-lilac font-bold text-ink", textClassName)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
