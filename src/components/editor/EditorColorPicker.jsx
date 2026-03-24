import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { COLOR_PALETTE } from './editorToolbarOptions';

function EditorColorPicker({ currentColor, onSelect, panelClassName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="color-picker" ref={ref}>
      <button
        type="button"
        className="editor-toolbar__button color-picker__trigger"
        title="Text Color"
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <span className="editor-toolbar__color-dot" style={{ background: currentColor }} />
      </button>
      {open && (
        <div className={clsx('color-picker__panel', panelClassName)}>
          <p className="color-picker__label">Black &amp; Gray</p>
          <div className="color-picker__row">
            {COLOR_PALETTE.slice(0, 5).map((color) => (
              <button
                key={color.value}
                type="button"
                className={clsx('color-picker__swatch', currentColor === color.value && 'is-active')}
                style={{ background: color.value }}
                title={color.label}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(color.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <p className="color-picker__label">Blue &amp; Sky</p>
          <div className="color-picker__row">
            {COLOR_PALETTE.slice(5).map((color) => (
              <button
                key={color.value}
                type="button"
                className={clsx('color-picker__swatch', currentColor === color.value && 'is-active')}
                style={{ background: color.value }}
                title={color.label}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(color.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorColorPicker;
