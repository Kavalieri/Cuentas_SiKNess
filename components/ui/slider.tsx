/**
 * Slider Component - Simple Implementation
 * Sin dependencias externas
 */

'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled && onValueChange) {
        const newValue = parseFloat(e.target.value);
        onValueChange([newValue]);
      }
    };

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0] || 0}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer',
            'slider-thumb:appearance-none slider-thumb:h-5 slider-thumb:w-5 slider-thumb:rounded-full slider-thumb:bg-primary slider-thumb:cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${
              (((value[0] || 0) - min) / (max - min)) * 100
            }%, hsl(var(--secondary)) ${
              (((value[0] || 0) - min) / (max - min)) * 100
            }%, hsl(var(--secondary)) 100%)`,
          }}
          {...props}
        />
      </div>
    );
  },
);
Slider.displayName = 'Slider';

export { Slider };
