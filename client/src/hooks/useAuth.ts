import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getStoredIdToken } from "@/lib/firebaseAuth";

export type AuthUser = User & { isAdmin: boolean; memberName: string | null };

// Signed in with Google but not on the studio team
interface NoAccess {
  noAccess: true;
  email: string;
}

async function fetchAuthUser(): Promise<AuthUser | NoAccess | null> {
  const token = getStoredIdToken();
  const res = await fetch("/api/auth/user", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (res.status === 401) return null;
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    return { noAccess: true, email: body.email || "" };
  }
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()) || res.statusText}`);
  return await res.json();
}

export function useAuth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAuthUser,
    retry: false,
    staleTime: 30000,
  });

  const noAccess = data && "noAccess" in data ? data : undefined;
  const user = data && !("noAccess" in data) ? data : undefined;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    noAccessEmail: noAccess?.email,
    isError,
  };
}
