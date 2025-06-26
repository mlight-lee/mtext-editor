import tinymce from 'tinymce';
import 'tinymce/icons/default/icons.min.js';
import 'tinymce/themes/silver/theme.min.js';
import 'tinymce/models/dom/model.min.js';
import 'tinymce/skins/ui/oxide/skin.js';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/table';
import 'tinymce/plugins/code';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
import { TinyMceToMTextConverter } from './converter';
import { MTextRenderer } from './renderer';

let mtext = '';

// Initialize MTextRenderer for the 3D rendering area
const mtextRenderer = new MTextRenderer('editor-container');

tinymce.init({
  selector: '#tinymce-editor',
  plugins: 'lists link code',
  toolbar: 'undo redo | forecolor | bold italic underline strikethrough overline | alignleft aligncenter alignright | bullist numlist | link code | letterspacing',
  menubar: false,
  skin: false,
  content_css: false,
  license_key: 'gpl',
  formats: {
    letterspacing: { inline: 'span', styles: { 'letter-spacing': '0.1em' } },
    overline: { inline: 'span', styles: { 'text-decoration': 'overline' } }
  },
  setup: function (editor) {
    // Register custom overline icon
    editor.ui.registry.addIcon('overline', 
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 4h14v1.5H5V4zm7 3.5c3.04 0 5.5 2.46 5.5 5.5v4.5h-2.25v-4.5c0-1.79-1.46-3.25-3.25-3.25S8.75 11.21 8.75 13v4.5H6.5V13c0-3.04 2.46-5.5 5.5-5.5z"/></svg>'
    );

    editor.ui.registry.addToggleButton('letterspacing', {
      text: 'A↔A',
      tooltip: 'Toggle Letter Spacing',
      onAction: function () {
        editor.execCommand('mceToggleFormat', false, 'letterspacing');
      },
      onSetup: function (buttonApi) {
        const handler = function (state: boolean) {
          buttonApi.setActive(state);
        };
        editor.formatter.formatChanged('letterspacing', handler);
        return function () {
          editor.formatter.formatChanged('letterspacing', handler);
        };
      }
    });
    // Add custom overline button
    editor.ui.registry.addToggleButton('overline', {
      icon: 'overline',  // Use our custom overline icon
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
      }
    });
    // Listen for content changes and convert to MText
    editor.on('Change', () => {
      const nodes = TinyMceToMTextConverter.htmlToTinyMceNodes(editor.getContent());
      mtext = TinyMceToMTextConverter.convert(nodes);
      console.log('Current MText:', mtext);
      mtextRenderer.renderMText(mtext);
    });
  }
});
