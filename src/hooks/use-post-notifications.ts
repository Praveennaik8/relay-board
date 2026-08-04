import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToNewPosts } from "@/services/posts.service";

type NotificationStatus = "unsupported" | NotificationPermission;

function getStatus(): NotificationStatus {
  return "Notification" in window ? Notification.permission : "unsupported";
}

export function usePostNotifications(user: User) {
  const [status, setStatus] = useState<NotificationStatus>(getStatus);

  useEffect(() => {
    if (status !== "granted") return;
    return subscribeToNewPosts((post) => {
      if (post.author.uid === user.uid) return;
      const notification = new Notification(`New ${post.type.replace("-", " ")} · RelayBoard`, {
        body: `${post.author.name}: ${post.title}`,
        icon: post.author.photoURL || undefined,
        tag: `relayboard-post-${post.id}`,
      });
      notification.onclick = () => { window.focus(); notification.close(); };
    }, () => undefined);
  }, [status, user.uid]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) { setStatus("unsupported"); return; }
    setStatus(await Notification.requestPermission());
  }, []);

  return { status, requestPermission };
}
