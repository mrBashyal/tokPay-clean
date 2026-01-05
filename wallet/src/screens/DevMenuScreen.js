import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';

const DevMenuScreen = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔧 Development Menu</Text>
        <Text style={styles.subtitle}>Test different modules</Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* Navigate to Wallet Test Screen */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('WalletTest')}>
          <Text style={styles.buttonIcon}>💰</Text>
          <Text style={styles.buttonTitle}>Test Wallet (Hour 1)</Text>
          <Text style={styles.buttonDescription}>
            SQLite wallet, add/deduct money, transactions
          </Text>
        </TouchableOpacity>

        {/* Navigate to Receive Screen */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Receive')}>
          <Text style={styles.buttonIcon}>📱</Text>
          <Text style={styles.buttonTitle}>Test Receive QR (Hour 2)</Text>
          <Text style={styles.buttonDescription}>
            Dynamic QR generation with device identity
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚠️ This screen is for development testing only
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#673AB7',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderLeftWidth: 5,
    borderLeftColor: '#673AB7',
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default DevMenuScreen;
