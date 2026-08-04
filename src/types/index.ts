import type { Timestamp } from "firebase/firestore";

export const postTypes = ["issue", "activity", "tip", "announcement", "lost-found", "poll"] as const;
export type PostType = (typeof postTypes)[number];
export type ActionType = "helpful" | "affected" | "join" | "acknowledge" | "claim" | "vote";

export interface Author {
  uid: string;
  name: string;
  photoURL: string | null;
}

export type ActionCounts = Record<ActionType, number>;

export interface Post {
  id: string;
  type: PostType;
  title: string;
  description: string;
  author: Author;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
  actionCounts: ActionCounts;
  totalActionCount: number;
}

export interface Comment {
  id: string;
  text: string;
  author: Author;
  createdAt: Timestamp | null;
}

export interface CreatePostInput {
  type: PostType;
  title: string;
  description: string;
}

export const actionMeta: Record<PostType, { label: string; action: ActionType; secondary?: { label: string; action: ActionType } }> = {
  issue: { label: "Helpful", action: "helpful", secondary: { label: "Affected me", action: "affected" } },
  activity: { label: "Join", action: "join" },
  tip: { label: "Helpful", action: "helpful" },
  announcement: { label: "Acknowledge", action: "acknowledge" },
  "lost-found": { label: "Claim", action: "claim" },
  poll: { label: "Vote", action: "vote" },
};

export const typeLabels: Record<PostType, string> = {
  issue: "Issue",
  activity: "Activity",
  tip: "Tip",
  announcement: "Announcement",
  "lost-found": "Lost & Found",
  poll: "Poll",
};

export const emptyActionCounts = (): ActionCounts => ({ helpful: 0, affected: 0, join: 0, acknowledge: 0, claim: 0, vote: 0 });
