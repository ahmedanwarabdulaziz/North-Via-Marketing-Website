// Extremely simple in-memory rate limiter
// Suitable for Server Actions in a single-instance or small scale Next.js backend MVP.
const logins = new Map<string, { count: number; timestamp: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { success: boolean; error?: string } {
  const now = Date.now();
  const record = logins.get(identifier);

  if (!record) {
    logins.set(identifier, { count: 1, timestamp: now });
    return { success: true };
  }

  // If the window has passed, reset
  if (now - record.timestamp > WINDOW_MS) {
    logins.set(identifier, { count: 1, timestamp: now });
    return { success: true };
  }

  // If within the window, check the attempt count
  if (record.count >= MAX_ATTEMPTS) {
    const timeLeft = Math.ceil((WINDOW_MS - (now - record.timestamp)) / 1000 / 60);
    return { success: false, error: `Too many login attempts. Please try again in ${timeLeft} minutes.` };
  }

  record.count += 1;
  return { success: true };
}

export function resetRateLimit(identifier: string) {
  logins.delete(identifier);
}
