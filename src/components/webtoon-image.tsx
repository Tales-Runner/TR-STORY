"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lazy-loaded webtoon panel. Reserves vertical space until in view to keep
 * the scroll position stable as panels stream in.
 */
export function WebtoonImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(!!priority);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "1000px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  return (
    <div
      ref={ref}
      className="w-full leading-[0] bg-[#0a0612]"
      style={{ minHeight: loaded ? undefined : 400 }}
    >
      {inView && !errored && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className="w-full h-auto block select-none"
          draggable={false}
        />
      )}
      {errored && (
        <div className="py-16 text-center text-xs text-white/40">
          이미지를 불러올 수 없습니다.
        </div>
      )}
    </div>
  );
}
