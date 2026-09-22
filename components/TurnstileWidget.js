'use client';

import Script from 'next/script';
import { useEffect, useId, useRef } from 'react';

export default function TurnstileWidget({ onToken }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const rawId = useId();
  const id = `turnstile-${rawId.replace(/:/g, '')}`;
  const rendered = useRef(false);

  useEffect(() => {
    if (!siteKey || rendered.current) return;

    const attempt = () => {
      if (!window.turnstile || rendered.current) return false;
      window.turnstile.render(`#${id}`, {
        sitekey: siteKey,
        theme: 'light',
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
      rendered.current = true;
      return true;
    };

    if (attempt()) return;
    const timer = window.setInterval(() => {
      if (attempt()) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [id, onToken, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="mt-5 rounded-xl bg-white/10 p-4">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div id={id} />
    </div>
  );
}
