import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react';
import { cn } from '../../lib/utils.ts';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('flex items-center px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-3 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 [&>span]:text-left [&>span]:min-w-0 [&>span]:ml-0 [&>span]:pl-0',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1.5',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm text-foreground outline-none focus:bg-muted focus:text-foreground data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>
      <span className="block truncate">{children}</span>
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

// SelectWithSearch — кастомный комбобокс с поиском (без Radix Select)
export interface SelectOption {
  value: string;
  label: string;
  [key: string]: string;
}

export interface SelectOptionGroup {
  label: string;
  icon?: React.ReactNode;
  options: SelectOption[];
}

interface SelectWithSearchProps {
  value?: string;
  onValueChange?: (value: string) => void;
  multiple?: boolean;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Показывать ли строку поиска (по умолчанию true) */
  withSearch?: boolean;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  searchFields?: string[];
  triggerClassName?: string;
}

function SelectWithSearch({
  value,
  onValueChange,
  multiple,
  values,
  onValuesChange,
  disabled,
  loading,
  placeholder,
  searchPlaceholder = 'Поиск...',
  withSearch = true,
  options,
  groups,
  searchFields = ['label'],
  triggerClassName,
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Закрытие при клике вне
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Фокус на input при открытии
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const allOptions: SelectOption[] = React.useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  const selectedLabel = React.useMemo(() => {
    if (multiple && values && values.length > 0) {
      const labels = values
        .map((v) => allOptions.find((o) => o.value === v)?.label)
        .filter(Boolean) as string[];
      if (labels.length === 0) return undefined;
      if (labels.length === 1) return labels[0];
      if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
      return `${labels[0]}, ${labels[1]} +${labels.length - 2}`;
    }
    return allOptions.find((o) => o.value === value)?.label;
  }, [allOptions, value, multiple, values]);

  const matchesSearch = (opt: SelectOption) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return searchFields.some((field) => String(opt[field] ?? '').toLowerCase().includes(q));
  };

  const filteredOptions = options?.filter(matchesSearch);
  const filteredGroups = groups
    ?.map((g) => ({ ...g, options: g.options.filter(matchesSearch) }))
    .filter((g) => g.options.length > 0);

  const hasResults =
    (filteredOptions && filteredOptions.length > 0) ||
    (filteredGroups && filteredGroups.length > 0);

  const handleSelect = (val: string) => {
    if (multiple) {
      const current = values ?? [];
      const exists = current.includes(val);
      const next = exists ? current.filter((v) => v !== val) : [...current, val];
      onValuesChange?.(next);
      return;
    }
    onValueChange?.(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !(disabled || loading) && setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background pl-3 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <span className={cn('flex-1 text-left truncate', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel ?? placeholder ?? ''}
        </span>
        {loading
          ? <Loader2 className="h-4 w-4 opacity-50 shrink-0 ml-2 animate-spin" />
          : <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-w-full"
          style={{
            maxHeight: '18rem',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: '100%',
            maxWidth: 'min(42rem, calc(100vw - 2rem))',
          }}
        >
          {/* Search input */}
          {withSearch && (
            <div className="flex items-center gap-1.5 border-b px-2 py-1.5 shrink-0">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                }}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto p-1.5">
            {!hasResults && (
              <div className="py-4 text-center text-sm text-muted-foreground">Ничего не найдено</div>
            )}

            {/* Плоский список */}
            {filteredOptions?.map((opt) => {
              const selected = multiple ? (values ?? []).includes(opt.value) : opt.value === value;
              return (
                <div
                  key={opt.value}
                  title={opt.label}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt.value); }}
                  className={cn(
                    'relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm font-normal outline-none hover:bg-muted',
                    selected && 'bg-muted'
                  )}
                >
                  <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
                    {selected && <Check className="h-4 w-4" />}
                  </span>
                  <span className="block min-w-0 truncate">{opt.label}</span>
                </div>
              );
            })}

            {/* Сгруппированный список */}
            {filteredGroups?.map((g) => (
              <div key={g.label}>
                <div className="flex items-center px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {g.icon}
                  {g.label}
                </div>
                {g.options.map((opt) => {
                  const selected = multiple ? (values ?? []).includes(opt.value) : opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      title={opt.label}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(opt.value); }}
                      className={cn(
                        'relative flex cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm font-normal outline-none hover:bg-muted',
                        selected && 'bg-muted'
                      )}
                    >
                      <span className="absolute left-3 flex h-4 w-4 items-center justify-center">
                        {selected && <Check className="h-4 w-4" />}
                      </span>
                      <span className="block min-w-0 truncate">{opt.label}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectWithSearch,
};
