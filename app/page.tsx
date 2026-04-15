"use client";

import { useState, useEffect } from "react";
import { Clock, CalendarDays, Target, RotateCcw, Check, Eye, EyeOff, Pill } from "lucide-react";

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
}

const PROTOCOLS: Record<Level, { gaps: number[]; portions: number[] }> = {
  // 6 doses, 1 portion each. Gaps: 0, 1h45m (105m), 1h45m (105m), 1h45m (105m), 1h45m (105m), 1h45m (105m)
  Charmander: {
    gaps: [0, 105, 105, 105, 105, 105],
    portions: [1, 1, 1, 1, 1, 1],
  },
  // 4 doses, 1, 2, 2, 1 portions. Gaps: 0, 1h45m (105m), 3h30m (210m), 1h45m (105m)
  Charmeleon: {
    gaps: [0, 105, 210, 105],
    portions: [1, 2, 2, 1],
  },
  // 3 doses, 2 portions each. Gaps: 0, 4h15m (255m), 4h15m (255m)
  Charizard: {
    gaps: [0, 255, 255],
    portions: [2, 2, 2],
  },
};

const THEMES: Record<
  Level,
  {
    glowBg: string;
    headerIconText: string;
    headerIconBg: string;
    activeBorder: string;
    activeBg: string;
    activeText: string;
    hoverBorder: string;
    ring: string;
    pillBg: string;
    pillSolidBg: string;
    pillBorder: string;
    badgeBg: string;
    badgeText: string;
    nodeBg: string;
    nodeText: string;
    intensity: number;
  }
> = {
  Charmander: {
    glowBg: "from-amber-500/20 via-amber-500/5 to-transparent",
    headerIconText: "text-amber-500 dark:text-amber-400",
    headerIconBg: "bg-amber-100 dark:bg-amber-900/30",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-900/20",
    activeText: "text-amber-700 dark:text-amber-300",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700/50",
    ring: "focus:ring-amber-500",
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
    glowBg: "from-orange-500/20 via-orange-500/5 to-transparent",
    headerIconText: "text-orange-500 dark:text-orange-400",
    headerIconBg: "bg-orange-100 dark:bg-orange-900/30",
    activeBorder: "border-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-900/20",
    activeText: "text-orange-700 dark:text-orange-300",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700/50",
    ring: "focus:ring-orange-500",
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
    glowBg: "from-red-500/20 via-red-500/5 to-transparent",
    headerIconText: "text-red-500 dark:text-red-400",
    headerIconBg: "bg-red-100 dark:bg-red-900/30",
    activeBorder: "border-red-500",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeText: "text-red-700 dark:text-red-300",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700/50",
    ring: "focus:ring-red-500",
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

export default function Home() {
  const [level, setLevel] = useState<Level>("Charmander");
  const [startTime, setStartTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [animatingStep, setAnimatingStep] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTime = localStorage.getItem("pokeMed_startTime");
    const savedLevel = localStorage.getItem("pokeMed_level") as Level | null;
    const savedSteps = localStorage.getItem("pokeMed_completedSteps");

    if (savedTime && savedLevel) {
      setStartTime(savedTime);
      setLevel(savedLevel);
    }
    
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
      localStorage.setItem("pokeMed_completedSteps", JSON.stringify(completedSteps));
    }
  }, [completedSteps, mounted]);

  const handleReset = () => {
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps([]);
    setShowCompleted(false);
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps");
  };

  const completeStep = (step: number) => {
    if (animatingStep !== null || completedSteps.includes(step)) return;
    setAnimatingStep(step);

    // Smooth CSS pop animation
    setTimeout(() => {
      setCompletedSteps((prev) => Array.from(new Set([...prev, step])));
      setAnimatingStep(null);
    }, 400); 
  };

  const handleTimeChange = (newTime: string) => {
    setStartTime(newTime);
    if (newTime && !completedSteps.includes(1)) {
      setTimeout(() => completeStep(1), 50);
    }
  };

  const setNow = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    handleTimeChange(`${hours}:${minutes}`);
  };

  // Derive schedule during render instead of using useEffect (Rule: rerender-derived-state-no-effect)
  const schedule: DoseInfo[] = (() => {
    if (!mounted || !startTime) return [];

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
    let cumulativeMinutes = 0;

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return protocol.gaps.map((gap, index) => {
      cumulativeMinutes += gap;

      const doseTime = new Date(baseDate.getTime() + cumulativeMinutes * 60000);

      const isNextDay =
        doseTime.getFullYear() > baseDate.getFullYear() ||
        doseTime.getMonth() > baseDate.getMonth() ||
        doseTime.getDate() > baseDate.getDate();

      return {
        doseNumber: index + 1,
        timeLabel: timeFormatter.format(doseTime),
        portions: protocol.portions[index],
        isNextDay,
      };
    });
  })();

  const totalPortions = schedule.reduce((sum, dose) => sum + dose.portions, 0);
  const completedPortions = schedule
    .filter((dose) => completedSteps.includes(dose.doseNumber))
    .reduce((sum, dose) => sum + dose.portions, 0);

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 font-sans p-4 sm:p-8 overflow-hidden">
      {/* Global styles for custom animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pokeball-wiggle {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(-25deg); }
          30% { transform: rotate(25deg); }
          45% { transform: rotate(-15deg); }
          60% { transform: rotate(15deg); }
          75% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-pokeball-wiggle {
          animation: pokeball-wiggle 1s ease-in-out infinite;
          transform-origin: bottom center;
        }
      `}} />

      {/* Background ambient glow */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial ${THEMES[level].glowBg} opacity-60 blur-[100px] rounded-full transition-colors duration-700`}
        />
      </div>

      <main className="relative z-10 max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 mt-4">
          <div className="flex justify-center mb-4">
            <div
              className={`p-3 rounded-2xl transition-colors ${THEMES[level].headerIconBg}`}
            >
              <PokeballIcon
                className={`w-8 h-8 transition-colors ${THEMES[level].headerIconText}`}
                aria-hidden="true"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ritalin, I Choose You!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Gotta catch all 6 pills
          </p>
        </div>

        {/* Level Selection */}
        <section className="space-y-3">
          <div
            className="grid grid-cols-3 gap-3 sm:gap-4"
            role="group"
            aria-labelledby="level-label"
          >
            {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex flex-col items-center justify-center p-4 sm:p-5 min-h-[120px] sm:min-h-[140px] rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 ${THEMES[l].ring} ${
                  level === l
                    ? `${THEMES[l].activeBorder} ${THEMES[l].activeBg} ${THEMES[l].activeText} shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_currentColor]`
                    : `border-zinc-200 dark:border-zinc-800 ${THEMES[l].hoverBorder} bg-white dark:bg-zinc-900 shadow-sm hover:shadow-[0_0_15px_currentColor] hover:shadow-opacity-10`
                }`}
              >
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: THEMES[l].intensity }).map((_, i) => (
                    <Target
                      key={i}
                      aria-hidden="true"
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        level === l
                          ? THEMES[l].headerIconText
                          : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  ))}
                </div>
                <div className="font-bold text-sm sm:text-base mb-1">{l}</div>
                <div className="text-xs opacity-80 leading-tight text-center">
                  {l === "Charmander"}
                  {l === "Charmeleon"}
                  {l === "Charizard"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Time Input */}
        <section className="space-y-3">
          <label
            htmlFor="time-input"
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
          >
            First Intake Time
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
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
                className={`w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus-visible:ring-2 focus-visible:outline-none ${THEMES[level].ring.replace("focus:", "focus-visible:")} focus:border-transparent transition-all appearance-none outline-none`}
              />
            </div>
            <button
              onClick={setNow}
              className="px-6 py-3 font-medium rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              Now
            </button>
          </div>
        </section>

        {/* Timeline */}
        <section className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5" aria-hidden="true" />
              Schedule
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {completedSteps.length > 0 && (
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors focus-visible:ring-2 outline-none bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 focus-visible:ring-zinc-500"
                >
                  {showCompleted ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                  {showCompleted ? "Hide Done" : `Show Done (${completedSteps.length})`}
                </button>
              )}
              {schedule.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {completedPortions} / {totalPortions}&nbsp;Pills
                </span>
              )}
              <button
                onClick={handleReset}
                disabled={schedule.length === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors focus-visible:ring-2 outline-none ${
                  schedule.length === 0
                    ? "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                    : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 focus-visible:ring-red-500"
                }`}
                aria-label="Reset schedule"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <p className="text-zinc-500 dark:text-zinc-400">
                Select a start time to view your schedule.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Continuous Vertical Line */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>

              <div className="space-y-8 relative">
                {schedule
                  .filter((dose) => {
                    if (showCompleted) return true;
                    if (animatingStep === dose.doseNumber) return true;
                    return !completedSteps.includes(dose.doseNumber);
                  })
                  .map((dose, idx) => {
                    const isCompleted = completedSteps.includes(dose.doseNumber);
                    const isAnimating = animatingStep === dose.doseNumber;

                    return (
                      <div key={idx} className="flex items-center gap-6 group relative">
                        {/* The Action Button (Timeline Node) */}
                        <button
                          onClick={() => completeStep(dose.doseNumber)}
                          disabled={isCompleted || isAnimating}
                          className={`relative z-10 flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 ${THEMES[level].ring} ${
                            isCompleted
                              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-default scale-95"
                              : isAnimating
                              ? `scale-110 ${THEMES[level].pillSolidBg} text-white shadow-lg`
                              : `bg-white dark:bg-[#111] border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-500 hover:scale-105 shadow-sm cursor-pointer`
                          }`}
                          aria-label={`Complete dose ${dose.doseNumber}`}
                        >
                          {isCompleted || isAnimating ? (
                            <Check
                              className={`w-6 h-6 transition-transform duration-300 ${
                                isAnimating ? "scale-110" : "scale-100"
                              }`}
                              strokeWidth={3}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <div className="flex -space-x-1">
                                {Array.from({ length: dose.portions }).map((_, i) => (
                                  <Pill
                                    key={i}
                                    className={`w-5 h-5 ${THEMES[level].headerIconText}`}
                                    fill="currentColor"
                                    fillOpacity={0.2}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </button>

                        {/* Minimal Content */}
                        <div
                          className={`flex flex-col transition-all duration-300 ${
                            isCompleted ? "opacity-40 translate-x-2" : "opacity-100 translate-x-0"
                          }`}
                        >
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${
                                isCompleted ? "line-through" : ""
                              }`}
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {dose.timeLabel}
                            </span>
                            {dose.isNextDay && (
                              <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">
                                +1 Day
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {dose.portions} {dose.portions === 1 ? "Pill" : "Pills"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>

        {/* Footer info/disclaimer */}
        <div className="text-center pt-8 pb-12">
          <p className="text-xs text-zinc-400">
            For tracking purposes only. Always follow medical advice.
          </p>
        </div>
      </main>
    </div>
  );
}
