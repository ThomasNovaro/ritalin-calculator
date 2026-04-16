"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Clock, Target, RotateCcw, Check, Eye, EyeOff, Pill, Bell, BellRing, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PokeballIcon = ({ className, "aria-hidden": ariaHidden }: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden={ariaHidden}>
    <g transform="rotate(45 12 12)">
      <rect x="7" y="3" width="10" height="18" rx="5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 12h2.5 M14.5 12h2.5" />
    </g>
  </svg>
);

type Level = "Charmander" | "Charmeleon" | "Charizard";

interface DoseInfo {
  doseNumber: number;
  timeLabel: string;
  portions: number;
  isNextDay: boolean;
  actualTimeMs: number;
}

const PROTOCOLS: Record<Level, { maxDoses: number; portions: number[] }> = {
  Charmander: { maxDoses: 6, portions: [1, 1, 1, 1, 1, 1] },
  Charmeleon: { maxDoses: 4, portions: [1, 2, 2, 1] },
  Charizard: { maxDoses: 3, portions: [2, 2, 2] },
};

const THEMES: Record<Level, { bg: string; text: string; border: string; intensity: number; label: string }> = {
  Charmander: {
    bg: "bg-[#FF5E00]",
    text: "text-[#FF5E00]",
    border: "border-[#FF5E00]",
    intensity: 1,
    label: "Soft Focus"
  },
  Charmeleon: {
    bg: "bg-[#FF0055]",
    text: "text-[#FF0055]",
    border: "border-[#FF0055]",
    intensity: 2,
    label: "Deep Work"
  },
  Charizard: {
    bg: "bg-[#7000FF]",
    text: "text-[#7000FF]",
    border: "border-[#7000FF]",
    intensity: 3,
    label: "Overdrive"
  },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const COMPLETION_MESSAGES = [
  "You're an absolute legend! ⚡️",
  "Incredible focus today! 🧠",
  "Unstoppable energy! 🔥",
  "You absolutely crushed this! 🎯",
  "Protocol flawlessly executed! 🚀"
];

const MOTIVATIONAL_WORDS = [
  "BOOM!",
  "CRUSHED IT!",
  "LET'S GO!",
  "NAILED IT!",
  "SHARP!",
  "FOCUS UP!",
  "LOCKED IN!"
];

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlLevel = (searchParams.get("level") as Level) || "Charmander";
  const urlTime = searchParams.get("time") || "";

  const [level, setLevelState] = useState<Level>(urlLevel);
  const [startTime, setStartTimeState] = useState<string>(urlTime);
  const [mounted, setMounted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, number>>({});
  const [animatingStep, setAnimatingStep] = useState<{ step: number, word: string } | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(true);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateUrl = useCallback((newLevel: Level, newTime: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("level", newLevel);
    if (newTime) {
      params.set("time", newTime);
    } else {
      params.delete("time");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setLevel = (newLevel: Level) => {
    setLevelState(newLevel);
    updateUrl(newLevel, startTime);
  };

  const setStartTime = (newTime: string) => {
    setStartTimeState(newTime);
    updateUrl(level, newTime);
  };

  useEffect(() => {
    setMounted(true);
    if (!urlTime) {
      const savedTime = localStorage.getItem("pokeMed_startTime");
      const savedLevel = localStorage.getItem("pokeMed_level") as Level | null;
      if (savedTime && savedLevel) {
        setStartTimeState(savedTime);
        setLevelState(savedLevel);
        updateUrl(savedLevel, savedTime);
      }
    } else {
      setStartTimeState(urlTime);
      setLevelState(urlLevel);
    }

    const savedSteps = localStorage.getItem("pokeMed_completedSteps_v2");
    const savedNotifs = localStorage.getItem("pokeMed_notifications");

    if (savedSteps) {
      try {
        setCompletedSteps(JSON.parse(savedSteps));
      } catch (e) {}
    }

    if (savedNotifs === "true" && "Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (mounted && startTime) {
      localStorage.setItem("pokeMed_startTime", startTime);
      localStorage.setItem("pokeMed_level", level);
    }
  }, [startTime, level, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("pokeMed_completedSteps_v2", JSON.stringify(completedSteps));
    }
  }, [completedSteps, mounted]);

  const handleReset = () => {
    if (Object.keys(completedSteps).length > 0) {
      if (!confirm("Are you sure you want to reset your entire schedule? This action cannot be undone.")) return;
    }
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps({});
    setAnimatingStep(null);
    setShowFullSchedule(true);
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
    localStorage.removeItem("pokeMed_cutoffModalShown");
  };

  const completeStep = (step: number) => {
    if (completedSteps[step] || animatingStep) return;
    
    const word = MOTIVATIONAL_WORDS[Math.floor(Math.random() * MOTIVATIONAL_WORDS.length)];
    setAnimatingStep({ step, word });
    
    setTimeout(() => {
      const now = new Date().getTime();
      setCompletedSteps((prev) => ({ ...prev, [step]: now }));
      setAnimatingStep(null);
    }, 1200);
  };

  const setNow = () => {
    const now = new Date();
    setStartTime(timeFormatter.format(now));
  };

  const startSchedule = () => {
    if (!startTime) return;
    const [hoursStr, minutesStr] = startTime.split(":");
    const now = new Date();
    now.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    setCompletedSteps((prev) => ({ ...prev, [1]: now.getTime() }));
  };

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification.");
      return;
    }

    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem("pokeMed_notifications", "false");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      localStorage.setItem("pokeMed_notifications", "true");
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("pokeMed_notifications", "true");
      }
    }
  };

  const isStarted = !!completedSteps[1];

  const schedule: DoseInfo[] = (() => {
    if (!mounted || !startTime) return [];
    const [hoursStr, minutesStr] = startTime.split(":");
    const startHours = parseInt(hoursStr, 10);
    const startMinutes = parseInt(minutesStr, 10);
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHours, startMinutes, 0);

    const protocol = PROTOCOLS[level];
    const generated: DoseInfo[] = [];

    let currentBaseTime = baseDate.getTime();
    let previousPortions = 0;
    let hitCutoff = false;

    for (let i = 0; i < protocol.maxDoses; i++) {
      const doseNumber = i + 1;
      let doseTimeMs: number;

      if (i === 0) {
        doseTimeMs = currentBaseTime;
      } else {
        const gapMinutes = previousPortions === 1 ? 105 : 210;
        doseTimeMs = currentBaseTime + gapMinutes * 60000;
      }

      const doseDate = new Date(doseTimeMs);

      if (doseDate.getHours() >= 18) {
        hitCutoff = true;
        break;
      }

      const isNextDay = doseDate.getFullYear() > baseDate.getFullYear() || doseDate.getMonth() > baseDate.getMonth() || doseDate.getDate() > baseDate.getDate();

      generated.push({
        doseNumber,
        timeLabel: timeFormatter.format(doseDate),
        portions: protocol.portions[i],
        isNextDay,
        actualTimeMs: doseTimeMs,
      });

      previousPortions = protocol.portions[i];
      if (completedSteps[doseNumber]) {
        currentBaseTime = completedSteps[doseNumber];
      } else {
        currentBaseTime = doseTimeMs;
      }
    }

    if (isStarted && hitCutoff && generated.length > 0 && !localStorage.getItem("pokeMed_cutoffModalShown")) {
      setTimeout(() => {
        setShowCutoffModal(true);
        localStorage.setItem("pokeMed_cutoffModalShown", "true");
      }, 0);
    }

    return generated;
  })();

  useEffect(() => {
    if (!notificationsEnabled || schedule.length === 0 || !isStarted) return;
    const nextDose = schedule.find((d) => !completedSteps[d.doseNumber]);
    if (!nextDose) return;

    const now = new Date().getTime();
    const timeUntilDose = nextDose.actualTimeMs - now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timeUntilDose > 0) {
      timeoutRef.current = setTimeout(() => {
        new Notification("Time for your next Ritalin!", {
          body: `Dose ${nextDose.doseNumber}: ${nextDose.portions} pill(s). Grab some water!`,
        });
      }, timeUntilDose);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [schedule, completedSteps, notificationsEnabled, isStarted]);

  const totalPortions = schedule.reduce((sum, dose) => sum + dose.portions, 0);
  const completedPortions = schedule.filter((dose) => completedSteps[dose.doseNumber]).reduce((sum, dose) => sum + dose.portions, 0);
  const nextDose = schedule.find((d) => !completedSteps[d.doseNumber]);
  const isAllComplete = schedule.length > 0 && schedule.every(d => completedSteps[d.doseNumber]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-[100dvh] pb-24 overflow-x-hidden font-sans bg-[#F4F4F0] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F4F4F0] antialiased selection:bg-[#FF5E00] selection:text-white">
      {/* Background glow based on level */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-start">
        <div className={cn("absolute -top-[30%] w-[120vw] h-[60vw] blur-[120px] opacity-[0.15] dark:opacity-[0.25] transition-colors duration-1000 rounded-full", THEMES[level].bg)} />
      </div>

      <AnimatePresence>
        {showCutoffModal && (
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
                <button onClick={() => setShowCutoffModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h3 className="font-serif text-2xl font-black mb-2 tracking-tight">Sleep Shield Active</h3>
              <p className="font-sans text-sm opacity-70 mb-6 leading-relaxed">
                We've clipped any doses past 18:00 from your timeline. Get some rest tonight!
              </p>
              <button
                onClick={() => setShowCutoffModal(false)}
                className="w-full bg-[#1A1A1A] dark:bg-[#F4F4F0] text-white dark:text-[#1A1A1A] py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-opacity"
              >
                Understood
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-md mx-auto w-full px-5 pt-8 space-y-10">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="font-serif text-4xl font-black tracking-tighter leading-none">Poké<br/><span className={THEMES[level].text}>Med.</span></h1>
            <p className="font-sans font-bold text-[10px] uppercase tracking-widest opacity-50 mt-2">Daily Schedule</p>
          </div>
          <div className={cn("p-3 rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] text-white shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] transition-colors duration-500", THEMES[level].bg)}>
            <PokeballIcon className="w-8 h-8" />
          </div>
        </header>

        {!isStarted && (
          <motion.section layout className="space-y-8">
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-black tracking-tight">Protocol</h2>
              <div className="grid grid-cols-3 gap-3">
                {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => {
                  const isActive = level === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 min-h-[140px] rounded-[1.5rem] border-4 transition-all duration-300 outline-none",
                        isActive 
                          ? cn("border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] scale-100", THEMES[l].bg, "text-white z-10") 
                          : "border-[#1A1A1A]/10 dark:border-white/10 hover:border-[#1A1A1A]/30 bg-white dark:bg-[#151515] scale-[0.96] hover:scale-100 opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="flex gap-1 mb-3">
                        {Array.from({ length: THEMES[l].intensity }).map((_, i) => (
                          <Target key={i} className={cn("w-5 h-5", isActive ? "text-white" : THEMES[l].text)} strokeWidth={3} />
                        ))}
                      </div>
                      <div className="font-sans font-black text-[10px] uppercase tracking-widest">{l}</div>
                      <div className="font-sans text-[8px] font-bold opacity-70 uppercase tracking-widest mt-2">{THEMES[l].label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="font-serif text-2xl font-black tracking-tight block">First Intake Time</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:flex-1">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none opacity-40">
                    <Clock className="w-5 h-5" strokeWidth={3} />
                  </div>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-14 pr-4 py-5 rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] bg-white dark:bg-[#151515] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] focus:outline-none focus:translate-y-[2px] focus:shadow-[2px_2px_0px_#1a1a1a] transition-all font-serif text-2xl font-black tabular-nums"
                  />
                </div>
                <button
                  onClick={setNow}
                  className="w-full sm:w-auto px-6 py-5 rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] bg-[#1A1A1A] dark:bg-[#F4F4F0] text-[#F4F4F0] dark:text-[#1A1A1A] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-[2px_2px_0px_#1a1a1a] transition-all font-black uppercase tracking-widest text-xs"
                >
                  Now
                </button>
              </div>
            </div>

            {startTime && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={startSchedule}
                className={cn(
                  "w-full py-6 rounded-3xl border-4 border-[#1A1A1A] dark:border-[#333] text-white shadow-[6px_6px_0px_#1a1a1a] dark:shadow-[6px_6px_0px_#000] active:translate-y-[4px] active:shadow-[2px_2px_0px_#1a1a1a] transition-all flex items-center justify-center gap-3 font-black text-xl tracking-tight uppercase",
                  THEMES[level].bg
                )}
              >
                <Pill className="w-6 h-6" strokeWidth={3} />
                Engage Protocol
              </motion.button>
            )}
          </motion.section>
        )}

        {isStarted && !isAllComplete && nextDose && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className={cn(
              "p-8 rounded-[2rem] border-4 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_#1a1a1a] dark:shadow-[8px_8px_0px_#000] overflow-hidden bg-white dark:bg-[#111]"
            )}>
              {/* Decorative intense background shape */}
              <div className={cn("absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-[0.15] pointer-events-none", THEMES[level].bg)} />
              
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <p className={cn("font-sans text-[10px] font-black uppercase tracking-widest mb-3", THEMES[level].text)}>
                    Next Dose • {nextDose.portions} Pill{nextDose.portions > 1 ? 's' : ''}
                  </p>
                  <h2 className="font-serif text-6xl font-black tracking-tighter tabular-nums leading-none">
                    {nextDose.timeLabel}
                  </h2>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => completeStep(nextDose.doseNumber)}
                  disabled={!!animatingStep}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center border-4 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] active:shadow-[0px_0px_0px_#1a1a1a] active:translate-y-1 transition-all text-white",
                    THEMES[level].bg,
                    !!animatingStep && "opacity-50 pointer-events-none scale-95"
                  )}
                >
                  <Check className="w-10 h-10" strokeWidth={4} />
                </motion.button>
              </div>

              <AnimatePresence>
                {animatingStep?.step === nextDose.doseNumber && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1.2, opacity: 1, rotate: Math.random() * 20 - 10 }}
                    exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)" }}
                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                    className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm"
                  >
                    <div className={cn(
                      "px-6 py-3 rounded-2xl border-4 border-[#1A1A1A] shadow-[8px_8px_0px_#1a1a1a] dark:shadow-[8px_8px_0px_#000] text-white rotate-[-5deg]",
                      THEMES[level].bg
                    )}>
                      <h3 className="font-serif text-4xl font-black tracking-tighter uppercase whitespace-nowrap">
                        {animatingStep.word}
                      </h3>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex justify-between items-center mt-6 px-2">
              <span className="font-sans font-bold text-[10px] tracking-widest uppercase opacity-50">
                Daily Progress
              </span>
              <span className="font-serif font-black text-xl">
                {completedPortions} / {totalPortions} Pills
              </span>
            </div>
          </motion.section>
        )}

        {isAllComplete && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative p-8 rounded-[2rem] border-4 border-[#1A1A1A] bg-[#00FF66] text-[#1A1A1A] shadow-[8px_8px_0px_#1a1a1a] text-center overflow-hidden"
          >
            {/* Background rays for completion */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="w-[150%] aspect-square" style={{ background: "conic-gradient(transparent 0deg, #1A1A1A 90deg, transparent 180deg, #1A1A1A 270deg, transparent 360deg)" }} />
            </div>
            
            <div className="relative z-10">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ 
                  scale: { type: "spring", stiffness: 200, damping: 10 },
                  rotate: { type: "keyframes", duration: 0.5, ease: "easeInOut" }
                }}
                className="w-24 h-24 mx-auto border-4 border-[#1A1A1A] bg-white rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1a1a1a]"
              >
                <Check className="w-12 h-12" strokeWidth={4} />
              </motion.div>
              <h2 className="font-serif text-4xl font-black tracking-tighter mb-3 leading-none">Protocol<br/>Complete.</h2>
              <p className="font-sans font-bold text-[12px] uppercase tracking-widest opacity-80 bg-[#1A1A1A]/10 py-2 px-4 rounded-xl inline-block mt-2 border-2 border-[#1A1A1A]/20">
                {COMPLETION_MESSAGES[Math.floor(completedSteps[1] || 0) % COMPLETION_MESSAGES.length]}
              </p>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                className="mt-8 w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[4px_4px_0px_rgba(0,0,0,0.3)] border-2 border-[#1A1A1A] flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" strokeWidth={3} />
                Start New Day
              </motion.button>
            </div>
          </motion.div>
        )}

        {isStarted && (
          <motion.section layout className="pt-4 space-y-6">
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="font-sans font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 flex items-center gap-2 transition-opacity"
              >
                {showFullSchedule ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showFullSchedule ? "Hide Stack" : "Show Stack"}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleNotifications}
                  className={cn(
                    "p-3 rounded-[1rem] border-2 transition-all active:scale-90",
                    notificationsEnabled 
                      ? "border-[#1A1A1A] bg-[#1A1A1A] text-white dark:border-[#F4F4F0] dark:bg-[#F4F4F0] dark:text-[#1A1A1A]" 
                      : "border-[#1A1A1A]/20 dark:border-white/20 opacity-50 hover:opacity-100"
                  )}
                >
                  {notificationsEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-3 rounded-[1rem] border-2 border-[#FF0055]/30 text-[#FF0055] hover:bg-[#FF0055]/10 active:scale-90 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFullSchedule && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative flex flex-col pt-4"
                >
                  {schedule.map((dose, index) => {
                    const isCompleted = !!completedSteps[dose.doseNumber];
                    const isNext = nextDose?.doseNumber === dose.doseNumber;
                    // Stacking effect calculations
                    const reverseIndex = schedule.length - index;
                    
                    return (
                      <motion.div
                        key={dose.doseNumber}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                        className={cn(
                          "relative p-5 rounded-[1.5rem] border-4 transition-all duration-500 flex items-center justify-between -mt-6 first:mt-0",
                          isNext ? cn("z-30 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] bg-white dark:bg-[#111] scale-100") :
                          isCompleted ? "z-10 border-[#1A1A1A]/10 dark:border-white/10 bg-[#F4F4F0] dark:bg-[#0A0A0A] scale-[0.92] opacity-40 hover:opacity-70" :
                          "z-20 border-[#1A1A1A] dark:border-[#333] bg-white dark:bg-[#151515] scale-[0.96] shadow-[2px_2px_0px_#1a1a1a] dark:shadow-[2px_2px_0px_#000]"
                        )}
                        style={{ zIndex: isNext ? 50 : reverseIndex }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-lg",
                            isCompleted ? "border-transparent bg-[#1A1A1A]/10 dark:bg-white/10 text-transparent" :
                            isNext ? cn("border-[#1A1A1A] dark:border-transparent text-white", THEMES[level].bg) :
                            "border-[#1A1A1A] dark:border-[#555] text-[#1A1A1A] dark:text-white"
                          )}>
                            {isCompleted ? <Check className="w-5 h-5 text-[#1A1A1A] dark:text-white" strokeWidth={4} /> : dose.portions}
                          </div>
                          <div>
                            <span className="font-serif text-2xl font-black tabular-nums tracking-tighter">{dose.timeLabel}</span>
                            {dose.isNextDay && <span className="ml-3 font-sans text-[9px] font-black bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full uppercase tracking-widest">+1D</span>}
                          </div>
                        </div>
                        {isCompleted && (
                          <div className="font-sans text-[9px] font-bold uppercase tracking-widest opacity-40 text-right">
                            Logged
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F0] dark:bg-[#0A0A0A]" />}>
      <AppContent />
    </Suspense>
  );
}