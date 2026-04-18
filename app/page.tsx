"use client";

import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  RotateCcw,
  Power,
  Zap,
  AlertCircle,
  Undo,
  Clock,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayfulToast } from "./components/PlayfulToast";

type Level = "Charmander" | "Charmeleon" | "Charizard";

interface DoseInfo {
  doseNumber: number;
  timeLabel: string;
  portions: number;
  isNextDay: boolean;
  isAfterCutoff: boolean;
  actualTimeMs: number;
}

const PROTOCOLS: Record<
  Level,
  { maxDoses: number; portions: number[]; jp: string }
> = {
  Charmander: { maxDoses: 6, portions: [1, 1, 1, 1, 1, 1], jp: "ヒトカゲ" },
  Charmeleon: { maxDoses: 4, portions: [1, 2, 2, 1], jp: "リザード" },
  Charizard: { maxDoses: 3, portions: [2, 2, 2], jp: "リザードン" },
};

const THEMES: Record<
  Level,
  {
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    fillClass: string;
  }
> = {
  Charmander: {
    color: "#FB8F02",
    bgClass: "bg-[#FB8F02]",
    textClass: "text-[#FB8F02]",
    borderClass: "border-[#FB8F02]",
    fillClass: "bg-[#FB8F02]",
  },
  Charmeleon: {
    color: "#F01A2E",
    bgClass: "bg-[#F01A2E]",
    textClass: "text-[#F01A2E]",
    borderClass: "border-[#F01A2E]",
    fillClass: "bg-[#F01A2E]",
  },
  Charizard: {
    color: "#95139C",
    bgClass: "bg-[#95139C]",
    textClass: "text-[#95139C]",
    borderClass: "border-[#95139C]",
    fillClass: "bg-[#95139C]",
  },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatTimeInputValue = (timeMs: number) => {
  const date = new Date(timeMs);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
};

const toTimeOnOrAfter = (baseTimeMs: number, value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return baseTimeMs;
  }
  const baseDate = new Date(baseTimeMs);
  const candidate = new Date(baseDate);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate.getTime() < baseTimeMs) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
};

// -- Custom Hold Button --
function HoldButton({
  onComplete,
  theme,
  label = "hold to consume",
  disabled = false,
}: {
  onComplete: () => void;
  theme: (typeof THEMES)[Level];
  label?: string;
  disabled?: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = (e: React.PointerEvent | React.TouchEvent) => {
    // e.preventDefault();
    if (disabled || completed) return;
    setHolding(true);
    if (navigator.vibrate) navigator.vibrate(50);

    timerRef.current = setTimeout(() => {
      setHolding(false);
      setCompleted(true);
      onComplete();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Success vibration
      setTimeout(() => setCompleted(false), 1000);
    }, 800);
  };

  const handleEnd = (e: React.PointerEvent | React.TouchEvent) => {
    // e.preventDefault();
    if (disabled || completed) return;
    setHolding(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <button
      onPointerDown={handleStart}
      onPointerUp={handleEnd}
      onPointerLeave={handleEnd}
      onPointerCancel={handleEnd}
      disabled={disabled}
      className={`relative w-full h-24 border border-border-theme overflow-hidden flex items-center justify-center tracking-wide text-base transition-all duration-100 ease-in-out select-none ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-surface text-disabled"
          : completed
            ? "bg-foreground text-background"
            : "bg-background text-foreground hover:bg-surface"
      }`}
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {!disabled && !completed && (
        <div
          className={`absolute left-0 top-0 bottom-0 ${theme.bgClass}`}
          style={{
            width: holding ? "100%" : "0%",
            transitionProperty: "width",
            transitionDuration: holding ? "800ms" : "100ms",
            transitionTimingFunction: holding ? "linear" : "ease-out",
          }}
        />
      )}
      <span
        className={`relative z-10 ${holding ? "text-white font-semibold" : ""} transition-colors duration-100`}
      >
        {completed ? "dose logged" : holding ? "holding..." : label}
      </span>
    </button>
  );
}

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlLevel = (searchParams.get("level") as Level) || "Charmander";
  const urlTime = searchParams.get("time") || "";

  const [level, setLevelState] = useState<Level>(urlLevel);
  const [startTime, setStartTimeState] = useState<string>(urlTime);
  const [mounted, setMounted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, number>>(
    {},
  );
  const [notifiedDoses, setNotifiedDoses] = useState<Record<number, boolean>>(
    {},
  );
  const [showPast, setShowPast] = useState(false);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [showEditDoseModal, setShowEditDoseModal] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState("");
  const [editDoseTimeInput, setEditDoseTimeInput] = useState("");
  const [editingDoseNumber, setEditingDoseNumber] = useState<number | null>(
    null,
  );
  const [editedDoseTimes, setEditedDoseTimes] = useState<Record<number, number>>(
    {},
  );
  const [acknowledgedCutoff, setAcknowledgedCutoff] = useState(false);
  const [quote, setQuote] = useState("");
  const [cheerMsg, setCheerMsg] = useState<{ text: string; id: number } | null>(
    null,
  );

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
    if (savedSteps) {
      try {
        setCompletedSteps(JSON.parse(savedSteps));
      } catch (e) {}
    }

    const savedNotified = localStorage.getItem("pokeMed_notifiedDoses");
    if (savedNotified) {
      try {
        setNotifiedDoses(JSON.parse(savedNotified));
      } catch (e) {}
    }

    const savedEditedDoseTimes = localStorage.getItem("pokeMed_editedDoseTimes");
    if (savedEditedDoseTimes) {
      try {
        setEditedDoseTimes(JSON.parse(savedEditedDoseTimes));
      } catch (e) {}
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
      localStorage.setItem(
        "pokeMed_completedSteps_v2",
        JSON.stringify(completedSteps),
      );
      localStorage.setItem(
        "pokeMed_notifiedDoses",
        JSON.stringify(notifiedDoses),
      );
      localStorage.setItem(
        "pokeMed_editedDoseTimes",
        JSON.stringify(editedDoseTimes),
      );
    }
  }, [completedSteps, notifiedDoses, editedDoseTimes, mounted]);

  const handleReset = () => {
    if (!confirm("reset protocol?")) return;
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps({});
    setNotifiedDoses({});
    setEditedDoseTimes({});
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
    localStorage.removeItem("pokeMed_notifiedDoses");
    localStorage.removeItem("pokeMed_editedDoseTimes");
  };

  const handleUndo = () => {
    const keys = Object.keys(completedSteps)
      .map(Number)
      .sort((a, b) => b - a);
    if (keys.length <= 1) return; // Don't undo dose 1 (which starts the protocol)
    const lastDoseNumber = keys[0];

    if (!confirm(`undo last dose logged?`)) return;

    setCompletedSteps((prev) => {
      const next = { ...prev };
      delete next[lastDoseNumber];
      return next;
    });
    setNotifiedDoses((prev) => {
      const next = { ...prev };
      delete next[lastDoseNumber];
      return next;
    });
  };

  const completeStep = (step: number, customTimeMs?: number) => {
    if (completedSteps[step]) return;
    const timeToLog = customTimeMs ?? new Date().getTime();
    setCompletedSteps((prev) => ({ ...prev, [step]: timeToLog }));

    const cheers = [
      "You've got this!",
      "Crushing it!",
      "Keep shining!",
      "Unstoppable!",
      "Stay strong!",
      "Victory secured!",
    ];
    setCheerMsg({
      text: cheers[Math.floor(Math.random() * cheers.length)],
      id: Date.now(),
    });
  };

  useEffect(() => {
    if (cheerMsg) {
      const timer = setTimeout(() => setCheerMsg(null), 1200);
      return () => clearTimeout(timer);
    }
  }, [cheerMsg]);

  const setNow = () => {
    const now = new Date();
    setStartTime(timeFormatter.format(now));
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
    let hasDoseAfterCutoff = false;

    for (let i = 0; i < protocol.maxDoses; i++) {
      const doseNumber = i + 1;
      let doseTimeMs: number;

      if (i === 0) {
        doseTimeMs = currentBaseTime;
      } else {
        const gapMinutes = previousPortions === 1 ? 105 : 210;
        doseTimeMs = currentBaseTime + gapMinutes * 60000;
      }

      if (completedSteps[doseNumber]) {
        doseTimeMs = completedSteps[doseNumber];
      } else if (editedDoseTimes[doseNumber]) {
        doseTimeMs = editedDoseTimes[doseNumber];
      }

      const doseDate = new Date(doseTimeMs);
      const isAfterCutoff = doseDate.getHours() >= 18;
      if (i > 0 && isAfterCutoff) {
        hasDoseAfterCutoff = true;
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
        isAfterCutoff,
        actualTimeMs: doseTimeMs,
      });

      previousPortions = protocol.portions[i];
      currentBaseTime = doseTimeMs;
    }
    return { schedule: generated, hitCutoff: hasDoseAfterCutoff };
  }, [mounted, startTime, level, completedSteps, editedDoseTimes]);

  const nextDose = schedule.find((d) => !completedSteps[d.doseNumber]);
  const isAllComplete =
    schedule.length > 0 && schedule.every((d) => completedSteps[d.doseNumber]);
  const theme = THEMES[level];
  const shouldWarnCutoff = hitCutoff;

  useEffect(() => {
    if ("serviceWorker" in navigator && "Notification" in window) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW registered", reg))
        .catch((err) => console.error("SW registration failed", err));
    }
  }, []);

  useEffect(() => {
    if (!isStarted || !nextDose || !mounted) return;
    if (notifiedDoses[nextDose.doseNumber]) return;

    const checkAndNotify = () => {
      if (notifiedDoses[nextDose.doseNumber]) return;
      const now = Date.now();
      if (now >= nextDose.actualTimeMs) {
        if (
          "Notification" in window &&
          Notification.permission === "granted" &&
          "serviceWorker" in navigator
        ) {
          navigator.serviceWorker.ready.then((registration) => {
            const notificationVariants = [
              "Hey bestie! Time for your meds! 🥰",
              "I'm not mad, just disappointed... take your dose before I cry. 🥺",
              "Your dopamine delivery is here! 📦",
              "If you ignore me, I'll just keep bothering you. Pill time. 🙄",
              "Look at you, doing so well today! Let's keep it up—take your meds! ✨",
              "Knock knock! It's your friendly reminder! 🚪",
              "I know you're busy, but your brain needs this. 🧠",
              "Time to re-up your focus stats! 📊",
              "I've been waiting all day to remind you! 🤩",
              "Don't make me sad. Take your meds! 💧",
              "It's me again! Did you miss me? Time for your pills! 🦉",
              "Please take your meds so I can stop worrying about you. 😩",
            ];
            const randomMessage = notificationVariants[Math.floor(Math.random() * notificationVariants.length)];
            
            registration.showNotification(
              `dose ${String(nextDose.doseNumber).padStart(2, "0")} ready`,
              {
                body: `${randomMessage} (${nextDose.portions} pill${nextDose.portions > 1 ? "s" : ""}).`,
                vibrate: [200, 100, 200, 100, 200],
                tag: `dose-${nextDose.doseNumber}`,
                requireInteraction: true,
              } as NotificationOptions,
            );
          });
        }
        setNotifiedDoses((prev) => ({ ...prev, [nextDose.doseNumber]: true }));
      }
    };

    const now = Date.now();
    const timeUntilDose = nextDose.actualTimeMs - now;
    let timeout: NodeJS.Timeout;

    if (timeUntilDose <= 0) {
      checkAndNotify();
    } else {
      timeout = setTimeout(checkAndNotify, timeUntilDose);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndNotify();
      }
    };

    const handleFocus = () => checkAndNotify();
    const handlePageShow = () => checkAndNotify();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [nextDose, isStarted, mounted, notifiedDoses]);

  const startSchedule = async (forceProceed = false) => {
    if (!startTime) return;
    if (shouldWarnCutoff && !acknowledgedCutoff && !forceProceed) {
      setShowCutoffModal(true);
      return;
    }
    const [hoursStr, minutesStr] = startTime.split(":");
    const now = new Date();
    now.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    setCompletedSteps({ 1: now.getTime() });
    setShowCutoffModal(false);
    setAcknowledgedCutoff(false);

    if ("Notification" in window && "serviceWorker" in navigator) {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
      }
      if (perm === "granted") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification("protocol engaged", {
            body: "notifications are active. you will be reminded when it's time.",
            vibrate: [200, 100, 200],
            tag: "protocol-start",
          } as NotificationOptions);
        });
      }
    }
  };

  const openEditDoseModal = (dose: DoseInfo) => {
    setEditingDoseNumber(dose.doseNumber);
    setEditDoseTimeInput(formatTimeInputValue(dose.actualTimeMs));
    setShowEditDoseModal(true);
  };

  const applyEditedDoseTime = () => {
    if (editingDoseNumber === null || !editDoseTimeInput) return;
    const editingDose = schedule.find(
      (dose) => dose.doseNumber === editingDoseNumber,
    );
    if (!editingDose) return;

    const previousDoseTime =
      schedule.find((dose) => dose.doseNumber === editingDoseNumber - 1)
        ?.actualTimeMs ??
      new Date(editingDose.actualTimeMs).setHours(0, 0, 0, 0);

    const nextTimeMs = toTimeOnOrAfter(previousDoseTime, editDoseTimeInput);

    setEditedDoseTimes((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([doseKey]) => {
          return Number(doseKey) < editingDoseNumber;
        }),
      ) as Record<number, number>;
      next[editingDoseNumber] = nextTimeMs;
      return next;
    });

    setNotifiedDoses((prev) => {
      const next = { ...prev };
      for (let i = editingDoseNumber; i <= PROTOCOLS[level].maxDoses; i++) {
        delete next[i];
      }
      return next;
    });

    setShowEditDoseModal(false);
    setEditingDoseNumber(null);
  };

  useEffect(() => {
    if (isAllComplete) {
      const quotes = [
        "protocol finished for the day.",
        "all doses logged. day complete.",
        "you're done for today. rest up.",
        "protocol complete. see you tomorrow.",
        "finished for the day. good work.",
      ];
      setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [isAllComplete]);

  // ==============================
  // RENDER: SETUP SCREEN & COMPLETION SCREEN
  // ==============================
  if (!isStarted || isAllComplete) {
    if (isAllComplete) {
      return (
        <main className="min-h-screen flex flex-col pt-24 pb-8 px-6 max-w-lg mx-auto w-full items-center justify-center text-center overflow-hidden relative">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="flex-1 flex flex-col items-center justify-center w-full relative z-10"
          >
            <div className="relative mb-12 flex items-center justify-center">
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className={`absolute w-[200px] h-[200px] rounded-full blur-3xl opacity-20 pointer-events-none ${theme.bgClass}`}
               />
               <motion.div
                 initial={{ scale: 0, rotate: -45 }}
                 animate={{ scale: 1, rotate: 0 }}
                 transition={{ 
                   type: "spring", 
                   damping: 12, 
                   stiffness: 400,
                   delay: 0.1 
                 }}
                 className={`w-20 h-20 border-2 border-border-theme ${theme.bgClass} text-white rounded-full flex items-center justify-center shadow-[4px_4px_0px_currentColor] relative z-10`}
               >
                 <Check className="w-10 h-10" strokeWidth={3} />
               </motion.div>
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-4xl text-semibold font-sans tracking-tighter leading-none mb-6 text-foreground"
            >
              protocol complete
            </motion.h1>
            
            {quote && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className={`text-2xl font-sans tracking-tight ${theme.textClass} px-4 leading-tight `}
              >
                "{quote}"
              </motion.div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="w-full mt-12 border-t border-border-theme pt-8 relative z-10"
          >
            <button
              onClick={() => {
                setStartTime("");
                setLevel("Charmander");
                setCompletedSteps({});
                localStorage.removeItem("pokeMed_startTime");
                localStorage.removeItem("pokeMed_level");
                localStorage.removeItem("pokeMed_completedSteps_v2");
              }}
              className="w-full py-4 border border-border-theme bg-surface text-foreground tracking-widest text-[13px] transition-all duration-100 ease-linear hover:bg-foreground hover:text-background flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> reset protocol
            </button>
          </motion.div>
        </main>
      );
    }

    return (
      <main className="min-h-screen flex flex-col pt-12 pb-40 px-6 max-w-lg mx-auto w-full ">
        <header className="mb-12 flex justify-between items-start border-b border-border-theme pb-6">
          <div>
            <div className="text-[13px] tracking-wide text-subtext mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" strokeWidth={1} /> initialize protocol
            </div>
            <h1 className="text-5xl font-sans tracking-tighter leading-none text-foreground">
              set parameters
            </h1>
          </div>
        </header>

        <div className="flex-1 space-y-12">
          {/* LEVEL SELECTION */}
          <section>
            <div className="text-[13px] tracking-[0.05em] text-subtext mb-4 border-b border-surface pb-2">
              01 // select dosage
            </div>
            <div className="flex flex-col gap-2">
              {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map(
                (l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`relative w-full text-left p-4 border transition-colors duration-100 ease-linear tracking-[0.05em] text-base overflow-hidden flex justify-between items-center ${
                      level === l
                        ? `${THEMES[l].bgClass} text-white border-border-theme font-semibold`
                        : "bg-background border-border-theme text-foreground hover:bg-surface"
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      {l.toLowerCase()}
                      <span className="text-xs opacity-70 font-normal">
                        {PROTOCOLS[l].jp}
                      </span>
                    </span>
                    {level === l && (
                      <span className="opacity-90 font-sans text-xs font-normal">
                        ×{PROTOCOLS[l].maxDoses}
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </section>

          {/* TIME SELECTION */}
          <section>
            <div className="text-[13px] tracking-[0.05em] text-subtext mb-4 border-b border-surface pb-2">
              02 // t-zero (start time)
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full bg-panel border ${startTime ? "border-border-theme text-foreground" : "border-surface text-disabled"} p-4 font-sans text-2xl appearance-none rounded-none focus:outline-none focus:border-foreground transition-colors duration-100 ease-linear`}
                />
              </div>
              <button
                onClick={setNow}
                className="h-[66px] px-6 border border-border-theme bg-surface text-foreground hover:bg-foreground hover:text-background tracking-[0.05em] text-[13px] transition-colors duration-100 ease-linear"
              >
                now
              </button>
            </div>
          </section>
        </div>

        {/* START BUTTON */}
        <div className="mt-12">
          <button
            onClick={() => startSchedule(false)}
            disabled={!startTime}
            className={`w-full py-4 tracking-[0.1em] text-[13px] border transition-colors duration-100 ease-linear ${
              startTime
                ? `${theme.bgClass} text-white border-border-theme hover:brightness-110 font-semibold`
                : "bg-surface text-disabled border-surface cursor-not-allowed"
            }`}
          >
            engage
          </button>
        </div>

        {/* CUTOFF WARNING MODAL */}
        <AnimatePresence>
          {showCutoffModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/90 sm:p-6"
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="bg-panel border-t sm:border border-border-theme p-6 pt-8 sm:p-6 w-full max-w-sm"
              >
                <h2 className="text-lg text-foreground mb-2 tracking-wide font-medium flex items-center gap-2">
                  <AlertCircle
                    className={`w-4 h-4 ${theme.textClass}`}
                    strokeWidth={1.5}
                  />{" "}
                  schedule adjusted
                </h2>
                <p className="text-subtext mb-8 text-[13px] leading-relaxed">
                  the calculated schedule goes past 18:00. late doses are still
                  shown in your timeline so you can plan with full visibility.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCutoffModal(false)}
                    className="flex-1 py-4 border border-border-theme bg-surface text-foreground tracking-[0.05em] text-[13px] hover:bg-foreground hover:text-background transition-all duration-100 ease-linear active:scale-95"
                  >
                    cancel
                  </button>
                  <button
                    onClick={() => {
                      setAcknowledgedCutoff(true);
                      startSchedule(true);
                    }}
                    className={`flex-1 py-4 border border-border-theme ${theme.bgClass} text-white tracking-[0.05em] text-[13px] font-semibold hover:brightness-110 transition-all duration-100 ease-linear active:scale-95`}
                  >
                    proceed
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }

  // ==============================
  // RENDER: MAIN TRACKING SCREEN
  // ==============================
  return (
    <main className="min-h-screen flex flex-col w-full max-w-lg mx-auto relative ">
      {/* HEADER / NAVIGATION */}
      <header className="flex items-center justify-between p-6 pb-0">
        <div className="text-[13px] tracking-[0.05em] flex flex-col">
          <span className="text-subtext">protocol //</span>
          <span className={`${theme.textClass} flex items-center gap-2`}>
            {level.toLowerCase()}{" "}
            <span className="opacity-50 text-[11px]">
              {PROTOCOLS[level].jp}
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          {Object.keys(completedSteps).length > 1 && (
            <button
              onClick={handleUndo}
              className="w-12 h-12 flex items-center justify-center border border-border-theme rounded-none bg-panel text-foreground hover:bg-surface transition-colors duration-100 ease-linear"
              title="undo last logged dose"
            >
              <Undo className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={handleReset}
            className="w-12 h-12 flex items-center justify-center border border-border-theme rounded-none bg-panel text-foreground hover:bg-surface transition-colors duration-100 ease-linear"
          >
            <RotateCcw className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* HERO: NEXT DOSE TIME */}
      <section className="flex flex-col items-center justify-center pt-24 pb-16 px-4 shrink-0">
        <div className="text-[13px] tracking-[0.05em] text-subtext mb-2 flex items-center gap-2">
          {nextDose ? <>t-minus // next dose</> : <>t-plus // complete</>}
        </div>
        <div className="w-full relative flex items-center justify-center">
          <h1 className="font-sans text-[clamp(5rem,20vw,8rem)] leading-none tracking-tighter text-foreground select-none [font-variant-numeric:tabular-nums]">
            {nextDose ? nextDose.timeLabel : "done"}
          </h1>
          {nextDose && (
            <span
              className={`absolute -right-2 top-2 ${theme.bgClass} text-white px-2 border border-border-theme font-sans text-xl font-normal translate-y-[-10px]`}
            >
              ×{nextDose.portions}
            </span>
          )}
        </div>
      </section>

      {/* SCHEDULE LIST (RECEIPT STYLE) */}
      <section className="flex-1 overflow-y-auto px-6 pb-40 flex flex-col">
        {Object.keys(completedSteps).length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowPast(!showPast)}
              className="text-[13px] tracking-[0.05em] text-subtext hover:text-foreground transition-colors duration-100"
            >
              {showPast ? "- hide past" : "+ show past"}
            </button>
          </div>
        )}
        <div className="border-t border-border-theme">
          {schedule.map((dose) => {
            const isCompleted = !!completedSteps[dose.doseNumber];
            const isNext = nextDose?.doseNumber === dose.doseNumber;
            const isFuture = !isCompleted && !isNext;

            if (isCompleted && !showPast) return null;

            const actualTimeMs = completedSteps[dose.doseNumber];
            const actualTimeLabel = actualTimeMs
              ? timeFormatter.format(new Date(actualTimeMs))
              : null;

            return (
              <div
                key={dose.doseNumber}
                className={`py-4 border-b border-surface flex items-center justify-between transition-all duration-300 ease-linear ${
                  isCompleted
                    ? "opacity-30 bg-surface grayscale"
                    : isNext
                      ? "opacity-100 bg-panel border-l-[6px] px-3 my-2 shadow-sm rounded-none"
                      : "opacity-80 hover:opacity-100"
                }`}
                style={{
                  borderLeftColor: isNext ? THEMES[level].color : "transparent",
                }}
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className={`w-6 text-[13px] font-bold ${isNext ? theme.textClass : "text-subtext"}`}
                  >
                    {String(dose.doseNumber).padStart(2, "0")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-sans tracking-tight [font-variant-numeric:tabular-nums] ${isCompleted ? "line-through text-subtext" : isNext ? "text-foreground font-bold" : "text-subtext"}`}
                    >
                      {dose.timeLabel}
                    </span>
                    {isCompleted && actualTimeLabel && (
                      <span className="text-xs font-sans tracking-tight text-subtext/70 [font-variant-numeric:tabular-nums] flex items-center gap-1">
                        <Check className="w-3 h-3" /> {actualTimeLabel}
                      </span>
                    )}
                  </div>
                  {dose.isNextDay && (
                    <span className="text-[10px] font-bold tracking-widest bg-surface border border-border-theme px-1.5 py-0.5 rounded-none text-subtext uppercase">
                      +1d
                    </span>
                  )}
                  {dose.isAfterCutoff && (
                    <span
                      className="text-[10px] font-bold tracking-widest bg-surface border border-border-theme px-1.5 py-0.5 rounded-none text-subtext uppercase"
                      aria-label="scheduled after 18:00"
                      title="scheduled after 18:00"
                    >
                      18+
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!isCompleted && (
                    <button
                      onClick={() => openEditDoseModal(dose)}
                      className={`px-3 py-1.5 border border-border-theme flex items-center justify-center bg-background hover:bg-surface text-foreground transition-all duration-100 ease-linear active:scale-95 text-[11px] tracking-widest uppercase rounded-none ${isNext ? "bg-surface font-semibold" : ""}`}
                      aria-label={`edit dose ${dose.doseNumber} time`}
                    >
                      adjust
                    </button>
                  )}
                  <span className={`text-[11px] font-bold tracking-widest px-2 py-1 rounded-none uppercase ${isNext ? `${theme.bgClass} text-white` : "bg-surface text-subtext border border-border-theme"}`}>
                    {dose.portions} pill{dose.portions > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM ACTION AREA */}
      <div className="fixed bottom-8 left-0 right-0 w-full max-w-lg mx-auto px-6">
        <div className="flex gap-2">
          <div className="flex-1">
            <HoldButton
              onComplete={() => nextDose && completeStep(nextDose.doseNumber)}
              theme={theme}
              disabled={!nextDose}
              label={nextDose ? "hold to consume" : "protocol complete"}
            />
          </div>
          {nextDose && (
            <button
              onClick={() => {
                const now = new Date();
                setCustomTimeInput(timeFormatter.format(now));
                setShowCustomTimeModal(true);
              }}
              className="w-24 border border-border-theme flex items-center justify-center bg-background hover:bg-surface text-foreground transition-all duration-100 ease-linear active:scale-95 text-[11px] tracking-widest"
            >
              custom
            </button>
          )}
        </div>
      </div>

      {/* CUSTOM TIME MODAL */}
      <AnimatePresence>
        {showCustomTimeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/90 sm:p-6"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-panel border-t sm:border border-border-theme p-6 pt-8 sm:p-6 w-full max-w-sm"
            >
              <h2 className="text-lg text-foreground mb-2 tracking-wide font-medium">
                log custom time
              </h2>
              <p className="text-subtext text-[13px] mb-8 leading-relaxed">
                did you take your dose earlier? specify the exact time below to keep your timeline accurate.
              </p>
              <div className="mb-8">
                <input
                  type="time"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  className="w-full bg-background border border-border-theme text-foreground p-4 font-sans text-3xl appearance-none rounded-none focus:outline-none focus:border-foreground transition-all duration-100 ease-linear tracking-tighter"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomTimeModal(false)}
                  className="flex-1 py-4 border border-border-theme bg-surface text-foreground tracking-[0.05em] text-[13px] hover:bg-foreground hover:text-background transition-all duration-100 ease-linear active:scale-95"
                >
                  cancel
                </button>
                <button
                  onClick={() => {
                    if (!customTimeInput || !nextDose) return;
                    const [hours, minutes] = customTimeInput
                      .split(":")
                      .map(Number);
                    const now = new Date();
                    const customDate = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate(),
                      hours,
                      minutes,
                    );
                    completeStep(nextDose.doseNumber, customDate.getTime());
                    setShowCustomTimeModal(false);
                  }}
                  className={`flex-1 py-4 border border-border-theme ${theme.bgClass} text-white tracking-[0.05em] text-[13px] font-semibold hover:brightness-110 transition-all duration-100 ease-linear active:scale-95`}
                >
                  log dose
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* EDIT DOSE TIME MODAL */}
      <AnimatePresence>
        {showEditDoseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/90 sm:p-6"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-panel border-t sm:border border-border-theme p-6 pt-8 sm:p-6 w-full max-w-sm"
            >
              <h2 className="text-lg text-foreground mb-2 tracking-wide font-medium">
                edit dose {editingDoseNumber ? String(editingDoseNumber).padStart(2, "0") : ""}
              </h2>
              <p className="text-subtext text-[13px] mb-8 leading-relaxed">
                adjust the scheduled time for this dose. subsequent doses will automatically shift to maintain your intervals.
              </p>
              <div className="mb-8">
                <input
                  type="time"
                  value={editDoseTimeInput}
                  onChange={(e) => setEditDoseTimeInput(e.target.value)}
                  className="w-full bg-background border border-border-theme text-foreground p-4 font-sans text-3xl appearance-none rounded-none focus:outline-none focus:border-foreground transition-all duration-100 ease-linear tracking-tighter"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditDoseModal(false)}
                  className="flex-1 py-4 border border-border-theme bg-surface text-foreground tracking-[0.05em] text-[13px] hover:bg-foreground hover:text-background transition-all duration-100 ease-linear active:scale-95"
                >
                  cancel
                </button>
                <button
                  onClick={applyEditedDoseTime}
                  className={`flex-1 py-4 border border-border-theme ${theme.bgClass} text-white tracking-[0.05em] text-[13px] font-semibold hover:brightness-110 transition-all duration-100 ease-linear active:scale-95`}
                >
                  save time
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CHEER OVERLAY */}
      <AnimatePresence>
        {cheerMsg && (
          <PlayfulToast
            key={cheerMsg.id}
            word={cheerMsg.text}
            themeColorClass={theme.bgClass}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppContent />
    </Suspense>
  );
}
