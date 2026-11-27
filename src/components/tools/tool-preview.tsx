import { catToHumanYears } from "@/lib/tools/cat-age";
import { buildCondolences } from "@/lib/tools/condolence";
import { buildDedications } from "@/lib/tools/dedication";
import { DOG_HUMAN_YEARS, DOG_SIZES } from "@/lib/tools/dog-age";
import { FAREWELL_WAYS } from "@/lib/tools/farewell";
import type { ToolSlug } from "@/lib/tools/registry";
import { tools } from "@/messages/hr/tools";

const t = tools.index.preview;

/** Brojke za pregled pseće dobi: pas od deset godina po veličini, iz iste tablice AKC-a kao alat. */
const DOG_AGE_YEARS = 10;
/** Dobi mačke za pregled, u godinama; vrijednosti računa ista funkcija kao alat. */
const CAT_AGES = [1, 2, 10, 15] as const;

/**
 * Mali pregled onoga što alat daje, izračunat istim kodom kao sam alat.
 * Primjeri teksta slažu se iz primjera upisa koje alat i sam nudi u poljima, pa ništa nije izmišljeno.
 */
export function ToolPreview({ slug }: { slug: ToolSlug }) {
  switch (slug) {
    case "psece-godine": {
      const values = DOG_SIZES.map((size) => ({ size, years: DOG_HUMAN_YEARS[size][DOG_AGE_YEARS - 1] }));
      const max = Math.max(...values.map((value) => value.years));
      return (
        <Panel tone="butter" caption={t.dogCaption}>
          <ul className="flex flex-col gap-2">
            {values.map((value) => (
              <li key={value.size} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="font-semibold">{tools.dogAge.form.sizes[value.size].label}</span>
                <span className="h-3 rounded-full bg-white">
                  <span
                    className="block h-3 rounded-full bg-terracotta"
                    style={{ width: `${Math.round((value.years / max) * 100)}%` }}
                  />
                </span>
                <span className="text-right font-bold tabular-nums">{value.years}</span>
              </li>
            ))}
          </ul>
        </Panel>
      );
    }
    case "macje-godine":
      return (
        <Panel tone="mint" caption={t.catCaption}>
          <ul className="grid grid-cols-4 gap-2 text-center">
            {CAT_AGES.map((age) => (
              <li key={age} className="flex flex-col gap-0.5 rounded-2xl bg-white px-1 py-2.5">
                <span className="text-xs text-plum-soft">{age === 1 ? t.catOneYear : `${age} ${t.catYears}`}</span>
                <span className="font-display text-2xl font-extrabold tabular-nums">
                  {Math.round(catToHumanYears(age * 12).humanYears)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      );
    case "posveta": {
      const form = tools.dedication.form;
      const [sample] = buildDedications({
        name: t.sampleName,
        tone: "warm",
        voice: "we",
        parts: { habit: form.topics.habit.placeholder, thanks: form.topics.thanks.placeholder },
      });
      return (
        <Panel tone="vanilla" caption={t.exampleCaption}>
          <blockquote className="line-clamp-4 font-display text-lg font-extrabold leading-snug">„{sample}”</blockquote>
        </Panel>
      );
    }
    case "sucut": {
      const [sample] = buildCondolences({
        relation: "friend",
        familiarity: "well",
        tone: "warm",
        address: "ti",
        petName: t.sampleName,
        memory: tools.condolence.form.memoryPlaceholder,
      });
      return (
        <Panel tone="mint" caption={t.exampleCaption}>
          <p className="line-clamp-4 rounded-[20px_20px_20px_6px] bg-white px-4 py-3 text-sm leading-relaxed">{sample}</p>
        </Panel>
      );
    }
    case "oprostaj":
      return (
        <Panel tone="butter" caption={t.farewellCaption}>
          <ul className="flex flex-wrap gap-1.5">
            {FAREWELL_WAYS.map((way) => (
              <li key={way} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold">
                {tools.farewell.ways[way].title}
              </li>
            ))}
          </ul>
        </Panel>
      );
    default:
      return null;
  }
}

const TONES = {
  butter: "bg-butter",
  mint: "bg-mint",
  vanilla: "bg-vanilla",
} as const;

function Panel({ tone, caption, children }: { tone: keyof typeof TONES; caption: string; children: React.ReactNode }) {
  return (
    <div className={`flex min-h-44 flex-col justify-between gap-3 rounded-[20px] p-4 ${TONES[tone]}`}>
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-plum-soft">{caption}</span>
      {children}
    </div>
  );
}
