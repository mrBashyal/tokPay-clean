import React from 'react';
import { SafeAreaView } from 'react-native';
import WalletTestScreen from './src/screens/WalletTestScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WalletTestScreen />
    </SafeAreaView>
  );
}
