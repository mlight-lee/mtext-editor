/**
 * Properties for paragraph formatting, such as indentation, alignment, and tab stops.
 */
export interface ParagraphProperties {
  /** Indentation level (number of indents or distance, implementation-defined). */
  indent?: number;
  /** Left margin or indentation in units (e.g., px, pt). */
  left?: number;
  /** Right margin or indentation in units (e.g., px, pt). */
  right?: number;
  /**
   * Paragraph alignment.
   * - 'left': Left-aligned
   * - 'right': Right-aligned
   * - 'center': Centered
   * - 'justified': Justified
   * - 'distributed': Distributed evenly
   */
  align?: 'left' | 'right' | 'center' | 'justified' | 'distributed';
  /** Tab stop positions in units (e.g., px, pt). */
  tabs?: number[];
}

/**
 * Supported node types for TinyMCE-like document model.
 */
export type TinyMceNodeType =
  /** Plain text node. */
  | 'text'
  /** Line break. */
  | 'br'
  /** Ordered list. */
  | 'ol'
  /** Unordered list. */
  | 'ul'
  /** List item. */
  | 'li'
  /** Paragraph. */
  | 'paragraph';

/**
 * Represents a node in a TinyMCE-like document model, supporting text, formatting, and structure.
 */
export interface TinyMceNode {
  /** The type of node (e.g., text, paragraph, list, etc.). */
  type: TinyMceNodeType;
  /** The text content (for text nodes). */
  text?: string;
  /** Child nodes (for container nodes like paragraphs, lists, etc.). */
  children?: TinyMceNode[];
  /** Bold formatting. */
  bold?: boolean;
  /** Italic formatting. */
  italic?: boolean;
  /** Underline formatting. */
  underline?: boolean;
  /** Overline formatting. */
  overline?: boolean;
  /** Strikethrough formatting. */
  strikethrough?: boolean;
  /** Subscript formatting. */
  subscript?: boolean;
  /** Superscript formatting. */
  superscript?: boolean;
  /** ACI color index (1-255). */
  color?: number;
  /** RGB color as 0xRRGGBB. */
  rgbColor?: number;
  /** Font family name. */
  font?: string;
  /** Bold font style (font-level, not text-level). */
  fontBold?: boolean;
  /** Italic font style (font-level, not text-level). */
  fontItalic?: boolean;
  /** Text height (e.g., in points or pixels). */
  height?: number;
  /** Width factor (e.g., for stretched or condensed text). */
  width?: number;
  /** Character tracking (spacing between characters). */
  tracking?: number;
  /** Oblique angle (slant) for italicized text. */
  slant?: number;
  /** Fraction formatting for stacked text. */
  stack?: { numerator: string; denominator: string; divider?: string };
  /** Paragraph formatting properties. */
  paragraph?: ParagraphProperties;
  // Add more formatting as needed
}
