import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const NONE = '__none__';

/** Field wrapper: label (+required) + control + error. */
export function Field({ label, required, error, htmlFor, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

/** shadcn Select wired to a simple value/onChange(string) + options ([str] or [{value,label}]). */
export function FormSelect({
  label,
  required,
  error,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  allowClear,
  htmlFor,
}) {
  return (
    <Field label={label} required={required} error={error} htmlFor={htmlFor}>
      <Select value={value || undefined} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger id={htmlFor}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && <SelectItem value={NONE}>{placeholder}</SelectItem>}
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Compact unlabeled filter select for toolbars. Empty value shows the "all" placeholder. */
export function ToolbarSelect({ value, onChange, options = [], placeholder = 'All', className = 'w-40' }) {
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
      <SelectTrigger size="sm" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function FormTextarea({ label, required, error, htmlFor, className, ...props }) {
  return (
    <Field label={label} required={required} error={error} htmlFor={htmlFor}>
      <textarea
        id={htmlFor}
        className={cn(
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </Field>
  );
}
