import { Slot } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../src/styles';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.surface }}>
      <Slot />
    </View>
  );
}
