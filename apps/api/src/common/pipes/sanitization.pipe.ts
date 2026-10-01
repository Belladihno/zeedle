import { Injectable, type PipeTransform } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

const NARRATION_KEYS = new Set(['narration']);

/**
 * Runs after validation: trims every string, strips HTML from narration
 * fields (stored-XSS kill), and floors numbers to integers.
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }
    if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
      const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
      for (const key of Object.keys(out)) {
        out[key] = this.sanitizeValue(out[key], key);
      }
      return out;
    }
    return value;
  }

  private sanitizeValue(value: unknown, key?: string): unknown {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return key && NARRATION_KEYS.has(key)
        ? sanitizeHtml(trimmed, { allowedTags: [], allowedAttributes: {} })
        : trimmed;
    }
    if (typeof value === 'number') {
      return Math.floor(value);
    }
    return value;
  }
}
