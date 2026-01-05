import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../src/screens/HomeScreen';
import SendScanScreen from '../src/screens/SendScanScreen';
import SendAmountScreen from '../src/screens/SendAmountScreen';
import ReceiveScreen from '../src/screens/ReceiveScreen';
import WalletTestScreen from '../src/screens/WalletTestScreen';

const Stack = createNativeStackNavigator();

/**
 * Main app navigation stack
 * Handles all screen navigation flows for wallet operations
 */
const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Home">
      {/* Home screen - main wallet dashboard with action buttons */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />

      {/* Send flow step 1: Scan recipient QR code */}
      <Stack.Screen
        name="SendScan"
        component={SendScanScreen}
        options={{title: 'Scan QR Code'}}
      />

      {/* Send flow step 2: Enter amount and confirm payment */}
      <Stack.Screen
        name="SendAmount"
        component={SendAmountScreen}
        options={{title: 'Send Payment'}}
      />

      {/* Receive flow: Display QR code for receiving payments */}
      <Stack.Screen
        name="Receive"
        component={ReceiveScreen}
        options={{title: 'Receive Payment'}}
      />

      {/* Development screen: Test wallet operations and view transaction history */}
      <Stack.Screen
        name="WalletTest"
        component={WalletTestScreen}
        options={{title: 'Wallet Test'}}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
