import { useEffect, useRef, useState, type ReactNode } from 'react';

// ── Scroll-scrubbed drone intro ──────────────────────────────────────
// A short scroll flies the drone from the Pyramid door up to a top-down
// view by scrubbing the video's currentTime. Near the end the frame blurs
// and the auth panel (children) fades in over it.

const SCROLL_VH = 200; // total scroll distance — keep short, whole clip maps here
const REVEAL_START = 0.78; // progress where the panel starts fading in
const DONE_AT = 0.992;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function Intro({ children, onReached }: { children: ReactNode; onReached: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef(0);
  const reachedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [reached, setReached] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function onScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = clamp01(max > 0 ? window.scrollY / max : 0);
        setProgress(p);
        const v = videoRef.current;
        if (v && v.duration && !reachedRef.current) {
          v.currentTime = p * v.duration;
        }
        if (p >= DONE_AT && !reachedRef.current) {
          reachedRef.current = true;
          setReached(true);
          onReached();
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [onReached]);

  // lock page scroll once the panel is revealed
  useEffect(() => {
    if (reached) {
      window.scrollTo({ top: 0 });
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [reached]);

  function skip() {
    if (reachedRef.current) return;
    reachedRef.current = true;
    setReached(true);
    onReached();
  }

  const blur = reached ? 16 : clamp01((progress - REVEAL_START) / (1 - REVEAL_START)) * 16;
  const panelOpacity = reached ? 1 : clamp01((progress - REVEAL_START) / (DONE_AT - REVEAL_START));
  const tint = reached ? 0.55 : 0.2 + panelOpacity * 0.35;

  return (
    <div style={{ height: reached ? '100vh' : `${SCROLL_VH}vh` }}>
      <div className="fixed inset-0 overflow-hidden bg-[#06090b]">
        <video
          ref={videoRef}
          src="/intro-drone.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => setReady(true)}
          className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-300"
          style={{ filter: `blur(${blur}px)`, transform: 'scale(1.06)' }}
        />

        {/* brand tint / vignette over the footage */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 30%, rgba(94,46,158,${tint * 0.55}) 0%, rgba(26,21,18,${tint}) 80%)`,
          }}
        />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#f3ecdf]">
            Loading…
          </div>
        )}

        {/* scroll hint while flying */}
        {ready && !reached && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-[#fbf7ef] transition-opacity duration-300"
            style={{ opacity: 1 - panelOpacity }}
          >
            <span className="text-xs font-semibold tracking-widest uppercase">Scroll to enter the Pyramid</span>
            <span className="h-7 w-[18px] rounded-full border border-white/40">
              <span className="mx-auto mt-1.5 block h-1.5 w-1 animate-bounce rounded-full bg-white/70" />
            </span>
          </div>
        )}

        {/* auth panel fades in over the blurred frame */}
        <div
          className="absolute inset-0 flex items-center justify-center px-5"
          style={{
            opacity: panelOpacity,
            pointerEvents: panelOpacity > 0.95 ? 'auto' : 'none',
            transform: `translateY(${(1 - panelOpacity) * 14}px)`,
          }}
        >
          {children}
        </div>

        {!reached && (
          <button
            type="button"
            onClick={skip}
            className="absolute top-5 right-5 cursor-pointer rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md transition-colors hover:bg-white/20"
            style={{ opacity: 1 - panelOpacity }}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
