import type { TinyMceNode, TinyMceNodeType, ParagraphProperties } from './types';

/**
 * Singleton class for converting HTML strings to TinyMceNode arrays.
 * Supports parsing of basic formatting, lists, paragraphs, and inline styles.
 */
export class HtmlToModelConverter {
  /**
   * The singleton instance of HtmlToTinyMceConverter.
   */
  private static instance: HtmlToModelConverter;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of HtmlToTinyMceConverter.
   * @returns {HtmlToModelConverter} The singleton instance.
   */
  public static getInstance(): HtmlToModelConverter {
    if (!HtmlToModelConverter.instance) {
      HtmlToModelConverter.instance = new HtmlToModelConverter();
    }
    return HtmlToModelConverter.instance;
  }

  /**
   * Converts an HTML string to an array of TinyMceNode objects.
   * @param html - The HTML string to convert.
   * @returns {TinyMceNode[]} The resulting array of TinyMceNode objects.
   */
  public htmlToTinyMceNodes(html: string): TinyMceNode[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let nodes: TinyMceNode[] = [];
    doc.body?.childNodes.forEach(child => {
      nodes = nodes.concat(this.parseNode(child));
    });
    return nodes;
  }

  /**
   * Merges formatting properties from parent and child TinyMceNode objects.
   * @param parent - The parent formatting object.
   * @param child - The child formatting object.
   * @returns {Partial<TinyMceNode>} The merged formatting object.
   */
  private mergeFormat(
    parent: Partial<TinyMceNode>,
    child: Partial<TinyMceNode>
  ): Partial<TinyMceNode> {
    return { ...parent, ...child };
  }

  /**
   * Parses a CSS value string and converts it to a number in em units if possible.
   * Supports em, px, pt, and plain numbers.
   * @param value - The CSS value string.
   * @returns {number | null} The parsed value in em units, or null if invalid.
   */
  private parseCssValue(value: string): number | null {
    if (!value) return null;
    const trimmedValue = value.trim();
    if (trimmedValue.endsWith('em')) {
      return parseFloat(trimmedValue);
    } else if (trimmedValue.endsWith('px')) {
      return parseFloat(trimmedValue) / 16;
    } else if (trimmedValue.endsWith('pt')) {
      return (parseFloat(trimmedValue) * 1.33) / 16;
    } else {
      const numValue = parseFloat(trimmedValue);
      return !isNaN(numValue) ? numValue : null;
    }
  }

  /**
   * Extracts a numeric CSS property value from a style attribute string.
   * @param styleAttr - The style attribute string.
   * @param property - The CSS property name to extract.
   * @returns {number | null} The parsed value in em units, or null if not found.
   */
  private extractCssProperty(styleAttr: string, property: string): number | null {
    const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
    const match = styleAttr.match(regex);
    if (match) {
      return this.parseCssValue(match[1]);
    }
    return null;
  }

  /**
   * Recursively parses a DOM Node and its children into TinyMceNode objects, applying formatting as needed.
   * @param node - The DOM Node to parse.
   * @param format - The accumulated formatting to apply (used for recursion).
   * @returns {TinyMceNode[]} The resulting TinyMceNode objects for this node and its children.
   */
  private parseNode(node: Node, format: Partial<TinyMceNode> = {}): TinyMceNode[] {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.parseTextNode(node, format);
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        return this.parseBrNode();
      }
      if (el.tagName === 'OL' || el.tagName === 'UL') {
        return this.parseListNode(el, format);
      }
      if (el.tagName === 'LI') {
        return this.parseListItemNode(el, format);
      }
      if (el.tagName === 'P') {
        return this.parseParagraphNode(el, format);
      }
      return this.parseElementNode(el, format);
    }
    return [];
  }

  /**
   * Parses a text node into a TinyMceNode.
   */
  private parseTextNode(node: Node, format: Partial<TinyMceNode>): TinyMceNode[] {
    const text = (node.textContent ?? '').replace(/\u00A0/g, ' ');
    return [{ type: 'text', text, ...format }];
  }

  /**
   * Parses a <br> element node.
   */
  private parseBrNode(): TinyMceNode[] {
    return [{ type: 'br' }];
  }

  /**
   * Parses an ordered or unordered list node (<ol> or <ul>).
   */
  private parseListNode(el: HTMLElement, format: Partial<TinyMceNode>): TinyMceNode[] {
    let children: TinyMceNode[] = [];
    el.childNodes.forEach(child => {
      children = children.concat(this.parseNode(child, format));
    });
    return [
      {
        type: el.tagName === 'OL' ? 'ol' : 'ul',
        children,
      },
    ];
  }

  /**
   * Parses a list item node (<li>).
   */
  private parseListItemNode(el: HTMLElement, format: Partial<TinyMceNode>): TinyMceNode[] {
    let children: TinyMceNode[] = [];
    el.childNodes.forEach(child => {
      children = children.concat(this.parseNode(child, format));
    });
    return [
      {
        type: 'li',
        children,
      },
    ];
  }

  /**
   * Parses a paragraph node (<p>), extracting paragraph properties and children.
   */
  private parseParagraphNode(el: HTMLElement, format: Partial<TinyMceNode>): TinyMceNode[] {
    let children: TinyMceNode[] = [];
    const mergedFormat = this.mergeFormat(format, this.extractFormatting(el));
    el.childNodes.forEach(child => {
      children = children.concat(this.parseNode(child, mergedFormat));
    });
    const paragraphProps = this.extractParagraphProperties(el);
    return [{ type: 'paragraph', children, paragraph: paragraphProps }];
  }

  /**
   * Parses a generic element node, extracting formatting and children.
   */
  private parseElementNode(el: HTMLElement, format: Partial<TinyMceNode>): TinyMceNode[] {
    let children: TinyMceNode[] = [];
    const thisFormat = this.extractFormatting(el);
    const mergedFormat = this.mergeFormat(format, thisFormat);
    el.childNodes.forEach(child => {
      children = children.concat(this.parseNode(child, mergedFormat));
    });
    let n: TinyMceNode = {
      type: el.tagName.toLowerCase() as TinyMceNodeType,
      children,
      ...thisFormat,
    };
    return [n];
  }

  /**
   * Extracts formatting properties from an element.
   */
  private extractFormatting(el: HTMLElement): Partial<TinyMceNode> {
    let thisFormat: Partial<TinyMceNode> = {};
    if (el.tagName === 'B' || el.tagName === 'STRONG') thisFormat.bold = true;
    if (el.tagName === 'I' || el.tagName === 'EM') thisFormat.italic = true;
    if (el.tagName === 'U' || el.style?.textDecoration?.includes('underline')) {
      thisFormat.underline = true;
    }
    if (el.style?.textDecoration?.includes('overline')) {
      thisFormat.overline = true;
    }
    if (
      el.tagName === 'S' ||
      el.tagName === 'STRIKE' ||
      el.tagName === 'DEL' ||
      el.style?.textDecoration?.includes('line-through')
    ) {
      thisFormat.strikethrough = true;
    }
    if (el.tagName === 'SUB') thisFormat.subscript = true;
    if (el.tagName === 'SUP') thisFormat.superscript = true;
    if (el.style?.color) {
      const color = el.style.color;
      if (color.startsWith('rgb')) {
        const [r, g, b] = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
        thisFormat.rgbColor = (r << 16) | (g << 8) | b;
      } else if (color.startsWith('#')) {
        thisFormat.rgbColor = parseInt(color.slice(1), 16);
      }
    }
    if (el.style?.fontFamily) {
      const fontFamily = el.style.fontFamily;
      const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
      thisFormat.font = cleanFont;
    }
    if (el.style?.letterSpacing) {
      const trackingValue = this.parseCssValue(el.style.letterSpacing);
      if (trackingValue !== null) {
        thisFormat.tracking = trackingValue;
      }
    }
    if (el.className?.includes('letterspacing')) {
      if (!thisFormat.tracking) {
        thisFormat.tracking = 10;
      }
    }
    if (el.style?.transform) {
      const transform = el.style.transform;
      const scaleXMatch = transform.match(/scaleX\(([^)]+)\)/);
      if (scaleXMatch) {
        const scaleXValue = parseFloat(scaleXMatch[1]);
        if (!isNaN(scaleXValue)) {
          thisFormat.width = scaleXValue;
        }
      }
    }
    if (el.className?.includes('letterwidth')) {
      if (!thisFormat.width) {
        thisFormat.width = 1;
      }
    }
    return thisFormat;
  }

  /**
   * Extracts paragraph properties (alignment, indent, margins) from a <p> element.
   */
  private extractParagraphProperties(el: HTMLElement): ParagraphProperties {
    let align: 'left' | 'right' | 'center' | 'justified' | undefined;
    const alignAttr = el.getAttribute('align');
    if (alignAttr) {
      if (alignAttr === 'left' || alignAttr === 'right' || alignAttr === 'center') {
        align = alignAttr;
      } else if (alignAttr === 'justify') {
        align = 'justified';
      }
    }
    const styleAlign = el.style?.textAlign;
    if (styleAlign) {
      if (styleAlign === 'left' || styleAlign === 'right' || styleAlign === 'center') {
        align = styleAlign;
      } else if (styleAlign === 'justify') {
        align = 'justified';
      }
    }
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
    const paragraphProps: ParagraphProperties = {};
    if (align) {
      paragraphProps.align = align;
    }
    if (el.style?.textIndent) {
      const indentValue = this.parseCssValue(el.style.textIndent);
      if (indentValue !== null) {
        paragraphProps.indent = indentValue;
      }
    }
    if (el.style?.marginLeft) {
      const leftValue = this.parseCssValue(el.style.marginLeft);
      if (leftValue !== null) {
        paragraphProps.left = leftValue;
      }
    }
    if (el.style?.marginRight) {
      const rightValue = this.parseCssValue(el.style.marginRight);
      if (rightValue !== null) {
        paragraphProps.right = rightValue;
      }
    }
    if (styleAttr) {
      if (!paragraphProps.indent) {
        const indentValue = this.extractCssProperty(styleAttr, 'text-indent');
        if (indentValue !== null) {
          paragraphProps.indent = indentValue;
        }
      }
      if (!paragraphProps.left) {
        const leftValue = this.extractCssProperty(styleAttr, 'margin-left');
        if (leftValue !== null) {
          paragraphProps.left = leftValue;
        }
      }
      if (!paragraphProps.right) {
        const rightValue = this.extractCssProperty(styleAttr, 'margin-right');
        if (rightValue !== null) {
          paragraphProps.right = rightValue;
        }
      }
    }
    return paragraphProps;
  }
}
