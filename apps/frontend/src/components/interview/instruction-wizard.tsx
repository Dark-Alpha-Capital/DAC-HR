import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  LayoutList,
  Wifi,
  Mic,
  Save,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Slide {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: LayoutList,
    iconBg: "bg-blue-100 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "How the Interview Works",
    description:
      "You will answer a series of questions within a 30-minute window. Questions appear one at a time — read each one carefully before responding. You can navigate between questions freely.",
  },
  {
    icon: Wifi,
    iconBg: "bg-green-100 dark:bg-green-950",
    iconColor: "text-green-600 dark:text-green-400",
    title: "Use a Stable Internet Connection",
    description:
      "Find a quiet place with reliable connectivity so you can focus without interruptions. A poor connection may slow down saving your answers.",
  },
  {
    icon: Mic,
    iconBg: "bg-purple-100 dark:bg-purple-950",
    iconColor: "text-purple-600 dark:text-purple-400",
    title: "Voice Dictation Available",
    description:
      "You can speak your answers using the microphone button on each question. You have up to 1 minute to speak per question. Once your voice response is recorded, it is locked and cannot be edited — choose between typing and speaking carefully.",
  },
  {
    icon: Save,
    iconBg: "bg-amber-100 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Your Progress Is Saved Automatically",
    description:
      "Answers are saved as you type. If you accidentally close or refresh the page, your answers will be restored and your 30-minute timer will resume from where it left off.",
  },
  {
    icon: ShieldAlert,
    iconBg: "bg-red-100 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
    title: "Stay on This Tab During Your Interview",
    description:
      "Switching tabs or windows is recorded and will be visible to the interviewer. Keep this page in focus for the duration of your interview. Closing the tab will show a warning, but your answers will remain safely saved.",
  },
];

interface InstructionWizardProps {
  onFinish: () => void;
}

export default function InstructionWizard({ onFinish }: InstructionWizardProps) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  if (!slide) return null;
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Before You Begin
          </p>
          <p className="text-sm text-muted-foreground">
            {step + 1} of {SLIDES.length}
          </p>
        </div>

        {/* Slide card */}
        <div className="rounded-2xl border bg-card px-8 py-10 text-center space-y-5">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl ${slide.iconBg}`}
          >
            <Icon className={`size-10 ${slide.iconColor}`} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold leading-tight">{slide.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {slide.description}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`block h-2 rounded-full transition-all duration-200 ${
                i === step
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>

          {isLast ? (
            <Button onClick={onFinish} className="flex-1">
              <CheckCircle2 className="mr-1.5 size-4" />
              I&apos;m Ready
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} className="flex-1">
              Next
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
