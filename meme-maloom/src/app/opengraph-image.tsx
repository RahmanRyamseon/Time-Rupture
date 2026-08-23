import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1224 0%, #1a2947 55%, #7a3610 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 96,
              height: 72,
              borderRadius: 28,
              background: "#ff8a00",
            }}
          />
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>
            Meme <span style={{ color: "#ff8a00", marginLeft: 16 }}>Maloom</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#ffe9c7" }}>
          Indian memes, explained.
        </div>
      </div>
    ),
    { ...size }
  );
}
