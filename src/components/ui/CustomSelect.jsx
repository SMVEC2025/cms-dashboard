import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import clsx from 'clsx';

/**
 * options: [{ value, label, disabled?, group? }]
 * keepEditorFocus – when true, uses onMouseDown+preventDefault so the
 *   rich-text editor never loses its selection when the toolbar is used.
 */
function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  className,
  disabled = false,
  size = 'md',         // 'md' | 'sm'
  keepEditorFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Bucket options into ordered groups
  const groups = [];
  const seen = {};
  options.forEach(opt => {
    const key = opt.group ?? '__ungrouped__';
    if (!seen[key]) {
      seen[key] = true;
      groups.push({ label: opt.group ?? null, items: [] });
    }
    groups[groups.length - 1].items.push(opt);
  });

  return (
    <div
      ref={ref}
      className={clsx(
        'ui-select',
        `ui-select--${size}`,
        open && 'is-open',
        disabled && 'is-disabled',
        className,
      )}
    >
      <button
        type="button"
        className="ui-select__trigger"
        {...(keepEditorFocus
          ? { onMouseDown: e => { e.preventDefault(); if (!disabled) setOpen(v => !v); } }
          : { onClick: () => !disabled && setOpen(v => !v) }
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={clsx('ui-select__value', !selected && 'is-placeholder')}>
          {selected ? selected.label : placeholder}
        </span>
        <FiChevronDown className="ui-select__chevron" />
      </button>

      {open && (
        <div className="ui-select__panel" role="listbox">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className={clsx('ui-select__group', gi > 0 && 'ui-select__group--divided')}
            >
              {group.label && (
                <span className="ui-select__group-label">{group.label}</span>
              )}
              {group.items.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={String(opt.value) === String(value)}
                  className={clsx(
                    'ui-select__item',
                    String(opt.value) === String(value) && 'is-selected',
                    opt.disabled && 'is-disabled',
                  )}
                  disabled={opt.disabled}
                  {...(keepEditorFocus
                    ? { onMouseDown: e => { e.preventDefault(); onChange(opt.value); setOpen(false); } }
                    : { onClick: () => { onChange(opt.value); setOpen(false); } }
                  )}
                >
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <FiCheck className="ui-select__check" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
