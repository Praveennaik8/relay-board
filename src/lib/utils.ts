import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return "Sending…";
  const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return timestamp.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
