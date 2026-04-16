import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlayfulToastProps {
  word: string;
  themeColorClass: string;
}

const particles = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  angle: (i * 360) / 12,
  distance: 60 + Math.random() * 40,
  scale: 0.5 + Math.random() * 0.8,
  delay: Math.random() * 0.1,
}));

export function PlayfulToast({ word, themeColorClass }: PlayfulToastProps) {
  return (
    <motion.div
      className="fixed top-10 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      initial={{ y: -100, opacity: 0, scale: 0.5, rotate: -10 }}
      animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
      exit={{ y: -50, opacity: 0, scale: 0.8, rotate: 5 }}
      transition={{
        type: "spring",
        damping: 12,
        stiffness: 300,
        mass: 0.8,
      }}
    >
      <div className="relative">
        {/* Particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          {particles.map((particle) => {
            const x = Math.cos((particle.angle * Math.PI) / 180) * particle.distance;
            const y = Math.sin((particle.angle * Math.PI) / 180) * particle.distance;

            return (
              <motion.div
                key={particle.id}
                className={cn("absolute w-3 h-3 rounded-sm border-2 border-[#1A1A1A] dark:border-[#333]", themeColorClass)}
                initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
                animate={{
                  x,
                  y,
                  scale: [0, particle.scale, 0],
                  rotate: particle.angle + 180,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: particle.delay,
                  ease: "easeOut",
                }}
              />
            );
          })}
        </div>

        {/* Toast Body */}
        <motion.div
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-full border-4 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_#1a1a1a] dark:shadow-[8px_8px_0px_#000] text-white relative z-10",
            themeColorClass
          )}
          initial={{ scale: 0.8 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3, times: [0, 0.5, 1] }}
        >
          <div className="bg-white/20 p-1.5 rounded-full">
            <Check className="w-5 h-5" strokeWidth={4} />
          </div>
          <span className="font-serif text-lg sm:text-xl md:text-2xl font-black tracking-tighter uppercase whitespace-nowrap pt-1">
            {word}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
