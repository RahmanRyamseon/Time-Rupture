"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../Icon";

export function TabLink({ to, label, icon, exact }: { to: string; label: string; icon: string; exact?: boolean }) {
  const path = decodeURI(usePathname() ?? "");
  const target = decodeURI(to);
  const active = exact ? path === target : path === target || path.startsWith(target + "/");
  return (
    <Link prefetch={false} href={to} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[0.7rem] no-underline ${active ? "text-gold-300" : "text-sand-300"}`}>
      <Icon name={icon} className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
