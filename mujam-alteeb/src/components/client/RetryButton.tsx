"use client";
export function RetryButton({ label }: { label: string }) {
  return <button className="btn btn-gold" onClick={() => window.location.reload()}>{label}</button>;
}
