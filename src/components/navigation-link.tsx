"use client";

import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <><span role="status" className="sr-only">Đang chuyển trang…</span><span aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-primary motion-safe:animate-pulse" /></>;
}

// Warm the loading boundary by default; fetch the full route on hover/focus
// in production, instead of eagerly fetching every private page on load.
export function NavigationLink({ children, onMouseEnter, onFocus, prefetch, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} prefetch={prefetch === false ? false : intent ? true : prefetch}
    onMouseEnter={event => { setIntent(true); onMouseEnter?.(event); }}
    onFocus={event => { setIntent(true); onFocus?.(event); }}>
    {children}<NavigationFeedback />
  </Link>;
}
