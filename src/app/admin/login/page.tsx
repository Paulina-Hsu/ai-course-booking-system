"use client";

import { FormEvent, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, isFirebaseReady } from "@/lib/firebase";

const AUTH_ERROR_LABELS: Record<string, string> = {
  "auth/invalid-credential": "帳號或密碼不正確（請確認 Email 與密碼）",
  "auth/user-not-found": "找不到此使用者，請確認 Email 是否正確",
  "auth/wrong-password": "密碼錯誤，請重新輸入",
  "auth/invalid-email": "Email 格式不正確",
  "auth/too-many-requests": "嘗試次數過多，請稍後再試",
  "auth/network-request-failed": "網路連線異常，請稍後再試",
  "auth/api-key-not-valid": "Firebase API key 無效，請檢查 Firebase 設定",
  "auth/operation-not-allowed": "此登入方式目前未啟用（請確認 Firebase Console 已開啟 Email/Password）",
};

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
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : "unknown";
      const message = error instanceof FirebaseError ? error.message : "登入時發生未預期錯誤";

      console.log("Firebase Auth login error", { code, message });

      setMessage(`登入失敗（${code}）：${AUTH_ERROR_LABELS[code] || message}`);
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
