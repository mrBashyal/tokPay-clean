import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
// Only import wallet operations from sqliteWallet - no direct DB access
import {
  addMoney,
  deductMoney,
  getTransactions,
} from '../modules/sqliteWallet';
// Use centralized helpers for initialization and balance refresh
import {initializeAndGetBalance, refreshBalance} from '../modules/walletHelpers';

const WalletTestScreen = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize database and load current balance on mount
   * Uses centralized helper instead of direct DB calls
   */
  useEffect(() => {
    const init = async () => {
      try {
        // Use centralized helper for initialization and balance fetch
        const currentBalance = await initializeAndGetBalance();
        setBalance(currentBalance);
        setIsLoading(false);
      } catch (error) {
        // Surface errors using Alert as per refactor requirements
        Alert.alert('Initialization Error', error.message);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  /**
   * Add ₹500 to wallet
   * Wraps async wallet mutation in try/catch with Alert error handling
   */
  const handleAddMoney = async () => {
    try {
      // Call exported function from sqliteWallet - no direct DB access
      const newBalance = await addMoney(500);
      setBalance(newBalance);
      Alert.alert('Success', `Added ₹500. New balance: ₹${newBalance.toFixed(2)}`);
    } catch (error) {
      // Surface all errors using Alert
      Alert.alert('Error', error.message || 'Failed to add money');
    }
  };

  /**
   * Deduct ₹200 from wallet
   * Wraps async wallet mutation in try/catch with Alert error handling
   */
  const handleDeductMoney = async () => {
    try {
      // Call exported function from sqliteWallet - validates sufficient funds internally
      const newBalance = await deductMoney(200);
      setBalance(newBalance);
      Alert.alert('Success', `Deducted ₹200. New balance: ₹${newBalance.toFixed(2)}`);
    } catch (error) {
      // Surface errors (e.g., insufficient funds) using Alert
      Alert.alert('Error', error.message || 'Failed to deduct money');
    }
  };

  /**
   * Refresh and display current balance
   * Uses centralized refreshBalance utility to avoid duplicate logic
   */
  const handleShowBalance = async () => {
    try {
      // Use centralized refreshBalance utility instead of direct getBalance
      const currentBalance = await refreshBalance();
      setBalance(currentBalance);
      Alert.alert('Current Balance', `₹${currentBalance.toFixed(2)}`);
    } catch (error) {
      // Surface errors using Alert
      Alert.alert('Error', error.message || 'Failed to fetch balance');
    }
  };

  /**
   * Fetch and display all transactions
   * Wraps async operation in try/catch with Alert error handling
   */
  const handleShowTransactions = async () => {
    try {
      // Call exported function from sqliteWallet - no direct DB queries
      const allTransactions = await getTransactions();
      setTransactions(allTransactions);
      if (allTransactions.length === 0) {
        Alert.alert('Transactions', 'No transactions found');
      }
    } catch (error) {
      // Surface errors using Alert
      Alert.alert('Error', error.message || 'Failed to fetch transactions');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Database...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet Test Screen</Text>
        <Text style={styles.balanceText}>Current Balance: ₹{balance.toFixed(2)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleAddMoney}>
          <Text style={styles.buttonText}>Add Money ₹500</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleDeductMoney}>
          <Text style={styles.buttonText}>Deduct Money ₹200</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleShowBalance}>
          <Text style={styles.buttonText}>Show Balance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleShowTransactions}>
          <Text style={styles.buttonText}>Show Transactions</Text>
        </TouchableOpacity>
      </View>

      {/* Display transactions list */}
      {transactions.length > 0 && (
        <View style={styles.transactionsContainer}>
          <Text style={styles.transactionsTitle}>Transaction History</Text>
          {transactions.map((transaction, index) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionType}>
                  {transaction.type === 'credit' ? '▲ Credit' : '▼ Debit'}
                </Text>
                <Text
                  style={[
                    styles.transactionAmount,
                    transaction.type === 'credit'
                      ? styles.creditAmount
                      : styles.debitAmount,
                  ]}>
                  ₹{transaction.amount.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.transactionTimestamp}>
                {new Date(transaction.timestamp).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
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
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  balanceText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  transactionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  transactionItem: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: '#4CAF50',
  },
  debitAmount: {
    color: '#F44336',
  },
  transactionTimestamp: {
    fontSize: 12,
    color: '#666',
  },
});

export default WalletTestScreen;
