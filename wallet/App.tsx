// import React from 'react';
// import { SafeAreaView } from 'react-native';
// import WalletTestScreen from './src/screens/WalletTestScreen';

// export default function App() {
//   return (
//     <SafeAreaView style={{ flex: 1 }}>
//       <WalletTestScreen />
//     </SafeAreaView>
//   );
// }


import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import ReceiveScreen from './src/screens/ReceiveScreen';
import WalletTestScreen from './src/screens/WalletTestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Receive"
          component={ReceiveScreen}
          options={{title: 'Receive Payment'}}
        />
        <Stack.Screen
          name="WalletTest"
          component={WalletTestScreen}
          options={{title: 'Wallet Test'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
