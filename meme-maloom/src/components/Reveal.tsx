"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Safety net: if IntersectionObserver never fires for any reason (an
    // odd browser, a screenshot/automation tool, timing edge cases), the
    // content must still show up rather than staying invisible forever.
    const fallback = setTimeout(() => setVisible(true), 1200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          clearTimeout(fallback);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 150px 0px" }
    );
    observer.observe(node);
    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
