"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Clock, Target, RotateCcw, Check, Eye, EyeOff, Pill, Bell, BellRing, X, AlertCircle } from "lucide-react";

// Custom SVG Pokeball Icon (Now a PokéPill!)
const PokeballIcon = ({
  className,
  "aria-hidden": ariaHidden,
}: {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) => (
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
      {/* Outer capsule shape */}
      <rect x="7" y="3" width="10" height="18" rx="5" />
      {/* Inner button */}
      <circle cx="12" cy="12" r="2.5" />
      {/* Left and right middle lines */}
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

const THEMES: Record<Level, { glowBg: string; headerIconText: string; headerIconBg: string; activeBorder: string; activeBg: string; activeText: string; hoverBorder: string; ring: string; pillBg: string; pillSolidBg: string; pillBorder: string; badgeBg: string; badgeText: string; nodeBg: string; nodeText: string; intensity: number; }> = {
  Charmander: {
    glowBg: "from-amber-400/30 via-amber-400/10 to-transparent",
    headerIconText: "text-amber-500 dark:text-amber-400",
    headerIconBg: "bg-amber-100 dark:bg-amber-900/30",
    activeBorder: "border-amber-400 dark:border-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-900/20",
    activeText: "text-amber-700 dark:text-amber-300",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700/50",
    ring: "focus-visible:ring-amber-500",
    pillBg: "bg-amber-500/20",
    pillSolidBg: "bg-amber-500 dark:bg-amber-400",
    pillBorder: "border-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    nodeBg: "bg-amber-100 dark:bg-amber-900/30",
    nodeText: "text-amber-600 dark:text-amber-400",
    intensity: 1,
  },
  Charmeleon: {
    glowBg: "from-orange-400/30 via-orange-400/10 to-transparent",
    headerIconText: "text-orange-500 dark:text-orange-400",
    headerIconBg: "bg-orange-100 dark:bg-orange-900/30",
    activeBorder: "border-orange-400 dark:border-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-900/20",
    activeText: "text-orange-700 dark:text-orange-300",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700/50",
    ring: "focus-visible:ring-orange-500",
    pillBg: "bg-orange-500/20",
    pillSolidBg: "bg-orange-500 dark:bg-orange-400",
    pillBorder: "border-orange-500",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-700 dark:text-orange-300",
    nodeBg: "bg-orange-100 dark:bg-orange-900/30",
    nodeText: "text-orange-600 dark:text-orange-400",
    intensity: 2,
  },
  Charizard: {
    glowBg: "from-red-400/30 via-red-400/10 to-transparent",
    headerIconText: "text-red-500 dark:text-red-400",
    headerIconBg: "bg-red-100 dark:bg-red-900/30",
    activeBorder: "border-red-400 dark:border-red-500",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeText: "text-red-700 dark:text-red-300",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700/50",
    ring: "focus-visible:ring-red-500",
    pillBg: "bg-red-500/20",
    pillSolidBg: "bg-red-500 dark:bg-red-400",
    pillBorder: "border-red-500",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-700 dark:text-red-300",
    nodeBg: "bg-red-100 dark:bg-red-900/30",
    nodeText: "text-red-600 dark:text-red-400",
    intensity: 3,
  },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function AppContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const urlLevel = (searchParams.get("level") as Level) || "Charmander";
  const urlTime = searchParams.get("time") || "";

  const [level, setLevelState] = useState<Level>(urlLevel);
  const [startTime, setStartTimeState] = useState<string>(urlTime);
  const [mounted, setMounted] = useState(false);
  // Key: doseNumber, Value: actual timestamp when taken
  const [completedSteps, setCompletedSteps] = useState<Record<number, number>>({});
  const [animatingStep, setAnimatingStep] = useState<number | null>(null);
  const [showFullSchedule, setShowFullSchedule] = useState(true);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state cleanly
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
    // Initial sync from local storage if URL is empty (hydration logic)
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
  }, []); // Only run once on mount

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
      if (!confirm("Are you sure you want to reset your entire schedule? This action cannot be undone.")) {
        return;
      }
    }
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps({});
    setShowFullSchedule(true);
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
    localStorage.removeItem("pokeMed_cutoffModalShown");
  };

  const completeStep = (step: number) => {
    if (animatingStep !== null || completedSteps[step]) return;
    setAnimatingStep(step);

    const now = new Date().getTime();

    setTimeout(() => {
      setCompletedSteps((prev) => ({ ...prev, [step]: now }));
      setAnimatingStep(null);
    }, 600);
  };

  const handleTimeChange = (newTime: string) => {
    setStartTime(newTime);
  };

  const setNow = () => {
    const now = new Date();
    const formatted = timeFormatter.format(now);
    setStartTime(formatted);
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
      new Notification("Notifications Enabled!", {
        body: "You will be notified when it's time for your next dose.",
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("pokeMed_notifications", "true");
        new Notification("Notifications Enabled!", {
          body: "You will be notified when it's time for your next dose.",
        });
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
          icon: "/favicon.ico",
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

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans p-4 sm:p-8 overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${THEMES[level].glowBg} opacity-60 rounded-full transition-colors duration-700 transform-gpu`} />
      </div>

      {showCutoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" aria-hidden="true">
                <AlertCircle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowCutoffModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-red-500 rounded-full p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold mb-2">Whoa there! Past 18:00.</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">
              To ensure you get a good night’s sleep, we’ve removed any doses scheduled after 18:00 from your timeline today.
            </p>
            <button
              onClick={() => setShowCutoffModal(false)}
              className="w-full py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2 mt-4">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-[2rem] transition-colors duration-300 ${THEMES[level].headerIconBg}`}>
              <PokeballIcon className={`w-8 h-8 transition-colors duration-300 ${THEMES[level].headerIconText}`} aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Ritalin, I Choose You!</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Gotta catch all {PROTOCOLS[level].maxDoses} pills
          </p>
        </div>

        {(!isStarted || isAllComplete) && (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3 sm:gap-4" role="radiogroup" aria-label="Select Protocol Level">
              {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => (
                <button
                  key={l}
                  role="radio"
                  aria-checked={level === l}
                  onClick={() => {
                    if (Object.keys(completedSteps).length > 1) {
                      if (confirm("Changing level will reset your schedule. Continue?")) {
                        setCompletedSteps({});
                        setStartTime("");
                        localStorage.removeItem("pokeMed_cutoffModalShown");
                        setLevel(l);
                      }
                    } else {
                      setLevel(l);
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-4 sm:p-5 min-h-[130px] rounded-[2rem] border-2 transition-[transform,colors,box-shadow] duration-300 motion-safe:hover:-translate-y-1 motion-safe:active:scale-95 focus:outline-none ${THEMES[l].ring} ${
                    level === l
                      ? `${THEMES[l].activeBorder} ${THEMES[l].activeBg} ${THEMES[l].activeText} shadow-xl`
                      : `border-transparent bg-white dark:bg-zinc-900 shadow-md ${THEMES[l].hoverBorder} text-zinc-600 dark:text-zinc-400 hover:shadow-lg`
                  }`}
                >
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: THEMES[l].intensity }).map((_, i) => (
                      <Target
                        key={i}
                        aria-hidden="true"
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${level === l ? THEMES[l].headerIconText : "text-zinc-300 dark:text-zinc-700"}`}
                      />
                    ))}
                  </div>
                  <div className="font-bold text-sm sm:text-base">{l}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {(!isStarted || isAllComplete) && (
          <section className="space-y-5">
            <div className="space-y-3">
              <label htmlFor="time-input" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                First Intake Time
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
                    <Clock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <input
                    id="time-input"
                    name="startTime"
                    autoComplete="off"
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className={`w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent bg-white dark:bg-zinc-900 shadow-sm focus:outline-none ${THEMES[level].ring} transition-colors appearance-none font-medium tabular-nums`}
                  />
                </div>
                <button
                  onClick={setNow}
                  className="px-6 py-4 font-bold rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-500 whitespace-nowrap shadow-sm motion-safe:active:scale-95"
                >
                  Now
                </button>
              </div>
            </div>

            {startTime && (
              <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <button
                  onClick={startSchedule}
                  className={`w-full py-4 rounded-2xl font-black text-white transition-[transform,opacity,box-shadow] motion-safe:hover:-translate-y-1 motion-safe:active:scale-95 ${THEMES[level].pillSolidBg} shadow-xl hover:shadow-2xl text-lg flex items-center justify-center gap-2`}
                >
                  <Pill className="w-5 h-5" aria-hidden="true" />
                  Start Schedule
                </button>
              </div>
            )}
          </section>
        )}

        {isStarted && schedule.length > 0 && (
          <section className="pt-2 animate-in fade-in zoom-in-95 duration-500" aria-live="polite">
            <div className="flex justify-center mb-6">
              <span className={`text-sm font-black px-4 py-2 rounded-2xl ${THEMES[level].activeBg} ${THEMES[level].activeText} border-2 ${THEMES[level].activeBorder} tabular-nums shadow-sm`}>
                {completedPortions} / {totalPortions} Pills Taken Today
              </span>
            </div>
            {!isAllComplete ? (
              nextDose && (
                <div className={`relative overflow-hidden p-6 sm:p-8 rounded-[2rem] border-2 ${THEMES[level].activeBorder} ${THEMES[level].activeBg} shadow-xl transition-colors duration-500`}>
                  <div className={`flex items-center justify-between transition-[transform,opacity] duration-500 ${animatingStep === nextDose.doseNumber ? '-translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}`}>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-widest mb-1 ${THEMES[level].headerIconText}`}>
                        Next Dose
                      </p>
                      <h2 className="text-5xl font-black tracking-tight mb-1 tabular-nums">
                        {nextDose.timeLabel}
                      </h2>
                    </div>
                    
                    <button
                      onClick={() => completeStep(nextDose.doseNumber)}
                      aria-label="Mark dose as complete"
                      className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-[transform,box-shadow] motion-safe:hover:scale-105 motion-safe:active:scale-95 shadow-lg ${THEMES[level].pillSolidBg} text-white focus-visible:outline-none ${THEMES[level].ring} ring-offset-4 ring-offset-transparent`}
                    >
                      <div className="flex gap-1">
                        {Array.from({ length: nextDose.portions }).map((_, i) => (
                          <Pill key={i} className={nextDose.portions === 1 ? "w-8 h-8" : "w-6 h-6"} aria-hidden="true" />
                        ))}
                      </div>
                    </button>
                  </div>
                  
                  {animatingStep === nextDose.doseNumber && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-20 animate-in fade-in duration-500">
                      <div className="flex flex-col items-center animate-in zoom-in-90 slide-in-from-bottom-2 fade-in duration-500 ease-out fill-mode-forwards">
                        <div className="w-14 h-14 mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                          <Check className="w-7 h-7" strokeWidth={4} aria-hidden="true" />
                        </div>
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                          Logged!
                        </h2>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="p-8 rounded-[2rem] border-2 border-green-400 bg-green-50 dark:bg-green-900/20 text-center shadow-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/40 text-green-500 rounded-full flex items-center justify-center mb-6">
                  <Check className="w-10 h-10" strokeWidth={3} aria-hidden="true" />
                </div>
                <h2 className="text-3xl font-black text-green-700 dark:text-green-300 mb-2">All Done!</h2>
                <p className="text-green-600 dark:text-green-400 font-medium">Great job adhering to your schedule today.</p>
              </div>
            )}
          </section>
        )}

        {isStarted && (
          <section className="pt-6 border-t-2 border-zinc-100 dark:border-zinc-800/50 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="flex items-center gap-2 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus-visible:outline-none focus-visible:underline rounded-lg"
              >
                {showFullSchedule ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                {showFullSchedule ? "Hide Timeline" : "Show Timeline"}
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={toggleNotifications}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-safe:active:scale-95 ${
                    notificationsEnabled
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {notificationsEnabled ? <BellRing className="w-3.5 h-3.5" aria-hidden="true" /> : <Bell className="w-3.5 h-3.5" aria-hidden="true" />}
                  {notificationsEnabled ? "Notifs On" : "Notifs Off"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 motion-safe:active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>

            {showFullSchedule && (
              <div className="relative animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="absolute left-[31px] top-8 bottom-8 w-1 bg-zinc-100 dark:bg-zinc-800 rounded-full" aria-hidden="true"></div>

                <div className="space-y-8 relative" role="list">
                  {schedule.map((dose) => {
                    const isCompleted = !!completedSteps[dose.doseNumber];
                    const isNext = nextDose?.doseNumber === dose.doseNumber;

                    return (
                      <div key={dose.doseNumber} className="flex items-center gap-6 group relative" role="listitem">
                        <div
                          className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                              : isNext
                              ? `${THEMES[level].pillSolidBg} text-white shadow-lg ring-4 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-[#050505] ${THEMES[level].ring.replace("focus-visible:", "")}`
                              : "bg-white dark:bg-zinc-900 border-4 border-zinc-100 dark:border-zinc-800"
                          }`}
                          aria-hidden="true"
                        >
                          {isCompleted ? (
                            <Check className="w-7 h-7" strokeWidth={3} />
                          ) : (
                            <div className="flex -space-x-1.5">
                              {Array.from({ length: dose.portions }).map((_, i) => (
                                <Pill
                                  key={i}
                                  className={`w-5 h-5 ${isNext ? "text-white" : THEMES[level].headerIconText}`}
                                  fill="currentColor"
                                  fillOpacity={0.2}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={`flex flex-col transition-opacity duration-300 ${isCompleted ? "opacity-50" : "opacity-100"}`}>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-black tracking-tight tabular-nums ${isCompleted ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                              {dose.timeLabel}
                            </span>
                            {dose.isNextDay && (
                              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                +1 Day
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {dose.portions}&nbsp;{dose.portions === 1 ? "Pill" : "Pills"}
                            {!isCompleted && !isNext && " (Est.)"}
                            {isCompleted && (
                              <span className="text-xs font-medium text-zinc-400 ml-2">
                                • Logged at {timeFormatter.format(new Date(completedSteps[dose.doseNumber]))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="text-center pt-8 pb-12">
          {notificationsEnabled && isStarted && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3 font-bold bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl inline-block">
              ⚠️ Keep this tab open to receive notifications.
            </p>
          )}
          <p className="text-xs text-zinc-400 font-medium">
            For tracking purposes only. Always follow medical advice.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-[#050505]" />}>
      <AppContent />
    </Suspense>
  );
}
