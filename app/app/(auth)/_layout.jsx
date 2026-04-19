// filepath: app/app/(auth)/_layout.jsx
import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.white } }} />
  );
}
