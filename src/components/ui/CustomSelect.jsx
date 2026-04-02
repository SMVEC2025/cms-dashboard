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
  const [openUpward, setOpenUpward] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
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

  useEffect(() => {
    if (!open) {
      setOpenUpward(false);
      setPanelStyle(null);
      return;
    }

    function updatePanelPosition() {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const gap = 5;
      const viewportPadding = 16;
      const idealHeight = 260;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const shouldOpenUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(
        120,
        shouldOpenUpward ? spaceAbove - gap : spaceBelow - gap,
      );

      setOpenUpward(shouldOpenUpward);
      setPanelStyle({ maxHeight: `${Math.min(idealHeight, availableHeight)}px` });
    }

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
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
        open && openUpward && 'is-open-upward',
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
        <div className="ui-select__panel" role="listbox" style={panelStyle || undefined}>
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
