"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** True ako je provjera uključena; obrazac tada mora poslati token. */
export const turnstileEnabled = SITE_KEY !== "";

/**
 * Cloudflare Turnstile za javne obrasce. Bez javnog ključa ne prikazuje ništa i ne učitava
 * nikakvu skriptu; tada štite zamka, vrijeme ispunjavanja i ograničenje učestalosti.
 */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileEnabled) {
      return;
    }
    let cancelled = false;
    const mount = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) {
        return;
      }
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: SITE_KEY,
        language: "hr",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };
    mount();
    const timer = window.setInterval(mount, 300);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [onToken]);

  if (!turnstileEnabled) {
    return null;
  }
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={container} className="min-h-[65px]" />
    </>
  );
}
