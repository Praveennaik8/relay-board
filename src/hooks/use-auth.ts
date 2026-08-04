import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { observeAuth } from "@/services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => observeAuth((nextUser) => {
    setUser(nextUser);
    setLoading(false);
  }), []);

  return { user, loading };
}
