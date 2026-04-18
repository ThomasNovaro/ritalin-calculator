"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Clock,
  Target,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Pill,
  Bell,
  BellRing,
  AlertCircle,
} from "lucide-react";
import {
  LazyMotion,
  domMax,
  m as motion,
  AnimatePresence,
  LayoutGroup,
} from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dynamic from "next/dynamic";
import { PlayfulToast } from "./components/PlayfulToast";

const CutoffModal = dynamic(() => import("./components/CutoffModal"), {
  ssr: false,
});

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PokeballIcon = ({ className, "aria-hidden": ariaHidden }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={ariaHidden}
  >
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

const THEMES: Record<
  Level,
  { bg: string; text: string; border: string; intensity: number; label: string }
> = {
  Charmander: {
    bg: "bg-[#FB8F02]",
    text: "text-[#FB8F02]",
    border: "border-[#FB8F02]",
    intensity: 1,
    label: "Soft Focus",
  },
  Charmeleon: {
    bg: "bg-[#F01A2E]",
    text: "text-[#F01A2E]",
    border: "border-[#F01A2E]",
    intensity: 2,
    label: "Deep Work",
  },
  Charizard: {
    bg: "bg-[#95139C]",
    text: "text-[#95139C]",
    border: "border-[#95139C]",
    intensity: 3,
    label: "Overdrive",
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
  "Protocol flawlessly executed! 🚀",
];

const MOTIVATIONAL_WORDS = [
  "BOOM!",
  "CRUSHED IT!",
  "LET'S GO!",
  "NAILED IT!",
  "SHARP!",
  "FOCUS UP!",
  "LOCKED IN!",
];

const sendNotification = (title: string, options: NotificationOptions) => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, options);
    });
  } else {
    new Notification(title, options);
  }
};

export default function AppClient({
  initialLevel,
  initialTime,
}: {
  initialLevel: Level;
  initialTime: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [level, setLevelState] = useState<Level>(initialLevel);
  const [startTime, setStartTimeState] = useState<string>(initialTime);
  const [mounted, setMounted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, number>>(
    {},
  );
  const [animatingStep, setAnimatingStep] = useState<{
    step: number;
    word: string;
  } | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(true);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateUrl = useCallback(
    (newLevel: Level, newTime: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("level", newLevel);
      if (newTime) {
        params.set("time", newTime);
      } else {
        params.delete("time");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setLevel = (newLevel: Level) => {
    setLevelState(newLevel);
    updateUrl(newLevel, startTime);
    localStorage.setItem("pokeMed_level", newLevel);
  };

  const setStartTime = (newTime: string) => {
    setStartTimeState(newTime);
    updateUrl(level, newTime);
    localStorage.setItem("pokeMed_startTime", newTime);
  };

  useEffect(() => {
    setMounted(true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    if (!initialTime) {
      const savedTime = localStorage.getItem("pokeMed_startTime");
      const savedLevel = localStorage.getItem("pokeMed_level") as Level | null;
      if (savedTime && savedLevel) {
        setStartTimeState(savedTime);
        setLevelState(savedLevel);
        updateUrl(savedLevel, savedTime);
      }
    }

    const savedSteps = localStorage.getItem("pokeMed_completedSteps_v2");
    const savedNotifs = localStorage.getItem("pokeMed_notifications");

    if (savedSteps) {
      try {
        setCompletedSteps(JSON.parse(savedSteps));
      } catch (e) {}
    }

    if (savedNotifs === "false") {
      setNotificationsEnabled(false);
    } else if (
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(true);
    }
  }, [initialTime, updateUrl]);

  const handleReset = () => {
    if (Object.keys(completedSteps).length > 0) {
      if (
        !confirm(
          "Are you sure you want to reset your entire schedule? This action cannot be undone.",
        )
      )
        return;
    }
    setStartTimeState("");
    setLevelState("Charmander");
    setCompletedSteps({});
    setAnimatingStep(null);
    setShowFullSchedule(true);
    updateUrl("Charmander", "");
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
    localStorage.removeItem("pokeMed_cutoffModalShown");
  };

  const completeStep = (step: number) => {
    if (completedSteps[step] || animatingStep) return;

    const word =
      MOTIVATIONAL_WORDS[Math.floor(Math.random() * MOTIVATIONAL_WORDS.length)];
    setAnimatingStep({ step, word });

    setTimeout(() => {
      const now = new Date().getTime();
      setCompletedSteps((prev) => {
        const next = { ...prev, [step]: now };
        localStorage.setItem("pokeMed_completedSteps_v2", JSON.stringify(next));
        return next;
      });
      setAnimatingStep(null);
    }, 1000);
  };

  const setNow = () => {
    const now = new Date();
    const newTime = timeFormatter.format(now);
    setStartTimeState(newTime);
    updateUrl(level, newTime);
    localStorage.setItem("pokeMed_startTime", newTime);
  };

  const startSchedule = () => {
    if (!startTime) return;
    const [hoursStr, minutesStr] = startTime.split(":");
    const now = new Date();
    now.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    setCompletedSteps((prev) => {
      const next = { ...prev, [1]: now.getTime() };
      localStorage.setItem("pokeMed_completedSteps_v2", JSON.stringify(next));
      return next;
    });

    if (
      notificationsEnabled &&
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          sendNotification("Notifications Enabled! 🔔", {
            body: "You will now receive alerts for your schedule. Keep the app open in the background to receive timely reminders.",
            icon: "/icon",
          });
        } else {
          setNotificationsEnabled(false);
          localStorage.setItem("pokeMed_notifications", "false");
        }
      });
    }
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
      sendNotification("Notifications Enabled! 🔔", {
        body: "You will now receive alerts for your schedule. Keep the app open in the background to receive timely reminders.",
        icon: "/icon",
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("pokeMed_notifications", "true");
        sendNotification("Notifications Enabled! 🔔", {
          body: "You will now receive alerts for your schedule. Keep the app open in the background to receive timely reminders!",
          icon: "/icon",
        });
      }
    }
  };

  const isStarted = !!completedSteps[1];

  const { schedule, hitCutoff } = useMemo(() => {
    if (!mounted || !startTime) return { schedule: [], hitCutoff: false };
    const [hoursStr, minutesStr] = startTime.split(":");
    const startHours = parseInt(hoursStr, 10);
    const startMinutes = parseInt(minutesStr, 10);
    const now = new Date();
    const baseDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHours,
      startMinutes,
      0,
    );

    const protocol = PROTOCOLS[level];
    const generated: DoseInfo[] = [];

    let currentBaseTime = baseDate.getTime();
    let previousPortions = 0;
    let hitCutoffState = false;

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
        hitCutoffState = true;
        break;
      }

      const isNextDay =
        doseDate.getFullYear() > baseDate.getFullYear() ||
        doseDate.getMonth() > baseDate.getMonth() ||
        doseDate.getDate() > baseDate.getDate();

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

    return { schedule: generated, hitCutoff: hitCutoffState };
  }, [mounted, startTime, level, completedSteps]);

  useEffect(() => {
    if (
      isStarted &&
      hitCutoff &&
      schedule.length > 0 &&
      !localStorage.getItem("pokeMed_cutoffModalShown")
    ) {
      setShowCutoffModal(true);
      localStorage.setItem("pokeMed_cutoffModalShown", "true");
    }
  }, [isStarted, hitCutoff, schedule.length]);

  useEffect(() => {
    if (!notificationsEnabled || schedule.length === 0 || !isStarted) return;
    const nextDoseItem = schedule.find((d) => !completedSteps[d.doseNumber]);
    if (!nextDoseItem) return;

    const now = new Date().getTime();
    const timeUntilDose = nextDoseItem.actualTimeMs - now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timeUntilDose > 0) {
      timeoutRef.current = setTimeout(() => {
        sendNotification("Time for your next Ritalin!", {
          body: `Dose ${nextDoseItem.doseNumber}: ${nextDoseItem.portions} pill(s). Grab some water!`,
          icon: "/icon",
        });
      }, timeUntilDose);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [schedule, completedSteps, notificationsEnabled, isStarted]);

  const { totalPortions, completedPortions, nextDose, isAllComplete } =
    useMemo(() => {
      return {
        totalPortions: schedule.reduce((sum, dose) => sum + dose.portions, 0),
        completedPortions: schedule
          .filter((dose) => completedSteps[dose.doseNumber])
          .reduce((sum, dose) => sum + dose.portions, 0),
        nextDose: schedule.find((d) => !completedSteps[d.doseNumber]),
        isAllComplete:
          schedule.length > 0 &&
          schedule.every((d) => completedSteps[d.doseNumber]),
      };
    }, [schedule, completedSteps]);

  // Use a fallback UI that matches the background during SSR/hydration to prevent flicker
  if (!mounted) {
    return (
      <div className="relative min-h-[100dvh] pb-24 overflow-x-hidden font-sans bg-[#F4F4F0] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F4F4F0] antialiased selection:bg-[#FF5E00] selection:text-white" />
    );
  }

  return (
    <LazyMotion features={domMax}>
      <LayoutGroup>
        <div className="relative min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] overflow-x-hidden font-sans bg-[#F4F4F0] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F4F4F0] antialiased selection:bg-[#FF5E00] selection:text-white">
        {/* Background glow based on level */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center items-start">
          <div
            className={cn(
              "absolute -top-[30%] w-[120vw] h-[60vw] blur-[120px] opacity-[0.15] dark:opacity-[0.25] transition-colors duration-1000 rounded-full",
              THEMES[level].bg,
            )}
          />
        </div>

        <AnimatePresence>
          {showCutoffModal ? (
            <CutoffModal onClose={() => setShowCutoffModal(false)} />
          ) : null}
          {animatingStep ? (
            <PlayfulToast
              key={`toast-${animatingStep.step}`}
              word={animatingStep.word}
              themeColorClass={THEMES[level].bg}
            />
          ) : null}
        </AnimatePresence>

        <main className="relative z-10 max-w-md mx-auto w-full px-5 pt-8 space-y-10 select-none">
          {/* Header */}
          <header className="flex justify-between items-center">
            <div>
              <h1 className="font-serif text-4xl font-black tracking-tighter leading-none">
                Poké
                <br />
                <span className={THEMES[level].text}>Med.</span>
              </h1>
              <p className="font-sans font-bold text-[10px] uppercase tracking-widest opacity-50 mt-2">
                Daily Schedule
              </p>
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={cn(
                "p-3 rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] text-white shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] transition-colors duration-500",
                THEMES[level].bg,
              )}
            >
              <PokeballIcon className="w-8 h-8" />
            </motion.div>
          </header>

          <AnimatePresence mode="wait">
            {!isStarted ? (
              <motion.section
                key="setup"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40, scale: 0.95, filter: "blur(8px)" }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-8 will-change-transform"
              >
              <div className="space-y-4">
                <h2 className="font-serif text-2xl font-black tracking-tight">
                  Protocol
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map(
                    (l) => {
                      const isActive = level === l;
                      return (
                        <motion.button
                          key={l}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setLevel(l)}
                          className={cn(
                            "relative flex flex-col items-center justify-center p-4 min-h-[140px] rounded-[1.5rem] border-4 transition-all duration-300 outline-none",
                            isActive
                              ? cn(
                                  "border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] scale-100",
                                  THEMES[l].bg,
                                  "text-white z-10",
                                )
                              : "border-[#1A1A1A]/10 dark:border-white/10 hover:border-[#1A1A1A]/30 bg-white dark:bg-[#151515] scale-[0.96] hover:scale-100 opacity-60 hover:opacity-100",
                          )}
                        >
                          <div className="flex gap-1 mb-3">
                            {Array.from({ length: THEMES[l].intensity }).map(
                              (_, i) => (
                                <Target
                                  key={i}
                                  className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-white" : THEMES[l].text,
                                  )}
                                  strokeWidth={3}
                                />
                              ),
                            )}
                          </div>
                          <div className="font-sans font-black text-[10px] uppercase tracking-widest">
                            {l}
                          </div>
                          <div className="font-sans text-[8px] font-bold opacity-70 uppercase tracking-widest mt-2">
                            {THEMES[l].label}
                          </div>
                        </motion.button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-serif text-2xl font-black tracking-tight block">
                  First Intake Time
                </label>
                <div className="flex gap-2 sm:gap-3 pr-1 pb-1">
                  <div className="relative flex-1 min-w-0">
                    <div className="absolute inset-y-0 left-3 sm:left-5 flex items-center pointer-events-none opacity-40">
                      <Clock
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        strokeWidth={3}
                      />
                    </div>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full min-w-0 pl-9 pr-1 sm:pl-14 sm:pr-4 py-4 sm:py-5 rounded-[1rem] sm:rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] bg-white dark:bg-[#151515] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] focus:outline-none focus:translate-y-[2px] focus:shadow-[2px_2px_0px_#1a1a1a] transition-all font-serif text-lg sm:text-2xl font-black tabular-nums appearance-none"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={setNow}
                    className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 rounded-[1rem] sm:rounded-2xl border-4 border-[#1A1A1A] dark:border-[#333] bg-[#1A1A1A] dark:bg-[#F4F4F0] text-[#F4F4F0] dark:text-[#1A1A1A] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:shadow-[2px_2px_0px_#1a1a1a] transition-all font-black uppercase tracking-widest text-[10px] sm:text-xs"
                  >
                    Now
                  </motion.button>
                </div>
              </div>

              {startTime ? (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startSchedule}
                  className={cn(
                    "w-full py-6 rounded-3xl border-4 border-[#1A1A1A] dark:border-[#333] text-white shadow-[6px_6px_0px_#1a1a1a] dark:shadow-[6px_6px_0px_#000] active:translate-y-[4px] active:shadow-[2px_2px_0px_#1a1a1a] transition-all flex items-center justify-center gap-3 font-black text-xl tracking-tight uppercase",
                    THEMES[level].bg,
                  )}
                >
                  <Pill className="w-6 h-6" strokeWidth={3} />
                  Engage Protocol
                </motion.button>
              ) : null}
            </motion.section>
          ) : (
            <motion.div
              key="active-dashboard"
              initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.3, delay: 0.1 }}
              className="space-y-6 will-change-transform"
            >
              {!isAllComplete && nextDose ? (
                <motion.section
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative"
                  style={{ willChange: "transform, opacity" }}
                >
                  <div
                    className={cn(
                  "p-8 rounded-[2rem] border-4 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_#1a1a1a] dark:shadow-[8px_8px_0px_#000] overflow-hidden bg-white dark:bg-[#111]",
                )}
              >
                {/* Decorative intense background shape */}
                <div
                  className={cn(
                    "absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-[0.15] pointer-events-none",
                    THEMES[level].bg,
                  )}
                />

                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p
                      className={cn(
                        "font-sans text-[10px] font-black uppercase tracking-widest mb-3",
                        THEMES[level].text,
                      )}
                    >
                      Next Dose • {nextDose.portions} Pill
                      {nextDose.portions > 1 ? "s" : ""}
                    </p>
                    <h2 className="font-serif text-6xl font-black tracking-tighter tabular-nums leading-none">
                      {nextDose.timeLabel}
                    </h2>
                  </div>

                  <div className="w-20 h-20 relative">
                    <AnimatePresence>
                      {animatingStep?.step !== nextDose.doseNumber && (
                        <motion.button
                          layoutId={`dose-action-${nextDose.doseNumber}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => completeStep(nextDose.doseNumber)}
                          className={cn(
                            "absolute inset-0 rounded-[2rem] flex items-center justify-center border-4 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] active:shadow-[0px_0px_0px_#1a1a1a] active:translate-y-1 transition-all text-white",
                            THEMES[level].bg,
                          )}
                          transition={{ type: "spring", damping: 25, stiffness: 350 }}
                        >
                          <motion.div layoutId={`dose-icon-${nextDose.doseNumber}`}>
                            <Check className="w-10 h-10" strokeWidth={4} />
                          </motion.div>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 px-2">
                <span className="font-sans font-bold text-[10px] tracking-widest uppercase opacity-50">
                  Daily Progress
                </span>
                <span className="font-serif font-black text-xl flex items-center gap-1 relative overflow-hidden px-1">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={completedPortions}
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0, position: "absolute" }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      className="inline-block"
                    >
                      {completedPortions}
                    </motion.span>
                  </AnimatePresence>
                  <span>/ {totalPortions} Pills</span>
                </span>
              </div>
            </motion.section>
          ) : null}

          {isAllComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative p-8 rounded-[2rem] border-4 border-[#1A1A1A] bg-[#00FF66] text-[#1A1A1A] shadow-[8px_8px_0px_#1a1a1a] text-center overflow-hidden"
              style={{ willChange: "transform, opacity" }}
            >
              {/* Background rays for completion */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-[150%] aspect-square"
                  style={{
                    background:
                      "conic-gradient(transparent 0deg, #1A1A1A 90deg, transparent 180deg, #1A1A1A 270deg, transparent 360deg)",
                    willChange: "transform",
                  }}
                />
              </div>

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{
                    scale: { type: "spring", stiffness: 200, damping: 10 },
                    rotate: {
                      type: "keyframes",
                      duration: 0.5,
                      ease: "easeInOut",
                    },
                  }}
                  className="w-24 h-24 mx-auto border-4 border-[#1A1A1A] bg-white rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1a1a1a]"
                  style={{ willChange: "transform" }}
                >
                  <Check className="w-12 h-12" strokeWidth={4} />
                </motion.div>
                <h2 className="font-serif text-4xl font-black tracking-tighter mb-3 leading-none">
                  Protocol
                  <br />
                  Complete.
                </h2>
                <p className="font-sans font-bold text-[12px] uppercase tracking-widest opacity-80 bg-[#1A1A1A]/10 py-2 px-4 rounded-xl inline-block mt-2 border-2 border-[#1A1A1A]/20">
                  {
                    COMPLETION_MESSAGES[
                      Math.floor(completedSteps[1] || 0) %
                        COMPLETION_MESSAGES.length
                    ]
                  }
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
          ) : null}

          <motion.section layout className="pt-4 space-y-6">
            <div className="flex items-center justify-between px-2">
                <button
                  onClick={() => setShowFullSchedule(!showFullSchedule)}
                  className="font-sans font-bold text-[10px] uppercase tracking-widest opacity-50 hover:opacity-100 flex items-center gap-2 transition-opacity"
                >
                  {showFullSchedule ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {showFullSchedule ? "Hide Stack" : "Show Stack"}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={toggleNotifications}
                    className={cn(
                      "p-3 rounded-[1rem] border-2 transition-all active:scale-90",
                      notificationsEnabled
                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white dark:border-[#F4F4F0] dark:bg-[#F4F4F0] dark:text-[#1A1A1A]"
                        : "border-[#1A1A1A]/20 dark:border-white/20 opacity-50 hover:opacity-100",
                    )}
                  >
                    {notificationsEnabled ? (
                      <BellRing className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
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
                {showFullSchedule ? (
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
                          layout
                          key={dose.doseNumber}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            opacity: { delay: index * 0.05 },
                            y: { delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 },
                            layout: { type: "spring", stiffness: 350, damping: 30 }
                          }}
                          className={cn(
                            "relative p-5 rounded-[1.5rem] border-4 transition-all duration-500 flex items-center justify-between -mt-6 first:mt-0",
                            isNext
                              ? cn(
                                  "z-30 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_#1a1a1a] dark:shadow-[4px_4px_0px_#000] bg-white dark:bg-[#111] scale-100",
                                )
                              : isCompleted
                                ? "z-10 border-[#1A1A1A]/10 dark:border-white/10 bg-[#F4F4F0] dark:bg-[#0A0A0A] scale-[0.92] opacity-40 hover:opacity-70"
                                : "z-20 border-[#1A1A1A] dark:border-[#333] bg-white dark:bg-[#151515] scale-[0.96] shadow-[2px_2px_0px_#1a1a1a] dark:shadow-[2px_2px_0px_#000]",
                          )}
                          style={{
                            zIndex: isNext ? 50 : reverseIndex,
                            willChange: "transform, opacity",
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-lg",
                                isCompleted
                                  ? "border-transparent bg-[#1A1A1A]/10 dark:bg-white/10 text-transparent"
                                  : isNext
                                    ? cn(
                                        "border-[#1A1A1A] dark:border-transparent text-white",
                                        THEMES[level].bg,
                                      )
                                    : "border-[#1A1A1A] dark:border-[#555] text-[#1A1A1A] dark:text-white",
                              )}
                            >
                              {isCompleted ? (
                                <Check
                                  className="w-5 h-5 text-[#1A1A1A] dark:text-white"
                                  strokeWidth={4}
                                />
                              ) : (
                                dose.portions
                              )}
                            </div>
                            <div>
                              <span className="font-serif text-2xl font-black tabular-nums tracking-tighter">
                                {dose.timeLabel}
                              </span>
                              {dose.isNextDay ? (
                                <span className="ml-3 font-sans text-[9px] font-black bg-[#1A1A1A] text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  +1D
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {isCompleted ? (
                            <div className="font-sans text-[9px] font-bold uppercase tracking-widest opacity-40 text-right">
                              Logged
                            </div>
                          ) : null}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.section>
            </motion.div>
          )}
          </AnimatePresence>
        </main>
      </div>
      </LayoutGroup>
    </LazyMotion>
  );
}
