"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";

const ENTRANCE = [0.22, 1, 0.36, 1] as const;

/**
 * Fades and lifts its children into place.
 *
 * Under `prefers-reduced-motion` the translate is dropped and only the opacity
 * fade survives, so the element still reads as new without any movement.
 */
export function FadeIn({
  delay = 0,
  y = 12,
  className,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.35, delay, ease: ENTRANCE }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its direct `Stagger.Item` children.
 *
 * The stagger is capped: past `maxStaggered` items every child shares the last
 * delay, so a 200-row table does not animate its final row two seconds late.
 */
const StaggerContext = React.createContext({ step: 0.04, max: 12 });

export function Stagger({
  step = 0.04,
  maxStaggered = 12,
  className,
  children,
}: {
  step?: number;
  maxStaggered?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ step, max: maxStaggered }),
    [step, maxStaggered],
  );

  return (
    <StaggerContext.Provider value={value}>
      <div className={className}>{children}</div>
    </StaggerContext.Provider>
  );
}

export function StaggerItem({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { step, max } = React.useContext(StaggerContext);
  const reduced = useReducedMotion();
  const delay = Math.min(index, max) * step;

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.12 : 0.28, delay, ease: ENTRANCE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Lifts on hover. Transform-only, so it never triggers layout. */
export function HoverLift({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -3 }}
      whileTap={reduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts a number up on mount. Used on dashboard stat tiles, where the motion
 * signals "this figure was just computed" rather than decorating the page.
 */
export function CountUp({
  value,
  format,
  duration = 0.8,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // easeOutCubic — decelerates into the final figure.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    frame = requestAnimationFrame(tick);

    // Browsers throttle requestAnimationFrame in background or non-compositing
    // tabs, sometimes to a single frame. Without this the counter would freeze
    // partway and display a figure that is simply wrong. The timer is not
    // throttled the same way, so it guarantees the true value lands.
    const settle = setTimeout(
      () => setDisplay(value),
      duration * 1000 + 100,
    );

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [value, duration, reduced]);

  return (
    <span className="tabular">
      {format ? format(display) : Math.round(display).toLocaleString()}
    </span>
  );
}
