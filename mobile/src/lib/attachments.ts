// Files for the chat (📎 in the Chat tab, or Share → "Ask the chat"). Sent to the website as base64;
// the website shows pictures to Claude and reads PDFs and text files. One request can carry about
// 4 MB, so pictures are shrunk on the device first and big files are refused with a clear message.

export interface ChatFile {
  name: string;
  mimeType: string;
  data: string; // base64
  size: number; // bytes
}

/** Base64 characters per request that stay under the website's ~4.5 MB limit. */
export const MAX_TOTAL_BASE64 = 4_000_000;

export const totalSize = (files: ChatFile[]) => files.reduce((n, f) => n + f.data.length, 0);

export function tooBig(files: ChatFile[], adding: ChatFile) {
  return totalSize(files) + adding.data.length > MAX_TOTAL_BASE64;
}

export const fileIcon = (f: { mimeType: string; name: string }) =>
  f.mimeType.startsWith('image/') ? '🖼' : /pdf/i.test(f.mimeType) || /\.pdf$/i.test(f.name) ? '📄' : '📎';

// What the Share screen hands to the Chat tab ("Ask the chat"): files, and text for the box.
let pending: ChatFile[] = [];
let pendingText = '';
export const setPendingChat = (files: ChatFile[], text = '') => {
  pending = files;
  pendingText = text;
};
export const takePendingChatFiles = () => {
  const out = pending;
  pending = [];
  return out;
};
export const takePendingChatText = () => {
  const out = pendingText;
  pendingText = '';
  return out;
};
