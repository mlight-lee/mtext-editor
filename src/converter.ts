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
  subscript?: boolean;
  superscript?: boolean;
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
    return nodes.map((node) => this.nodeToMText(node)).join('');
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
      mtext += node.children.map((child) => this.nodeToMText(child)).join('');
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
    let codes = '';
    // Only underline, overline, strikethrough, color, font, etc. have separate codes
    if (node.underline) {
      codes += '\\L';
    }
    if (node.overline) {
      codes += '\\O';
    }
    if (node.strikethrough) {
      codes += '\\K';
    }
    if (node.superscript) {
      text = `\\S${text}^ ;`;
    }
    if (node.subscript) {
      text = `\\S^ ${text};`;
    }
    if (node.color) {
      codes += `\\C${node.color};`;
    }
    if (node.rgbColor) {
      codes += `\\c${node.rgbColor & 0xffffff};`;
    }
    if (node.height) {
      codes += `\\H${node.height};`;
    }
    if (node.width) {
      codes += `\\W${node.width};`;
    }
    if (node.tracking) {
      codes += `\\T${node.tracking}x;`;
    }
    if (node.slant) {
      codes += `\\Q${node.slant};`;
    }
    // Font command: if font, or bold/italic present, use font command
    if (node.font ?? node.bold ?? node.italic) {
      codes += `\\f${this.fontCommand(node)};`;
    }
    // If any formatting is present, wrap in {<codes>text} (no closing codes)
    if (codes) {
      return `{${codes}${text}}`;
    }
    return text;
  }

  // Font command: "\fArial|b1|i0;". If bold/italic present but no font, use default font (Arial)
  private static fontCommand(node: TinyMceNode): string {
    const family = node.font ?? 'Arial';
    const bold = (node.fontBold ?? node.bold) ? 'b1' : 'b0';
    const italic = (node.fontItalic ?? node.italic) ? 'i1' : 'i0';
    return `${family}|${bold}|${italic}`;
  }

  // Stacking/fraction command: "\S1^ 2;" or "\S1/2;"
  private static stackCommand(
    numerator: string,
    denominator: string,
    divider: string = '^'
  ): string {
    // For "^" divider, add a space after to avoid caret decoding
    if (divider === '^') {
      divider = '^ ';
    }
    return `\\S${numerator}${divider}${denominator};`;
  }

  // Paragraph properties command
  private static paragraphCommand(paragraph: TinyMceNode['paragraph']): string {
    let cmd = '\\p';
    if (paragraph?.indent !== undefined) cmd += `i${paragraph.indent},`;
    if (paragraph?.left !== undefined) cmd += `l${paragraph.left},`;
    if (paragraph?.right !== undefined) cmd += `r${paragraph.right},`;
    if (paragraph?.align) {
      const alignMap: Record<string, string> = {
        left: 'ql',
        right: 'qr',
        center: 'qc',
        justified: 'qj',
        distributed: 'qd',
      };
      cmd += `${alignMap[paragraph.align] || 'ql'},`;
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
    function mergeFormat(
      parent: Partial<TinyMceNode>,
      child: Partial<TinyMceNode>
    ): Partial<TinyMceNode> {
      return { ...parent, ...child };
    }
    function parseNode(node: Node, format: Partial<TinyMceNode> = {}): TinyMceNode[] {
      if (node.nodeType === Node.TEXT_NODE) {
        // Apply accumulated formatting to text node
        // Replace non-breaking spaces (\u00A0) with regular spaces
        const text = (node.textContent ?? '').replace(/\u00A0/g, ' ');
        return [{ type: 'text', text, ...format }];
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
        if (el.tagName === 'U' || el.style?.textDecoration?.includes('underline')) {
          thisFormat.underline = true;
        }
        // Add overline support
        if (el.style?.textDecoration?.includes('overline')) {
          thisFormat.overline = true;
        }
        // Add strikethrough support
        if (
          el.tagName === 'S' ||
          el.tagName === 'STRIKE' ||
          el.tagName === 'DEL' ||
          el.style?.textDecoration?.includes('line-through')
        ) {
          thisFormat.strikethrough = true;
        }
        // Add subscript/superscript support
        if (el.tagName === 'SUB') thisFormat.subscript = true;
        if (el.tagName === 'SUP') thisFormat.superscript = true;
        // Add color support
        if (el.style?.color) {
          // Convert color to RGB number
          const color = el.style.color;
          if (color.startsWith('rgb')) {
            // Parse rgb(r, g, b) format
            const [r, g, b] = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
            thisFormat.rgbColor = (r << 16) | (g << 8) | b;
          } else if (color.startsWith('#')) {
            // Parse hex format
            thisFormat.rgbColor = parseInt(color.slice(1), 16);
          }
        }
        // Add font family support
        if (el.style?.fontFamily) {
          // Extract the primary font family (first in the list)
          const fontFamily = el.style.fontFamily;
          // Remove quotes and get the first font
          const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
          thisFormat.font = cleanFont;
        }
        // Add letter spacing support
        if (el.style?.letterSpacing) {
          const letterSpacing = el.style.letterSpacing;
          // Convert letter-spacing to tracking value
          // letter-spacing can be in various units: em, px, pt, etc.
          // For MText tracking, we need to convert to a relative value
          if (letterSpacing.endsWith('em')) {
            // Convert em to a tracking multiplier (em is relative to font size)
            const emValue = parseFloat(letterSpacing);
            thisFormat.tracking = emValue;
          } else if (letterSpacing.endsWith('px')) {
            // Convert px to tracking (assuming base font size of 12px)
            const pxValue = parseFloat(letterSpacing);
            thisFormat.tracking = pxValue / 12;
          } else if (letterSpacing.endsWith('pt')) {
            // Convert pt to tracking (1pt ≈ 1.33px, assuming base font size of 12px)
            const ptValue = parseFloat(letterSpacing);
            thisFormat.tracking = (ptValue * 1.33) / 12;
          } else {
            // Try to parse as a number (assume it's already in a reasonable format)
            const numValue = parseFloat(letterSpacing);
            if (!isNaN(numValue)) {
              thisFormat.tracking = numValue;
            }
          }
        }
        // Also check for letterspacing format class (TinyMCE might apply this)
        if (el.className?.includes('letterspacing')) {
          // If no explicit letter-spacing style but has the class, use default value
          if (!thisFormat.tracking) {
            thisFormat.tracking = 10; // Default letter spacing value
          }
        }
        // Add letter width support
        if (el.style?.transform) {
          const transform = el.style.transform;
          // Parse transform: scaleX(value)
          const scaleXMatch = transform.match(/scaleX\(([^)]+)\)/);
          if (scaleXMatch) {
            const scaleXValue = parseFloat(scaleXMatch[1]);
            if (!isNaN(scaleXValue)) {
              thisFormat.width = scaleXValue;
            }
          }
        }
        // Also check for letterwidth format class (TinyMCE might apply this)
        if (el.className?.includes('letterwidth')) {
          // If no explicit transform style but has the class, use default value
          if (!thisFormat.width) {
            thisFormat.width = 1; // Default letter width value
          }
        }
        // Merge parent and this element's formatting
        const mergedFormat = mergeFormat(format, thisFormat);
        el.childNodes.forEach((child) => {
          children = children.concat(parseNode(child, mergedFormat));
        });
        if (el.tagName === 'P') {
          // Paragraph node
          // Extract alignment from align attribute or style
          let align: 'left' | 'right' | 'center' | 'justified' | undefined;
          // Check align attribute
          const alignAttr = el.getAttribute('align');
          if (alignAttr) {
            if (alignAttr === 'left' || alignAttr === 'right' || alignAttr === 'center') {
              align = alignAttr;
            } else if (alignAttr === 'justify') {
              align = 'justified';
            }
          }
          // Check style.textAlign (JS-set styles)
          const styleAlign = el.style?.textAlign;
          if (styleAlign) {
            if (styleAlign === 'left' || styleAlign === 'right' || styleAlign === 'center') {
              align = styleAlign;
            } else if (styleAlign === 'justify') {
              align = 'justified';
            }
          }
          // Parse inline style attribute for text-align
          const styleAttr = el.getAttribute('style');
          if (styleAttr) {
            const match = styleAttr.match(/text-align\s*:\s*(left|right|center|justify)/i);
            if (match) {
              const val = match[1].toLowerCase();
              if (val === 'left' || val === 'right' || val === 'center') {
                align = val;
              } else if (val === 'justify') {
                align = 'justified';
              }
            }
          }
          return [{ type: 'paragraph', children, paragraph: align ? { align } : {} }];
        }
        let n: TinyMceNode = {
          type: el.tagName.toLowerCase(),
          children,
          ...thisFormat,
        };
        return [n];
      }
      return [];
    }
    // Only parse body children
    let nodes: TinyMceNode[] = [];
    doc.body?.childNodes.forEach((child) => {
      nodes = nodes.concat(parseNode(child));
    });
    return nodes;
  }
}
