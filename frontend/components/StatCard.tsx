"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <motion.div
      data-anime-reveal
      data-anime-hover
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <span className="min-w-0 text-sm text-[#4d4d4d]">{label}</span>
        <Icon size={18} className="text-[#0070f3]" />
      </div>
      <div className="break-words text-2xl font-semibold text-[#171717] sm:text-3xl">{value}</div>
    </motion.div>
  );
}
