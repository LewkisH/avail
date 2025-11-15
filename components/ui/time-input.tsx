import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimeInputProps extends Omit<React.ComponentProps<"input">, "type"> {
}

/**
 * Custom time input that always displays in 24-hour format (HH:mm)
 * This component uses a text input with validation instead of type="time"
 * to ensure consistent 24-hour display across all browsers and locales.
 */
const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value = "", onChange, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(String(value || ""));

    React.useEffect(() => {
      // Update local value whenever the external value changes
      setLocalValue(String(value || ""));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Remove any non-digit or colon characters
      inputValue = inputValue.replace(/[^\d:]/g, "");

      // Auto-format as user types
      if (inputValue.length === 2 && !inputValue.includes(":")) {
        inputValue = inputValue + ":";
      }

      // Limit to HH:MM format
      if (inputValue.length > 5) {
        inputValue = inputValue.slice(0, 5);
      }

      setLocalValue(inputValue);

      // Call onChange with the synthetic event
      if (onChange) {
        // Create a synthetic event compatible with react-hook-form
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: inputValue },
        };
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // If user typed just hours, add :00
      if (/^\d{1,2}$/.test(inputValue)) {
        const hours = parseInt(inputValue, 10);
        if (hours >= 0 && hours <= 23) {
          const formatted = `${hours.toString().padStart(2, "0")}:00`;
          setLocalValue(formatted);
          if (onChange) {
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: formatted },
            };
            onChange(
              syntheticEvent as any as React.ChangeEvent<HTMLInputElement>
            );
          }
        }
      }

      // Validate final value
      const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(inputValue) && inputValue !== "") {
        // Invalid time, revert to previous valid value
        setLocalValue(String(value || ""));
      }

      props.onBlur?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === ':' ||
        (e.key >= '0' && e.key <= '9')
      ) {
        return;
      }
      
      // Prevent any other keys
      e.preventDefault();
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("font-mono", className)}
        {...props}
      />
    );
  }
);

TimeInput.displayName = "TimeInput";

export { TimeInput };
