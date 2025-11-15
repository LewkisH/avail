"use client";

import React from "react";
import { Label } from "@/components/ui/label";

interface DurationSliderProps {
  value: number; // Duration in minutes
  onChange: (value: number) => void;
  min?: number; // Default: 15
  max?: number; // Default: 2880 (48 hours)
  step?: number; // Default: 15
  disabled?: boolean;
}

export function DurationSlider({
  value,
  onChange,
  min = 15,
  max = 2880,
  step = 15,
  disabled = false,
}: DurationSliderProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${mins} minutes`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="duration-slider" className="text-sm font-medium">
          Duration
        </Label>
        <span className="text-sm font-semibold text-primary">
          {formatDuration(value)}
        </span>
      </div>
      <div className="relative">
        <input
          id="duration-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="w-full h-11 cursor-pointer appearance-none bg-transparent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((value - min) / (max - min)) * 100}%, hsl(var(--muted)) ${((value - min) / (max - min)) * 100}%, hsl(var(--muted)) 100%)`,
            backgroundSize: "100% 8px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          aria-label="Duration slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatDuration(value)}
        />
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(var(--primary));
            cursor: pointer;
            border: 2px solid hsl(var(--background));
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(var(--primary));
            cursor: pointer;
            border: 2px solid hsl(var(--background));
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          input[type="range"]::-webkit-slider-thumb:hover {
            background: hsl(var(--primary) / 0.9);
          }

          input[type="range"]::-moz-range-thumb:hover {
            background: hsl(var(--primary) / 0.9);
          }

          input[type="range"]:focus::-webkit-slider-thumb {
            outline: 2px solid hsl(var(--ring));
            outline-offset: 2px;
          }

          input[type="range"]:focus::-moz-range-thumb {
            outline: 2px solid hsl(var(--ring));
            outline-offset: 2px;
          }

          input[type="range"]:disabled::-webkit-slider-thumb {
            background: hsl(var(--muted-foreground));
            cursor: not-allowed;
          }

          input[type="range"]:disabled::-moz-range-thumb {
            background: hsl(var(--muted-foreground));
            cursor: not-allowed;
          }
        `}</style>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDuration(min)}</span>
        <span>{formatDuration(max)}</span>
      </div>
    </div>
  );
}
