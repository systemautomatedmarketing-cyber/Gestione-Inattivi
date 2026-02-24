"use client";

import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);


// ✅ redirect SOLO in useEffect
  useEffect(() => {

    if (!loading && user) {
//      router.replace("/check/new");
      router.replace("/home");
    }
  }, [loading, user, router]);

  async function handleLogin() {
    setError(null);
    try {    
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e?.message ?? "Login fallito");
    }
  }

  return (
 <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Accesso</h1>
        <p className="mt-2 text-sm text-gray-600">
          Entra con Google per compilare il check settimanale.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-5 w-full rounded-xl border px-4 py-2"
        >
          Accedi con Google
        </button>

        {loading && (
          <p className="mt-3 text-sm text-gray-500">Caricamento...</p>
        )}
      </div>
    </main>
  );
}
