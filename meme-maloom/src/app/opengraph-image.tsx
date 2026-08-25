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
          background: "linear-gradient(135deg, #0a0814 0%, #341463 45%, #ff2a9d 78%, #ff6b00 100%)",
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
              background: "linear-gradient(135deg, #7c3aed 0%, #ff2a9d 55%, #ff6b00 100%)",
            }}
          />
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>
            Meme <span style={{ color: "#d4fa3e", marginLeft: 16 }}>Maloom</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#e1defc" }}>
          Indian memes, explained.
        </div>
      </div>
    ),
    { ...size }
  );
}
