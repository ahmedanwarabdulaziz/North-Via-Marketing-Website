import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isRtl } from '@/lib/format';
import { radius, space, usePalette, type Palette } from '@/lib/theme';

type Tone = 'brand' | 'danger' | 'warn' | 'ok' | 'muted';

function toneColors(p: Palette, tone: Tone) {
  switch (tone) {
    case 'danger':
      return { fg: p.danger, bg: p.dangerSoft };
    case 'warn':
      return { fg: p.warn, bg: p.warnSoft };
    case 'ok':
      return { fg: p.ok, bg: p.okSoft };
    case 'muted':
      return { fg: p.muted, bg: p.border };
    default:
      return { fg: p.brand, bg: p.brandSoft };
  }
}

/** A scrolling page with pull-to-refresh. `title` shows a large heading (tab screens have no header). */
export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  right,
  padTop = true,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  right?: ReactNode;
  padTop?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: space.lg, paddingTop: padTop ? insets.top + space.lg : space.lg, paddingBottom: 120, gap: space.md }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={p.brand} colors={[p.brand]} /> : undefined}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: p.text }}>{title}</Text>
            {subtitle ? <Text style={{ color: p.muted, marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  onPress,
  onLongPress,
  tone,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onLongPress?: () => void;
  tone?: Tone;
}) {
  const p = usePalette();
  const border = tone ? toneColors(p, tone).fg : p.border;
  const base: ViewStyle = {
    backgroundColor: p.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: tone ? 1.5 : StyleSheet.hairlineWidth,
    borderColor: border,
    gap: space.sm,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={({ pressed }) => [base, style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function T({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
  selectable,
}: {
  children: ReactNode;
  variant?: 'title' | 'heading' | 'body' | 'small' | 'label';
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const p = usePalette();
  const sizes: Record<string, TextStyle> = {
    title: { fontSize: 20, fontWeight: '700' },
    heading: { fontSize: 16, fontWeight: '700' },
    body: { fontSize: 15, lineHeight: 21 },
    small: { fontSize: 13, lineHeight: 18 },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  };
  const text = typeof children === 'string' ? children : null;
  return (
    <Text
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        sizes[variant],
        { color: color ?? (variant === 'small' || variant === 'label' ? p.muted : p.text) },
        isRtl(text) && { writingDirection: 'rtl', textAlign: 'right' },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T variant="label" style={{ flex: 1 }}>
          {title}
        </T>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  tone = 'brand',
  busy,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'outline';
  tone?: Tone;
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const c = toneColors(p, tone);
  const bg = kind === 'primary' ? c.fg : kind === 'soft' ? c.bg : 'transparent';
  const fg = kind === 'primary' ? p.onBrand : c.fg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingVertical: small ? 8 : 13,
          paddingHorizontal: small ? 12 : 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: kind === 'outline' ? 1.5 : 0,
          borderColor: c.fg,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          minHeight: small ? 36 : 48,
        },
        style,
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function Row({ children, gap = space.sm, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Pill({ text, tone = 'brand' }: { text: string; tone?: Tone }) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Chip({ text, selected, onPress }: { text: string; selected?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.pill,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderWidth: 1.5,
        borderColor: selected ? p.brand : p.border,
        backgroundColor: selected ? p.brandSoft : p.card,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: selected ? p.brand : p.text, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const p = usePalette();
  const rtl = isRtl(typeof props.value === 'string' ? props.value : null);
  return (
    <TextInput
      placeholderTextColor={p.muted}
      {...props}
      style={[
        {
          backgroundColor: p.card,
          borderWidth: 1.5,
          borderColor: p.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: p.text,
          textAlignVertical: props.multiline ? 'top' : 'center',
          minHeight: props.multiline ? 96 : 48,
        },
        rtl && { writingDirection: 'rtl', textAlign: 'right' },
        props.style,
      ]}
    />
  );
}

export function Stat({ label, value, tone = 'brand', onPress }: { label: string; value: number | string; tone?: Tone; onPress?: () => void }) {
  const p = usePalette();
  const c = toneColors(p, tone);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 140,
        backgroundColor: p.card,
        borderRadius: radius.lg,
        padding: space.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.fg }}>{value}</Text>
      <Text style={{ color: p.muted, fontWeight: '600', marginTop: 2 }}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  const p = usePalette();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={p.brand} />
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const p = usePalette();
  return (
    <Card tone="danger">
      <T color={p.danger} variant="heading">
        Couldn’t load
      </T>
      <T>{message}</T>
      {onRetry ? <Button title="Try again" kind="soft" tone="danger" small onPress={onRetry} /> : null}
    </Card>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: space.xl, alignItems: 'center' }}>
      <T variant="small">{text}</T>
    </View>
  );
}

/** One-row segmented tabs with an optional small count badge on each. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string; count?: number | null; alert?: boolean }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: p.border, borderRadius: radius.md, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: radius.sm,
              backgroundColor: on ? p.card : 'transparent',
              opacity: pressed ? 0.7 : 1,
              ...(on ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 } : {}),
            })}>
            <Text numberOfLines={1} style={{ color: on ? p.brand : p.muted, fontWeight: on ? '800' : '600', fontSize: 13 }}>
              {o.label}
            </Text>
            {o.count ? (
              <Text style={{ color: o.alert ? p.danger : on ? p.brand : p.muted, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{o.count}</Text>
            ) : (
              <Text style={{ fontSize: 11, marginTop: 1, color: 'transparent' }}>0</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Filter chips in one row that scrolls sideways (inboxes, clients), instead of wrapping onto more lines. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
      {children}
    </ScrollView>
  );
}
