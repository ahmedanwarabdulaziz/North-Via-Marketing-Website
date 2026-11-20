import { Alert, Platform, type AlertButton } from 'react-native';

// On the PC version (web), React Native's Alert.alert does nothing, so "Send this reply?" and other
// questions would never be answered. This makes them the browser's own dialogs:
//   one button (or none)  → an info box, then that button's action
//   several buttons       → OK / Cancel; OK runs the main (non-cancel) button
//   three or more choices → asks for each choice in turn until one is accepted
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons?.length ? buttons : [{ text: 'OK' }];
    const cancel = list.find((b) => b.style === 'cancel');
    const choices = list.filter((b) => b !== cancel);
    setTimeout(() => {
      if (choices.length <= 1 && !cancel) {
        window.alert(text);
        choices[0]?.onPress?.();
        return;
      }
      if (choices.length === 1) {
        if (window.confirm(`${text}\n\nOK = ${choices[0].text ?? 'OK'}`)) choices[0].onPress?.();
        else cancel?.onPress?.();
        return;
      }
      for (const c of choices) {
        if (window.confirm(`${text}\n\n${c.text ?? 'OK'}?`)) {
          c.onPress?.();
          return;
        }
      }
      cancel?.onPress?.();
    }, 0);
  };
}
