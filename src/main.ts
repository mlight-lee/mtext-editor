import tinymce from "tinymce";
import "tinymce/icons/default/icons.min.js";
import "tinymce/themes/silver/theme.min.js";
import "tinymce/models/dom/model.min.js";
import "tinymce/skins/ui/oxide/skin.js";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/code";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/skins/content/default/content.min.css";
import { TinyMceToMTextConverter } from "./converter";
import { MTextRenderer } from "./renderer";

let mtext = "";

// Initialize MTextRenderer for the 3D rendering area
const mtextRenderer = new MTextRenderer("editor-container");

void tinymce.init({
  selector: "#tinymce-editor",
  plugins: "lists link code",
  toolbar:
    "undo redo | fontfamily | forecolor | bold italic underline strikethrough overline subscript superscript | alignleft aligncenter alignright | bullist numlist | code | letterspacing letterwidth",
  menubar: false,
  skin: false,
  content_css: false,
  license_key: "gpl",
  font_family_formats:
    'Arial=arial; Tahoma=tahoma; Verdana=verdana; 楷体=simkai, SimKai, KaiTi, serif; 黑体=simhei, SimHei, "PingFang SC"; 宋体=simsun, SimSun, serif;',
  formats: {
    letterspacing: {
      inline: "span",
      styles: { "letter-spacing": "%value" },
      remove_similar: true,
    },
    overline: { inline: "span", styles: { "text-decoration": "overline" } },
    fontstretch: {
      inline: "span",
      styles: { "font-stretch": "%value" },
      remove_similar: true,
    },
    letterwidth: {
      inline: "span",
      styles: {
        display: "inline-block",
        transform: "scaleX(%value)",
        "transform-origin": "left",
      },
      remove_similar: true,
    },
  },
  setup: function (editor) {
    // Register custom overline icon
    editor.ui.registry.addIcon(
      "overline",
      `<svg width='24' height='24' viewBox='0 0 24 24'><path d='M5 4h14v1.5H5V4zm7 3.5c3.04 0 5.5 2.46 5.5 5.5v4.5h-2.25v-4.5c0-1.79-1.46-3.25-3.25-3.25S8.75 11.21 8.75 13v4.5H6.5V13c0-3.04 2.46-5.5 5.5-5.5z'/></svg>`,
    );

    // Register custom letterspacing icon
    editor.ui.registry.addIcon(
      "letterspacing",
      `<svg width='24' height='24' viewBox='0 0 24 24'><path d='M4 6h2v12H4V6zm3 0h1v12H7V6zm2 0h1v12H9V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h1v12h-1V6zm2 0h2v12h-2V6z'/></svg>`,
    );

    // Register custom letterwidth icon
    editor.ui.registry.addIcon(
      "letterwidth",
      `<svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path d='M8 20 L12 4 L16 20 M10 15 H14' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/>
        <path d='M2 12h5' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/>
        <path d='M4 10l-2 2 2 2' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
        <path d='M22 12h-5' stroke='currentColor' stroke-width='1.2' stroke-linecap='round'/>
        <path d='M20 10l2 2-2 2' stroke='currentColor' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/>
      </svg>`,
    );

    // Add letterspacing spinbox instead of toggle button
    editor.ui.registry.addButton("letterspacing", {
      icon: "letterspacing",
      tooltip: "Letter Spacing",
      onAction: function () {
        editor.windowManager.open({
          title: "Letter Spacing",
          body: {
            type: "panel",
            items: [
              {
                type: "input",
                name: "letterspacing-value",
                label: "Letter Spacing (em)",
                placeholder: "0",
              },
            ],
          },
          buttons: [
            {
              type: "submit",
              text: "Apply",
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()["letterspacing-value"];
            if (value && !isNaN(parseFloat(value))) {
              const letterSpacing = parseFloat(value) + "em";

              // Get the selected content
              const selectedContent = editor.selection.getContent();

              if (selectedContent) {
                // Apply letter spacing to selected text
                editor.execCommand(
                  "mceInsertContent",
                  false,
                  `<span style='letter-spacing: ${letterSpacing}'>${selectedContent}</span>`,
                );
              }
            }
            api.close();
          },
        });
      },
    });

    // Add letterwidth button
    editor.ui.registry.addButton("letterwidth", {
      icon: "letterwidth",
      tooltip: "Letter Width",
      onAction: function () {
        editor.windowManager.open({
          title: "Letter Width",
          body: {
            type: "panel",
            items: [
              {
                type: "input",
                name: "letterwidth-value",
                label: "Letter Width (0.5-2.0)",
                placeholder: "1",
              },
            ],
          },
          buttons: [
            {
              type: "submit",
              text: "Apply",
            },
          ],
          onSubmit: function (api) {
            const value = api.getData()["letterwidth-value"];
            if (value && !isNaN(parseFloat(value))) {
              const letterWidth = parseFloat(value);

              // Validate the range
              if (letterWidth < 0.5 || letterWidth > 2.0) {
                alert("Please enter a value between 0.5 and 2.0");
                return;
              }

              // Get the selected content
              const selectedContent = editor.selection.getContent();

              if (selectedContent) {
                // Apply letter width using transform scaleX for better browser support
                editor.execCommand(
                  "mceInsertContent",
                  false,
                  `<span style='display: inline-block; transform: scaleX(${letterWidth}); transform-origin: left;'>${selectedContent}</span>`,
                );
              }
            }
            api.close();
          },
        });
      },
    });

    // Add custom overline button
    editor.ui.registry.addToggleButton("overline", {
      icon: "overline", // Use our custom overline icon
      tooltip: "Toggle Overline",
      onAction: function () {
        editor.execCommand("mceToggleFormat", false, "overline");
      },
      onSetup: function (buttonApi) {
        const handler = function (state: boolean) {
          buttonApi.setActive(state);
        };
        editor.formatter.formatChanged("overline", handler);
        return function () {
          editor.formatter.formatChanged("overline", handler);
        };
      },
    });
    // Listen for content changes and convert to MText
    editor.on("Change", () => {
      const nodes = TinyMceToMTextConverter.htmlToTinyMceNodes(
        editor.getContent(),
      );
      mtext = TinyMceToMTextConverter.convert(nodes);
      console.log("Current MText:", mtext);
      mtextRenderer.renderMText(mtext);
    });
  },
});
