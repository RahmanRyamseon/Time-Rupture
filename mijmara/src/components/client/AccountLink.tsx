"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function AccountLink({ signInHref, accountHref, signInLabel, accountLabel }: { signInHref: string; accountHref: string; signInLabel: string; accountLabel: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <Link href={signedIn ? accountHref : signInHref} className="btn btn-ghost hidden !px-3 text-sm sm:inline-flex">
      {signedIn ? accountLabel : signInLabel}
    </Link>
  );
}
