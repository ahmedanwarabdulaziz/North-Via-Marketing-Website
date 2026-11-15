import { Pressable, Text, View } from 'react-native';

import { radius, space, usePalette } from '@/lib/theme';

import { Row, T } from './ui';

// Multi-select (Inbox, Tasks): hold a card to start, tap others, then one action for all.

/** The round tick on a card while selecting. */
export function Tick({ on }: { on: boolean }) {
  const p = usePalette();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: on ? p.brand : p.muted,
        backgroundColor: on ? p.brand : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {on ? (
        <T color={p.onBrand} style={{ fontSize: 13, fontWeight: '900', lineHeight: 16 }}>
          ✓
        </T>
      ) : null}
    </View>
  );
}

export interface BarAction {
  key: string;
  icon: string;
  label: string;
  tone?: 'ok' | 'danger';
}

/** The floating bar at the bottom while items are selected. */
export function SelectionBar({
  count,
  allSelected,
  onToggleAll,
  onCancel,
  actions,
  working,
  onAction,
}: {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onCancel: () => void;
  actions: BarAction[];
  working: string | null;
  onAction: (key: string) => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        position: 'absolute',
        left: space.md,
        right: space.md,
        bottom: space.md,
        backgroundColor: p.card,
        borderRadius: radius.lg,
        padding: space.sm,
        gap: space.sm,
        borderWidth: 1,
        borderColor: p.border,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 12,
      }}>
      <Row>
        <Text style={{ flex: 1, color: p.text, fontWeight: '800', fontSize: 15, paddingLeft: 6 }}>{`${count} selected`}</Text>
        <BarLink label={allSelected ? 'Unselect all' : 'Select all'} onPress={onToggleAll} />
        <BarLink label="✖️" onPress={onCancel} />
      </Row>
      <Row>
        {actions.map((a) => {
          const fg = a.tone === 'ok' ? p.ok : a.tone === 'danger' ? p.danger : p.text;
          const bg = a.tone === 'ok' ? p.okSoft : a.tone === 'danger' ? p.dangerSoft : p.bg;
          const busy = working === a.key;
          const disabled = working !== null;
          return (
            <Pressable
              key={a.key}
              onPress={() => onAction(a.key)}
              disabled={disabled}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                gap: 2,
                paddingVertical: 10,
                borderRadius: radius.md,
                backgroundColor: bg,
                opacity: disabled && !busy ? 0.5 : pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 18 }}>{busy ? '⏳' : a.icon}</Text>
              <Text style={{ color: fg, fontWeight: '700', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

function BarLink({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: p.brand, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** Runs one action on many items, a few at a time. Returns how many worked and the errors. */
export async function runForEach(ids: string[], fn: (id: string) => Promise<unknown>) {
  let ok = 0;
  const failed: string[] = [];
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(
      ids.slice(i, i + 4).map((id) =>
        fn(id)
          .then(() => ok++)
          .catch((e) => failed.push(e instanceof Error ? e.message : String(e)))
      )
    );
  }
  return { ok, failed };
}
