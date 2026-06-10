import * as React from 'react';
import { createPortal } from 'react-dom';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronRight, ChevronUp, Loader2, Search } from 'lucide-react';
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
  /** Минимальная высота прокручиваемой области списка */
  listMinHeight?: string;
  emptyMessage?: string;
  /** Ширина списка: по полю (по умолчанию) или до 42rem */
  dropdownWidth?: 'trigger' | 'wide';
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
  listMinHeight,
  emptyMessage = 'Ничего не найдено',
  dropdownWidth = 'trigger',
}: SelectWithSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});
  /** true = группа свёрнута */
  const [groupCollapsed, setGroupCollapsed] = React.useState<Record<string, boolean>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Закрытие при клике вне
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Фокус на input при открытии + позиция dropdown (portal, не обрезается модалкой)
  React.useLayoutEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePosition = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxH = 448;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const available = openUp ? spaceAbove : spaceBelow;
      const height = Math.min(maxH, Math.max(available, 200));

      const viewportPad = 8;
      const contentMax = 672; // 42rem
      let left = rect.left;
      const triggerWidth = Math.max(rect.width, 280);

      let panelWidth: number;
      if (dropdownWidth === 'wide') {
        const maxWide = Math.min(contentMax, window.innerWidth - left - viewportPad);
        panelWidth = Math.max(triggerWidth, maxWide);
        if (panelWidth > maxWide) {
          left = Math.max(viewportPad, window.innerWidth - viewportPad - panelWidth);
          panelWidth = Math.min(contentMax, window.innerWidth - left - viewportPad);
        }
      } else {
        panelWidth = Math.min(triggerWidth, window.innerWidth - viewportPad * 2);
        if (left + panelWidth > window.innerWidth - viewportPad) {
          left = Math.max(viewportPad, window.innerWidth - viewportPad - panelWidth);
        }
      }

      setDropdownStyle({
        position: 'fixed',
        left,
        width: panelWidth,
        minWidth: panelWidth,
        maxWidth: panelWidth,
        zIndex: 200,
        maxHeight: height,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, dropdownWidth]);

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

  const searchActive = Boolean(search.trim());

  const isGroupExpanded = React.useCallback(
    (label: string) => {
      if (searchActive) return true;
      return groupCollapsed[label] !== true;
    },
    [groupCollapsed, searchActive],
  );

  const toggleGroup = React.useCallback((label: string) => {
    setGroupCollapsed((prev) => ({ ...prev, [label]: prev[label] !== true }));
  }, []);

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
    <div ref={containerRef} className="relative min-w-0">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => !(disabled || loading) && setOpen((v) => !v)}
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-md border border-input bg-background pl-3 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          triggerClassName
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate text-left', !selectedLabel && 'text-muted-foreground')}>
          {selectedLabel ?? placeholder ?? ''}
        </span>
        {loading
          ? <Loader2 className="h-4 w-4 opacity-50 shrink-0 ml-2 animate-spin" />
          : <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        }
      </button>

      {/* Dropdown (portal — не обрезается overflow модалки) */}
      {open && createPortal(
        <div
          ref={listRef}
          className="overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{
            ...dropdownStyle,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Search input */}
          {withSearch && (
            <div className="flex items-center gap-1.5 border-b pl-2 pr-4 py-1.5 shrink-0">
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
          <div
            className="flex-1 overflow-x-hidden overflow-y-auto py-1.5 pl-1.5 pr-4 [scrollbar-gutter:stable]"
            style={listMinHeight ? { minHeight: listMinHeight } : undefined}
          >
            {!hasResults && (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>
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
                    'relative flex cursor-default select-none items-start rounded-md py-2 pl-8 pr-4 text-sm font-normal outline-none hover:bg-muted',
                    selected && 'bg-muted'
                  )}
                >
                  <span className="absolute left-3 top-2.5 flex h-4 w-4 items-center justify-center">
                    {selected && <Check className="h-4 w-4" />}
                  </span>
                  <span className="block min-w-0 flex-1 whitespace-normal break-words leading-snug">{opt.label}</span>
                </div>
              );
            })}

            {/* Сгруппированный список (заголовок группы раскрывает/сворачивает опции) */}
            {filteredGroups?.map((g) => {
              const expanded = isGroupExpanded(g.label);
              return (
                <div key={g.label}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleGroup(g.label);
                    }}
                    className="flex w-full flex-wrap items-center gap-1.5 rounded-md pl-2 pr-4 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70">
                      {expanded ? (
                        <ChevronDown className="pointer-events-none h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="pointer-events-none h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </span>
                    <span className="pointer-events-none shrink-0 [&_svg]:pointer-events-none">{g.icon}</span>
                    <span className="min-w-0 flex-1 whitespace-normal break-words">{g.label}</span>
                  </button>
                  {expanded &&
                    g.options.map((opt) => {
                      const selected = multiple ? (values ?? []).includes(opt.value) : opt.value === value;
                      return (
                        <div
                          key={opt.value}
                          title={opt.label}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(opt.value);
                          }}
                          className={cn(
                            'relative flex cursor-default select-none items-start rounded-md py-2 pl-8 pr-4 text-sm font-normal outline-none hover:bg-muted',
                            selected && 'bg-muted',
                          )}
                        >
                          <span className="absolute left-3 top-2.5 flex h-4 w-4 items-center justify-center">
                            {selected && <Check className="h-4 w-4" />}
                          </span>
                          <span className="block min-w-0 flex-1 whitespace-normal break-words leading-snug">{opt.label}</span>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
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
