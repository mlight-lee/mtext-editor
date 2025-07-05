# Rich Text Editor based on WebGL

Most rich text editors are based on HTML rendering mechanism. If you are creating a web application based on THREE.js, it is hard to edit texts used in your scene. This project is targeted to provide a rich text editor for THREE.js and allow users to edit texts used in scene. It renders texts using THREE.js instead of HTML.

In order to leverage the existing rich text editors, we adopt the following technologies.

- Use `TinyMCE` to edit and format texts
- Convert data model of `TinyMCE` to AutoCAD MText
- Use '@mlightcad/mtext-renderer' (which is based on THREE.js) to render texts

## Key Features

- **WebGL-Based Text Editing**: Edit and render rich text directly within THREE.js scenes, bypassing traditional HTML-based rendering.
- **Rich Formatting Support**: Leverage the power of TinyMCE to provide users with a familiar and feature-rich text editing experience.
  - **Font styles**: font selection, color, bold, italic, underline, overline, and strikethrough.
  - Subscript, superscript, and fraction.
  - Letter space and letter width.
  - Paragraph settings.
    - Horizontal alignment: left, right, and center.
    - Indent.
    - Left & right margin.
  - List: bullet, numbered.
- **AutoCAD MText Compatibility**: Seamlessly convert between TinyMCE's data model and AutoCAD MText format for interoperability with CAD workflows.
- **Real-Time Scene Updates**: Instantly reflect text edits in the 3D scene, enabling interactive and dynamic content creation.
- **Customizable Rendering**: Utilize '@mlightcad/mtext-renderer' for flexible and high-quality text rendering within WebGL environments.

## Key Technologies

- **THREE.js**: The core 3D engine used for rendering scenes and integrating text objects.
- **TinyMCE**: A robust WYSIWYG editor for rich text editing and formatting.
- **@mlightcad/mtext-renderer**: A specialized renderer for displaying MText objects in THREE.js scenes.
- **AutoCAD MText**: The data format used for representing rich text in CAD applications, ensuring compatibility and data exchange.

## Demo

Try [this page](https://mlight-lee.github.io/mtext-editor/)
