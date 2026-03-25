import { useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import clsx from 'clsx';

const MIN_WIDTH_PERCENT = 20;
const MAX_WIDTH_PERCENT = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parsePercent(value, fallback = 56) {
  const numeric = Number.parseFloat(String(value || ''));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function ResizableImageNodeView({ node, selected, updateAttributes }) {
  const wrapperRef = useRef(null);

  const handleResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const wrapper = wrapperRef.current;
    const editorSurface = wrapper?.closest('.editor-surface__content');
    if (!wrapper || !editorSurface) {
      return;
    }

    const surfaceWidth = editorSurface.clientWidth || wrapper.clientWidth;
    const startX = event.clientX;
    const startWidthPercent = parsePercent(node.attrs.width, 56);
    const startWidthPx = (surfaceWidth * startWidthPercent) / 100;

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidthPx = clamp(startWidthPx + deltaX, surfaceWidth * 0.2, surfaceWidth);
      const nextWidthPercent = clamp((nextWidthPx / surfaceWidth) * 100, MIN_WIDTH_PERCENT, MAX_WIDTH_PERCENT);
      updateAttributes({ width: `${Math.round(nextWidthPercent)}%` });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={clsx(
        'editor-resizable-image',
        `is-${node.attrs.align || 'left'}`,
        selected && 'is-selected',
      )}
      style={{ width: node.attrs.width || '56%' }}
      data-align={node.attrs.align || 'left'}
      data-width={node.attrs.width || '56%'}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        title={node.attrs.title || ''}
        draggable={false}
      />
      {selected && (
        <button
          type="button"
          className="editor-resizable-image__handle"
          aria-label="Resize image"
          onPointerDown={handleResizeStart}
        />
      )}
    </NodeViewWrapper>
  );
}

export default ResizableImageNodeView;
