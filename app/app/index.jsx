// filepath: app/app/index.jsx
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

// The root layout restores authentication and redirects to the correct role flow.
// Showing a loader during the bootstrap avoids a blank screen.
export default function IndexRoute() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
