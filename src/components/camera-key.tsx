"use client";

/* ─────────────────────────────────────────────────────────
 * CAMERA KEY: the camera button of a call, as a lens
 *
 *   off       a glass lens in a soft key, its seven aperture
 *             blades shut. Hover and they part a hair, as if
 *             waiting to look
 *   starting  while your onToggle asks for the camera, the
 *             blades open a crack and hunt back and forth, and
 *             the light beside the lens glows amber
 *   on        the blades spiral open, each on its own spring,
 *             and you appear in the lens over-bright and soft,
 *             then the picture finds its exposure and focus
 *             (it hunts once, like a real lens). The light turns
 *             green
 *   off again the blades spiral shut over you, the picture
 *             darkening as the light is cut, and meet with a
 *             small knock that the key feels
 *   blocked   if onToggle throws, the blades open a little and
 *             jam: they rattle, the key shakes, the light
 *             blinks red and they fall shut. The reason is the
 *             label
 *
 * Click as fast as you like: every blade keeps its speed when
 * it is turned round, so a closing iris opens again from
 * wherever it got to. The lens catches the light where your
 * pointer is.
 *
 * One line in your app: <CameraKey stream={stream}
 * onToggle={(on) => (on ? startCamera() : stopCamera())} />.
 * Your camera, your stream; the key only shows it.
 * ───────────────────────────────────────────────────────── */

import * as React from "react";
import { EASE_OUT, INTERACTION_FOCUS, createSpring, type Spring } from "./ui-interaction-motion";
import { playSound } from "./ui-sounds";

export type CameraKeyStatus = "off" | "starting" | "on" | "blocked";

export interface CameraKeyProps {
  /** Controlled: whether the camera is on. */
  on?: boolean;
  /** Uncontrolled: whether it starts on. */
  defaultOn?: boolean;
  /** Start or stop your camera. Resolve when it is running (or stopped); throw an Error to show why it can't start. */
  onToggle?: (next: boolean) => unknown | Promise<unknown>;
  /** Every change between on and off. */
  onOnChange?: (on: boolean) => void;
  /** Your camera's stream, shown in the lens while it is on. */
  stream?: MediaStream | null;
  /** A picture to show in the lens instead of a stream (a placeholder or a still of the last frame). */
  poster?: string;
  /** Show the picture mirrored, as people expect to see themselves. */
  mirror?: boolean;
  /** The key's size in px. Everything is drawn to scale. */
  size?: number;
  /** Show the state under the key. */
  showLabel?: boolean;
  labels?: Partial<Record<"off" | "starting" | "on" | "blocked", string>>;
  disabled?: boolean;
  /** Soft synthesised sounds as the blades open, meet, or jam. */
  sound?: boolean;
  onStatusChange?: (status: CameraKeyStatus) => void;
  className?: string;
}

// The iris, in a 100-unit drawing: seven blades pinned round a rim under the bezel.
const N = 7;
const STEP = (Math.PI * 2) / N;
const BASE = -Math.PI / 2;
const LENS = 31; // the glass you see, inside the bezel
const RIM = 40; // where the blades are pinned, hidden under the bezel
const OPEN = 33.5; // a blade's edge this far out is out of sight
const TWIST = 0.62; // how far the blades turn as they close (radians)
const SIDE_BOW = 0.3; // the cut of each blade, so the opening is round rather than a polygon
const LEAD_BOW = 0.1; // the slight curve of each blade's long edge
const LED_ANGLE = -0.72;
const LIGHT = (-3 * Math.PI) / 4; // where the light comes from: the top left // where the light sits on the key (radians, from three o'clock)

// Springs. The blades are a little different from each other, so they ripple round the ring.
const bladeSpring = (k: number) => {
  const stiffness = 250 + k * 11;
  return { stiffness, damping: 2 * 0.64 * Math.sqrt(stiffness) };
};
const PRESS = { stiffness: 620, damping: 30 };
const TILT = { stiffness: 170, damping: 20 };
const FOCUS = { stiffness: 90, damping: 9 }; // under-damped: the picture overshoots into focus and back, once
const LIVE = { stiffness: 140, damping: 24 };
const RATTLE = { stiffness: 1100, damping: 9 };

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(reducedQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () => React.useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => false);

type Springs = {
  blades: Spring[];
  press: Spring;
  tiltX: Spring;
  tiltY: Spring;
  focus: Spring;
  live: Spring;
  rattle: Spring;
};

type P = { x: number; y: number };
const f = (n: number) => n.toFixed(2);
const pt = (p: P) => `${f(p.x)} ${f(p.y)}`;

/** The iris for seven blade openings (0 shut, 1 open): each blade's outline, its lit edge, and the shadow it throws. */
function irisPaths(open: number[], rattle: number) {
  const lines = open.map((a, k) => {
    const o = clamp(a, 0, 1.08);
    const phi = BASE + k * STEP + (1 - clamp(o, 0, 1)) * TWIST + rattle;
    return { d: Math.max(0, o) * OPEN, n: { x: Math.cos(phi), y: Math.sin(phi) }, t: { x: -Math.sin(phi), y: Math.cos(phi) } };
  });
  // Where two neighbouring edges cross: a corner of the opening.
  const corner = (a: (typeof lines)[number], b: (typeof lines)[number]): P => {
    const det = a.n.x * b.n.y - a.n.y * b.n.x || 1e-6;
    return { x: 50 + (a.d * b.n.y - b.d * a.n.y) / det, y: 50 + (a.n.x * b.d - b.n.x * a.d) / det };
  };
  const V = lines.map((_, k) => corner(lines[(k - 1 + N) % N], lines[k])); // V[k]: start of blade k's cut
  const rimPoint = (l: (typeof lines)[number]): P => {
    const u = Math.sqrt(Math.max(0, RIM * RIM - l.d * l.d));
    return { x: 50 + l.n.x * l.d + l.t.x * u, y: 50 + l.n.y * l.d + l.t.y * u };
  };
  const Pk = lines.map(rimPoint); // where blade k's long edge meets the rim
  const bend = (a: P, b: P, n: P, bow: number): P => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    return { x: (a.x + b.x) / 2 + n.x * len * bow, y: (a.y + b.y) / 2 + n.y * len * bow };
  };
  const lead = lines.map((l, k) => bend(V[(k + 1) % N], Pk[k], l.n, LEAD_BOW));
  return lines.map((l, k) => {
    const v0 = V[k];
    const v1 = V[(k + 1) % N];
    const prev = (k - 1 + N) % N;
    const side = bend(v0, v1, l.n, SIDE_BOW);
    // How much this blade faces the light (top left), so the leaves read apart.
    const mid = Math.atan2(l.n.y, l.n.x) + STEP / 2;
    const lit = Math.cos(mid - LIGHT);
    return {
      lit,
      blade: `M${pt(v0)}Q${pt(side)} ${pt(v1)}Q${pt(lead[k])} ${pt(Pk[k])}A${RIM} ${RIM} 0 0 0 ${pt(Pk[prev])}Q${pt(lead[prev])} ${pt(v0)}Z`,
      edge: `M${pt(v0)}Q${pt(side)} ${pt(v1)}Q${pt(lead[k])} ${pt(Pk[k])}`,
      shade: shadeOf(Pk[prev], lead[prev], v0, lines[prev].n),
    };
  });
}

type PathRefs = React.RefObject<(SVGPathElement | null)[]>;

/** The key and the bezel: drawn once, never re-rendered. */
const KeyBody = React.memo(function KeyBody({ id }: { id: string }) {
  return (
    <>
      {/* The key and the bezel. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-key`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in oklab, var(--background) 86%, white)" />
            <stop offset="1" stopColor="color-mix(in oklab, var(--background) 90%, var(--foreground))" />
          </linearGradient>
          <linearGradient id={`${id}-bezel`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="oklch(0.44 0.004 260)" />
            <stop offset="0.45" stopColor="oklch(0.25 0.004 260)" />
            <stop offset="1" stopColor="oklch(0.15 0.004 260)" />
          </linearGradient>
          <radialGradient id={`${id}-well`} cx="50" cy="50" r={LENS} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="oklch(0.2 0.01 270)" />
            <stop offset="1" stopColor="oklch(0.09 0.005 270)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="49.6" fill={`url(#${id}-key)`} />
        <circle cx="50" cy="50" r="49.6" fill="none" stroke="var(--border)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="48.9" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="0.6" className="dark:[stroke-opacity:0.14]" style={{ clipPath: "inset(0 0 55% 0)" }} />
        {/* The bezel: a dark metal ring with a knurled edge, lit from above. */}
        {/* The groove the bezel sits in. */}
        <circle cx="50" cy="50" r="42.3" fill="black" fillOpacity="0.07" className="dark:[fill-opacity:0.4]" />
        <circle cx="50" cy="50" r="41.2" fill="black" fillOpacity="0.12" transform="translate(0 0.9)" />
        <circle cx="50" cy="50" r="41" fill={`url(#${id}-bezel)`} />
        <g stroke="white" strokeOpacity="0.09" strokeWidth="0.45">
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i / 72) * Math.PI * 2;
            return <line key={i} x1={f(50 + Math.cos(a) * 38.6)} y1={f(50 + Math.sin(a) * 38.6)} x2={f(50 + Math.cos(a) * 40.5)} y2={f(50 + Math.sin(a) * 40.5)} />;
          })}
        </g>
        <circle cx="50" cy="50" r="40.75" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" style={{ clipPath: "inset(0 0 55% 0)" }} />
        <circle cx="50" cy="50" r={LENS + 1.6} fill="oklch(0.12 0 0)" />
        <circle cx="50" cy="50" r={LENS} fill={`url(#${id}-well)`} />
      </svg>
    </>
  );
});

/** The aperture: seven blades, their shadows and their lit edges, written to by the springs. */
const Iris = React.memo(function Iris({ id, blades, edges, shades }: { id: string; blades: PathRefs; edges: PathRefs; shades: PathRefs }) {
  return (
    <>
      {/* The aperture: seven blades. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full will-change-transform" style={{ clipPath: `circle(${LENS + 0.2}% at 50% 50%)` }}>
        <defs>
          <radialGradient id={`${id}-blade`} cx="50" cy="50" r={RIM} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="oklch(0.42 0.006 260)" />
            <stop offset="0.55" stopColor="oklch(0.3 0.005 260)" />
            <stop offset="1" stopColor="oklch(0.17 0.004 260)" />
          </radialGradient>
        </defs>
        <g>
          {Array.from({ length: N }, (_, k) => (
            <path
              key={k}
              ref={(node) => {
                blades.current[k] = node;
              }}
              fill={`url(#${id}-blade)`}
            />
          ))}
          {/* Each blade lies under the next: the one above throws a soft shadow along its edge. */}
          {Array.from({ length: N }, (_, k) => (
            <path
              key={k}
              ref={(node) => {
                shades.current[k] = node;
              }}
              fill="none"
              stroke="black"
              strokeOpacity="0.2"
              strokeWidth="3.7"
              strokeLinecap="round"
            />
          ))}
          {/* The cut edges catch the light. */}
          {Array.from({ length: N }, (_, k) => (
            <path
              key={k}
              ref={(node) => {
                edges.current[k] = node;
              }}
              fill="none"
              stroke="white"
              strokeOpacity="0.2"
              strokeWidth="0.45"
              strokeLinecap="round"
            />
          ))}
        </g>
      </svg>
    </>
  );
});

/** The front glass: its lip, the coating's colour, the room's reflection, and the glint that follows the pointer. */
type GRef = React.RefObject<SVGGElement | null>;
const Glass = React.memo(function Glass({ id, glint, coat, ghosts }: { id: string; glint: GRef; coat: GRef; ghosts: GRef }) {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full will-change-transform">
      <defs>
        <radialGradient id={`${id}-glare`} cx="0.36" cy="0.28" r="0.62">
          <stop offset="0" stopColor="white" stopOpacity="0.22" />
          <stop offset="0.55" stopColor="white" stopOpacity="0.04" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-coat`} x1="36" y1="76" x2="75" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--chart-4, var(--primary))" stopOpacity="0" />
          <stop offset="0.45" stopColor="var(--chart-4, var(--primary))" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="var(--chart-2, var(--primary))" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--chart-2, var(--primary))" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glint`}>
          <stop offset="0" stopColor="white" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="white" stopOpacity="0.4" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-glass`}>
          <circle cx="50" cy="50" r={LENS} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-glass)`}>
        <circle cx="50" cy="50" r={LENS} fill={`url(#${id}-glare)`} />
        <g ref={coat} fill="none" strokeLinecap="round">
          <path d="M36.9 76.2 A27.5 27.5 0 0 0 74.6 61.4" stroke={`url(#${id}-coat)`} strokeWidth="2.2" opacity="0.55" />
          <path d="M30.6 36.9 A23.5 23.5 0 0 1 39.5 29.2" stroke="var(--chart-2, var(--primary))" strokeOpacity="0.28" strokeWidth="1.4" />
        </g>
        {/* The inner elements' reflections: seen in a dark lens, lost against a lit picture. */}
        <g ref={ghosts}>
          <circle cx="50" cy="50" r="21.5" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="12.5" fill="none" stroke="white" strokeOpacity="0.05" strokeWidth="0.5" />
          <circle cx="61" cy="62.5" r="1.1" fill="white" fillOpacity="0.35" />
        </g>
        <g ref={glint}>
          <ellipse cx="38.5" cy="35" rx="5.2" ry="3.1" fill={`url(#${id}-glint)`} transform="rotate(-32 38.5 35)" />
        </g>
      </g>
      <circle cx="50" cy="50" r={LENS} fill="none" stroke="black" strokeOpacity="0.7" strokeWidth="1.1" />
      <circle cx="50" cy="50" r={LENS + 1.1} fill="none" stroke="white" strokeOpacity="0.13" strokeWidth="0.45" />
    </svg>
  );
});

/**
 * The shadow the blade above throws along a blade's trailing edge: the same curve, moved 2 units into the blade (the
 * side away from the edge's normal) and stopped short of the opening's corner, so it never needs a clip.
 */
function shadeOf(from: P, control: P, to: P, n: P) {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  const t = clamp(1 - 4.5 / Math.max(len, 0.001), 0, 1);
  const q: P = { x: from.x + (control.x - from.x) * t, y: from.y + (control.y - from.y) * t };
  const r: P = { x: control.x + (to.x - control.x) * t, y: control.y + (to.y - control.y) * t };
  const end: P = { x: q.x + (r.x - q.x) * t, y: q.y + (r.y - q.y) * t };
  const o = (p: P): P => ({ x: p.x - n.x * 2, y: p.y - n.y * 2 });
  return t <= 0 ? "" : `M${pt(o(from))}Q${pt(o(q))} ${pt(o(end))}`;
}

const LINES = ["off", "blocked", "starting", "on"] as const;
type Line = (typeof LINES)[number];

export function CameraKey({
  on,
  defaultOn = false,
  onToggle,
  onOnChange,
  stream,
  poster,
  mirror = true,
  size = 64,
  showLabel = true,
  labels,
  disabled = false,
  sound = false,
  onStatusChange,
  className = "",
}: CameraKeyProps) {
  const reduced = useReducedMotion();
  const rawId = React.useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const words = { off: "Camera off", starting: "Starting camera", on: "Camera on", blocked: "Camera blocked", ...labels };

  const [status, setStatus] = React.useState<CameraKeyStatus>(on ?? defaultOn ? "on" : "off");
  const [reason, setReason] = React.useState<string | null>(null);
  // Controlled: follow the parent when it changes its mind (and nothing is in flight).
  const [lastOn, setLastOn] = React.useState(on);
  if (on !== undefined && on !== lastOn) {
    setLastOn(on);
    if (status !== "starting") setStatus(on ? "on" : "off");
  }

  const rootRef = React.useRef<HTMLButtonElement>(null);
  const faceRef = React.useRef<HTMLSpanElement>(null);
  const shadowRef = React.useRef<HTMLSpanElement>(null);
  const mediaRef = React.useRef<HTMLSpanElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const bladeRefs = React.useRef<(SVGPathElement | null)[]>([]);
  const edgeRefs = React.useRef<(SVGPathElement | null)[]>([]);
  const shadeRefs = React.useRef<(SVGPathElement | null)[]>([]);
  const glintRef = React.useRef<SVGGElement>(null);
  const coatRef = React.useRef<SVGGElement>(null);
  const ghostsRef = React.useRef<SVGGElement>(null);
  const ledRef = React.useRef<HTMLSpanElement>(null);

  const timers = React.useRef(new Set<ReturnType<typeof setTimeout>>());
  const hunt = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const flow = React.useRef({ hover: false, down: false, closedKnock: true, token: 0 });
  const latest = React.useRef({ onToggle, onOnChange, onStatusChange, sound, reduced, status, size });
  React.useLayoutEffect(() => {
    latest.current = { onToggle, onOnChange, onStatusChange, sound, reduced, status, size };
  });

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  const stopHunt = () => {
    if (hunt.current) clearInterval(hunt.current);
    hunt.current = null;
  };

  // Everything is drawn from these springs, once per frame, straight to the DOM.
  const paintRef = React.useRef<() => void>(() => {});
  const springsRef = React.useRef<Springs | null>(null);
  const getSprings = React.useCallback(() => {
    if (!springsRef.current) {
      const paint = () => paintRef.current();
      const start = latest.current.status === "on" ? 1 : 0;
      springsRef.current = {
        blades: Array.from({ length: N }, (_, k) => createSpring(start, bladeSpring(k), paint, 0.0015)),
        press: createSpring(0, PRESS, paint, 0.002),
        tiltX: createSpring(0, TILT, paint, 0.002),
        tiltY: createSpring(0, TILT, paint, 0.002),
        focus: createSpring(0, FOCUS, paint, 0.004),
        live: createSpring(start, LIVE, paint, 0.003),
        rattle: createSpring(0, RATTLE, paint, 0.0008),
      };
    }
    return springsRef.current;
  }, []);

  React.useLayoutEffect(() => {
    paintRef.current = () => {
      const s = springsRef.current;
      if (!s) return;
      const px = latest.current.size / 100;
      const open = s.blades.map((b) => b.get());
      const rattle = s.rattle.get();
      const paths = irisPaths(open, rattle * 0.35);
      for (let k = 0; k < N; k++) {
        const blade = bladeRefs.current[k];
        if (blade) {
          blade.setAttribute("d", paths[k].blade);
          blade.style.opacity = f(0.8 + 0.2 * paths[k].lit);
        }
        const edge = edgeRefs.current[k];
        if (edge) {
          edge.setAttribute("d", paths[k].edge);
          edge.style.strokeOpacity = f(0.14 + 0.16 * Math.max(0, paths[k].lit));
        }
        shadeRefs.current[k]?.setAttribute("d", paths[k].shade);
      }
      const mean = open.reduce((sum, a) => sum + clamp(a, 0, 1), 0) / N;

      // The blades meeting: a small knock the key feels (once per close).
      const state = flow.current;
      if (mean < 0.02 && !state.closedKnock && s.blades[0].getTarget() < 0.08) {
        state.closedKnock = true;
        if (!latest.current.reduced) s.press.push(5);
        if (latest.current.sound) playSound("tick", 0.35);
      } else if (mean > 0.08) state.closedKnock = false;

      // The key: pressed, leaning toward the pointer, and shaken when the blades jam.
      const p = s.press.get();
      const tx = s.tiltX.get();
      const ty = s.tiltY.get();
      if (faceRef.current) {
        // Flat transforms only: a 3D turn resamples the drawn layer and breaks the blades' fine edges into dashes.
        faceRef.current.style.transform = `translate3d(${f(rattle * px * 9 + tx * px * 0.9)}px, ${f(p * px * 1.6 + ty * px * 0.9)}px, 0) scale(${f(1 - p * 0.04)})`;
      }
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate3d(${f(tx * px * 3)}px, ${f(px * (7 - p * 3.5) + ty * px * 2)}px, 0) scale(${f(0.9 - p * 0.06)})`;
        shadowRef.current.style.opacity = f(0.95 - p * 0.35);
      }

      // The picture: there while the camera is live, darker as the blades cut the light, bright and soft until it finds focus.
      const fo = Math.abs(s.focus.get());
      const live = clamp(s.live.get(), 0, 1);
      if (mediaRef.current) {
        const bright = (0.22 + 0.78 * mean) * (1 + 0.75 * fo);
        mediaRef.current.style.opacity = f(live);
        mediaRef.current.style.filter = `brightness(${f(bright)}) blur(${f(fo * px * 2.4)}px) saturate(${f(1 - fo * 0.3)})`;
        mediaRef.current.style.transform = `translate3d(${f(-tx * px * 1.6)}px, ${f(-ty * px * 1.6)}px, 0) scale(${f(1.04 + (1 - mean) * 0.08 + fo * 0.02)})`;
      }

      // The glass catches the light where the pointer is; the coating's colour slides the other way.
      glintRef.current?.setAttribute("transform", `translate(${f(tx * 9)} ${f(ty * 9)})`);
      coatRef.current?.setAttribute("transform", `translate(${f(-tx * 5)} ${f(-ty * 5)})`);
      if (coatRef.current) coatRef.current.style.opacity = f(1 - live * 0.45);
      if (ghostsRef.current) ghostsRef.current.style.opacity = f(1 - live * 0.9);
    };
    paintRef.current();
  });

  // First paint: the iris drawn where it starts, before any spring has moved.
  React.useLayoutEffect(() => {
    getSprings();
    paintRef.current();
  }, [getSprings]);

  // The stream, in the lens.
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream ?? null;
    if (stream) void video.play().catch(() => {});
  }, [stream]);

  // Drive the springs from the state.
  React.useEffect(() => {
    const s = getSprings();
    const quick = latest.current.reduced;
    const aim = (value: number) => s.blades.forEach((b) => (quick ? b.jump(value) : b.set(value)));
    stopHunt();
    if (status === "on") {
      aim(flow.current.hover ? 0.94 : 1);
      if (quick) s.live.jump(1);
      else s.live.set(1);
    } else if (status === "starting") {
      if (quick) aim(0.16);
      else {
        // Hunting: the blades open a crack and work back and forth while the camera is asked for.
        let wide = true;
        aim(0.2);
        hunt.current = setInterval(() => {
          wide = !wide;
          s.blades.forEach((b, k) => b.set((wide ? 0.21 : 0.12) + (k % 2) * 0.012));
        }, 420);
      }
    } else if (status === "off") {
      aim(flow.current.hover ? 0.05 : 0);
      if (quick) s.live.jump(0);
      else s.live.set(0);
    } else {
      // Blocked: jam() moves the blades; the picture never came.
      s.live.set(0);
    }
    latest.current.onStatusChange?.(status);
    return stopHunt;
  }, [status, getSprings]);

  // The light beside the lens: green while live, a slow amber breath while starting, two red blinks when blocked.
  React.useEffect(() => {
    const led = ledRef.current;
    if (!led || reduced) return;
    if (status === "starting") {
      const a = led.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 840, iterations: Infinity, easing: "ease-in-out" });
      return () => a.cancel();
    }
    if (status === "blocked") {
      const a = led.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 760, easing: "linear" });
      return () => a.cancel();
    }
  }, [status, reduced]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
      pending.clear();
      stopHunt();
      const s = springsRef.current;
      if (s) [...s.blades, s.press, s.tiltX, s.tiltY, s.focus, s.live, s.rattle].forEach((sp) => sp.stop());
    };
  }, []);

  const jam = () => {
    const s = getSprings();
    if (latest.current.sound) playSound("error", 0.35);
    if (latest.current.reduced) {
      s.blades.forEach((b) => b.jump(0));
      return;
    }
    // They get a little way open, catch on each other and rattle, the key shakes, then they fall shut.
    s.blades.forEach((b, k) => b.set(0.3 + (k % 3) * 0.015));
    later(() => {
      s.rattle.push(7);
      s.press.push(4);
    }, 170);
    later(() => s.rattle.push(-5), 260);
    later(() => s.blades.forEach((b) => b.set(0)), 620);
  };

  const toggle = async () => {
    if (disabled) return;
    const s = getSprings();
    const current = latest.current.status;
    const token = ++flow.current.token;
    if (current === "on" || current === "starting") {
      // Off at once: the blades close from wherever they are, keeping their speed.
      setStatus("off");
      setReason(null);
      latest.current.onOnChange?.(false);
      try {
        await latest.current.onToggle?.(false);
      } catch {}
      return;
    }
    setReason(null);
    const handler = latest.current.onToggle;
    if (!handler) {
      setStatus("on");
      openUp(s);
      latest.current.onOnChange?.(true);
      return;
    }
    setStatus("starting");
    try {
      await handler(true);
      if (token !== flow.current.token) return; // turned off again while it was starting
      setStatus("on");
      openUp(s);
      latest.current.onOnChange?.(true);
    } catch (error) {
      if (token !== flow.current.token) return;
      setReason(error instanceof Error && error.message ? error.message : null);
      setStatus("blocked");
      jam();
    }
  };

  // Opening: the picture comes in over-bright and soft, then finds its exposure and focus (one hunt past it and back).
  const openUp = (s: Springs) => {
    if (latest.current.sound) playSound("unfold", 0.3);
    if (latest.current.reduced) return;
    s.focus.jump(1);
    later(() => s.focus.set(0), 120);
  };

  // Pointer: tilt toward it, and let the blades lean the way a press would take them.
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (latest.current.reduced || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const s = getSprings();
    s.tiltX.set(clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1));
    s.tiltY.set(clamp(((event.clientY - rect.top) / rect.width) * 2 - 1, -1, 1));
  };
  const lean = () => {
    const s = getSprings();
    const st = latest.current.status;
    const { hover, down } = flow.current;
    if (st === "on") s.blades.forEach((b) => b.set(down ? 0.86 : hover ? 0.94 : 1));
    else if (st === "off") s.blades.forEach((b) => b.set(down ? 0.1 : hover ? 0.05 : 0));
  };
  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || latest.current.reduced) return;
    flow.current.hover = true;
    lean();
  };
  const onPointerLeave = () => {
    const s = getSprings();
    flow.current.hover = false;
    flow.current.down = false;
    s.tiltX.set(0);
    s.tiltY.set(0);
    s.press.set(0);
    if (!latest.current.reduced) lean();
  };
  const onPointerDown = () => {
    if (disabled) return;
    const s = getSprings();
    flow.current.down = true;
    if (!latest.current.reduced) {
      s.press.set(1);
      lean();
    }
  };
  const onPointerUp = () => {
    const s = getSprings();
    flow.current.down = false;
    s.press.set(0);
  };
  const onClick = (event: React.MouseEvent) => {
    // A keyboard press has no pointer: give the key its dip anyway.
    if (event.detail === 0 && !latest.current.reduced) getSprings().press.push(7);
    void toggle();
  };

  const line: Line = status;
  const announce = status === "on" ? words.on : status === "starting" ? words.starting : status === "blocked" ? `${words.blocked}${reason ? `: ${reason}` : ""}` : words.off;
  const fade = (ms: number, delay = 0) => (reduced ? "none" : `opacity ${ms}ms ${EASE_OUT} ${delay}ms, transform ${ms + 120}ms ${EASE_OUT} ${delay}ms, filter ${ms}ms ${EASE_OUT} ${delay}ms`);
  const lineStyle = (name: Line): React.CSSProperties => {
    const shown = name === line;
    const offset = LINES.indexOf(name) < LINES.indexOf(line) ? -5 : 5;
    return {
      opacity: shown ? 1 : 0,
      transform: shown ? "none" : `translate3d(0,${offset}px,0)`,
      filter: shown ? "blur(0px)" : "blur(3px)",
      transition: shown ? fade(280, 80) : fade(150),
    };
  };
  const ledColor =
    status === "on" ? "bg-emerald-400" : status === "starting" ? "bg-amber-400" : status === "blocked" ? "bg-red-500" : "bg-[oklch(0.3_0_0)] dark:bg-[oklch(0.22_0_0)]";
  const ledLit = status !== "off";
  const ledX = 50 + Math.cos(LED_ANGLE) * 45.6;
  const ledY = 50 + Math.sin(LED_ANGLE) * 45.6;
  const lensInset = `${50 - LENS}%`;

  return (
    <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <button
        ref={rootRef}
        type="button"
        role="switch"
        aria-checked={status === "on" || status === "starting"}
        aria-label="Camera"
        aria-busy={status === "starting" || undefined}
        aria-disabled={disabled || undefined}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className={`relative shrink-0 cursor-pointer touch-manipulation select-none rounded-full outline-none [-webkit-tap-highlight-color:transparent] aria-disabled:cursor-default aria-disabled:opacity-50 ${INTERACTION_FOCUS}`}
        style={{ width: size, height: size }}
      >
        {/* The key's shadow on the surface it sits on: it tightens when the key is pressed. */}
        <span
          ref={shadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(0_0_0/0.2),rgb(0_0_0/0.07)_62%,transparent)] blur-[3px] will-change-transform dark:bg-[radial-gradient(closest-side,rgb(0_0_0/0.6),rgb(0_0_0/0.25)_62%,transparent)]"
          style={{ transform: `translate3d(0,${size * 0.07}px,0) scale(0.9)` }}
        />
        <span ref={faceRef} aria-hidden="true" className="absolute inset-0 block rounded-full will-change-transform">
          <KeyBody id={id} />

          {/* The picture, behind the blades. */}
          <span
            className="absolute overflow-hidden rounded-full"
            style={{ left: lensInset, top: lensInset, right: lensInset, bottom: lensInset }}
          >
            <span ref={mediaRef} className="absolute inset-0 block will-change-[transform,filter,opacity]" style={{ opacity: 0 }}>
              {stream ? (
                <video ref={videoRef} muted playsInline autoPlay className={`size-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
              ) : poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" draggable={false} className={`size-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
              ) : (
                <span className="block size-full bg-[radial-gradient(circle_at_50%_40%,oklch(0.55_0.03_250),oklch(0.25_0.02_260))]" />
              )}
            </span>
            {/* The glass's own falloff toward its edge. */}
            <span className="absolute inset-0 rounded-full shadow-[inset_0_0_0.6em_0.15em_rgb(0_0_0/0.55)]" style={{ fontSize: size * 0.1 }} />
          </span>

          <Iris id={id} blades={bladeRefs} edges={edgeRefs} shades={shadeRefs} />

          <Glass id={id} glint={glintRef} coat={coatRef} ghosts={ghostsRef} />

          {/* The light that says the camera is on. */}
          <span
            ref={ledRef}
            className={`absolute rounded-full transition-[background-color,box-shadow] duration-300 ${ledColor}`}
            style={{
              width: `${4.2}%`,
              height: `${4.2}%`,
              left: `${ledX - 2.1}%`,
              top: `${ledY - 2.1}%`,
              boxShadow: ledLit
                ? `0 0 ${f(size * 0.05)}px ${f(size * 0.012)}px ${status === "on" ? "rgb(52 211 153/0.75)" : status === "starting" ? "rgb(251 191 36/0.7)" : "rgb(239 68 68/0.75)"}`
                : "inset 0 0.5px 1px rgb(0 0 0/0.6)",
            }}
          />
        </span>
      </button>

      {showLabel ? (
        <span aria-hidden="true" className="relative grid h-4 text-center text-[12.5px] leading-4 text-muted-foreground">
          {LINES.map((name) => (
            <span
              key={name}
              className={`col-start-1 row-start-1 whitespace-nowrap ${name === "blocked" ? "text-red-600 dark:text-red-400" : ""}`}
              style={lineStyle(name)}
            >
              {name === "blocked" ? reason ?? words.blocked : words[name]}
            </span>
          ))}
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {announce}
      </span>
    </span>
  );
}

export default CameraKey;
