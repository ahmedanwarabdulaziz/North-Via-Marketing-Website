// The bit of Markdown the chat assistant writes, parsed into blocks and inline spans for
// components/rich-text.tsx. Plain TypeScript (no React Native), so it can be tested on its own.

export type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'bullet'; text: string; depth: number }
  | { kind: 'number'; n: string; text: string; depth: number }
  | { kind: 'para'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }
  | { kind: 'gap' };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      if (blocks.length && blocks[blocks.length - 1].kind !== 'gap') blocks.push({ kind: 'gap' });
      continue;
    }
    const depth = Math.min(3, Math.floor((raw.match(/^\s*/)?.[0].length ?? 0) / 2));
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^\s*(#{1,4})\s+(.*)$/))) blocks.push({ kind: 'heading', level: m[1].length, text: m[2].replace(/\s*#+\s*$/, '') });
    else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) blocks.push({ kind: 'rule' });
    else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) blocks.push({ kind: 'bullet', text: m[1], depth });
    else if ((m = line.match(/^\s*(\d{1,3})[.)]\s+(.*)$/))) blocks.push({ kind: 'number', n: m[1], text: m[2], depth });
    else blocks.push({ kind: 'para', text: line.trim() });
  }
  while (blocks.length && blocks[blocks.length - 1].kind === 'gap') blocks.pop();
  return blocks;
}

export type Span = { text: string; bold?: boolean; italic?: boolean; code?: boolean; url?: string };

/** **bold**, __bold__, *italic*, _italic_, `code`, [text](url) and bare https:// links. */
export function parseInline(text: string): Span[] {
  const spans: Span[] = [];
  const re = /(\*\*|__)(.+?)\1|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,!?:;'"])|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])|(?<![\w_])_(?!\s)([^_\n]+?)_(?![\w_])/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) spans.push({ text: text.slice(last, at) });
    if (m[2] !== undefined) spans.push(...parseInline(m[2]).map((s) => ({ ...s, bold: true })));
    else if (m[3] !== undefined) spans.push({ text: m[3], code: true });
    else if (m[4] !== undefined) spans.push({ text: m[4], url: m[5] });
    else if (m[6] !== undefined) spans.push({ text: m[6], url: m[6] });
    else if (m[7] !== undefined) spans.push({ text: m[7], italic: true });
    else if (m[8] !== undefined) spans.push({ text: m[8], italic: true });
    last = at + m[0].length;
  }
  if (last < text.length) spans.push({ text: text.slice(last) });
  return spans;
}
