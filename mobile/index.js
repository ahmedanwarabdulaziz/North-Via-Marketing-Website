// App entry: the normal app (expo-router), plus the "ProcessText" panel that Android opens over other
// apps from the text-selection menu (modules/anwarz-text, "Anwarz ✓ Correct" / "Anwarz ✨ Rephrase").
import 'expo-router/entry';
import { AppRegistry } from 'react-native';

import ProcessTextRoot from './src/process-text/process-text';

AppRegistry.registerComponent('ProcessText', () => ProcessTextRoot);
