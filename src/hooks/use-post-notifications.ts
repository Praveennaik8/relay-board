import { useCallback, useEffect, useState } from "react";
import type { Post } from "@/types";
import { subscribeToNewPosts } from "@/services/posts.service";

type NotificationStatus = "unsupported" | NotificationPermission;

function getStatus(): NotificationStatus {
  return "Notification" in window ? Notification.permission : "unsupported";
}

async function workerRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/notification-sw.js", { scope: "/" });
}

async function showNativeNotification(title: string, body: string, tag: string, icon?: string | null) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const registration = await workerRegistration();
    if (registration) {
      await registration.showNotification(title, { body, icon: icon ?? undefined, tag, data: { url: "/" } });
    } else {
      const notification = new Notification(title, { body, icon: icon ?? undefined, tag });
      notification.onclick = () => { window.focus(); notification.close(); };
    }
    return true;
  } catch {
    return false;
  }
}

export function usePostNotifications() {
  const [status, setStatus] = useState<NotificationStatus>(getStatus);
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "granted") return;
    return subscribeToNewPosts(
      (post) => {
        setLatestPost(post);
        void showNativeNotification(`New ${post.type.replace("-", " ")} · RelayBoard`, `${post.author.name}: ${post.title}`, `relayboard-post-${post.id}`, post.author.photoURL);
      },
      (error) => setListenerError(error.message),
    );
  }, [status]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) { setStatus("unsupported"); return "unsupported" as const; }
    const nextStatus = await Notification.requestPermission();
    setStatus(nextStatus);
    if (nextStatus === "granted") await workerRegistration();
    return nextStatus;
  }, []);

  const sendTestNotification = useCallback(() => showNativeNotification(
    "RelayBoard alerts are on",
    "You’ll see a notification when a new post is received.",
    "relayboard-notification-test",
  ), []);

  return { status, latestPost, listenerError, requestPermission, sendTestNotification };
}
