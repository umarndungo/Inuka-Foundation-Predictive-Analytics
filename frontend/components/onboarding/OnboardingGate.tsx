"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useAppStore } from "@/lib/store";

export function OnboardingGate() {
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (hasSeenOnboarding) {
      router.replace("/dashboard");
    } else {
      setShowModal(true);
    }
  }, [mounted, hasSeenOnboarding, router]);

  if (!mounted) return null;

  return (
    <OnboardingModal
      open={showModal}
      onOpenChange={(open) => {
        if (!open) {
          router.replace("/dashboard");
        }
      }}
    />
  );
}
