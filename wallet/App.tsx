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
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
