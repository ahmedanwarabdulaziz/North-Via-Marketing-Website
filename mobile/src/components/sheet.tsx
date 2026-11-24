import { useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, usePalette } from '@/lib/theme';

import { T } from './ui';

/**
 * A pop-up that slides up from the bottom; tapping the dimmed area or Back closes it.
 * On a PC (web, wide window) it's a centered window instead, with ✕ and Esc to close.
 */
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 700;
  // Esc closes the window on a PC (the web Modal doesn't do it by itself).
  useEffect(() => {
    if (!desktop || !visible || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [desktop, visible, onClose]);
  if (desktop) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
          <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 12, 24, 0.55)' }} />
          <View
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: '86%',
              backgroundColor: p.bg,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: p.border,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
            }}>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 2,
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hovered || pressed ? p.border : 'transparent',
              })}>
              <Text style={{ color: p.muted, fontSize: 18, fontWeight: '700' }}>✕</Text>
            </Pressable>
            <ScrollView contentContainerStyle={{ gap: space.md, padding: space.xl, paddingTop: space.lg }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(8, 12, 24, 0.45)' }} />
        <View
          style={{
            backgroundColor: p.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: space.lg,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.lg,
            maxHeight: '88%',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 24,
          }}>
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: p.border, marginBottom: space.md }} />
          <ScrollView contentContainerStyle={{ gap: space.md }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A big button with an icon on top: easy to hit with a thumb. `wide` puts the icon beside the label. */
export function Tile({
  icon,
  label,
  onPress,
  tone,
  busy,
  wide,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: 'ok' | 'danger' | 'muted' | 'brand';
  busy?: boolean;
  wide?: boolean;
  disabled?: boolean;
}) {
  const p = usePalette();
  const fg = tone === 'ok' ? p.ok : tone === 'danger' ? p.danger : tone === 'muted' ? p.muted : p.brand;
  const bg = tone === 'ok' ? p.okSoft : tone === 'danger' ? p.dangerSoft : tone === 'brand' ? p.brandSoft : p.card;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flex: wide ? undefined : 1,
        flexDirection: wide ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: wide ? 10 : 4,
        backgroundColor: bg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: hovered ? fg : tone && tone !== 'muted' ? bg : p.border,
        paddingVertical: wide ? 14 : 16,
        paddingHorizontal: 8,
        opacity: busy || disabled ? 0.5 : pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}>
      <Text style={{ fontSize: 22 }}>{busy ? '⏳' : icon}</Text>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 14, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>;
}

export function Choice({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 13,
        borderRadius: radius.md,
        backgroundColor: pressed || hovered ? p.brandSoft : p.card,
        borderWidth: 1,
        borderColor: hovered ? p.brand : p.border,
        opacity: busy ? 0.5 : 1,
      })}>
      <Text style={{ color: p.text, fontWeight: '600', fontSize: 15 }}>{busy ? '⏳' : label}</Text>
    </Pressable>
  );
}

export function Back({ onPress, label = '⬅️ Back' }: { onPress: () => void; label?: string }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 }}>
      <Text style={{ color: p.muted, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** A green (or red) line inside a sheet saying what just happened. */
export function Note({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'danger' }) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: tone === 'ok' ? p.okSoft : p.dangerSoft, borderRadius: radius.md, padding: space.md }}>
      <T color={tone === 'ok' ? p.ok : p.danger} style={{ fontWeight: '700' }}>
        {text}
      </T>
    </View>
  );
}
