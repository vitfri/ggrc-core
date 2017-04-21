/*!
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, GGRC, Quill) {
  'use strict';

  var URL_CLIPBOARD_REGEX = /https?:\/\/[^\s]+/g;
  var URL_TYPE_REGEX = /https?:\/\/[^\s]+$/;

  GGRC.Components('richText', {
    tag: 'rich-text',
    template: can.view(
      GGRC.mustache_path +
      '/components/rich_text/rich_text.mustache'
    ),
    viewModel: {
      define: {
        placeholder: {
          type: 'string',
          value: ''
        },
        disabled: {
          type: 'boolean',
          set: function (newValue) {
            this.toggle(!newValue);
            return newValue;
          }
        },
        text: {
          type: 'string',
          value: '',
          set: function (text) {
            text = text || '';
            this.setText(text);
            return text;
          }
        }
      },
      editor: false,
      initEditor: function (container, toolbarContainer, text) {
        var editor = new Quill(container, {
          theme: 'snow',
          bounds: container,
          placeholder: this.attr('placeholder'),
          modules: {
            toolbar: {
              container: toolbarContainer
            },
            clipboard: {
              matchers: [
                [Node.TEXT_NODE, this.urlMatcher]
              ]
            }
          }
        });
        if (text) {
          editor.clipboard.dangerouslyPasteHTML(0, text);
        }
        editor.on('text-change', this.onChange.bind(this));
        this.attr('editor', editor);
      },
      urlMatcher: function (node, delta) {
        var matches;
        var ops;
        var str;
        if (typeof (node.data) !== 'string') {
          return;
        }
        matches = node.data.match(URL_CLIPBOARD_REGEX);

        if (matches && matches.length > 0) {
          ops = [];
          str = node.data;
          matches.forEach(function (match) {
            var split = str.split(match);
            var beforeLink = split.shift();
            ops.push({insert: beforeLink});
            ops.push({insert: match, attributes: {link: match}});
            str = split.join(match);
          });
          ops.push({insert: str});
          delta.ops = ops;
        }

        return delta;
      },
      isWhitespace: function (ch) {
        return (ch === ' ') || (ch === '\t') || (ch === '\n');
      },
      onChange: function (delta) {
        var match;
        var url;
        var ops;
        var text;
        var startIdx;
        var endIdx;
        var editor;
        if (!this.getTextLength()) {
          // Should null text value if this is no content
          return this.attr('text', '');
        }

        if (delta.ops.length === 2 &&
          delta.ops[0].retain &&
          !delta.ops[1].delete &&
          !this.isWhitespace(delta.ops[1].insert)) {
          editor = this.getEditor();
          text = editor.getText();
          startIdx = delta.ops[0].retain;
          while (!this.isWhitespace(text[startIdx - 1]) && startIdx > 0) {
            startIdx--;
          }
          endIdx = delta.ops[0].retain + 1;
          while (!this.isWhitespace(text[endIdx]) && endIdx < text.length) {
            endIdx++;
          }

          match = text.substring(startIdx, endIdx).match(URL_TYPE_REGEX);
          if (match !== null) {
            url = match[0];

            ops = [];
            if (startIdx !== 0) {
              ops.push({retain: startIdx});
            }
            ops = ops.concat([
              {'delete': url.length},
              {insert: url, attributes: {link: url}}
            ]);
            editor.updateContents({
              ops: ops
            });
          }
        }

        return this.attr('text', this.getContent());
      },
      toggle: function (isDisabled) {
        var editor = this.getEditor();
        if (editor) {
          editor.enable(isDisabled);
        }
      },
      getEditor: function () {
        return this.attr('editor');
      },
      getTextLength: function () {
        return this.getText().trim().length;
      },
      /**
       * Returns only text content of the Rich Text
       * @return {String} - plain text value
       */
      getText: function () {
        return this.getEditor().getText();
      },
      setText: function (text) {
        var editor = this.getEditor();
        if (editor && !text.length) {
          editor.setText('');
        }
      },
      /**
       * Returns the whole content of the Rich Text field with HTML content
       * @return {String} - current HTML String
       */
      getContent: function () {
        return this.getEditor().root.innerHTML;
      }
    },
    events: {
      inserted: function () {
        var wysiwyg = this.element.find('.rich-text__content')[0];
        var toolbar = this.element.find('.rich-text__toolbar')[0];
        var text = this.viewModel.attr('text');
        this.viewModel.initEditor(wysiwyg, toolbar, text);
      }
    }
  });
})(window.can, window.GGRC, window.Quill);
