"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useAuthorization } from "@/hooks/useAuthorization";

function Card({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border p-5 shadow-sm hover:shadow transition"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{desc}</div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const authz = useAuthorization(user);

  // protezione
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (authz.loading) return;
    if (!authz.authorized) {
      const t = setTimeout(() => router.replace("/unauthorized"), 400);
      return () => clearTimeout(t);
    }
  }, [loading, user?.uid, authz.loading, authz.authorized, authz.role, router]);

  if (loading || (user && authz.loading)) {
    return <main className="p-6">Caricamento...</main>;
  }
  if (!user || !authz.authorized) {
    return <main className="p-6">Reindirizzamento...</main>;
  }

  async function handleLogout() {
if (auth) {
    await signOut(auth);
}
    router.replace("/login");
  }

  const isAdmin = authz.role === "admin";

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pannello</h1>
          <p className="mt-1 text-sm text-gray-600">
            {user.displayName} — {user.email} · ruolo <b>{authz.role}</b>
          </p>
        </div>

        <button onClick={handleLogout} className="rounded-lg border px-4 py-2">
          Logout
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isAdmin && (
          <Card
            title="Elenco generale inattivi"
            desc="Lista dal foglio Google + assegnazione editor (admin)"
            onClick={() => router.push("/admin/inattivi")}
          />
        )}

        <Card
          title="Gestione inattivi"
          desc={isAdmin ? "I tuoi + filtro per editor" : "Solo i tuoi assegnati"}
          onClick={() => router.push("/inattivi")}
        />

        <Card
          title="Storici"
          desc={isAdmin ? "Tutti i check + filtro editor" : "Solo i tuoi check"}
          onClick={() => router.push("/history")}
        />

        {isAdmin && (
          <Card
            title="Impostazioni"
            desc="Scegli foglio mese + abilita/disabilita editor"
            onClick={() => router.push("/settings")}
          />
        )}
      </div>
    </main>
  );
}
