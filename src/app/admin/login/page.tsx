"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, isFirebaseReady } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) {
      setMessage("Firebase 尚未設定，請先完成環境變數");
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch {
      setMessage("登入失敗，請確認帳號密碼");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card max-w-md">
      <h1 className="text-2xl font-bold">管理員登入</h1>
      <p className="text-sm text-slate-600">
        {isFirebaseReady ? "請輸入 Firebase 帳號密碼" : "請先完成 Firebase 環境變數設定"}
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          required
          type="email"
          placeholder="admin@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          required
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={isLoading || !isFirebaseReady}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "登入中..." : "登入"}
        </button>
      </form>
      {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
    </section>
  );
}
