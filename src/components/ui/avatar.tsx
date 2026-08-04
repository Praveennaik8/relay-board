import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return <AvatarPrimitive.Root className={cn("flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#e8f0fe]", className)}>
    <AvatarPrimitive.Image src={src ?? undefined} alt={name} className="aspect-square h-full w-full object-cover" />
    <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center text-xs font-medium text-[#185abc]">{initials(name)}</AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>;
}
