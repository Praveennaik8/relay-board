import { useEffect, useState } from "react";
import { subscribeToPosts } from "@/services/posts.service";
import type { Post, PostType } from "@/types";

export function usePosts(type?: PostType) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeToPosts(
      (nextPosts) => { setPosts(nextPosts); setLoading(false); },
      (nextError) => { setError(nextError.message); setLoading(false); },
      undefined,
      type,
    );
  }, [type]);

  return { posts, loading, error };
}
