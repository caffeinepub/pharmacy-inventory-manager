import { cn } from "@/lib/utils";
import { Delete, Package } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PinScreenProps {
  mode: "set" | "enter";
  onSuccess: () => void;
  savedPin?: string;
  onSetPin: (pin: string) => Promise<void>;
  firmName?: string;
}

type SetPinStep = "enter" | "confirm";

const PIN_KEYS = [
  { id: "k1", label: "1" },
  { id: "k2", label: "2" },
  { id: "k3", label: "3" },
  { id: "k4", label: "4" },
  { id: "k5", label: "5" },
  { id: "k6", label: "6" },
  { id: "k7", label: "7" },
  { id: "k8", label: "8" },
  { id: "k9", label: "9" },
  { id: "k_empty", label: "" },
  { id: "k0", label: "0" },
  { id: "k_back", label: "backspace" },
];

export default function PinScreen({
  mode,
  onSuccess,
  savedPin,
  onSetPin,
  firmName,
}: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<SetPinStep>("enter");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }, []);

  const handleEnterPin = useCallback(
    async (fullPin: string) => {
      if (mode === "enter") {
        if (fullPin === savedPin) {
          onSuccess();
        } else {
          setError("Incorrect PIN. Please try again.");
          triggerShake();
          setTimeout(() => setPin(""), 400);
        }
      } else if (mode === "set") {
        if (step === "enter") {
          setStep("confirm");
          setConfirmPin("");
          setError("");
        } else {
          if (fullPin === pin) {
            setIsLoading(true);
            try {
              await onSetPin(pin);
              onSuccess();
            } catch {
              setError("Failed to save PIN. Please try again.");
              setIsLoading(false);
              triggerShake();
              setTimeout(() => setConfirmPin(""), 400);
            }
          } else {
            setError("PINs don't match. Please try again.");
            triggerShake();
            setTimeout(() => {
              setStep("enter");
              setPin("");
              setConfirmPin("");
            }, 400);
          }
        }
      }
    },
    [mode, step, pin, savedPin, onSuccess, onSetPin, triggerShake],
  );

  const handleKey = useCallback(
    (key: string) => {
      if (isLoading) return;

      const currentValue =
        mode === "set" && step === "confirm" ? confirmPin : pin;
      const setCurrentValue =
        mode === "set" && step === "confirm" ? setConfirmPin : setPin;

      if (key === "backspace") {
        setCurrentValue((prev) => prev.slice(0, -1));
        setError("");
      } else if (currentValue.length < 4) {
        const newPin = currentValue + key;
        setCurrentValue(newPin);
        setError("");
        if (newPin.length === 4) {
          setTimeout(() => handleEnterPin(newPin), 150);
        }
      }
    },
    [isLoading, mode, step, confirmPin, pin, handleEnterPin],
  );

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleKey(e.key);
      else if (e.key === "Backspace") handleKey("backspace");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKey]);

  const displayPin = mode === "set" && step === "confirm" ? confirmPin : pin;

  const title =
    mode === "enter"
      ? "Enter PIN"
      : step === "enter"
        ? "Set App PIN"
        : "Confirm PIN";

  const subtitle =
    mode === "enter"
      ? "Enter your 4-digit PIN to access the app"
      : step === "enter"
        ? "Choose a 4-digit PIN to protect your pharmacy data"
        : "Re-enter your PIN to confirm";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <Package className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {firmName || "PharmaCare ERP"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inventory & Billing Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>

          {/* PIN Dots */}
          <div
            className={cn(
              "flex justify-center gap-4 mb-6 transition-all",
              shake && "animate-[shake_0.4s_ease-in-out]",
            )}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`dot-${i}`}
                className={cn(
                  "w-4 h-4 rounded-full border-2 transition-all duration-150",
                  i < displayPin.length
                    ? "bg-primary border-primary scale-110"
                    : "bg-transparent border-border",
                )}
              />
            ))}
          </div>

          {/* Error message */}
          <div className="h-5 mb-4 text-center">
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {PIN_KEYS.map(({ id, label }) => {
              if (label === "") {
                return <div key={id} />;
              }
              if (label === "backspace") {
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleKey("backspace")}
                    disabled={isLoading}
                    className={cn(
                      "h-14 rounded-xl flex items-center justify-center",
                      "border border-border bg-muted/50 text-foreground",
                      "hover:bg-muted active:scale-95 transition-all duration-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleKey(label)}
                  disabled={isLoading}
                  className={cn(
                    "h-14 rounded-xl flex items-center justify-center",
                    "border border-border bg-card text-foreground",
                    "text-xl font-semibold",
                    "hover:bg-primary/10 hover:border-primary/30 active:scale-95 active:bg-primary/20",
                    "transition-all duration-100 shadow-sm",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {isLoading && (
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Setting up your PIN...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
