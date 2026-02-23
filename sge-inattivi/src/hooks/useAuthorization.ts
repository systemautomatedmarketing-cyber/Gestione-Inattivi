"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Role = "admin" | "editor";

type AuthzState =
  | { loading: true; authorized: false; role: null }
  | { loading: false; authorized: true; role: Role }
  | { loading: false; authorized: false; role: null };

export function useAuthorization(user: User | null): AuthzState {
  const [state, setState] = useState<AuthzState>({
    loading: true,
    authorized: false,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!db) {
      if (!cancelled) setState({ loading: false, authorized: false, role: null });
      return;
    }

    async function run() {
      // ✅ ogni volta che cambia user, riparti in loading
      setState({ loading: true, authorized: false, role: null });

      if (!user) {
        if (!cancelled) setState({ loading: false, authorized: false, role: null });
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

        const data = snap.data() as { active?: boolean; role?: string };

        if (data.active !== true) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

        const role: Role | null =
          data.role === "admin" ? "admin" : data.role === "editor" ? "editor" : null;

        if (!role) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

        if (!cancelled) setState({ loading: false, authorized: true, role });
      } catch (e: any) {
        // ✅ logga il vero motivo (permission-denied ecc.)
        console.error("AUTHZ ERROR:", e?.code, e?.message, e);
        if (!cancelled) setState({ loading: false, authorized: false, role: null });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]); // ✅ dipendenza stabile

  return state;
}
