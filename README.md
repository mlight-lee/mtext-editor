# Rich Text Editor based on WebGL

Most of rich text editors are based on HTML rendering mechinism. If you are creating one web application based on THREE.js, it is hard to edit texts used in your scene. This project is targeted to provide one rich text editor for THREE.js and allow users to edit texts used in scene. It renders texts using THREE.js instead of HTML.

In order to leverage the existing rich text editors, we adopt the following technologies.

- Use `TineMCE` to edit and format texts
- Convert data model of `TineMCE` to AutoCAD MText
- Use '@mlightcad/mtext-renderer' (which is based on THREE.js) to render texts

## Key Features

- **WebGL-Based Text Editing**: Edit and render rich text directly within THREE.js scenes, bypassing traditional HTML-based rendering.
- **Rich Formatting Support**: Leverage the power of TineMCE to provide users with a familiar and feature-rich text editing experience.
- **AutoCAD MText Compatibility**: Seamlessly convert between TineMCE's data model and AutoCAD MText format for interoperability with CAD workflows.
- **Real-Time Scene Updates**: Instantly reflect text edits in the 3D scene, enabling interactive and dynamic content creation.
- **Customizable Rendering**: Utilize '@mlightcad/mtext-renderer' for flexible and high-quality text rendering within WebGL environments.

## Key Technologies

- **THREE.js**: The core 3D engine used for rendering scenes and integrating text objects.
- **TineMCE**: A robust WYSIWYG editor for rich text editing and formatting.
- **@mlightcad/mtext-renderer**: A specialized renderer for displaying MText objects in THREE.js scenes.
- **AutoCAD MText**: The data format used for representing rich text in CAD applications, ensuring compatibility and data exchange.
