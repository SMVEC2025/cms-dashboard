import CustomSelect from '@/components/ui/CustomSelect';
import clsx from 'clsx';
import EditorColorPicker from './EditorColorPicker';
import { FONT_FAMILIES, FONT_SIZES } from './editorToolbarOptions';

function ToolbarButton({ active, onClick, children, disabled = false, title }) {
  return (
    <button
      type="button"
      className={clsx('editor-toolbar__button', active && 'is-active')}
      onMouseDown={e => {
        e.preventDefault(); // keeps editor selection intact on click
        if (!disabled) onClick?.();
      }}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="editor-toolbar__divider" />;
}

function EditorToolbar({ editor, onImageSelect, uploadInProgress }) {
  if (!editor) return null;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const nextUrl = window.prompt('Enter link URL', previousUrl);
    if (nextUrl === null) return;
    if (!nextUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl }).run();
  };

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || 'Inter';
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16px';
  const currentColor = editor.getAttributes('textStyle').color || '#111827';

  return (
    <div className="editor-toolbar">
      {/* Font family */}
      <div className="editor-toolbar__group">
        <CustomSelect
          size="sm"
          keepEditorFocus
          className="editor-toolbar__select--font"
          value={currentFontFamily}
          onChange={val => editor.chain().focus().setFontFamily(val).run()}
          options={FONT_FAMILIES.map(f => ({ value: f, label: f }))}
        />
      </div>

      <ToolbarDivider />

      {/* Font size */}
      <div className="editor-toolbar__group">
        <CustomSelect
          size="sm"
          keepEditorFocus
          className="editor-toolbar__select--size"
          value={currentFontSize}
          onChange={val => editor.chain().focus().setMark('textStyle', { fontSize: val }).run()}
          options={FONT_SIZES.map(s => ({ value: s, label: s }))}
        />
      </div>

      <ToolbarDivider />

      {/* H1 · H2 · P */}
      <div className="editor-toolbar__group">
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <span className="editor-toolbar__label">H1</span>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <span className="editor-toolbar__label">H2</span>
        </ToolbarButton>

        <ToolbarButton
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="Paragraph"
        >
          <span className="editor-toolbar__label">P</span>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Bold · Italic · Underline */}
      <div className="editor-toolbar__group">
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
            <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
          </svg>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Color picker */}
      <div className="editor-toolbar__group">
        <EditorColorPicker
          currentColor={currentColor}
          onSelect={color => editor.chain().focus().setColor(color).run()}
        />
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <div className="editor-toolbar__group">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Justify"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" />
          </svg>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Undo · Redo */}
      <div className="editor-toolbar__group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Link · Image · AI */}
      <div className="editor-toolbar__group">
        <ToolbarButton active={editor.isActive('link')} onClick={handleSetLink} title="Link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={onImageSelect}
          disabled={uploadInProgress}
          title={uploadInProgress ? 'Uploading…' : 'Insert Image'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}

export default EditorToolbar;
