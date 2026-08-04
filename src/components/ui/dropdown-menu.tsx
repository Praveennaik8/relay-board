import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export function DropdownMenuContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) { return <DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content className={cn("z-50 min-w-36 rounded-md border bg-background p-1 shadow-lg", className)} sideOffset={6} align="end" {...props} /></DropdownMenuPrimitive.Portal>; }
export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>) { return <DropdownMenuPrimitive.Item className={cn("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent", className)} {...props} />; }
