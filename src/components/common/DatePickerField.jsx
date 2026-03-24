import { useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { FiCalendar } from 'react-icons/fi';
import clsx from 'clsx';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';

function parseDateValue(value) {
  if (!value) {
    return undefined;
  }

  const parsedValue = parseISO(value);
  return isValid(parsedValue) ? parsedValue : undefined;
}

function DatePickerField({
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  className,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => parseDateValue(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={clsx('date-picker-field', !selectedDate && 'is-empty', className)}
          disabled={disabled}
          aria-label="Pick a date"
        >
          <span className="date-picker-field__value">
            {selectedDate ? format(selectedDate, 'dd-MM-yyyy') : placeholder}
          </span>
          <FiCalendar className="date-picker-field__icon" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={10}
        className="date-picker-field__popover"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(nextDate) => {
            onChange(nextDate ? format(nextDate, 'yyyy-MM-dd') : '');
            if (nextDate) {
              setOpen(false);
            }
          }}
          className="date-picker-field__calendar"
        />
      </PopoverContent>
    </Popover>
  );
}

export default DatePickerField;
