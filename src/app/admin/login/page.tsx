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
      setMessage("Firebase 尚未設定，請先確認環境變數");
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch {
      setMessage("登入失敗，請確認帳號、密碼");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card max-w-md">
      <h1 className="text-2xl font-bold">管理員登入</h1>
      <p className="text-sm text-slate-600">請使用 Firebase Authentication（Email/Password）。</p>

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
          placeholder="密碼"
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
      <p className="mt-3 text-xs text-slate-500">
        Firebase 狀態：{isFirebaseReady ? "已啟用" : "未啟用"}
      </p>
    </section>
  );
}
