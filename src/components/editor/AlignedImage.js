import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

const AlignedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
          class: `is-${attributes.align}`,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setAlignedImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              ...options,
              align: options.align || 'center',
            },
          }),
      setImageAlign:
        (align) =>
        ({ state, commands }) => {
          const { selection } = state;
          if (!selection.node || selection.node.type.name !== this.name) {
            return false;
          }

          return commands.updateAttributes(this.name, { align });
        },
    };
  },
});

export default AlignedImage;

