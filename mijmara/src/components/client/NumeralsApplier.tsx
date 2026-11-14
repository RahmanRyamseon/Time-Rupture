"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/types";

export const NUMERALS_KEY = "mijmara:numerals";
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);

function convert(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest("[data-latin-digits],[lang='en']")) return NodeFilter.FILTER_REJECT;
      return /[0-9]/.test(node.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const n of nodes) n.nodeValue = n.nodeValue!.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
}

/**
 * Pages are rendered with Western digits so they stay static and cacheable.
 * Readers who choose Eastern Arabic numerals get them applied here, after hydration.
 */
export function NumeralsApplier({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  useEffect(() => {
    if (locale !== "ar" || localStorage.getItem(NUMERALS_KEY) !== "eastern") return;
    const main = document.body;
    convert(main);
    const obs = new MutationObserver((muts) => {
      obs.disconnect();
      for (const m of muts) {
        if (m.type === "characterData" && m.target.parentNode) convert(m.target.parentNode);
        m.addedNodes.forEach((n) => convert(n));
      }
      obs.observe(main, { childList: true, subtree: true, characterData: true });
    });
    obs.observe(main, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [locale, pathname]);
  return null;
}
