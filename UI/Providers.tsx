"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";

export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <Tooltip.Provider delayDuration={300} skipDelayDuration={100}>
          {children}
        </Tooltip.Provider>
      </MotionConfig>
    </LazyMotion>
  );
}
