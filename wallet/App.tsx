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
import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import {requestAllPermissions} from './src/modules/permissions';

export default function App() {
  const [permissionsReady, setPermissionsReady] = useState(false);

  useEffect(() => {
    // Bootstrap permissions on app launch (one-time only)
    const bootstrapPermissions = async () => {
      await requestAllPermissions();
      setPermissionsReady(true);
    };

    bootstrapPermissions();
  }, []);

  // Show loading screen while permissions are being requested
  if (!permissionsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
