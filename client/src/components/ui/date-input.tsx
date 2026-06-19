import { useRef } from 'react';
import { cn } from '../../lib/utils.ts';
import { Input } from './input.tsx';

function isoToDdMmYyyy(iso: string): string {
  if (!iso) return '';
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

interface DateInputProps {
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  disabled,
  required,
  className = 'w-40',
  id,
}: DateInputProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const display = value ? isoToDdMmYyyy(value) : '';
  const fullWidth = /\bw-full\b/.test(className);

  return (
    <div className={cn('relative', fullWidth ? 'block w-full' : 'inline-block')}>
      <input
        ref={dateRef}
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled}
        required={required}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ fontSize: 'inherit', zIndex: 0 }}
        aria-hidden
      />
      <Input
        type="text"
        id={id}
        value={display}
        readOnly
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`relative z-10 cursor-pointer ${className}`}
        onClick={() => {
          const el = dateRef.current;
          if (el && !disabled) {
            el.focus();
            if (typeof el.showPicker === 'function') el.showPicker();
          }
        }}
        style={{ caretColor: 'transparent' }}
      />
    </div>
  );
}
