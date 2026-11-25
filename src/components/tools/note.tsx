import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Mirna napomena uz rezultat (npr. „ne zamjenjuje veterinara"). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-3xl bg-mint px-5 py-4 text-[15px] font-semibold leading-relaxed", className)}>
      {children}
    </p>
  );
}
