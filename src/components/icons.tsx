import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PAW_PATH =
  "M32 30c-9 0-17 9-15 17 2 7 10 5 15 5s13 2 15-5c2-8-6-17-15-17zM7.5 26a5.5 7 0 1 0 11 0a5.5 7 0 1 0-11 0zM19 15a6 7.5 0 1 0 12 0a6 7.5 0 1 0-12 0zM33 15a6 7.5 0 1 0 12 0a6 7.5 0 1 0-12 0zM45.5 26a5.5 7 0 1 0 11 0a5.5 7 0 1 0-11 0z";

/** Znak brenda: srce s tri otiska. Namjerno nije šapa jedne vrste; spomeni su za sve ljubimce. */
export const LOGO_PATH =
  "M32 56C21 48.5 12 41 12 31.500C12 25.500 16.800 21.500 22 21.500C26.200 21.500 29.800 23.800 32 27.200C34.200 23.800 37.800 21.500 42 21.500C47.200 21.500 52 25.500 52 31.500C52 41 43 48.500 32 56ZM9.500 15.500a6 6.500 0 1 0 12 0a6 6.500 0 1 0-12 0zM26 9.500a6 6.500 0 1 0 12 0a6 6.500 0 1 0-12 0zM42.500 15.500a6 6.500 0 1 0 12 0a6 6.500 0 1 0-12 0z";

export function LogoMark({ size = 26, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path d={LOGO_PATH} fill="currentColor" />
    </svg>
  );
}

export function PawIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path d={PAW_PATH} fill="currentColor" />
    </svg>
  );
}

export function CandleIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 2.8c1.3 1.5 2 2.6 2 3.7a2 2 0 0 1-4 0c0-1.1.7-2.2 2-3.7z" />
      <path d="M12 8.6v2" />
      <rect x="8.5" y="10.6" width="7" height="10.6" rx="1.4" />
    </Stroke>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 20l1.2-4.4L16.4 4.4a1.7 1.7 0 0 1 2.4 0l.8.8a1.7 1.7 0 0 1 0 2.4L8.4 18.8 4 20z" />
      <path d="M14.5 6.5l3 3" />
    </Stroke>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 15V4" />
      <path d="M8 7.6L12 4l4 3.6" />
      <path d="M5 12.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5" />
    </Stroke>
  );
}

export function FlowerIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 21v-8" />
      <path d="M12 13c-3.2 0-5-2.2-5-6 1.6.2 2.8.9 3.5 2 .3-1.9.8-3.3 1.5-4.4.7 1.1 1.2 2.5 1.5 4.4.7-1.1 1.9-1.8 3.5-2 0 3.8-1.8 6-5 6z" />
      <path d="M12 18c1.6-1.8 3.2-2.4 5-2.2" />
    </Stroke>
  );
}

export function BallIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6.2c2.6 2 3.6 6.6 1.6 11.8" />
      <path d="M18 6.2c-2.6 2-3.6 6.6-1.6 11.8" />
    </Stroke>
  );
}

export function TreatIcon({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="6.4" cy="14.6" r="2.4" fill="currentColor" />
      <circle cx="9.4" cy="17.6" r="2.4" fill="currentColor" />
      <circle cx="14.6" cy="6.4" r="2.4" fill="currentColor" />
      <circle cx="17.6" cy="9.4" r="2.4" fill="currentColor" />
      <path d="M8.6 15.4l6.8-6.8" fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Stroke>
  );
}

/** Četiri kuta: prikaži sve (cijela livada). */
export function FitIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Stroke>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Stroke>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="5" y="11" width="14" height="9.5" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Stroke>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 8.5a2 2 0 0 1 2-2h1.6l1.2-1.8h6.4l1.2 1.8H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </Stroke>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7" />
    </Stroke>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5.5 21V4" />
      <path d="M5.5 5h11l-2 3.5 2 3.5h-11" />
    </Stroke>
  );
}

/** Trag šapa koji se pojačava slijeva nadesno. Boja dolazi iz `color`. */
export function PawTrail({ className }: { className?: string }) {
  const steps = [
    { x: 24, y: 18, rotate: 78, opacity: 0.35 },
    { x: 74, y: 38, rotate: 102, opacity: 0.55 },
    { x: 124, y: 18, rotate: 78, opacity: 0.8 },
    { x: 174, y: 38, rotate: 102, opacity: 1 },
  ];
  return (
    <svg width="200" height="56" viewBox="0 0 200 56" aria-hidden="true" className={className}>
      {steps.map((step) => (
        <g
          key={step.x}
          transform={`translate(${step.x} ${step.y}) rotate(${step.rotate}) scale(0.4) translate(-32 -32)`}
          opacity={step.opacity}
        >
          <path d={PAW_PATH} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
