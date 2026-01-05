import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {initDatabase, getBalance} from '../modules/sqliteWallet';

const HomeScreen = ({navigation}) => {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and fetch balance on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  // Refresh balance when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBalance();
    });
    return unsubscribe;
  }, [navigation]);

  /**
   * Initialize database and load current balance
   * Called on first mount
   */
  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      // Initialize SQLite database with tables
      await initDatabase();
      // Fetch current balance from offline_wallet table
      const currentBalance = await getBalance();
      setBalance(currentBalance);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', `Failed to initialize wallet: ${error.message}`);
    }
  };

  /**
   * Refresh balance from database
   * Called when screen regains focus
   */
  const refreshBalance = async () => {
    try {
      const currentBalance = await getBalance();
      setBalance(currentBalance);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  /**
   * Handle Send Money button press
   * Placeholder for future send flow
   */
  const handleSendMoney = () => {
    Alert.alert('Coming Soon', 'Send money feature will be available soon');
  };

  /**
   * Handle Receive Money button press
   * Navigate to ReceiveScreen to display QR
   */
  const handleReceiveMoney = () => {
    navigation.navigate('Receive');
  };

  /**
   * Handle Wallet Details button press
   * Navigate to WalletTestScreen for transactions and balance management
   */
  const handleWalletDetails = () => {
    navigation.navigate('WalletTest');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with app branding */}
      <View style={styles.header}>
        <Text style={styles.title}>TokPay Wallet</Text>
        <Text style={styles.subtitle}>Offline P2P Payment System</Text>
      </View>

      {/* Balance Display Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
        <TouchableOpacity onPress={refreshBalance}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.primaryButtonsRow}>
          {/* Send Money Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSendMoney}>
            <Text style={styles.buttonIcon}>📤</Text>
            <Text style={styles.buttonTitle}>Send Money</Text>
          </TouchableOpacity>

          {/* Receive Money Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleReceiveMoney}>
            <Text style={styles.buttonIcon}>📥</Text>
            <Text style={styles.buttonTitle}>Receive Money</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Button - Wallet Details */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleWalletDetails}>
          <Text style={styles.secondaryButtonIcon}>💰</Text>
          <View style={styles.secondaryButtonTextContainer}>
            <Text style={styles.secondaryButtonTitle}>Wallet Details</Text>
            <Text style={styles.secondaryButtonDescription}>
              View transactions and manage balance
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ℹ️ How it works</Text>
        <Text style={styles.infoText}>
          • Send & receive payments offline using BLE{'\n'}
          • Secure offline tokens signed by bank{'\n'}
          • Automatic sync when back online{'\n'}
          • No internet required during transaction
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 30,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  balanceCard: {
    margin: 20,
    marginTop: -30,
    padding: 25,
    backgroundColor: '#FFF',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  refreshText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 0,
  },
  primaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  secondaryButtonIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  secondaryButtonTextContainer: {
    flex: 1,
  },
  secondaryButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  secondaryButtonDescription: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    fontSize: 28,
    color: '#CCC',
    fontWeight: '300',
  },
  infoSection: {
    margin: 20,
    marginTop: 10,
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
});

export default HomeScreen;
