import type { TinyMceNode } from './types';

/**
 * Singleton class for converting TinyMCE node models to MText string format.
 * Provides methods to encode text, apply formatting, handle stacking/fractions, and paragraph properties.
 */
export class ModelToMTextConverter {
  /**
   * The singleton instance of ModelToMTextConverter.
   */
  private static instance: ModelToMTextConverter;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Returns the singleton instance of ModelToMTextConverter.
   * @returns {ModelToMTextConverter} The singleton instance.
   */
  public static getInstance(): ModelToMTextConverter {
    if (!ModelToMTextConverter.instance) {
      ModelToMTextConverter.instance = new ModelToMTextConverter();
    }
    return ModelToMTextConverter.instance;
  }

  /**
   * Converts an array of TinyMceNode objects to an MText string.
   * @param nodes - Array of TinyMceNode objects representing TinyMCE content.
   * @returns {string} The converted MText string.
   */
  public convert(nodes: TinyMceNode[]): string {
    return nodes.map(node => this.nodeToMText(node)).join('');
  }

  /**
   * Recursively converts a TinyMceNode to its MText string representation.
   * @param node - The TinyMceNode to convert.
   * @param listContext - Context for list type and depth (for nested lists).
   * @returns {string} The MText string for the node.
   */
  private nodeToMText(
    node: TinyMceNode,
    listContext?: { type: 'ul' | 'ol'; depth: number; olCounter: number[] }
  ): string {
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
    } else if (node.type === 'ul' || node.type === 'ol') {
      // List context: track depth and numbering for ol
      const newDepth = (listContext?.depth ?? 0) + 1;
      // For ordered lists, track counters per depth
      let olCounter = listContext?.olCounter ? [...listContext.olCounter] : [];
      if (node.type === 'ol') {
        if (olCounter.length < newDepth) olCounter.push(1);
      }
      if (node.children) {
        mtext += node.children
          .map(child =>
            this.nodeToMText(child, {
              type: node.type as 'ul' | 'ol',
              depth: newDepth,
              olCounter: olCounter,
            })
          )
          .join('');
      }
    } else if (node.type === 'li') {
      // List item: use context to determine bullet/number and indentation
      let prefix = '';
      let indent = '';
      if (listContext) {
        indent = '  '.repeat(listContext.depth - 1); // 2 spaces per depth
        if (listContext.type === 'ul') {
          prefix = '* ';
        } else if (listContext.type === 'ol') {
          // Use and increment the counter for this depth
          const n = listContext.olCounter[listContext.depth - 1] || 1;
          prefix = n + '. ';
          listContext.olCounter[listContext.depth - 1] = n + 1;
        }
      }
      // Render children (the content of the list item)
      let itemContent = '';
      if (node.children) {
        itemContent = node.children.map(child => this.nodeToMText(child, undefined)).join('');
      }
      mtext += `\\P${indent}${prefix}${itemContent}`;
    } else if (node.children) {
      mtext += node.children.map(child => this.nodeToMText(child)).join('');
      if (node.type === 'paragraph') {
        mtext += '\\P'; // MText paragraph break
      }
    }
    return mtext;
  }

  /**
   * Encodes special/caret characters and fractions for MText.
   * @param text - The input text to encode.
   * @returns {string} The encoded text.
   */
  private encodeMText(text: string): string {
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

  /**
   * Applies MText formatting codes (bold, italic, underline, color, font, etc.) to a text string based on node properties.
   * @param text - The text to format.
   * @param node - The TinyMceNode containing formatting properties.
   * @returns {string} The formatted text string.
   */
  private applyFormatting(text: string, node: TinyMceNode): string {
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

  /**
   * Builds the MText font command string for a node.
   * @param node - The TinyMceNode containing font, bold, and italic properties.
   * @returns {string} The font command string.
   */
  private fontCommand(node: TinyMceNode): string {
    const family = node.font ?? 'Arial';
    const bold = (node.fontBold ?? node.bold) ? 'b1' : 'b0';
    const italic = (node.fontItalic ?? node.italic) ? 'i1' : 'i0';
    return `${family}|${bold}|${italic}`;
  }

  /**
   * Builds the MText stacking/fraction command string.
   * @param numerator - The numerator string.
   * @param denominator - The denominator string.
   * @param divider - The divider character (default is '^').
   * @returns {string} The stacking/fraction command string.
   */
  private stackCommand(numerator: string, denominator: string, divider: string = '^'): string {
    // For "^" divider, add a space after to avoid caret decoding
    if (divider === '^') {
      divider = '^ ';
    }
    return `\\S${numerator}${divider}${denominator};`;
  }

  /**
   * Builds the MText paragraph properties command string.
   * @param paragraph - The paragraph properties from a TinyMceNode.
   * @returns {string} The paragraph command string.
   */
  private paragraphCommand(paragraph: TinyMceNode['paragraph']): string {
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
    } else {
      cmd += 'ql';
    }
    if (paragraph?.tabs && paragraph.tabs.length > 0) {
      cmd += 't' + paragraph.tabs.join(',') + ',';
    }
    if (cmd.endsWith(',')) cmd = cmd.slice(0, -1);
    cmd += ';';
    return cmd;
  }
}
