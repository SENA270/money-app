"use client";

import { useSwipeable } from "react-swipeable";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ORDER = ["/", "/history", "/forecast", "/settings"];

export default function SwipeNav({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Simple mobile detection (client-side only)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isMobile) return;
      handleNavigate("next");
    },
    onSwipedRight: () => {
      if (!isMobile) return;
      handleNavigate("prev");
    },
    trackMouse: false, // Don't track mouse on desktop
    preventScrollOnSwipe: true, // Prevent scrolling while swiping horizontally
    delta: 50, // Minimum swipe distance
  });

  const handleNavigate = (direction: "next" | "prev") => {
    // 1. Find exact match or best match (e.g. /settings/profile -> /settings)
    let currentIndex = NAV_ORDER.indexOf(pathname);

    // If exact match failed, try partial match (for sub-routes)
    if (currentIndex === -1) {
      // Example: if we are at /settings/categories, treat it as /settings
      currentIndex = NAV_ORDER.findIndex(p => p !== "/" && pathname.startsWith(p));
    }

    // If still not found (e.g. /input, /receipt), disable swipe nav
    if (currentIndex === -1) return;

    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    // Boundary checks
    if (nextIndex < 0) return; // Can't go left from Home
    if (nextIndex >= NAV_ORDER.length) return; // Can't go right from Settings

    router.push(NAV_ORDER[nextIndex]);
  };

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div {...handlers} style={{ minHeight: "100%", width: "100%" }}>
      {children}
    </div>
  );
}
