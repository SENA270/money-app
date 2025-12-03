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
    let cancelled = false;

    const checkSession = async () => {
      try {
        // 1. まずセッションを確認
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        console.log("AuthGuard getSession result", {
          data: sessionData,
          error: sessionError,
        });

        if (sessionError) {
          console.error("getSession error", sessionError);
        }

        let authed = !!sessionData?.session;

        // 2. セッションが取れなかったら getUser でもう一度確認
        if (!authed) {
          const { data: userData, error: userError } =
            await supabase.auth.getUser();
          console.log("AuthGuard getUser result", {
            data: userData,
            error: userError,
          });

          if (userError) {
            console.error("getUser error", userError);
          }

          authed = !!userData?.user;
        }

        if (cancelled) return;

        if (!authed) {
          setIsAuthed(false);
          router.replace("/login");
        } else {
          setIsAuthed(true);
        }
      } catch (e) {
        console.error("AuthGuard checkSession error", e);
        if (!cancelled) {
          setIsAuthed(false);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) return null;
  if (!isAuthed) return null;

  return <>{children}</>;
}
