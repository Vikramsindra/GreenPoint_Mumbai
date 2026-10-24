// filepath: app/app/(society-representative)/_layout.jsx
import React from 'react';
import { Stack } from 'expo-router';

export default function SocietyRepresentativeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
