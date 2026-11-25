/** Crtež izmišljenog ljubimca za stranicu primjera. Stoji umjesto fotografije. */
export function ExampleIllustration() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="size-full"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Crtež zlatnog retrivera na livadi, umjesto fotografije"
    >
      <rect width="400" height="400" fill="#CDEAE6" />
      <circle cx="296" cy="100" r="40" fill="#F8B93B" />
      <path d="M0 286C80 240 170 250 240 278S360 296 400 262V400H0Z" fill="#A9D0A4" />
      <path d="M0 336C110 304 230 322 400 300V400H0Z" fill="#7DB58B" />
      <path d="M96 400C96 318 140 282 200 282S304 318 304 400Z" fill="#E2A857" />
      <path d="M168 400C168 350 180 318 200 318S232 350 232 400Z" fill="#F3D9A6" />
      <path d="M128 138C92 136 76 188 88 238C94 264 122 262 134 232C144 206 146 164 128 138Z" fill="#C98B3C" />
      <path d="M272 138C308 136 324 188 312 238C306 264 278 262 266 232C256 206 254 164 272 138Z" fill="#C98B3C" />
      <ellipse cx="200" cy="186" rx="78" ry="76" fill="#E2A857" />
      <ellipse cx="200" cy="222" rx="40" ry="32" fill="#F3D9A6" />
      <path d="M185 204Q200 197 215 204Q213 220 200 224Q187 220 185 204Z" fill="#3A2A22" />
      <path
        d="M200 224V234M200 234Q190 246 178 238M200 234Q210 246 222 238"
        fill="none"
        stroke="#3A2A22"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="170" cy="178" r="7.5" fill="#3A2A22" />
      <circle cx="230" cy="178" r="7.5" fill="#3A2A22" />
      <circle cx="172.5" cy="175.5" r="2.2" fill="#FFFFFF" />
      <circle cx="232.5" cy="175.5" r="2.2" fill="#FFFFFF" />
      <path d="M150 266Q200 296 250 266" fill="none" stroke="#C2451F" strokeWidth="11" strokeLinecap="round" />
      <circle cx="200" cy="291" r="8" fill="#F8B93B" />
    </svg>
  );
}
