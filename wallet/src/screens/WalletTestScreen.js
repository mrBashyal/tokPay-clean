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
import {
  initDatabase,
  getBalance,
  addMoney,
  deductMoney,
  getTransactions,
} from '../modules/sqliteWallet';

const WalletTestScreen = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database on component mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        const currentBalance = await getBalance();
        setBalance(currentBalance);
        setIsLoading(false);
      } catch (error) {
        Alert.alert('Database Error', error.message);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Handle adding money to wallet
  const handleAddMoney = async () => {
    try {
      const newBalance = await addMoney(500);
      setBalance(newBalance);
      Alert.alert('Success', `Added ₹500. New balance: ₹${newBalance}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle deducting money from wallet
  const handleDeductMoney = async () => {
    try {
      const newBalance = await deductMoney(200);
      setBalance(newBalance);
      Alert.alert('Success', `Deducted ₹200. New balance: ₹${newBalance}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle showing current balance
  const handleShowBalance = async () => {
    try {
      const currentBalance = await getBalance();
      setBalance(currentBalance);
      Alert.alert('Current Balance', `₹${currentBalance}`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle showing all transactions
  const handleShowTransactions = async () => {
    try {
      const allTransactions = await getTransactions();
      setTransactions(allTransactions);
      if (allTransactions.length === 0) {
        Alert.alert('Transactions', 'No transactions found');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
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
