import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import type { ActionType } from "@/types";

export function useOwnAction(workspaceId: string, postId: string, userId?: string) {
  const [action, setAction] = useState<ActionType | null>(null);

  useEffect(() => {
    if (!userId) { setAction(null); return; }
    return onSnapshot(
      doc(db, "workspaces", workspaceId, "posts", postId, "actions", userId),
      (snapshot) => setAction(snapshot.exists() ? snapshot.data().actionType as ActionType : null),
      () => setAction(null),
    );
  }, [workspaceId, postId, userId]);

  return action;
}
