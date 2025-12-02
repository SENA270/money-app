"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
// ← ProtectedPage.tsx は app/components 配下だから、lib までは ../.. で戻る
import { supabase } from "../../lib/supabaseClient";

export default function ProtectedPage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        // ログインしてなければ /login へ
        router.replace("/login");
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        読み込み中...
      </div>
    );
  }

  return <>{children}</>;
}