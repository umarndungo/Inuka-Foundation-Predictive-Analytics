import type { OnboardingStep } from "@/types";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Risk goes unnoticed too long.",
    description:
      "By the time a coordinator sees it, the moment to help early has already passed.",
    type: "info",
  },
  {
    id: 2,
    title: "What beneficiaries are up against",
    description:
      "The gaps Inuka Risk Radar was built to close:",
    type: "info",
    bullets: [
      "Attendance drops go unnoticed for weeks",
      "Field workers get no early warning",
      "Manual checks miss urgent cases",
      "Help arrives after the moment has passed",
    ],
  },
  {
    id: 3,
    title: "Meet Inuka Risk Radar",
    description:
      "Automatic risk scoring. Instant field alerts. One system that watches so no one has to guess.",
    type: "info",
  },
  {
    id: 4,
    title: "How it works",
    description:
      "Live data streams in. Every beneficiary gets a real-time risk score. High-risk cases trigger an automatic EMAIL to the nearest field worker — before a supervisor has to go looking for trouble.",
    type: "info",
  },
];
