import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, DEFAULT_WORKSPACE_ID } from "@/firebase/config";
import type { ActionType } from "@/types";

export function useOwnAction(postId: string, userId?: string) {
  const [action, setAction] = useState<ActionType | null>(null);

  useEffect(() => {
    if (!userId) { setAction(null); return; }
    return onSnapshot(
      doc(db, "workspaces", DEFAULT_WORKSPACE_ID, "posts", postId, "actions", userId),
      (snapshot) => setAction(snapshot.exists() ? snapshot.data().actionType as ActionType : null),
      () => setAction(null),
    );
  }, [postId, userId]);

  return action;
}
