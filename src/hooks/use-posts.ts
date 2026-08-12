import { useEffect, useState } from "react";
import { subscribeToPosts } from "@/services/posts.service";
import type { Post, PostType } from "@/types";

export function usePosts(workspaceId: string, type?: PostType) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeToPosts(
      (nextPosts) => { setPosts(nextPosts); setLoading(false); },
      (nextError) => { setError(nextError.message); setLoading(false); },
      workspaceId,
      type,
    );
  }, [workspaceId, type]);

  useEffect(() => {
    const nextExpiry = posts.reduce<number | null>((earliest, post) => {
      const expiry = post.expiresAt?.toMillis();
      if (!expiry || expiry <= Date.now()) return earliest;
      return earliest === null || expiry < earliest ? expiry : earliest;
    }, null);
    if (nextExpiry === null) return;

    const delay = Math.min(Math.max(nextExpiry - Date.now(), 0) + 1, 2_147_483_647);
    const timeout = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timeout);
  }, [posts, now]);

  return { posts: posts.filter((post) => !post.expiresAt || post.expiresAt.toMillis() > now), loading, error };
}
