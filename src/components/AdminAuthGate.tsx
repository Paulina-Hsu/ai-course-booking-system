"use client";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!auth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialized(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitialized(true);

      if (!nextUser && pathname?.startsWith("/admin") && pathname !== "/admin/login") {
        router.replace("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (!initialized) {
    return <div className="card">Checking admin auth...</div>;
  }

  if (!user && pathname !== "/admin/login") {
    return <div className="card">Please log in first.</div>;
  }

  return (
    <div className="space-y-5">
      {pathname !== "/admin/login" && user ? (
        <div className="flex items-center justify-end text-sm text-slate-600">
          <span>{user.email}</span>
          <button
            onClick={async () => {
              await signOut(auth!);
              router.push("/admin/login");
            }}
            className="ml-3 rounded-full border border-slate-300 px-3 py-1 text-xs"
          >
            Sign out
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
