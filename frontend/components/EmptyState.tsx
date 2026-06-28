"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-[#ebebeb] bg-[#fafafa] p-8 text-center"
    >
      <motion.div initial={{ y: 3 }} animate={{ y: 0 }} transition={{ duration: 0.2 }}>
        <Icon className="mb-4 text-[#888888]" size={32} />
      </motion.div>
      <h3 className="text-base font-medium text-[#171717]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#4d4d4d]">{body}</p>
    </motion.div>
  );
}
