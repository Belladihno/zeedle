export interface RecentRecipient {
  id: string;
  name: string;
  accountNumber?: string;
}

const KEY = 'zeedle-recent-recipients';
const MAX = 5;

export function loadRecentRecipients(): RecentRecipient[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentRecipient[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecentRecipient(entry: RecentRecipient): void {
  const rest = loadRecentRecipients().filter((item) => item.id !== entry.id);
  localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, MAX)));
}
