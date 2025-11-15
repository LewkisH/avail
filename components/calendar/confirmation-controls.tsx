'use client';

import { Button } from '@/components/ui/button';

interface ConfirmationControlsProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  rangeCount: number;
}

export function ConfirmationControls({
  visible,
  onConfirm,
  onCancel,
  rangeCount,
}: ConfirmationControlsProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto">
      <span className="text-sm text-muted-foreground text-center sm:text-left">
        {rangeCount} unavailable {rangeCount === 1 ? 'period' : 'periods'}
      </span>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onCancel}
          className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px]"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="min-h-[44px] flex-1 sm:flex-none sm:min-w-[100px]"
        >
          Confirm Unavailables
        </Button>
      </div>
    </div>
  );
}
