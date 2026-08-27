/**
 * Renders a real, admin-uploaded image or video hosted on this site
 * (meme.imageUrl, served from /public/uploads). Always paired with a
 * visible, real link back to the original source platform — uploaded
 * media still needs the same credit treatment as an embed or an
 * illustration placeholder, never shown blank or without context.
 */
export default function UploadedMedia({
  src,
  kind,
  title,
  sourceUrl,
  sourcePlatform,
  className,
}: {
  src: string;
  kind: "image" | "video";
  title: string;
  sourceUrl: string;
  sourcePlatform: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[28px] bg-navy-950 ${className ?? ""}`}>
      {kind === "video" ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        >
          Your browser can&apos;t play this video.{" "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            View it on {sourcePlatform}
          </a>
          .
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded files aren't in next/image's static domain allowlist
        <img src={src} alt={title} className="h-full w-full object-contain" />
      )}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="glass-dark absolute right-2 bottom-2 rounded-full px-2.5 py-1 text-[10px] font-bold text-white transition-transform hover:scale-105"
      >
        Source: {sourcePlatform} ↗
      </a>
    </div>
  );
}
