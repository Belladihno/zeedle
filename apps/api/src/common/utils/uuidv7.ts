import { randomBytes } from 'node:crypto';

/**
 * Generates an RFC 9562 UUID v7 (time-ordered): 48-bit unix millis +
 * version nibble 0111 + 74 bits of randomness. Sortable by creation time,
 * unlike v4 — better for primary keys and index locality.
 */
export function uuidv7(date: Date = new Date()): string {
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(date.getTime(), 0, 6);
  const rand = randomBytes(10);
  bytes[6] = (rand[0] & 0x0f) | 0x70;
  bytes[7] = rand[1];
  bytes[8] = (rand[2] & 0x3f) | 0x80;
  rand.copy(bytes, 9, 3);
  const hex = bytes.toString('hex');
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20)}`
  );
}
