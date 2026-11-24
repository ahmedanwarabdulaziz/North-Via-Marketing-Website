import { Fragment, type ReactNode } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

import { parseBlocks, parseInline } from '@/lib/markdown';
import { usePalette } from '@/lib/theme';

// Formatted chat answers: the bit of Markdown the assistant writes (headings, bullet and numbered
// lists, **bold**, *italic*, `code`, [links](https://…) and bare links). Small and dependency-free so
// it works the same in Expo Go, on Android and on the web, and it re-renders cheaply while an answer
// streams in. Arabic lines are laid out right to left, each line on its own.

const ARABIC = /[؀-ۿ]/;
const rtl = (s: string) => ARABIC.test(s.replace(/[\s\d\W_]+/g, '').slice(0, 20));

const open = (url: string) => {
  void Linking.openURL(url).catch(() => undefined);
};

export function RichText({ text, color, fontSize = 15, selectable = true }: { text: string; color?: string; fontSize?: number; selectable?: boolean }) {
  const p = usePalette();
  const ink = color ?? p.text;
  const lineHeight = Math.round(fontSize * 1.47);
  const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

  const inline = (s: string, key: string): ReactNode =>
    parseInline(s).map((span, i) => (
      <Text
        key={`${key}:${i}`}
        onPress={span.url ? () => open(span.url!) : undefined}
        style={{
          fontWeight: span.bold ? '700' : undefined,
          fontStyle: span.italic ? 'italic' : undefined,
          fontFamily: span.code ? mono : undefined,
          backgroundColor: span.code ? p.bg : undefined,
          color: span.url ? p.brand : undefined,
          textDecorationLine: span.url ? 'underline' : undefined,
        }}>
        {span.text}
      </Text>
    ));

  const line = (s: string, key: string, extra: object = {}) => (
    <Text key={key} selectable={selectable} style={{ color: ink, fontSize, lineHeight, writingDirection: rtl(s) ? 'rtl' : 'ltr', textAlign: rtl(s) ? 'right' : 'left', ...extra }}>
      {inline(s, key)}
    </Text>
  );

  const blocks = parseBlocks(text);
  return (
    <View style={{ gap: 2 }}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case 'gap':
            return <View key={key} style={{ height: lineHeight / 2.5 }} />;
          case 'rule':
            return <View key={key} style={{ height: 1, backgroundColor: p.border, marginVertical: 6 }} />;
          case 'heading':
            return line(b.text, key, { fontWeight: '700', fontSize: b.level <= 2 ? fontSize + 2 : fontSize + 1, marginTop: i ? 4 : 0 });
          case 'code':
            return (
              <View key={key} style={{ backgroundColor: p.bg, borderRadius: 8, padding: 10, marginVertical: 2 }}>
                <Text selectable={selectable} style={{ color: ink, fontFamily: mono, fontSize: fontSize - 2, lineHeight: lineHeight - 3 }}>
                  {b.text}
                </Text>
              </View>
            );
          case 'bullet':
          case 'number': {
            const right = rtl(b.text);
            return (
              <View key={key} style={{ flexDirection: right ? 'row-reverse' : 'row', gap: 6, [right ? 'paddingRight' : 'paddingLeft']: 4 + b.depth * 14 }}>
                <Text style={{ color: ink, fontSize, lineHeight, minWidth: b.kind === 'number' ? 18 : 10, textAlign: right ? 'left' : 'right' }}>{b.kind === 'number' ? `${b.n}.` : b.depth ? '◦' : '•'}</Text>
                <View style={{ flex: 1 }}>{line(b.text, `${key}t`)}</View>
              </View>
            );
          }
          default:
            return <Fragment key={key}>{line(b.text, key)}</Fragment>;
        }
      })}
    </View>
  );
}
