import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import ResizableImageNodeView from './ResizableImageNodeView';

const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
          class: `is-${attributes.align}`,
        }),
      },
      width: {
        default: '68%',
        parseHTML: (element) =>
          element.getAttribute('data-width')
          || element.style.width
          || '68%',
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
          style: attributes.width ? `width: ${attributes.width};` : null,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setAlignedImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent([
            {
              type: this.name,
              attrs: {
                ...options,
                align: options.align || 'left',
                width: options.width || '68%',
              },
            },
            { type: 'paragraph' },
          ]),
      setImageAlign:
        (align) =>
        ({ state, commands }) => {
          const { selection } = state;
          if (!selection.node || selection.node.type.name !== this.name) {
            return false;
          }

          return commands.updateAttributes(this.name, { align });
        },
      setImageWidth:
        (width) =>
        ({ state, commands }) => {
          const { selection } = state;
          if (!selection.node || selection.node.type.name !== this.name) {
            return false;
          }

          return commands.updateAttributes(this.name, { width });
        },
    };
  },
});

export default AlignedImage;
