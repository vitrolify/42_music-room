import { Slot } from 'expo-router';
import { View } from 'react-native';
import { colors } from '../../src/styles';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.base, width: '100%', maxWidth: 400, alignSelf: 'center' }}>
      <Slot />
    </View>
  );
}
