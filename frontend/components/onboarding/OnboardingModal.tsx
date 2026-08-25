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
import { ONBOARDING_STEPS } from "./onboarding-data";
import { useAppStore } from "@/lib/store";

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
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : handleSkip())}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden bg-white border border-black/10"
        showCloseButton
      >
        {/* Progress bar */}
        <div className="flex gap-1.5 px-5 pt-5 pb-1">
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
        <div className="relative min-h-[220px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="px-5 pt-4 pb-2"
            >
              <DialogHeader className="mb-3">
                <DialogTitle className="text-lg font-bold text-[#09090B] leading-snug">
                  {step.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-[#09090B]/70 leading-relaxed">
                  {step.description}
                </DialogDescription>
              </DialogHeader>

              {step.bullets && step.bullets.length > 0 && (
                <ul className="space-y-2 mt-3">
                  {step.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-[#09090B]/80"
                    >
                      <span
                        className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]"
                      />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5 pt-2">
          <Button
            variant="ghost"
            className="text-[#09090B] hover:bg-transparent px-0 h-8 text-sm font-medium"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button
            className="bg-[#EF4444] text-white hover:bg-[#DC2626] h-9 px-5 text-sm font-semibold rounded-lg"
            onClick={goNext}
          >
            {isLast ? "Get Started" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
