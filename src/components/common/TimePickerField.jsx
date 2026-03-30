import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { FiClock } from 'react-icons/fi';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';

const DEFAULT_TIME = { hour: 7, minute: 0, period: 'AM', isValid: false };
const HOUR_MARKERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_MARKERS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DIAL_RADIUS = 62;

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseTimeValue(value) {
  if (!value || typeof value !== 'string') return DEFAULT_TIME;
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return DEFAULT_TIME;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  return {
    hour: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
    isValid: true,
  };
}

function to24HourString({ hour, minute, period }) {
  const h24 = period === 'PM' ? (hour % 12) + 12 : hour % 12;
  return `${pad(h24)}:${pad(minute)}`;
}

function getHourPos(hour) {
  const angle = ((hour % 12) * 30 - 90) * (Math.PI / 180);
  return { x: Math.cos(angle) * DIAL_RADIUS, y: Math.sin(angle) * DIAL_RADIUS };
}

function getMinutePos(minute) {
  const angle = (minute * 6 - 90) * (Math.PI / 180);
  return { x: Math.cos(angle) * DIAL_RADIUS, y: Math.sin(angle) * DIAL_RADIUS };
}

function TimePickerField({ value, onChange, placeholder = 'Select time', className, disabled = false }) {
  const [open, setOpen] = useState(false);
  const parsedValue = useMemo(() => parseTimeValue(value), [value]);
  const [draft, setDraft] = useState(parsedValue);
  const [dialMode, setDialMode] = useState('hour'); // 'hour' | 'minute'
  const [editField, setEditField] = useState(null);  // null | 'hour' | 'minute'
  const [editBuffer, setEditBuffer] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(parsedValue);
      setDialMode('hour');
      setEditField(null);
      setEditBuffer('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handAngle = dialMode === 'hour'
    ? (draft.hour % 12) * 30 - 90
    : draft.minute * 6 - 90;

  const selectedPos = dialMode === 'hour'
    ? getHourPos(draft.hour)
    : getMinutePos(draft.minute);

  const displayValue = parsedValue.isValid
    ? `${pad(parsedValue.hour)}:${pad(parsedValue.minute)} ${parsedValue.period}`
    : placeholder;

  // --- segment typing ---
  function openEdit(field) {
    setDialMode(field);
    setEditField(field);
    setEditBuffer(field === 'hour' ? String(draft.hour) : pad(draft.minute));
  }

  function handleEditChange(e) {
    setEditBuffer(e.target.value.replace(/\D/g, '').slice(0, 2));
  }

  function commitEdit() {
    const num = parseInt(editBuffer, 10);
    if (editField === 'hour' && !isNaN(num) && num >= 1 && num <= 12) {
      setDraft((p) => ({ ...p, hour: num }));
    } else if (editField === 'minute' && !isNaN(num) && num >= 0 && num <= 59) {
      setDraft((p) => ({ ...p, minute: num }));
    }
    setEditField(null);
    setEditBuffer('');
  }

  function handleEditKeyDown(e) {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditField(null);
      setEditBuffer('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      openEdit(editField === 'hour' ? 'minute' : 'hour');
    }
  }

  // --- dial interactions ---
  function handleHourSelect(hour) {
    setDraft((p) => ({ ...p, hour }));
    setEditField(null);
    setEditBuffer('');
    // auto-advance to minute dial
    setDialMode('minute');
  }

  function handleMinuteSelect(minute) {
    setDraft((p) => ({ ...p, minute }));
    setEditField(null);
    setEditBuffer('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={clsx('time-picker-field', !parsedValue.isValid && 'is-empty', className)}
          disabled={disabled}
          aria-label={parsedValue.isValid ? `Selected: ${displayValue}. Change time` : 'Choose time'}
          aria-haspopup="dialog"
        >
          <span className="time-picker-field__value">{displayValue}</span>
          <FiClock className="time-picker-field__icon" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" side="bottom" sideOffset={8} collisionPadding={12} className="time-picker-field__popover">
        <div className="time-picker-panel">
          <p className="time-picker-panel__title">
            {dialMode === 'hour' ? 'Select hour' : 'Select minute'}
          </p>

          {/* ── display row ── */}
          <div className="time-picker-panel__display">
            <div className="time-picker-panel__display-main">

              {/* hour segment */}
              {editField === 'hour' ? (
                <input
                  className="time-picker-panel__segment is-active is-editing"
                  type="text"
                  inputMode="numeric"
                  value={editBuffer}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={handleEditChange}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  aria-label="Hour"
                />
              ) : (
                <button
                  type="button"
                  className={clsx('time-picker-panel__segment', dialMode === 'hour' && 'is-active')}
                  onClick={() => openEdit('hour')}
                  aria-label={`Hour ${draft.hour}, click to edit`}
                >
                  {pad(draft.hour)}
                </button>
              )}

              <span className="time-picker-panel__separator">:</span>

              {/* minute segment */}
              {editField === 'minute' ? (
                <input
                  className="time-picker-panel__segment is-editing"
                  type="text"
                  inputMode="numeric"
                  value={editBuffer}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={handleEditChange}
                  onBlur={commitEdit}
                  onKeyDown={handleEditKeyDown}
                  aria-label="Minute"
                />
              ) : (
                <button
                  type="button"
                  className={clsx('time-picker-panel__segment', dialMode === 'minute' && 'is-active')}
                  onClick={() => openEdit('minute')}
                  aria-label={`Minute ${draft.minute}, click to edit`}
                >
                  {pad(draft.minute)}
                </button>
              )}
            </div>

            {/* AM / PM */}
            <div className="time-picker-panel__period" role="group" aria-label="AM or PM">
              {['AM', 'PM'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={clsx('time-picker-panel__period-button', draft.period === p && 'is-active')}
                  onClick={() => setDraft((prev) => ({ ...prev, period: p }))}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ── clock dial ── */}
          <div className="time-picker-panel__dial">
            <div className="time-picker-panel__dial-face">
              {/* hand */}
              <div
                className="time-picker-panel__dial-hand"
                style={{ transform: `translateY(-50%) rotate(${handAngle}deg)` }}
              />
              {/* center dot */}
              <div className="time-picker-panel__dial-center" />
              {/* selected value bubble */}
              <div
                className="time-picker-panel__dial-selected"
                style={{
                  left: `calc(50% + ${selectedPos.x}px)`,
                  top: `calc(50% + ${selectedPos.y}px)`,
                }}
              >
                {dialMode === 'hour' ? draft.hour : pad(draft.minute)}
              </div>

              {/* hour markers */}
              {dialMode === 'hour' && HOUR_MARKERS.map((hour) => {
                const pos = getHourPos(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    className={clsx('time-picker-panel__dial-marker', draft.hour === hour && 'is-active')}
                    style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}
                    onClick={() => handleHourSelect(hour)}
                    aria-label={`${hour} o'clock`}
                  >
                    {hour}
                  </button>
                );
              })}

              {/* minute markers */}
              {dialMode === 'minute' && MINUTE_MARKERS.map((min) => {
                const pos = getMinutePos(min);
                return (
                  <button
                    key={min}
                    type="button"
                    className={clsx('time-picker-panel__dial-marker', draft.minute === min && 'is-active')}
                    style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}
                    onClick={() => handleMinuteSelect(min)}
                    aria-label={`${min} minutes`}
                  >
                    {pad(min)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── footer ── */}
          <div className="time-picker-panel__footer">
            <div className="time-picker-panel__actions">
              <button
                type="button"
                className="time-picker-panel__action"
                onClick={() => { setDraft(parsedValue); setOpen(false); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="time-picker-panel__action is-primary"
                onClick={() => { onChange(to24HourString(draft)); setOpen(false); }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TimePickerField;
