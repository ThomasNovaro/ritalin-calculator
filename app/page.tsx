"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Clock, RotateCcw, Check, Zap, AlertCircle, Undo } from "lucide-react";

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
    color: "#ffbf00",
    bgClass: "bg-[#ffbf00]",
    textClass: "text-[#ffbf00]",
    borderClass: "border-[#ffbf00]",
    fillClass: "bg-[#ffbf00]",
  },
  Charmeleon: {
    color: "#ff5100",
    bgClass: "bg-[#ff5100]",
    textClass: "text-[#ff5100]",
    borderClass: "border-[#ff5100]",
    fillClass: "bg-[#ff5100]",
  },
  Charizard: {
    color: "#ff003c",
    bgClass: "bg-[#ff003c]",
    textClass: "text-[#ff003c]",
    borderClass: "border-[#ff003c]",
    fillClass: "bg-[#ff003c]",
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
      className={`relative w-full h-24 border-t border-[#333] overflow-hidden flex items-center justify-center uppercase tracking-widest text-lg font-bold transition-colors ${
        disabled ? 'opacity-30 cursor-not-allowed bg-black text-[#666]' : 
        completed ? 'bg-white text-black' : 'bg-black text-white hover:bg-[#111]'
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

  const startSchedule = () => {
    if (!startTime) return;
    const [hoursStr, minutesStr] = startTime.split(":");
    const now = new Date();
    now.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    setCompletedSteps({ 1: now.getTime() });
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

  // ==============================
  // RENDER: SETUP SCREEN
  // ==============================
  if (!isStarted || isAllComplete) {
    return (
      <main className="min-h-screen flex flex-col pt-12 pb-8 px-6 max-w-lg mx-auto w-full fade-in">
        <header className="mb-12">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#666] mb-2 flex items-center gap-2">
            <Zap className="w-3 h-3" /> INITIALIZE PROTOCOL
          </div>
          <h1 className="text-4xl font-sans tracking-tighter uppercase leading-none">
            {isAllComplete ? "PROTOCOL\nCOMPLETE" : "SET\nPARAMETERS"}
          </h1>
        </header>

        <div className="flex-1 space-y-12">
          {/* LEVEL SELECTION */}
          <section>
            <div className="text-xs uppercase tracking-widest text-[#888] mb-4 border-b border-[#333] pb-2">01 // SELECT DOSAGE</div>
            <div className="flex flex-col gap-3">
              {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`relative w-full text-left p-4 border transition-all duration-200 uppercase tracking-widest text-lg overflow-hidden ${
                    level === l 
                      ? `${THEMES[l].bgClass} text-black border-transparent font-bold` 
                      : 'border-[#333] text-white hover:border-[#666]'
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
            <div className="text-xs uppercase tracking-widest text-[#888] mb-4 border-b border-[#333] pb-2">02 // T-ZERO (START TIME)</div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full bg-black border ${startTime ? theme.borderClass : 'border-[#333]'} text-white p-4 font-sans text-3xl uppercase appearance-none rounded-none focus:outline-none focus:border-white transition-colors`}
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <button
                onClick={setNow}
                className="h-[68px] px-6 border border-[#333] text-[#888] hover:text-white hover:border-white uppercase tracking-widest text-sm transition-colors"
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
            className={`w-full py-6 uppercase tracking-[0.2em] font-bold text-lg transition-all ${
              startTime 
                ? `${theme.bgClass} text-black hover:scale-[1.02] active:scale-[0.98]` 
                : 'bg-[#111] text-[#444] cursor-not-allowed'
            }`}
          >
            {isAllComplete ? "RESTART PROTOCOL" : "ENGAGE"}
          </button>
        </div>
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
        <div className="text-[10px] uppercase tracking-[0.2em] flex flex-col">
          <span className="text-[#666]">PROTOCOL //</span>
          <span className={`${theme.textClass} font-bold`}>{level}</span>
        </div>
        <div className="flex gap-2">
          {Object.keys(completedSteps).length > 1 && (
            <button 
              onClick={handleUndo}
              className="w-10 h-10 flex items-center justify-center border border-[#333] rounded-full text-[#666] hover:text-white hover:border-white transition-colors"
              title="Undo last logged dose"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleReset}
            className="w-10 h-10 flex items-center justify-center border border-[#333] rounded-full text-[#666] hover:text-white hover:border-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* HERO: NEXT DOSE TIME */}
      <section className="flex flex-col items-center justify-center pt-8 pb-12 px-4 shrink-0">
        <div className="text-xs uppercase tracking-widest text-[#888] mb-2 flex items-center gap-2">
          {nextDose ? (
            <>T-MINUS // NEXT DOSE</>
          ) : (
            <>T-PLUS // COMPLETE</>
          )}
        </div>
        <div className="w-full relative flex items-center justify-center">
          <h1 
            className="font-sans text-[clamp(6rem,25vw,10rem)] leading-none tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] select-none"
          >
            {nextDose ? nextDose.timeLabel : "DONE"}
          </h1>
          {nextDose && (
            <span className={`absolute -right-2 top-2 ${theme.textClass} font-sans text-2xl font-bold`}>
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
              className="text-[10px] uppercase tracking-widest text-[#888] hover:text-white transition-colors"
            >
              {showPast ? "- HIDE PAST" : "+ SHOW PAST"}
            </button>
          </div>
        )}
        <div className="border-t border-[#333]">
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
                className={`py-4 border-b border-[#222] flex items-center justify-between transition-colors ${
                  isCompleted ? 'opacity-40' : isNext ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className={`w-6 text-xs text-[#555] ${isNext ? theme.textClass : ''}`}>
                    {String(dose.doseNumber).padStart(2, '0')}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-sans tracking-tight ${isCompleted ? 'line-through text-[#666]' : isNext ? 'text-white' : 'text-[#aaa]'}`}>
                      {dose.timeLabel}
                    </span>
                    {isCompleted && actualTimeLabel && (
                      <span className="text-sm font-sans tracking-tight text-[#888]">
                        [{actualTimeLabel}]
                      </span>
                    )}
                  </div>
                  {dose.isNextDay && (
                    <span className="text-[9px] uppercase tracking-widest bg-[#222] px-1 text-[#888]">
                      +1D
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#666] tracking-widest">
                    {dose.portions} PILL{dose.portions > 1 ? 'S' : ''}
                  </span>
                  <div className={`w-3 h-3 rounded-full ${
                    isCompleted ? 'bg-[#333]' : isNext ? `${theme.bgClass} animate-pulse` : 'border border-[#444]'
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
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AppContent />
    </Suspense>
  );
}
