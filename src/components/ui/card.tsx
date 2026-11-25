import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-white p-5", className)} {...props} />;
}

export function Chip({ className, tone = "butter", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: "butter" | "mint" | "teal" }) {
  const tones = {
    butter: "bg-butter text-plum",
    mint: "bg-mint text-plum",
    teal: "bg-teal text-white",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3.5 py-1.5 text-[15px] font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

/** Mala natpisna oznaka iznad naslova. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-[13px] font-bold uppercase tracking-[0.08em] text-terracotta-deep", className)}
      {...props}
    />
  );
}
