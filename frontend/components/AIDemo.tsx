"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Layers } from "lucide-react";

interface Chip {
  label: string;
  tone?: "cool" | "warm" | "hot";
}

interface Example {
  text: string;
  chips: Chip[];
  note: string;
}

const EXAMPLES: Example[] = [
  {
    text: "Internet keeps disconnecting near the lab, cannot join online classes.",
    chips: [
      { label: "📶 Network & Wi-Fi", tone: "cool" },
      { label: "Medium severity", tone: "warm" },
      { label: "Priority 61", tone: "hot" },
      { label: "Routed → IT Services" },
    ],
    note: "Matched to 2 similar reports — merged into 1 systemic issue",
  },
  {
    text: "Exposed live wiring near the electrical panel in the basement.",
    chips: [
      { label: "⚡ Electrical", tone: "cool" },
      { label: "Critical severity", tone: "hot" },
      { label: "Priority 100", tone: "hot" },
      { label: "Routed → Facilities" },
    ],
    note: "Flagged as top priority — immediate safety risk",
  },
  {
    text: "Broken chair with a sharp exposed edge in room 204.",
    chips: [
      { label: "🪑 Furniture & Fixtures", tone: "cool" },
      { label: "Medium severity", tone: "warm" },
      { label: "Priority 47" },
      { label: "Routed → Facilities" },
    ],
    note: "No similar reports found — filed as a new issue",
  },
];

type Phase = "typing" | "chips" | "hold";

const TYPE_SPEED_MS = 18;
const CHIP_REVEAL_DELAY_MS = 300;
const HOLD_MS = 2400;

export default function AIDemo() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  const example = EXAMPLES[index];

  // Typewriter effect for the input line.
  useEffect(() => {
    setTyped("");
    setPhase("typing");
    let i = 0;
    const text = EXAMPLES[index].text;
    const timer = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        window.setTimeout(() => setPhase("chips"), CHIP_REVEAL_DELAY_MS);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(timer);
  }, [index]);

  // After chips finish staggering in, hold, then move to the next example.
  useEffect(() => {
    if (phase !== "chips") return;
    const t = window.setTimeout(() => setPhase("hold"), example.chips.length * 130 + 200);
    return () => clearTimeout(t);
  }, [phase, example.chips.length]);

  useEffect(() => {
    if (phase !== "hold") return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % EXAMPLES.length), HOLD_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const showChips = phase === "chips" || phase === "hold";

  return (
    <div className="ai-demo">
      <div className="ai-demo-dots">
        <span style={{ background: "#ef4444" }} />
        <span style={{ background: "#f59e0b" }} />
        <span style={{ background: "#10b981" }} />
      </div>
      <div className="ai-demo-label">
        <Brain size={13} /> AI understands this in real time
      </div>
      <div className="ai-demo-input">
        &ldquo;{typed}
        {phase === "typing" && <span className="ai-cursor" />}
        &rdquo;
      </div>

      <AnimatePresence mode="wait">
        {showChips && (
          <motion.div
            key={index}
            className="ai-demo-chips"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.13 } } }}
          >
            {example.chips.map((chip) => (
              <motion.span
                key={chip.label}
                className={`ai-demo-chip ${chip.tone ?? ""}`}
                variants={{
                  hidden: { opacity: 0, y: 8, scale: 0.92 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 350, damping: 22 }}
              >
                {chip.label}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "hold" && (
          <motion.div
            className="ai-demo-foot"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Layers size={14} /> {example.note}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
