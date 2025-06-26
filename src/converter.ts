// TinyMceToMTextConverter.ts
// Converts TinyMCE data model to AutoCAD MText string, following AutoCAD MText specification

export type TinyMceNode = {
  type: string;
  text?: string;
  children?: TinyMceNode[];
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  overline?: boolean;
  strikethrough?: boolean;
  color?: number; // ACI color index (1-255)
  rgbColor?: number; // RGB color as 0xRRGGBB
  font?: string; // font family
  fontBold?: boolean;
  fontItalic?: boolean;
  height?: number; // text height
  width?: number; // width factor
  tracking?: number; // character tracking
  slant?: number; // oblique angle
  stack?: { numerator: string; denominator: string; divider?: string }; // for fractions
  paragraph?: {
    indent?: number;
    left?: number;
    right?: number;
    align?: 'left' | 'right' | 'center' | 'justified' | 'distributed';
    tabs?: number[];
  };
  // Add more formatting as needed
};

export class TinyMceToMTextConverter {
  // Entry point: accepts TinyMCE content (array of nodes)
  public static convert(nodes: TinyMceNode[]): string {
    return nodes.map(node => this.nodeToMText(node)).join('');
  }

  private static nodeToMText(node: TinyMceNode): string {
    let mtext = '';
    // Handle paragraph properties
    if (node.paragraph) {
      mtext += this.paragraphCommand(node.paragraph);
    }
    // Handle stacking/fractions
    if (node.stack) {
      mtext += this.stackCommand(node.stack.numerator, node.stack.denominator, node.stack.divider);
      return mtext;
    }
    // Handle text node
    if (node.type === 'text' && node.text) {
      mtext += this.applyFormatting(this.encodeMText(node.text), node);
    } else if (node.children) {
      mtext += node.children.map(child => this.nodeToMText(child)).join('');
      if (node.type === 'paragraph') {
        mtext += '\\P'; // MText paragraph break
      }
    }
    return mtext;
  }

  // Encode special/caret characters and fractions
  private static encodeMText(text: string): string {
    // Caret encoded characters
    text = text.replace(/\^I/g, '\\t'); // tabulator
    text = text.replace(/\^J/g, '\\P'); // line break
    text = text.replace(/\^M/g, ''); // CR ignored
    text = text.replace(/\^ /g, '^'); // caret glyph
    // Special encoded characters
    text = text.replace(/%%[cC]/g, 'Ø');
    text = text.replace(/%%[dD]/g, '°');
    text = text.replace(/%%[pP]/g, '±');
    // Multi-byte character encoding (not implemented, just pass through)
    // Stacking/fractions handled by stackCommand
    return text;
  }

  // Apply formatting codes (bold, italic, underline, color, font, etc.)
  private static applyFormatting(text: string, node: TinyMceNode): string {
    let result = text;
    if (node.bold) {
      result = `\\b1;${result}\\b0;`;
    }
    if (node.italic) {
      result = `\\i1;${result}\\i0;`;
    }
    if (node.underline) {
      result = `\\L${result}\\l`;
    }
    if (node.overline) {
      result = `\\O${result}\\o`;
    }
    if (node.strikethrough) {
      result = `\\K${result}\\k`;
    }
    if (node.color) {
      result = `\\C${node.color};${result}\\C0;`;
    }
    if (node.rgbColor) {
      result = `\\c${node.rgbColor & 0xffffff};${result}\\c0;`;
    }
    if (node.height) {
      result = `\\H${node.height};${result}\\H;`;
    }
    if (node.width) {
      result = `\\W${node.width};${result}\\W;`;
    }
    if (node.tracking) {
      result = `\\T${node.tracking};${result}\\T;`;
    }
    if (node.slant) {
      result = `\\Q${node.slant};${result}\\Q;`;
    }
    if (node.font) {
      result = `\\f${this.fontCommand(node)};${result}\\f;`;
    }
    return result;
  }

  // Font command: "\fArial|b1|i0;"
  private static fontCommand(node: TinyMceNode): string {
    const family = node.font || '';
    const bold = node.fontBold ? 'b1' : 'b0';
    const italic = node.fontItalic ? 'i1' : 'i0';
    return `${family}|${bold}|${italic}`;
  }

  // Stacking/fraction command: "\S1^ 2;" or "\S1/2;"
  private static stackCommand(numerator: string, denominator: string, divider: string = '^'): string {
    // For "^" divider, add a space after to avoid caret decoding
    if (divider === '^') {
      divider = '^ ';
    }
    return `\\S${numerator}${divider}${denominator};`;
  }

  // Paragraph properties command
  private static paragraphCommand(paragraph: TinyMceNode['paragraph']): string {
    let cmd = '\\px';
    if (paragraph?.indent !== undefined) cmd += `i${paragraph.indent},`;
    if (paragraph?.left !== undefined) cmd += `l${paragraph.left},`;
    if (paragraph?.right !== undefined) cmd += `r${paragraph.right},`;
    if (paragraph?.align) {
      const alignMap: Record<string, string> = {
        left: 'ql', right: 'qr', center: 'qc', justified: 'qj', distributed: 'qd',
      };
      cmd += `q${alignMap[paragraph.align] || 'ql'},`;
    }
    if (paragraph?.tabs && paragraph.tabs.length > 0) {
      cmd += 't' + paragraph.tabs.join(',') + ',';
    }
    if (cmd.endsWith(',')) cmd = cmd.slice(0, -1);
    cmd += ';';
    return cmd;
  }

  // Parse HTML string to TinyMceNode[] (basic implementation: text, b, strong, i, em, u)
  public static htmlToTinyMceNodes(html: string): TinyMceNode[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Helper to merge formatting
    function mergeFormat(parent: Partial<TinyMceNode>, child: Partial<TinyMceNode>): Partial<TinyMceNode> {
      return { ...parent, ...child };
    }
    function parseNode(node: Node, format: Partial<TinyMceNode> = {}): TinyMceNode[] {
      if (node.nodeType === Node.TEXT_NODE) {
        // Apply accumulated formatting to text node
        return [{ type: 'text', text: node.textContent || '', ...format }];
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        let children: TinyMceNode[] = [];
        if (el.tagName === 'BR') {
          return [{ type: 'br' }];
        }
        // Determine this element's formatting
        let thisFormat: Partial<TinyMceNode> = {};
        if (el.tagName === 'B' || el.tagName === 'STRONG') thisFormat.bold = true;
        if (el.tagName === 'I' || el.tagName === 'EM') thisFormat.italic = true;
        // Add underline support
        if (
          el.tagName === 'U' ||
          (el.style && el.style.textDecoration && el.style.textDecoration.includes('underline'))
        ) {
          thisFormat.underline = true;
        }
        // Add overline support
        if (el.style && el.style.textDecoration && el.style.textDecoration.includes('overline')) {
          thisFormat.overline = true;
        }
        // Add strikethrough support
        if (
          el.tagName === 'S' || 
          el.tagName === 'STRIKE' || 
          el.tagName === 'DEL' ||
          (el.style && el.style.textDecoration && el.style.textDecoration.includes('line-through'))
        ) {
          thisFormat.strikethrough = true;
        }
        // Add color support
        if (el.style && el.style.color) {
          // Convert color to RGB number
          const color = el.style.color;
          if (color.startsWith('rgb')) {
            // Parse rgb(r, g, b) format
            const [r, g, b] = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
            thisFormat.rgbColor = (r << 16) | (g << 8) | b;
          } else if (color.startsWith('#')) {
            // Parse hex format
            thisFormat.rgbColor = parseInt(color.slice(1), 16);
          }
        }
        // Merge parent and this element's formatting
        const mergedFormat = mergeFormat(format, thisFormat);
        el.childNodes.forEach(child => {
          children = children.concat(parseNode(child, mergedFormat));
        });
        if (el.tagName === 'P') {
          // Paragraph node
          return [{ type: 'paragraph', children, paragraph: {} }];
        }
        let n: TinyMceNode = { type: el.tagName.toLowerCase(), children, ...thisFormat };
        return [n];
      }
      return [];
    }
    // Only parse body children
    let nodes: TinyMceNode[] = [];
    doc.body.childNodes.forEach(child => {
      nodes = nodes.concat(parseNode(child));
    });
    return nodes;
  }
} 