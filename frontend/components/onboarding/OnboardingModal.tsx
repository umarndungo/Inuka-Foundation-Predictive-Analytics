"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StepGlyph } from "@/components/ui/step-glyph";
import { ONBOARDING_STEPS } from "./onboarding-data";
import { useAppStore } from "@/lib/store";
import { Shield, Map, BarChart3, Bell } from "lucide-react";

const STEP_ICONS = [Shield, Map, BarChart3, Bell];
const STEP_COLORS = ["#EF4444", "#71717A", "#09090B", "#B91C1C"];

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const markOnboardingSeen = useAppStore((s) => s.markOnboardingSeen);

  const totalSteps = ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const StepIcon = STEP_ICONS[currentStep] ?? Shield;

  const finish = useCallback(() => {
    markOnboardingSeen();
    onOpenChange(false);
  }, [markOnboardingSeen, onOpenChange]);

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    finish();
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : handleSkip())}>
      <DialogContent
        className="sm:max-w-[640px] p-0 gap-0 overflow-hidden bg-white border border-black/10"
        showCloseButton
      >
        <div className="flex min-h-[360px]">
          {/* Left: Visual panel */}
          <div className="hidden sm:flex flex-col items-center justify-center w-[200px] flex-shrink-0 bg-secondary/40 border-r border-border/40 relative overflow-hidden">
            {/* Large glyph */}
            <motion.div
              key={`glyph-${step.id}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div
                className="h-20 w-20 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${STEP_COLORS[currentStep]}10` }}
              >
                <StepIcon
                  className="h-10 w-10"
                  style={{ color: STEP_COLORS[currentStep] }}
                />
              </div>
            </motion.div>

            {/* Step indicator */}
            <div className="mt-6 text-center">
              <p className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>

            {/* Decorative dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? "16px" : "6px",
                    backgroundColor: i === currentStep ? STEP_COLORS[currentStep] : "#D4D4D8",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Content panel */}
          <div className="flex-1 flex flex-col">
            {/* Mobile progress */}
            <div className="sm:hidden flex gap-1.5 px-5 pt-4">
              {ONBOARDING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: i <= currentStep ? "#EF4444" : "#E4E4E7",
                  }}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="px-6 pt-6 pb-2"
                >
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold text-[#09090B] leading-snug">
                      {step.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-[#09090B]/70 leading-relaxed">
                      {step.description}
                    </DialogDescription>
                  </DialogHeader>

                  {step.bullets && step.bullets.length > 0 && (
                    <ul className="space-y-2.5 mt-4">
                      {step.bullets.map((bullet, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.05 }}
                          className="flex items-start gap-2.5 text-sm text-[#09090B]/80"
                        >
                          <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF4444]" />
                          {bullet}
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-border/30">
              <Button
                variant="ghost"
                className="text-[#09090B] hover:bg-transparent px-0 h-8 text-sm font-medium"
                onClick={goBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground px-2 h-8 text-xs"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  className="bg-[#EF4444] text-white hover:bg-[#DC2626] h-9 px-5 text-sm font-semibold rounded-lg"
                  onClick={goNext}
                >
                  {isLast ? "Get Started" : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
