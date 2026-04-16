"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Clock, RotateCcw, Check, Zap, AlertCircle, Undo, Sun, Moon } from "lucide-react";

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

const THEMES: Record<Level, { color: string; bgClass: string; textClass: string; borderClass: string; fillClass: string }> = {
  Charmander: {
    color: "#FACC15",
    bgClass: "bg-[#FACC15]",
    textClass: "text-[#FACC15]",
    borderClass: "border-[#FACC15]",
    fillClass: "bg-[#FACC15]",
  },
  Charmeleon: {
    color: "#FF5E0E",
    bgClass: "bg-[#FF5E0E]",
    textClass: "text-[#FF5E0E]",
    borderClass: "border-[#FF5E0E]",
    fillClass: "bg-[#FF5E0E]",
  },
  Charizard: {
    color: "#E63946",
    bgClass: "bg-[#E63946]",
    textClass: "text-[#E63946]",
    borderClass: "border-[#E63946]",
    fillClass: "bg-[#E63946]",
  },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// -- Custom Hold Button --
function HoldButton({ 
  onComplete, 
  theme, 
  label = "HOLD TO CONSUME",
  disabled = false
}: { 
  onComplete: () => void; 
  theme: typeof THEMES[Level]; 
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
    }, 1500);
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
      className={`relative w-full h-24 border-[3px] border-border-theme overflow-hidden flex items-center justify-center uppercase tracking-widest text-lg font-bold transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed bg-surface text-subtext shadow-none' : 
        completed ? 'bg-foreground text-background shadow-[4px_4px_0px_0px_var(--color-border-theme)]' : 'bg-background text-foreground hover:bg-surface shadow-[6px_6px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]'
      }`}
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {!disabled && !completed && (
        <div
          className={`absolute left-0 top-0 bottom-0 ${theme.bgClass}`}
          style={{
            width: holding ? "100%" : "0%",
            transitionProperty: "width",
            transitionDuration: holding ? "1500ms" : "300ms",
            transitionTimingFunction: holding ? "linear" : "ease-out",
          }}
        />
      )}
      <span className={`relative z-10 ${holding ? 'text-black' : ''} transition-colors duration-100`}>
        {completed ? "DOSE LOGGED" : holding ? "HOLDING..." : label}
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
  const [completedSteps, setCompletedSteps] = useState<Record<number, number>>({});
  const [showPast, setShowPast] = useState(false);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [acknowledgedCutoff, setAcknowledgedCutoff] = useState(false);
  const [quote, setQuote] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("pokeMed_theme") as "light" | "dark" | null;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    if (savedTheme) {
      setThemeMode(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const isDark = mql.matches;
      setThemeMode(isDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("pokeMed_theme")) {
        const isDark = e.matches;
        setThemeMode(isDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
      }
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("pokeMed_theme", newTheme);
  };
  
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
    if (savedSteps) {
      try {
        setCompletedSteps(JSON.parse(savedSteps));
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
      localStorage.setItem("pokeMed_completedSteps_v2", JSON.stringify(completedSteps));
    }
  }, [completedSteps, mounted]);

  const handleReset = () => {
    if (!confirm("RESET PROTOCOL?")) return;
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps({});
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
  };

  const handleUndo = () => {
    const keys = Object.keys(completedSteps).map(Number).sort((a, b) => b - a);
    if (keys.length <= 1) return; // Don't undo dose 1 (which starts the protocol)
    const lastDoseNumber = keys[0];
    
    if (!confirm(`UNDO DOSE ${lastDoseNumber}?`)) return;
    
    setCompletedSteps((prev) => {
      const next = { ...prev };
      delete next[lastDoseNumber];
      return next;
    });
  };

  const completeStep = (step: number) => {
    if (completedSteps[step]) return;
    const now = new Date().getTime();
    setCompletedSteps((prev) => ({ ...prev, [step]: now }));
  };

  const setNow = () => {
    const now = new Date();
    setStartTime(timeFormatter.format(now));
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

      // Skip strict 18:00 cutoff display modal, just visually end or limit
      if (doseDate.getHours() >= 18 && i > 0) {
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
    return generated;
  })();

  const nextDose = schedule.find((d) => !completedSteps[d.doseNumber]);
  const isAllComplete = schedule.length > 0 && schedule.every(d => completedSteps[d.doseNumber]);
  const theme = THEMES[level];
  const willBeTruncated = schedule.length < PROTOCOLS[level].maxDoses;

  useEffect(() => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered', reg))
        .catch(err => console.error('SW registration failed', err));
    }
  }, []);

  const startSchedule = async () => {
    if (!startTime) return;
    if (willBeTruncated && !acknowledgedCutoff) {
      setShowCutoffModal(true);
      return;
    }
    const [hoursStr, minutesStr] = startTime.split(":");
    const now = new Date();
    now.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    setCompletedSteps({ 1: now.getTime() });
    setShowCutoffModal(false);
    setAcknowledgedCutoff(false);

    if ('Notification' in window && 'serviceWorker' in navigator) {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }
      if (perm === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification("Protocol Engaged", {
            body: "Notifications are active. You will be reminded when it's time.",
            vibrate: [200, 100, 200],
            tag: "protocol-start"
          } as NotificationOptions);
        });
      }
    }
  };

  useEffect(() => {
    if (isAllComplete) {
      const quotes = [
        "Great job sticking to the protocol today.",
        "You conquered the day! Rest and recover.",
        "Protocol complete. Your future self thanks you.",
        "All doses logged. Time to wind down."
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
        <main className="min-h-screen flex flex-col pt-24 pb-8 px-6 max-w-lg mx-auto w-full fade-in items-center justify-center text-center">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="w-16 h-16 rounded-full bg-panel flex items-center justify-center mb-8 border-[3px] border-border-theme shadow-[4px_4px_0px_0px_var(--color-border-theme)]">
              <Check className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-5xl font-sans tracking-tighter uppercase leading-none mb-12 text-foreground drop-shadow-[2px_2px_0px_var(--color-surface)]">
              PROTOCOL<br/>COMPLETE
            </h1>
            {quote && (
              <div className={`text-3xl md:text-4xl font-sans tracking-tight ${theme.textClass} font-bold italic px-4 leading-tight drop-shadow-[2px_2px_0px_var(--color-surface)]`}>
                "{quote}"
              </div>
            )}
          </div>
          
          <div className="w-full mt-12">
            <button
              onClick={() => {
                setStartTime("");
                setLevel("Charmander");
                setCompletedSteps({});
                localStorage.removeItem("pokeMed_startTime");
                localStorage.removeItem("pokeMed_level");
                localStorage.removeItem("pokeMed_completedSteps_v2");
              }}
              className="w-full py-6 border-[3px] border-border-theme bg-surface text-foreground uppercase tracking-[0.2em] font-bold text-lg transition-all hover:bg-foreground hover:text-background shadow-[6px_6px_0px_0px_var(--color-border-theme)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
            >
              RESET PROTOCOL
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen flex flex-col pt-12 pb-8 px-6 max-w-lg mx-auto w-full fade-in">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-2 flex items-center gap-2 font-bold">
              <Zap className="w-3 h-3" /> INITIALIZE PROTOCOL
            </div>
            <h1 className="text-4xl font-sans tracking-tighter uppercase leading-none text-foreground drop-shadow-[2px_2px_0px_var(--color-surface)]">
              SET<br/>PARAMETERS
            </h1>
          </div>
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center border-[2px] border-border-theme rounded-full text-foreground hover:bg-surface transition-all shadow-[2px_2px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            title="Toggle theme"
          >
            {themeMode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </header>

        <div className="flex-1 space-y-12">
          {/* LEVEL SELECTION */}
          <section>
            <div className="text-xs uppercase tracking-widest text-subtext mb-4 border-b-[2px] border-surface pb-2 font-bold">01 // SELECT DOSAGE</div>
            <div className="flex flex-col gap-3">
              {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`relative w-full text-left p-4 border-[3px] transition-all duration-200 uppercase tracking-widest text-lg overflow-hidden ${
                    level === l 
                      ? `${THEMES[l].bgClass} text-black border-border-theme font-bold shadow-[6px_6px_0px_0px_var(--color-border-theme)] translate-x-[-2px] translate-y-[-2px]` 
                      : 'bg-background border-border-theme text-foreground hover:bg-surface shadow-[2px_2px_0px_0px_var(--color-border-theme)]'
                  }`}
                >
                  <span className="relative z-10">{l}</span>
                  {level === l && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 font-sans text-xl">
                      ×{PROTOCOLS[l].maxDoses}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* TIME SELECTION */}
          <section>
            <div className="text-xs uppercase tracking-widest text-subtext mb-4 border-b-[2px] border-surface pb-2 font-bold">02 // T-ZERO (START TIME)</div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full bg-panel border-[3px] ${startTime ? 'border-border-theme shadow-[4px_4px_0px_0px_var(--color-border-theme)]' : 'border-border-theme shadow-[2px_2px_0px_0px_var(--color-border-theme)] opacity-50'} text-foreground p-4 font-sans text-3xl uppercase appearance-none rounded-none focus:outline-none focus:shadow-[6px_6px_0px_0px_var(--color-border-theme)] transition-all`}
                  style={{ colorScheme: themeMode }}
                />
              </div>
              <button
                onClick={setNow}
                className="h-[68px] px-6 border-[3px] border-border-theme bg-surface text-foreground font-bold hover:bg-foreground hover:text-background uppercase tracking-widest text-sm transition-all shadow-[4px_4px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
              >
                NOW
              </button>
            </div>
          </section>
        </div>

        {/* START BUTTON */}
        <div className="mt-8">
          <button
            onClick={startSchedule}
            disabled={!startTime}
            className={`w-full py-6 uppercase tracking-[0.2em] font-bold text-lg border-[3px] border-border-theme transition-all ${
              startTime 
                ? `${theme.bgClass} text-black shadow-[6px_6px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px]` 
                : 'bg-surface text-subtext opacity-50 cursor-not-allowed shadow-none'
            }`}
          >
            ENGAGE
          </button>
        </div>

        {/* CUTOFF WARNING MODAL */}
        {showCutoffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6 fade-in">
            <div className="bg-panel border-[3px] border-border-theme shadow-[8px_8px_0px_0px_var(--color-border-theme)] p-6 max-w-sm w-full">
              <h2 className="text-xl font-bold text-foreground mb-4 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${theme.textClass}`} /> Schedule Adjusted
              </h2>
              <p className="text-subtext font-bold mb-6 text-sm">
                The calculated schedule goes past 18:00. To prevent sleep disruption, some late doses have been omitted from this protocol.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCutoffModal(false)} 
                  className="flex-1 py-3 border-[3px] border-border-theme bg-surface text-foreground font-bold uppercase tracking-widest text-sm hover:bg-foreground hover:text-background transition-all shadow-[4px_4px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { setAcknowledgedCutoff(true); setTimeout(startSchedule, 0); }} 
                  className={`flex-1 py-3 border-[3px] border-border-theme ${theme.bgClass} text-black uppercase tracking-widest text-sm font-bold shadow-[4px_4px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all`}
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ==============================
  // RENDER: MAIN TRACKING SCREEN
  // ==============================
  return (
    <main className="min-h-screen flex flex-col w-full max-w-lg mx-auto relative fade-in">
      
      {/* HEADER / NAVIGATION */}
      <header className="flex items-center justify-between p-6 pb-0">
        <div className="text-[10px] uppercase tracking-[0.2em] flex flex-col font-bold">
          <span className="text-subtext">PROTOCOL //</span>
          <span className={`${theme.textClass} drop-shadow-[1px_1px_0px_var(--color-surface)]`}>{level}</span>
        </div>
        <div className="flex gap-2">
          {Object.keys(completedSteps).length > 1 && (
            <button 
              onClick={handleUndo}
              className="w-10 h-10 flex items-center justify-center border-[2px] border-border-theme rounded-full bg-panel text-foreground hover:bg-surface transition-all shadow-[2px_2px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              title="Undo last logged dose"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center border-[2px] border-border-theme rounded-full bg-panel text-foreground hover:bg-surface transition-all shadow-[2px_2px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center border-[2px] border-border-theme rounded-full bg-panel text-foreground hover:bg-surface transition-all shadow-[2px_2px_0px_0px_var(--color-border-theme)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            title="Toggle theme"
          >
            {themeMode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* HERO: NEXT DOSE TIME */}
      <section className="flex flex-col items-center justify-center pt-8 pb-12 px-4 shrink-0">
        <div className="text-xs uppercase tracking-widest text-subtext font-bold mb-2 flex items-center gap-2">
          {nextDose ? (
            <>T-MINUS // NEXT DOSE</>
          ) : (
            <>T-PLUS // COMPLETE</>
          )}
        </div>
        <div className="w-full relative flex items-center justify-center">
          <h1 
            className="font-sans text-[clamp(6rem,25vw,10rem)] leading-none tracking-tighter text-foreground drop-shadow-[4px_4px_0px_var(--color-surface)] select-none"
          >
            {nextDose ? nextDose.timeLabel : "DONE"}
          </h1>
          {nextDose && (
            <span className={`absolute -right-2 top-2 ${theme.bgClass} text-black px-2 border-[2px] border-border-theme font-sans text-2xl font-bold shadow-[2px_2px_0px_0px_var(--color-border-theme)] translate-y-[-10px] rotate-[10deg]`}>
              ×{nextDose.portions}
            </span>
          )}
        </div>
      </section>

      {/* SCHEDULE LIST (RECEIPT STYLE) */}
      <section className="flex-1 overflow-y-auto px-6 pb-32 flex flex-col">
        {Object.keys(completedSteps).length > 0 && (
          <div className="flex justify-end mb-2">
            <button 
              onClick={() => setShowPast(!showPast)}
              className="text-[10px] uppercase tracking-widest text-subtext hover:text-foreground transition-colors font-bold"
            >
              {showPast ? "- HIDE PAST" : "+ SHOW PAST"}
            </button>
          </div>
        )}
        <div className="border-t-[3px] border-border-theme">
          {schedule.map((dose) => {
            const isCompleted = !!completedSteps[dose.doseNumber];
            const isNext = nextDose?.doseNumber === dose.doseNumber;
            const isFuture = !isCompleted && !isNext;
            
            if (isCompleted && !showPast) return null;
            
            const actualTimeMs = completedSteps[dose.doseNumber];
            const actualTimeLabel = actualTimeMs ? timeFormatter.format(new Date(actualTimeMs)) : null;

            return (
              <div 
                key={dose.doseNumber} 
                className={`py-4 border-b-[3px] border-surface flex items-center justify-between transition-colors ${
                  isCompleted ? 'opacity-40 bg-surface' : isNext ? 'opacity-100 bg-panel border-border-theme px-2 translate-x-[-4px] shadow-[4px_4px_0px_0px_var(--color-border-theme)] my-2' : 'opacity-70'
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className={`w-6 text-xs text-subtext font-bold ${isNext ? theme.textClass : ''}`}>
                    {String(dose.doseNumber).padStart(2, '0')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-sans tracking-tight ${isCompleted ? 'line-through text-subtext' : isNext ? 'text-foreground' : 'text-subtext'}`}>
                      {dose.timeLabel}
                    </span>
                    {isCompleted && actualTimeLabel && (
                      <span className="text-sm font-sans tracking-tight text-subtext">
                        [{actualTimeLabel}]
                      </span>
                    )}
                  </div>
                  {dose.isNextDay && (
                    <span className="text-[9px] uppercase tracking-widest bg-surface border-[1px] border-border-theme px-1 text-subtext font-bold shadow-[1px_1px_0px_0px_var(--color-border-theme)]">
                      +1D
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-subtext tracking-widest font-bold">
                    {dose.portions} PILL{dose.portions > 1 ? 'S' : ''}
                  </span>
                  <div className={`w-4 h-4 border-[2px] border-border-theme rounded-full ${
                    isCompleted ? 'bg-surface shadow-none' : isNext ? `${theme.bgClass} shadow-[2px_2px_0px_0px_var(--color-border-theme)] animate-pulse` : 'bg-background shadow-[1px_1px_0px_0px_var(--color-border-theme)]'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM ACTION AREA */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto">
        <HoldButton 
          onComplete={() => nextDose && completeStep(nextDose.doseNumber)}
          theme={theme}
          disabled={!nextDose}
          label={nextDose ? "HOLD TO CONSUME" : "PROTOCOL COMPLETE"}
        />
      </div>

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
