import Link from "next/link";

// Fallback for requests outside any locale segment.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf6ee", color: "#24160d", padding: "3rem" }}>
        <h1>Page not found</h1>
        <p>
          <Link href="/">Go to the home page</Link>
        </p>
      </body>
    </html>
  );
}
