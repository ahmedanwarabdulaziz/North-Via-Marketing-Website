import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Text } from 'react-native';

import { Button, Input, T } from '@/components/ui';
import { radius, space, usePalette } from '@/lib/theme';

// Pick the client a Page / account belongs to (Facebook & Instagram, Google & Ads screens).
// "— No client —" unlinks it.

export function ClientPicker({
  visible,
  title,
  clients,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  clients: { id: string; name: string }[];
  current: string | null;
  onPick: (clientId: string | null) => void;
  onClose: () => void;
}) {
  const p = usePalette();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = [{ id: '', name: '— No client —' }, ...clients.filter((c) => !q || c.name.toLowerCase().includes(q))];
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: space.lg }} onPress={close}>
        <Pressable
          onPress={() => undefined}
          style={{ backgroundColor: p.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, maxHeight: '80%', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <T variant="heading">{title}</T>
          <Input value={query} onChangeText={setQuery} placeholder="Search clients" />
          <ScrollView style={{ flexGrow: 0 }}>
            {list.map((c) => {
              const on = (current ?? '') === c.id;
              return (
                <Pressable
                  key={c.id || 'none'}
                  onPress={() => {
                    setQuery('');
                    onPick(c.id || null);
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: space.sm + 2,
                    paddingHorizontal: space.md,
                    borderRadius: radius.md,
                    backgroundColor: on ? p.brandSoft : pressed ? p.border : 'transparent',
                  })}>
                  <Text style={{ color: on ? p.brand : p.text, fontWeight: on ? '700' : '500', textAlign: 'left' }}>{on ? `✓ ${c.name}` : c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button title="Cancel" kind="outline" small onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A confirmation that works on the phone and on the PC (where Alert buttons don't). */
export function confirmAsk(title: string, text: string, ok: string, onYes: () => void, onNo?: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${text}`)) onYes();
    else onNo?.();
    return;
  }
  Alert.alert(title, text, [
    { text: 'Cancel', style: 'cancel', onPress: onNo },
    { text: ok, onPress: onYes },
  ]);
}
