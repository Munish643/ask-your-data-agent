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
      className="rounded-lg border border-[#ebebeb] bg-white p-5 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]"
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm text-[#4d4d4d]">{label}</span>
        <Icon size={18} className="text-[#0070f3]" />
      </div>
      <div className="text-3xl font-semibold text-[#171717]">{value}</div>
    </motion.div>
  );
}
