"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` whenever `value` changes. Falls back to
 * rendering `value` immediately for non-numeric strings (e.g. "-"). */
export default function AnimatedNumber({ value, duration = 700 }: { value: string | number; duration?: number }) {
  const numeric = typeof value === "number" ? value : parseFloat(value);
  const isNumeric = !Number.isNaN(numeric) && typeof value !== "boolean";
  const [display, setDisplay] = useState(isNumeric ? 0 : value);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!isNumeric) {
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = numeric;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(Number.isInteger(to) ? Math.round(current) : Math.round(current * 10) / 10);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeric, isNumeric]);

  return <>{display}</>;
}
