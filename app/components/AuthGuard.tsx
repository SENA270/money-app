// app/components/AuthGuard.tsx
"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Props = {
  children: ReactNode;
};

export function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("getSession error", error);
        }

        if (!data?.session) {
          // 未ログインなら /login へ飛ばす
          router.replace("/login");
          setIsAuthed(false);
        } else {
          setIsAuthed(true);
        }
      } catch (e) {
        console.error(e);
        router.replace("/login");
        setIsAuthed(false);
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, [router]);

  if (checking) {
    // チェック中は何も表示しない（チラつき防止）
    return null;
  }

  if (!isAuthed) {
    // 未ログインの場合、/login へのリダイレクトを待つだけ
    return null;
  }

  // ログイン済みなら中身を表示
  return <>{children}</>;
}