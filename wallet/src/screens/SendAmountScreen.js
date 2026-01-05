import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {deductMoney} from '../modules/sqliteWallet';
import {validateTransactionAmount} from '../modules/walletHelpers';

const SendAmountScreen = ({navigation, route}) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Validate navigation params on mount
  const walletId = route.params?.walletId;
  
  React.useEffect(() => {
    if (!walletId) {
      Alert.alert('Error', 'Invalid recipient wallet ID', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    }
  }, [walletId, navigation]);

  // Return early if no valid walletId
  if (!walletId) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  /**
   * Handle confirm send button press
   * Validates amount, deducts from wallet, and navigates on success
   */
  const handleConfirmSend = async () => {
    // Validate amount using centralized helper
    const validation = validateTransactionAmount(amount);
    
    if (!validation.valid) {
      Alert.alert('Invalid Amount', validation.error);
      return;
    }

    try {
      setIsLoading(true);

      // Deduct money from wallet using sqliteWallet module
      await deductMoney(validation.amount);

      setIsLoading(false);

      // Show success message and navigate back to home
      Alert.alert(
        'Payment Sent',
        `Successfully sent ₹${validation.amount.toFixed(2)} to ${walletId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home and reset navigation stack
              navigation.reset({
                index: 0,
                routes: [{name: 'Home'}],
              });
            },
          },
        ]
      );
    } catch (error) {
      setIsLoading(false);

      // Handle errors (e.g., insufficient funds)
      console.error('Send money error:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to send payment');
    }
  };

  /**
   * Handle cancel button press
   * Navigate back to previous screen
   */
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Send Money</Text>
        </View>

        {/* Recipient Info Card */}
        <View style={styles.recipientCard}>
          <Text style={styles.recipientLabel}>Sending to:</Text>
          <Text style={styles.recipientId}>{walletId}</Text>
        </View>

        {/* Amount Input Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Enter Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#CCC"
              keyboardType="numeric"
              editable={!isLoading}
              autoFocus={true}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Amount will be deducted from your offline wallet balance.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
            onPress={handleConfirmSend}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Send</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isLoading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  recipientCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  recipientLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  recipientId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  amountCard: {
    backgroundColor: '#FFF',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    padding: 0,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default SendAmountScreen;
