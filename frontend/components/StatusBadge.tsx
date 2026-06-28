"use client";

import { motion } from "motion/react";
import clsx from "@/lib/clsx";

const styles: Record<string, string> = {
  indexed: "border-[#d3e5ff] bg-[#eef6ff] text-[#0761d1]",
  processing: "border-[#ffefcf] bg-[#fff8ea] text-[#ab570a]",
  uploaded: "border-[#d3e5ff] bg-[#eef6ff] text-[#0761d1]",
  failed: "border-[#f7d4d6] bg-[#fff5f5] text-[#c50000]",
  coming_soon: "border-[#ebebeb] bg-[#fafafa] text-[#4d4d4d]"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <motion.span
      data-anime-reveal
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16 }}
      className={clsx("inline-flex rounded-full border px-2.5 py-1 font-mono text-xs", styles[status] ?? styles.coming_soon)}
    >
      {status.replace("_", " ")}
    </motion.span>
  );
}
