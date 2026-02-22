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

    async function run() {

      setState({ loading: true, authorized: false, role: null });

      if (!user) {
        if (!cancelled) setState({ loading: false, authorized: false, role: null });
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
console.log("user.uid = ", user.uid);

        const snap = await getDoc(ref);
console.log("AUTHZ uid=", user.uid, "exists=", snap.exists());
console.log("cancelled = ", cancelled);

        if (!snap.exists()) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

        const data = snap.data() as { active?: boolean; role?: string };
console.log("data.active =", data.active);

        if (data.active != true) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

console.log("role =", data.role);

        const role: Role | null = data.role === "admin" ? "admin" : data.role === "editor" ? "editor" : null;

        if (!role) {
          if (!cancelled) setState({ loading: false, authorized: false, role: null });
          return;
        }

console.log("cancelled = ", cancelled);

        if (!cancelled) setState({ loading: false, authorized: true, role });
	console.log("Autorizzato!");

      } catch (e: any) {
        // In caso di errori (rules, network), meglio bloccare
console.log("blocco!");
         console.error("AUTHZ ERROR:", e?.code, e?.message, e);
        if (!cancelled) setState({ loading: false, authorized: false, role: null });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

console.log("state = ", state);

  return state;
}
