"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";


export default function UnauthorizedPage() {
  const router = useRouter();

  async function handleLogout() {
if (auth) {
    await signOut(auth);
}
    router.replace("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Accesso non autorizzato!</h1>

        <p className="mt-3 text-sm text-gray-600">
          Il tuo account è stato autenticato, ma non risulta abilitato all’uso di questa app.
        </p>

        <p className="mt-4 text-sm">
          Contatti:{" "}
          <a
            className="underline"
            href="https://www.webstudioams.it/contact/"
            target="_blank"
            rel="noreferrer"
          >
            https://www.webstudioams.it/contact/
          </a>
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-lg border px-4 py-2">
          Logout
        </button>
      </div>
    </main>
  );
}
