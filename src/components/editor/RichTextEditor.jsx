import { useEffect, useState } from 'react';
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import clsx from 'clsx';
import CustomSelect from '@/components/ui/CustomSelect';
import EditorColorPicker from './EditorColorPicker';
import EditorImagePicker from './EditorImagePicker';
import EditorToolbar from './EditorToolbar';
import { FONT_FAMILIES, FONT_SIZES } from './editorToolbarOptions';
import AlignedImage from './AlignedImage';

// Extend TextStyle to also carry a fontSize attribute
const TextStyleExtended = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: el => el.style.fontSize || null,
        renderHTML: attrs =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

function BubbleBtn({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      className={clsx('bubble-menu__button', active && 'is-active')}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange, onImageUpload, readOnly = false }) {
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({
        placeholder: 'Write the full story, event agenda, blog narrative, highlights, and context…',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      AlignedImage,
      TextStyleExtended,
      FontFamily,
      Color,
    ],
    content: value || '',
    editorProps: {
      attributes: { class: 'editor-surface__content' },
      handlePaste: (_view, event) => {
        if (!onImageUpload || !editor?.isEditable) {
          return false;
        }

        const clipboardItems = Array.from(event.clipboardData?.items || []);
        const imageItem = clipboardItems.find((item) => item.type?.startsWith('image/'));
        if (!imageItem) {
          return false;
        }

        const file = imageItem.getAsFile();
        if (!file) {
          return false;
        }

        event.preventDefault();

        void (async () => {
          try {
            const asset = await onImageUpload(file);
            const assetName = asset?.fileName || asset?.name || file.name || 'Image';
            const assetUrl = asset?.publicUrl || asset?.url;
            if (!assetUrl || !editor?.isEditable) {
              return;
            }

            editor.chain().focus().setAlignedImage({
              src: assetUrl,
              alt: assetName,
              title: assetName,
              align: 'left',
              width: '56%',
            }).run();
          } catch (error) {
            console.error('Failed to upload pasted image', error);
          }
        })();

        return true;
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange({ html: e.getHTML(), json: e.getJSON() });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const nextValue = value || '';
    if (currentHtml === nextValue || (nextValue === '' && currentHtml === '<p></p>')) return;
    editor.commands.setContent(nextValue, true);
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  const handleInsertImage = (asset) => {
    if (!asset || !editor) return;

    const assetName = asset.fileName || asset.name || 'Image';
    const assetUrl = asset.publicUrl || asset.url;
    if (!assetUrl) return;

    editor.chain().focus().setAlignedImage({
      src: assetUrl,
      alt: assetName,
      title: assetName,
      align: 'left',
      width: '56%',
    }).run();
  };

  const handleSetLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const nextUrl = window.prompt('Enter link URL', previousUrl);
    if (nextUrl === null) return;
    if (!nextUrl) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: nextUrl }).run();
  };

  const currentFontFamily = editor?.getAttributes('textStyle').fontFamily || 'Inter';
  const currentFontSize = editor?.getAttributes('textStyle').fontSize || '16px';
  const currentColor = editor?.getAttributes('textStyle').color || '#111827';
  const isImageSelection = editor?.isActive('image');
  const currentImageAlign = editor?.getAttributes('image').align || 'left';
  const currentImageWidth = editor?.getAttributes('image').width || '56%';
  const hasRangeSelection = editor ? !editor.state.selection.empty : false;
  const H1_SIZE = '32px';
  const H2_SIZE = '28px';
  const P_SIZE = '16px';

  const applyHeadingLevel = (level) => {
    if (!editor) return;

    if (hasRangeSelection) {
      const fontSize = level === 1 ? H1_SIZE : H2_SIZE;
      editor.chain().focus().setMark('textStyle', { fontSize }).run();
      return;
    }

    editor.chain().focus().toggleHeading({ level }).run();
  };

  const applyParagraph = () => {
    if (!editor) return;

    if (hasRangeSelection) {
      editor.chain().focus().setMark('textStyle', { fontSize: P_SIZE }).run();
      return;
    }

    editor.chain().focus().setParagraph().run();
  };

  return (
    <div className="editor-surface">
      {!readOnly && (
        <>
          <EditorToolbar
            editor={editor}
            onImageSelect={() => setIsImagePickerOpen(true)}
          />
          <EditorImagePicker
            open={isImagePickerOpen}
            onClose={() => setIsImagePickerOpen(false)}
            onInsert={handleInsertImage}
            onUpload={onImageUpload}
          />
        </>
      )}

      {editor && !readOnly && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          shouldShow={({ editor, state }) => {
            const { from, to } = state.selection;
            return editor.isActive('image') || from !== to;
          }}
          className="bubble-menu"
        >
          {isImageSelection ? (
            <>
              <div className="bubble-menu__group">
                <BubbleBtn
                  active={currentImageAlign === 'left'}
                  onClick={() => editor.chain().focus().setImageAlign('left').run()}
                  title="Image align left"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                  </svg>
                </BubbleBtn>
                <BubbleBtn
                  active={currentImageAlign === 'center'}
                  onClick={() => editor.chain().focus().setImageAlign('center').run()}
                  title="Image align center"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" />
                  </svg>
                </BubbleBtn>
                <BubbleBtn
                  active={currentImageAlign === 'right'}
                  onClick={() => editor.chain().focus().setImageAlign('right').run()}
                  title="Image align right"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
                    <line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" />
                  </svg>
                </BubbleBtn>
              </div>

              <span className="bubble-menu__divider" />

              <div className="bubble-menu__group">
                {[
                  { label: 'S', value: '38%' },
                  { label: 'M', value: '56%' },
                  { label: 'L', value: '72%' },
                  { label: 'XL', value: '100%' },
                ].map((option) => (
                  <BubbleBtn
                    key={option.value}
                    active={currentImageWidth === option.value}
                    onClick={() => editor.chain().focus().setImageWidth(option.value).run()}
                    title={`Image width ${option.value}`}
                  >
                    <span className="bubble-menu__label">{option.label}</span>
                  </BubbleBtn>
                ))}
              </div>
            </>
          ) : (
            <>
          <div className="bubble-menu__group">
            <CustomSelect
              size="sm"
              keepEditorFocus
              className="bubble-menu__select bubble-menu__select--font"
              value={currentFontFamily}
              onChange={(value) => editor.chain().focus().setFontFamily(value).run()}
              options={FONT_FAMILIES.map((family) => ({ value: family, label: family }))}
            />
            <CustomSelect
              size="sm"
              keepEditorFocus
              className="bubble-menu__select bubble-menu__select--size"
              value={currentFontSize}
              onChange={(value) => editor.chain().focus().setMark('textStyle', { fontSize: value }).run()}
              options={FONT_SIZES.map((size) => ({ value: size, label: size }))}
            />
          </div>

          <span className="bubble-menu__divider" />

          <div className="bubble-menu__group">
            <BubbleBtn
              active={editor.isActive('heading', { level: 1 }) || (hasRangeSelection && currentFontSize === H1_SIZE)}
              onClick={() => applyHeadingLevel(1)}
              title="Heading 1"
            >
              <span className="bubble-menu__label">H1</span>
            </BubbleBtn>
            <BubbleBtn
              active={editor.isActive('heading', { level: 2 }) || (hasRangeSelection && currentFontSize === H2_SIZE)}
              onClick={() => applyHeadingLevel(2)}
              title="Heading 2"
            >
              <span className="bubble-menu__label">H2</span>
            </BubbleBtn>

            <BubbleBtn
              active={editor.isActive('paragraph') || (hasRangeSelection && currentFontSize === P_SIZE)}
              onClick={applyParagraph}
              title="Paragraph"
            >
              <span className="bubble-menu__label">P</span>
            </BubbleBtn>
          </div>

          <div className="bubble-menu__group">
            <BubbleBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
            </BubbleBtn>
            <EditorColorPicker
              currentColor={currentColor}
              onSelect={(color) => editor.chain().focus().setColor(color).run()}
              panelClassName="bubble-menu__color-panel"
            />
          </div>

          <span className="bubble-menu__divider" />

          <div className="bubble-menu__group">
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
              </svg>
            </BubbleBtn>
          </div>

          <span className="bubble-menu__divider" />

          <div className="bubble-menu__group">
            <BubbleBtn active={editor.isActive('link')} onClick={handleSetLink} title="Link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </BubbleBtn>
            <BubbleBtn
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              title="Clear formatting"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
              </svg>
            </BubbleBtn>
          </div>
            </>
          )}
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
