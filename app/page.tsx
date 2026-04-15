"use client";

import { useState, useEffect } from "react";
import { Clock, CalendarDays } from "lucide-react";

// Custom SVG Pokeball Icon
const PokeballIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M2.06 12H9" />
    <path d="M15 12h6.94" />
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
    headerIconText: string;
    headerIconBg: string;
    activeBorder: string;
    activeBg: string;
    activeText: string;
    hoverBorder: string;
    ring: string;
    pillBg: string;
    pillBorder: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  Charmander: {
    headerIconText: "text-amber-500 dark:text-amber-400",
    headerIconBg: "bg-amber-100 dark:bg-amber-900/30",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-50 dark:bg-amber-900/20",
    activeText: "text-amber-700 dark:text-amber-300",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700/50",
    ring: "focus:ring-amber-500",
    pillBg: "bg-amber-500/20",
    pillBorder: "border-amber-500",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  Charmeleon: {
    headerIconText: "text-orange-500 dark:text-orange-400",
    headerIconBg: "bg-orange-100 dark:bg-orange-900/30",
    activeBorder: "border-orange-500",
    activeBg: "bg-orange-50 dark:bg-orange-900/20",
    activeText: "text-orange-700 dark:text-orange-300",
    hoverBorder: "hover:border-orange-300 dark:hover:border-orange-700/50",
    ring: "focus:ring-orange-500",
    pillBg: "bg-orange-500/20",
    pillBorder: "border-orange-500",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-700 dark:text-orange-300",
  },
  Charizard: {
    headerIconText: "text-red-500 dark:text-red-400",
    headerIconBg: "bg-red-100 dark:bg-red-900/30",
    activeBorder: "border-red-500",
    activeBg: "bg-red-50 dark:bg-red-900/20",
    activeText: "text-red-700 dark:text-red-300",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700/50",
    ring: "focus:ring-red-500",
    pillBg: "bg-red-500/20",
    pillBorder: "border-red-500",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-700 dark:text-red-300",
  },
};

export default function Home() {
  const [level, setLevel] = useState<Level>("Charmander");
  const [startTime, setStartTime] = useState<string>("");
  const [schedule, setSchedule] = useState<DoseInfo[]>([]);

  useEffect(() => {
    calculateSchedule(level, startTime);
  }, [level, startTime]);

  const setNow = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    setStartTime(`${hours}:${minutes}`);
  };

  const calculateSchedule = (selectedLevel: Level, timeStr: string) => {
    if (!timeStr) {
      setSchedule([]);
      return;
    }

    const [hoursStr, minutesStr] = timeStr.split(":");
    const startHours = parseInt(hoursStr, 10);
    const startMinutes = parseInt(minutesStr, 10);

    const now = new Date();
    // Use today's date to establish a baseline
    const baseDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHours,
      startMinutes,
      0,
    );

    const protocol = PROTOCOLS[selectedLevel];
    let cumulativeMinutes = 0;

    const newSchedule: DoseInfo[] = protocol.gaps.map((gap, index) => {
      cumulativeMinutes += gap;

      const doseTime = new Date(baseDate.getTime() + cumulativeMinutes * 60000);

      // Check for next day crossover
      // This works even across month/year boundaries because it compares the absolute day offset
      const isNextDay =
        doseTime.getFullYear() > baseDate.getFullYear() ||
        doseTime.getMonth() > baseDate.getMonth() ||
        doseTime.getDate() > baseDate.getDate();

      const formatOptions: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };

      const timeLabel = new Intl.DateTimeFormat("en-US", formatOptions).format(
        doseTime,
      );

      return {
        doseNumber: index + 1,
        timeLabel,
        portions: protocol.portions[index],
        isNextDay,
      };
    });

    setSchedule(newSchedule);
  };

  const totalPortions = schedule.reduce((sum, dose) => sum + dose.portions, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-4 sm:p-8">
      <main className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 mt-4">
          <div className="flex justify-center mb-4">
            <div
              className={`p-3 rounded-2xl transition-colors ${THEMES[level].headerIconBg}`}
            >
              <PokeballIcon
                className={`w-8 h-8 transition-colors ${THEMES[level].headerIconText}`}
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
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            1. Select Level
          </label>
          <div className="grid gap-3">
            {(["Charmander", "Charmeleon", "Charizard"] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  level === l
                    ? `${THEMES[l].activeBorder} ${THEMES[l].activeBg} ${THEMES[l].activeText}`
                    : `border-zinc-200 dark:border-zinc-800 ${THEMES[l].hoverBorder} bg-white dark:bg-zinc-900`
                }`}
              >
                <div className="font-medium">{l}</div>
                <div className="text-xs opacity-70">
                  {l === "Charmander" && "6x spaced"}
                  {l === "Charmeleon" && "Varied sizes"}
                  {l === "Charizard" && "Heavy spaced"}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Time Input */}
        <section className="space-y-3">
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            2. First Intake Time
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
                <Clock className="w-5 h-5" />
              </div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ colorScheme: "dark" }}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 ${THEMES[level].ring} focus:border-transparent outline-none transition-all appearance-none`}
              />
            </div>
            <button
              onClick={setNow}
              className="px-6 py-3 font-medium rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Now
            </button>
          </div>
        </section>

        {/* Timeline */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Schedule
            </h2>
            {schedule.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Total: {totalPortions} / 6 Pills
              </span>
            )}
          </div>

          {schedule.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <p className="text-zinc-500 dark:text-zinc-400">
                Select a start time to view your schedule.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line connecting the timeline items */}
              <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>

              <div className="space-y-6 relative">
                {schedule.map((dose, idx) => (
                  <div key={idx} className="flex gap-4">
                    {/* Timeline Node */}
                    <div className="relative flex-shrink-0 w-14 h-14 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-bold text-zinc-400 z-10 shadow-sm">
                      {dose.doseNumber}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tracking-tight">
                            {dose.timeLabel}
                          </span>
                          {dose.isNextDay && (
                            <span
                              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${THEMES[level].badgeBg} ${THEMES[level].badgeText}`}
                            >
                              +1 Day
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <PokeballIcon className="w-3.5 h-3.5" />
                          {dose.portions}{" "}
                          {dose.portions === 1 ? "Pill" : "Pills"}
                        </div>
                      </div>

                      {/* Visual Portion Indicator */}
                      <div className="flex gap-2">
                        {Array.from({ length: dose.portions }).map(
                          (_, pIdx) => (
                            <div
                              key={pIdx}
                              className={`relative w-4 h-8 rounded-full border-2 overflow-hidden flex flex-col ${THEMES[level].pillBg} ${THEMES[level].pillBorder}`}
                            >
                              <div
                                className={`absolute top-1/2 left-0 w-full border-t-2 opacity-50 ${THEMES[level].pillBorder}`}
                              ></div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer info/disclaimer */}
        <div className="text-center pt-8 pb-12">
          <p className="text-xs text-zinc-400">
            For tracking purposes only. Always follow medical advice. App resets
            upon refresh.
          </p>
        </div>
      </main>
    </div>
  );
}
