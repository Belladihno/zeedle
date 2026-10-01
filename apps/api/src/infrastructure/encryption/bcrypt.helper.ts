import bcrypt from 'bcrypt';

const ROUNDS = 12;

export function hashSecret(value: string): Promise<string> {
  return bcrypt.hash(value, ROUNDS);
}

export function compareSecret(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}
