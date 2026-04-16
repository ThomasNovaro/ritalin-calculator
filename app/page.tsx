"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  RotateCcw,
  Power,
  Zap,
  AlertCircle,
  Undo,
} from "lucide-react";

type Level = "Charmander" | "Charmeleon" | "Charizard";

interface DoseInfo {
  doseNumber: number;
  timeLabel: string;
  portions: number;
  isNextDay: boolean;
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
    color: "#1aa167",
    bgClass: "bg-[#1aa167]",
    textClass: "text-[#1aa167]",
    borderClass: "border-[#1aa167]",
    fillClass: "bg-[#1aa167]",
  },
  Charmeleon: {
    color: "#1270b8",
    bgClass: "bg-[#1270b8]",
    textClass: "text-[#1270b8]",
    borderClass: "border-[#1270b8]",
    fillClass: "bg-[#1270b8]",
  },
  Charizard: {
    color: "#ce2021",
    bgClass: "bg-[#ce2021]",
    textClass: "text-[#ce2021]",
    borderClass: "border-[#ce2021]",
    fillClass: "bg-[#ce2021]",
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
      className={`relative w-full h-24 border border-border-theme overflow-hidden flex items-center justify-center tracking-wide text-base transition-all duration-100 ease-in-out ${
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
            transitionDuration: holding ? "1500ms" : "100ms",
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
  const [notifiedDoses, setNotifiedDoses] = useState<Record<number, boolean>>({});
  const [showPast, setShowPast] = useState(false);
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [acknowledgedCutoff, setAcknowledgedCutoff] = useState(false);
  const [quote, setQuote] = useState("");

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
    }
  }, [completedSteps, notifiedDoses, mounted]);

  const handleReset = () => {
    if (!confirm("reset protocol?")) return;
    setStartTime("");
    setLevel("Charmander");
    setCompletedSteps({});
    setNotifiedDoses({});
    localStorage.removeItem("pokeMed_startTime");
    localStorage.removeItem("pokeMed_level");
    localStorage.removeItem("pokeMed_completedSteps_v2");
    localStorage.removeItem("pokeMed_notifiedDoses");
  };

  const handleUndo = () => {
    const keys = Object.keys(completedSteps)
      .map(Number)
      .sort((a, b) => b - a);
    if (keys.length <= 1) return; // Don't undo dose 1 (which starts the protocol)
    const lastDoseNumber = keys[0];

    if (!confirm(`undo dose ${lastDoseNumber}?`)) return;

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
    return generated;
  })();

  const nextDose = schedule.find((d) => !completedSteps[d.doseNumber]);
  const isAllComplete =
    schedule.length > 0 && schedule.every((d) => completedSteps[d.doseNumber]);
  const theme = THEMES[level];
  const willBeTruncated = schedule.length < PROTOCOLS[level].maxDoses;

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

    const now = Date.now();
    const timeUntilDose = nextDose.actualTimeMs - now;

    // If the dose time has already passed (e.g. app was closed and reopened), notify immediately
    const delay = Math.max(0, timeUntilDose);

    const timeout = setTimeout(() => {
      if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(`dose ${String(nextDose.doseNumber).padStart(2, '0')} ready`, {
            body: `it is time for your next dose (${nextDose.portions} pill${nextDose.portions > 1 ? "s" : ""}).`,
            vibrate: [200, 100, 200, 100, 200],
            tag: `dose-${nextDose.doseNumber}`,
            requireInteraction: true,
          } as NotificationOptions);
        });
      }
      setNotifiedDoses((prev) => ({ ...prev, [nextDose.doseNumber]: true }));
    }, delay);

    return () => clearTimeout(timeout);
  }, [nextDose, isStarted, mounted, notifiedDoses]);

  const startSchedule = async (forceProceed = false) => {
    if (!startTime) return;
    if (willBeTruncated && !acknowledgedCutoff && !forceProceed) {
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

  useEffect(() => {
    if (isAllComplete) {
      const quotes = [
        "great job sticking to the protocol today.",
        "you conquered the day! rest and recover.",
        "protocol complete. your future self thanks you.",
        "all doses logged. time to wind down.",
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
        <main className="min-h-screen flex flex-col pt-24 pb-8 px-6 max-w-lg mx-auto w-full items-center justify-center text-center">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            <Power className="w-12 h-12 text-foreground mb-8" strokeWidth={1} />
            <h1 className="text-4xl text-semibold font-sans tracking-tighter leading-none mb-12 text-foreground">
              protocol complete
            </h1>
            {quote && (
              <div
                className={`text-2xl font-sans tracking-tight ${theme.textClass} px-4 leading-tight `}
              >
                "{quote}"
              </div>
            )}
          </div>

          <div className="w-full mt-12 border-t border-border-theme pt-8">
            <button
              onClick={() => {
                setStartTime("");
                setLevel("Charmander");
                setCompletedSteps({});
                localStorage.removeItem("pokeMed_startTime");
                localStorage.removeItem("pokeMed_level");
                localStorage.removeItem("pokeMed_completedSteps_v2");
              }}
              className="w-full py-4 border border-border-theme bg-surface text-foreground tracking-widest text-[13px] transition-all duration-100 ease-linear hover:bg-foreground hover:text-background"
            >
              reset protocol
            </button>
          </div>
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
        {showCutoffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6">
            <div className="bg-panel border border-border-theme p-6 max-w-sm w-full">
              <h2 className="text-lg text-foreground mb-4 tracking-wide flex items-center gap-2">
                <AlertCircle
                  className={`w-4 h-4 ${theme.textClass}`}
                  strokeWidth={1}
                />{" "}
                schedule adjusted
              </h2>
              <p className="text-subtext mb-8 text-[13px] leading-relaxed">
                the calculated schedule goes past 18:00. to prevent sleep
                disruption, some late doses have been omitted from this
                protocol.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCutoffModal(false)}
                  className="flex-1 py-3 border border-border-theme bg-surface text-foreground tracking-[0.05em] text-[13px] hover:bg-foreground hover:text-background transition-colors duration-100 ease-linear"
                >
                  cancel
                </button>
                <button
                  onClick={() => {
                    setAcknowledgedCutoff(true);
                    startSchedule(true);
                  }}
                  className={`flex-1 py-3 border border-border-theme ${theme.bgClass} text-white tracking-[0.05em] text-[13px] font-semibold hover:brightness-110 transition-colors duration-100 ease-linear`}
                >
                  proceed
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
                className={`py-3 border-b border-surface flex items-center justify-between transition-colors duration-100 ease-linear ${
                  isCompleted
                    ? "opacity-40 bg-surface"
                    : isNext
                      ? "opacity-100 bg-panel border-border-theme px-2 my-2"
                      : "opacity-70"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span
                    className={`w-6 text-[13px] text-subtext ${isNext ? theme.textClass : ""}`}
                  >
                    {String(dose.doseNumber).padStart(2, "0")}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-sans tracking-tight [font-variant-numeric:tabular-nums] ${isCompleted ? "line-through text-subtext" : isNext ? "text-foreground" : "text-subtext"}`}
                    >
                      {dose.timeLabel}
                    </span>
                    {isCompleted && actualTimeLabel && (
                      <span className="text-sm font-sans tracking-tight text-subtext [font-variant-numeric:tabular-nums]">
                        [{actualTimeLabel}]
                      </span>
                    )}
                  </div>
                  {dose.isNextDay && (
                    <span className="text-[11px] tracking-widest bg-surface border border-border-theme px-1 text-subtext">
                      +1d
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-subtext tracking-[0.05em]">
                    {dose.portions} pill{dose.portions > 1 ? "s" : ""}
                  </span>
                  <div
                    className={`w-3 h-3 border rounded-none ${
                      isCompleted
                        ? `border-border-theme ${theme.bgClass}`
                        : isNext
                          ? `${theme.borderClass} bg-transparent`
                          : "border-border-theme bg-transparent"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM ACTION AREA */}
      <div className="fixed bottom-8 left-0 right-0 w-full max-w-lg mx-auto px-6">
        <HoldButton
          onComplete={() => nextDose && completeStep(nextDose.doseNumber)}
          theme={theme}
          disabled={!nextDose}
          label={nextDose ? "hold to consume" : "protocol complete"}
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
