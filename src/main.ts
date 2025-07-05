import tinymce from 'tinymce';
import 'tinymce/icons/default/icons.min.js';
import 'tinymce/themes/silver/theme.min.js';
import 'tinymce/models/dom/model.min.js';
import 'tinymce/skins/ui/oxide/skin.js';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/code';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
import { ModelToMTextConverter } from './modelConverter';
import { MTextRenderer } from './renderer';
import { HtmlToModelConverter } from './htmlConverter';

let mtext = '';
let showTextBox = true;

// Get the checkbox element
const showTextBoxCheckbox = document.getElementById('show-textbox-checkbox') as HTMLInputElement;
if (showTextBoxCheckbox) {
  showTextBox = showTextBoxCheckbox.checked;
  showTextBoxCheckbox.addEventListener('change', () => {
    showTextBox = showTextBoxCheckbox.checked;
    // Re-render with the new value
    void mtextRenderer.renderMText({ content: mtext, width: 5, isDrawTextBox: showTextBox });
  });
}

// Initialize MTextRenderer for the 3D rendering area
const mtextRenderer = new MTextRenderer('editor-container');

void tinymce.init({
  selector: '#tinymce-editor',
  plugins: 'lists link code',
  toolbar:
    'undo redo | fontfamily | forecolor | bold italic underline strikethrough overline subscript superscript | alignleft aligncenter alignright | bullist numlist | letterspacing letterwidth | indentleft marginleft marginright | code',
  menubar: false,
  skin: false,
  content_css: false,
  license_key: 'gpl',
  font_family_formats:
    'Arial=arial; Tahoma=tahoma; Verdana=verdana; 楷体=simkai, SimKai, KaiTi, serif; 黑体=simhei, SimHei, "PingFang SC"; 宋体=simsun, SimSun, serif;',
  formats: {
    letterspacing: {
      inline: 'span',
      styles: { 'letter-spacing': '%value' },
      remove_similar: true,
    },
    overline: { inline: 'span', styles: { 'text-decoration': 'overline' } },
    fontstretch: {
      inline: 'span',
      styles: { 'font-stretch': '%value' },
      remove_similar: true,
    },
    letterwidth: {
      inline: 'span',
      styles: {
        display: 'inline-block',
        transform: 'scaleX(%value)',
        'transform-origin': 'left',
      },
      remove_similar: true,
    },
  },
  setup: function (editor) {
    // Register custom overline icon
    editor.ui.registry.addIcon(
      'overline',
      `<svg width='24' height='24' viewBox='0 0 24 24'><path d='M5 4h14v1.5H5V4zm7 3.5c3.04 0 5.5 2.46 5.5 5.5v4.5h-2.25v-4.5c0-1.79-1.46-3.25-3.25-3.25S8.75 11.21 8.75 13v4.5H6.5V13c0-3.04 2.46-5.5 5.5-5.5z'/></svg>`
    );

    // Register custom letterspacing icon
    editor.ui.registry.addIcon(
      'letterspacing',
      `<svg width='24' height='24' viewBox='0 0 24 24'><path d='M4 6h2v12H4V6zm3 0h1v12H7V6zm2 0h1v12H9V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h2v12h-2V6z'/></svg>`
    );

    // Register custom letterwidth icon
    editor.ui.registry.addIcon(
      'letterwidth',
      `<svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M8 20 L12 4 L16 20 M10 15 H14' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
        <path d='M2 12h5' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/>
        <path d='M4 10l-2 2 2 2' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
        <path d='M22 12h-5' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/>
        <path d='M20 10l2 2-2 2' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
      </svg>`
    );

    // Register custom indent icons
    editor.ui.registry.addIcon(
      'indentleft',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor"/><rect x="11" y="11" width="10" height="2" rx="1" fill="currentColor"/><path d="M3 12h6m0 0-2-2m2 2-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    );

    // Register custom margin icons
    editor.ui.registry.addIcon(
      'marginleft',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="2" height="16" rx="1" fill="currentColor"/><rect x="7" y="7" width="12" height="2" rx="1" fill="currentColor"/><rect x="7" y="11" width="8" height="2" rx="1" fill="currentColor"/><rect x="7" y="15" width="6" height="2" rx="1" fill="currentColor"/></svg>`
    );

    editor.ui.registry.addIcon(
      'marginright',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="19" y="4" width="2" height="16" rx="1" fill="currentColor"/><rect x="5" y="7" width="12" height="2" rx="1" fill="currentColor"/><rect x="9" y="11" width="8" height="2" rx="1" fill="currentColor"/><rect x="11" y="15" width="6" height="2" rx="1" fill="currentColor"/></svg>`
    );

    // Add letterspacing spinbox instead of toggle button
    editor.ui.registry.addButton('letterspacing', {
      icon: 'letterspacing',
      tooltip: 'Letter Spacing',
      onAction: function () {
        editor.windowManager.open({
          title: 'Letter Spacing',
          body: {
            type: 'panel',
            items: [
              {
                type: 'input',
                name: 'letterspacing-value',
                label: 'Letter Spacing (em)',
                placeholder: '0',
              },
            ],
          },
          buttons: [
            {
              type: 'submit',
              text: 'Apply',
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()['letterspacing-value'];
            if (value && !isNaN(parseFloat(value))) {
              const letterSpacing = parseFloat(value) + 'em';

              // Get the selected content
              const selectedContent = editor.selection.getContent();

              if (selectedContent) {
                // Apply letter spacing to selected text
                editor.execCommand(
                  'mceInsertContent',
                  false,
                  `<span style='letter-spacing: ${letterSpacing}'>${selectedContent}</span>`
                );
              }
            }
            api.close();
          },
        });
      },
    });

    // Add letterwidth button
    editor.ui.registry.addButton('letterwidth', {
      icon: 'letterwidth',
      tooltip: 'Letter Width',
      onAction: function () {
        editor.windowManager.open({
          title: 'Letter Width',
          body: {
            type: 'panel',
            items: [
              {
                type: 'input',
                name: 'letterwidth-value',
                label: 'Letter Width (0.5-2.0)',
                placeholder: '1',
              },
            ],
          },
          buttons: [
            {
              type: 'submit',
              text: 'Apply',
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()['letterwidth-value'];
            if (value && !isNaN(parseFloat(value))) {
              const letterWidth = parseFloat(value);

              // Validate the range
              if (letterWidth < 0.5 || letterWidth > 2.0) {
                alert('Please enter a value between 0.5 and 2.0');
                return;
              }

              // Get the selected content
              const selectedContent = editor.selection.getContent();

              if (selectedContent) {
                // Apply letter width using transform scaleX for better browser support
                editor.execCommand(
                  'mceInsertContent',
                  false,
                  `<span style='display: inline-block; transform: scaleX(${letterWidth}); transform-origin: left;'>${selectedContent}</span>`
                );
              }
            }
            api.close();
          },
        });
      },
    });

    // Add indent button
    editor.ui.registry.addButton('indentleft', {
      icon: 'indentleft',
      tooltip: 'Set Indent',
      onAction: function () {
        editor.windowManager.open({
          title: 'Set Indent',
          body: {
            type: 'panel',
            items: [
              {
                type: 'input',
                name: 'indent-value',
                label: 'Indent Amount (em)',
                placeholder: '2',
              },
            ],
          },
          buttons: [
            {
              type: 'submit',
              text: 'Apply',
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()['indent-value'];
            if (value && !isNaN(parseFloat(value))) {
              const indentAmount = parseFloat(value);

              // Get the selected content or current paragraph
              const selectedContent = editor.selection.getContent();
              const currentNode = editor.selection.getNode();

              if (selectedContent) {
                // Apply to selected content
                editor.execCommand(
                  'mceInsertContent',
                  false,
                  `<div style='text-indent: ${indentAmount}em'>${selectedContent}</div>`
                );
              } else if (currentNode.nodeName === 'P' || currentNode.nodeName === 'DIV') {
                // Apply to current paragraph
                currentNode.style.textIndent = indentAmount * 16 + 'px'; // Convert em to px
              }
            }
            api.close();
          },
        });
      },
    });

    // Add margin left button
    editor.ui.registry.addButton('marginleft', {
      icon: 'marginleft',
      tooltip: 'Set Left Margin',
      onAction: function () {
        editor.windowManager.open({
          title: 'Set Left Margin',
          body: {
            type: 'panel',
            items: [
              {
                type: 'input',
                name: 'margin-value',
                label: 'Left Margin (em)',
                placeholder: '2',
              },
            ],
          },
          buttons: [
            {
              type: 'submit',
              text: 'Apply',
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()['margin-value'];
            if (value && !isNaN(parseFloat(value))) {
              const marginAmount = parseFloat(value);

              // Get the selected content or current paragraph
              const selectedContent = editor.selection.getContent();
              const currentNode = editor.selection.getNode();

              if (selectedContent) {
                // Apply to selected content
                editor.execCommand(
                  'mceInsertContent',
                  false,
                  `<div style='margin-left: ${marginAmount}em'>${selectedContent}</div>`
                );
              } else if (currentNode.nodeName === 'P' || currentNode.nodeName === 'DIV') {
                // Apply to current paragraph
                currentNode.style.marginLeft = marginAmount * 16 + 'px'; // Convert em to px
              }
            }
            api.close();
          },
        });
      },
    });

    // Add margin right button
    editor.ui.registry.addButton('marginright', {
      icon: 'marginright',
      tooltip: 'Set Right Margin',
      onAction: function () {
        editor.windowManager.open({
          title: 'Set Right Margin',
          body: {
            type: 'panel',
            items: [
              {
                type: 'input',
                name: 'margin-value',
                label: 'Right Margin (em)',
                placeholder: '2',
              },
            ],
          },
          buttons: [
            {
              type: 'submit',
              text: 'Apply',
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()['margin-value'];
            if (value && !isNaN(parseFloat(value))) {
              const marginAmount = parseFloat(value);

              // Get the selected content or current paragraph
              const selectedContent = editor.selection.getContent();
              const currentNode = editor.selection.getNode();

              if (selectedContent) {
                // Apply to selected content
                editor.execCommand(
                  'mceInsertContent',
                  false,
                  `<div style='margin-right: ${marginAmount}em'>${selectedContent}</div>`
                );
              } else if (currentNode.nodeName === 'P' || currentNode.nodeName === 'DIV') {
                // Apply to current paragraph
                currentNode.style.marginRight = marginAmount * 16 + 'px'; // Convert em to px
              }
            }
            api.close();
          },
        });
      },
    });

    // Add custom overline button
    editor.ui.registry.addToggleButton('overline', {
      icon: 'overline', // Use our custom overline icon
      tooltip: 'Toggle Overline',
      onAction: function () {
        editor.execCommand('mceToggleFormat', false, 'overline');
      },
      onSetup: function (buttonApi) {
        const handler = function (state: boolean) {
          buttonApi.setActive(state);
        };
        editor.formatter.formatChanged('overline', handler);
        return function () {
          editor.formatter.formatChanged('overline', handler);
        };
      },
    });
    // Listen for content changes and convert to MText
    editor.on('Change', () => {
      const nodes = HtmlToModelConverter.getInstance().htmlToTinyMceNodes(editor.getContent());
      mtext = ModelToMTextConverter.getInstance().convert(nodes);
      console.log('Current MText:', mtext);
      void mtextRenderer.renderMText({ content: mtext, width: 8.7, isDrawTextBox: showTextBox });
    });
  },
});
