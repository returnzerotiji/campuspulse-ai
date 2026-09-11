"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Fades/slides an element in once it scrolls into view. Belt-and-suspenders
 * against ever getting stuck invisible: besides the normal viewport trigger,
 * a short fallback timer force-reveals the content regardless, so a missed
 * or delayed intersection observer callback can never permanently hide it. */
export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start({ opacity: 1, y: 0 });
  }, [inView, controls]);

  useEffect(() => {
    const fallback = setTimeout(() => controls.start({ opacity: 1, y: 0 }), 1000 + delay * 1000);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={controls}
      transition={{ duration: 0.5, delay, ease: [0.21, 0.8, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
