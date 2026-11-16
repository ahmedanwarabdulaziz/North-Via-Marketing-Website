import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform, type View } from 'react-native';

// Android apps are edge-to-edge now, so the window no longer shrinks when the keyboard opens and a
// text box at the bottom ends up behind it. This returns how much space to add under the screen's
// content so its bottom sits right on top of the keyboard: the keyboard's height minus whatever
// already sits below the content (the tab bar, the navigation bar). Pass the ref of the screen's
// outer View, and give that View `paddingBottom: space`.

export function useKeyboardSpace(ref: RefObject<ComponentRef<typeof View> | null>) {
  const [space, setSpace] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animate = () => LayoutAnimation.configureNext(LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));

    const show = Keyboard.addListener(showEvent, (e) => {
      const keyboardTop = e.endCoordinates.screenY || Dimensions.get('screen').height - e.endCoordinates.height;
      const node = ref.current;
      if (!node) return;
      node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        // The screen's frame (padding doesn't change it) vs. where the keyboard starts.
        setSpace((current) => {
          const next = Math.max(0, Math.round(y + h - keyboardTop));
          if (next !== current) animate();
          return next;
        });
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      animate();
      setSpace(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ref]);

  return space;
}
