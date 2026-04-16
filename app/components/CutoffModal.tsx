"use client";

import { AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";

interface CutoffModalProps {
  onClose: () => void;
}

export default function CutoffModal({ onClose }: CutoffModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-[#151515] p-6 rounded-[2rem] max-w-sm w-full shadow-[8px_8px_0px_#1a1a1a] border-4 border-[#1A1A1A] dark:border-[#333] dark:shadow-[8px_8px_0px_#000]"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="bg-[#FF0055] text-white p-3 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1a1a1a]">
            <AlertCircle strokeWidth={3} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <h3 className="font-serif text-2xl font-black mb-2 tracking-tight">Sleep Shield Active</h3>
        <p className="font-sans text-sm opacity-70 mb-6 leading-relaxed">
          We've clipped any doses past 18:00 from your timeline. Get some rest tonight!
        </p>
        <button
          onClick={onClose}
          className="w-full bg-[#1A1A1A] dark:bg-[#F4F4F0] text-white dark:text-[#1A1A1A] py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity"
        >
          Understood
        </button>
      </motion.div>
    </motion.div>
  );
}