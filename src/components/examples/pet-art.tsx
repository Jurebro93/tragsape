import type { ExamplePetKey } from "@/lib/examples";

/**
 * Crteži izmišljenih ljubimaca za primjere. Stoje umjesto fotografija: tuđe fotografije ne
 * koristimo, a ovi ljubimci ne postoje. Boje su dio crteža, pa nisu iz tokena teme.
 */

const INK = "#3A2A22";

function Eyes({ y, left, right, r = 7 }: { y: number; left: number; right: number; r?: number }) {
  return (
    <>
      <circle cx={left} cy={y} r={r} fill={INK} />
      <circle cx={right} cy={y} r={r} fill={INK} />
      <circle cx={left + r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#FFFFFF" />
      <circle cx={right + r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#FFFFFF" />
    </>
  );
}

function Dog() {
  return (
    <>
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
      <path d="M185 204Q200 197 215 204Q213 220 200 224Q187 220 185 204Z" fill={INK} />
      <path d="M200 224V234M200 234Q190 246 178 238M200 234Q210 246 222 238" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <Eyes y={178} left={170} right={230} r={7.5} />
      <path d="M150 266Q200 296 250 266" fill="none" stroke="#C2451F" strokeWidth="11" strokeLinecap="round" />
      <circle cx="200" cy="291" r="8" fill="#F8B93B" />
    </>
  );
}

function Cat() {
  return (
    <>
      <rect width="400" height="400" fill="#FFE7A8" />
      <rect x="40" y="36" width="320" height="230" rx="18" fill="#CDEAE6" />
      <path d="M200 36V266M40 150H360" stroke="#FFFAF0" strokeWidth="12" />
      <circle cx="300" cy="92" r="26" fill="#F8B93B" />
      <rect y="266" width="400" height="134" fill="#C98B3C" />
      <rect y="266" width="400" height="16" fill="#A8702C" />
      <path d="M108 400C104 320 146 286 200 286S296 320 292 400Z" fill="#8E9AA6" />
      <path d="M170 400C170 352 182 322 200 322S230 352 230 400Z" fill="#E9EDF0" />
      <path d="M132 116L150 190L204 150Z" fill="#8E9AA6" />
      <path d="M268 116L250 190L196 150Z" fill="#8E9AA6" />
      <path d="M142 138L154 178L180 158Z" fill="#F2B8B0" />
      <path d="M258 138L246 178L220 158Z" fill="#F2B8B0" />
      <ellipse cx="200" cy="214" rx="82" ry="70" fill="#8E9AA6" />
      <path d="M176 152L182 180M200 148V178M224 152L218 180" stroke="#6C7783" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="200" cy="244" rx="34" ry="24" fill="#E9EDF0" />
      <path d="M192 232H208L200 242Z" fill="#E58A84" />
      <path d="M200 242V250M200 250Q192 258 184 252M200 250Q208 258 216 252" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="168" cy="208" rx="11" ry="13" fill="#B8D36A" />
      <ellipse cx="232" cy="208" rx="11" ry="13" fill="#B8D36A" />
      <ellipse cx="168" cy="208" rx="4" ry="11" fill={INK} />
      <ellipse cx="232" cy="208" rx="4" ry="11" fill={INK} />
      <path d="M150 240H112M152 250L116 260M250 240H288M248 250L284 260" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Rabbit() {
  return (
    <>
      <rect width="400" height="400" fill="#D5ECE8" />
      <path d="M0 300C90 262 200 272 280 292S370 300 400 284V400H0Z" fill="#A9D0A4" />
      <path d="M0 344C120 318 250 334 400 316V400H0Z" fill="#7DB58B" />
      <circle cx="78" cy="330" r="9" fill="#FFFAF0" />
      <circle cx="78" cy="330" r="3.5" fill="#F8B93B" />
      <circle cx="330" cy="344" r="9" fill="#FFFAF0" />
      <circle cx="330" cy="344" r="3.5" fill="#F8B93B" />
      <path d="M150 46C132 44 124 98 138 158C146 190 178 190 180 160C184 112 172 50 150 46Z" fill="#FFFAF0" />
      <path d="M250 46C268 44 276 98 262 158C254 190 222 190 220 160C216 112 228 50 250 46Z" fill="#FFFAF0" />
      <path d="M152 74C144 76 142 110 150 150C154 166 168 164 168 150C170 116 164 76 152 74Z" fill="#F2B8B0" />
      <path d="M248 74C256 76 258 110 250 150C246 166 232 164 232 150C230 116 236 76 248 74Z" fill="#F2B8B0" />
      <path d="M104 400C100 328 146 300 200 300S300 328 296 400Z" fill="#FFFAF0" />
      <ellipse cx="200" cy="222" rx="80" ry="72" fill="#FFFAF0" />
      <ellipse cx="174" cy="252" rx="26" ry="20" fill="#F5EBDD" />
      <ellipse cx="226" cy="252" rx="26" ry="20" fill="#F5EBDD" />
      <path d="M191 232H209L200 243Z" fill="#E58A84" />
      <path d="M200 243V256" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="192" y="256" width="16" height="13" rx="3" fill="#FFFFFF" stroke="#D9CFC2" strokeWidth="2" />
      <Eyes y={206} left={164} right={236} r={8} />
      <ellipse cx="138" cy="236" rx="13" ry="8" fill="#F8C9C2" opacity="0.7" />
      <ellipse cx="262" cy="236" rx="13" ry="8" fill="#F8C9C2" opacity="0.7" />
    </>
  );
}

function Bird() {
  return (
    <>
      <rect width="400" height="400" fill="#FFE7A8" />
      <circle cx="94" cy="92" r="46" fill="#F8B93B" />
      <path d="M0 330H400" stroke="#A8702C" strokeWidth="16" strokeLinecap="round" />
      <path d="M300 330C330 300 350 262 344 238" fill="none" stroke="#7DB58B" strokeWidth="8" strokeLinecap="round" />
      <path d="M344 238C322 240 310 256 314 276C334 276 346 260 344 238Z" fill="#7DB58B" />
      <path d="M232 300L268 384L226 372L212 396L196 304Z" fill="#3F9A7A" />
      <path d="M124 250C116 196 148 150 200 150S288 200 276 262C268 304 236 328 200 328S130 300 124 250Z" fill="#7CCB6B" />
      <path d="M236 204C262 222 270 262 250 300C236 290 224 252 236 204Z" fill="#3F9A7A" />
      <path d="M244 226L262 240M240 250L258 264M238 272L250 284" stroke="#2C6E58" strokeWidth="4" strokeLinecap="round" />
      <circle cx="196" cy="140" r="62" fill="#FFE27A" />
      <path d="M156 100Q196 78 236 100M150 120Q196 96 242 120" fill="none" stroke="#3A2A22" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
      <path d="M184 150Q196 142 208 150Q206 172 196 178Q186 172 184 150Z" fill="#F2A33A" />
      <path d="M184 150Q196 142 208 150" fill="none" stroke="#8FB8E8" strokeWidth="9" strokeLinecap="round" />
      <Eyes y={134} left={168} right={224} r={7} />
      <circle cx="150" cy="158" r="5" fill="#33242B" opacity="0.6" />
      <circle cx="242" cy="158" r="5" fill="#33242B" opacity="0.6" />
      <path d="M176 328V338M168 338H184M224 328V338M216 338H232" stroke="#A8702C" strokeWidth="6" strokeLinecap="round" />
    </>
  );
}

const ART: Record<ExamplePetKey, { render: () => React.ReactNode; label: string }> = {
  medo: { render: Dog, label: "Crtež zlatnog retrivera na livadi, umjesto fotografije" },
  mrvica: { render: Cat, label: "Crtež sive mačke na prozorskoj dasci, umjesto fotografije" },
  grof: { render: Rabbit, label: "Crtež bijelog kunića u travi, umjesto fotografije" },
  kiki: { render: Bird, label: "Crtež zeleno-žute papige tigrice na grani, umjesto fotografije" },
};

export function PetArt({ pet, decorative = false }: { pet: ExamplePetKey; decorative?: boolean }) {
  const art = ART[pet];
  return (
    <svg
      viewBox="0 0 400 400"
      className="size-full"
      preserveAspectRatio="xMidYMid slice"
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": art.label })}
    >
      {art.render()}
    </svg>
  );
}
