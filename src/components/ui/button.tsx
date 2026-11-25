import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { AttributedLink } from "@/components/attributed-link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "light" | "quiet";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold text-[15px] leading-tight text-center no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-terracotta text-white hover:bg-terracotta-deep",
  secondary: "border-2 border-plum bg-white text-plum hover:bg-butter",
  light: "bg-white text-plum hover:bg-butter",
  quiet: "text-teal underline underline-offset-4 hover:text-teal-deep",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5",
  lg: "min-h-14 px-6",
};

export function buttonClass(variant: Variant = "primary", size: Size = "lg", className?: string) {
  return cn(base, variants[variant], variant === "quiet" ? "min-h-11 px-1" : sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  /** Poveznica sa sobom nosi izvor posjeta iz adrese (članak, alat, UTM). Za pozive na izradu i kupnju. */
  carry?: boolean;
};

export function ButtonLink({ variant, size, className, carry, ...props }: ButtonLinkProps) {
  if (carry && typeof props.href === "string") {
    return (
      <AttributedLink href={props.href} className={buttonClass(variant, size, className)}>
        {props.children}
      </AttributedLink>
    );
  }
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
