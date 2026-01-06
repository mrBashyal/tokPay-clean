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
// Use centralized validation and payment processing helpers - no business logic in UI
import {validateTransactionAmount, processOfflinePayment} from '../modules/walletHelpers';

const SendAmountScreen = ({navigation, route}) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Extract walletId from navigation params - validates at entry point
  const walletId = route.params?.walletId;
  
  /**
   * Validate navigation params on mount
   * Ensures walletId is present before allowing any operations
   * Prevents runtime errors from missing required params
   */
  React.useEffect(() => {
    if (!walletId) {
      // Surface error using Alert and navigate back
      Alert.alert('Error', 'Invalid recipient wallet ID', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    }
  }, [walletId, navigation]);

  // Return early with loading indicator if no valid walletId
  if (!walletId) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  /**
   * Handle confirm send button press
   * Orchestrates offline payment: token generation → BLE transfer → wallet update
   * All business logic delegated to processOfflinePayment helper
   * All async operations wrapped in try/catch with Alert error handling
   */
  const handleConfirmSend = async () => {
    // Validate amount using centralized helper - ensures amount is number and positive
    const validation = validateTransactionAmount(amount);
    
    if (!validation.valid) {
      // Surface validation error using Alert
      Alert.alert('Invalid Amount', validation.error);
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Generating payment token...');

      // Process offline payment: generate token → scan BLE → send token → update wallet
      // All business logic is in processOfflinePayment helper function
      const result = await processOfflinePayment(validation.amount, walletId);

      setIsLoading(false);
      setStatusMessage('');

      if (result.success) {
        // Show success message with payment details
        Alert.alert(
          'Payment Sent',
          `${result.message} to ${walletId}\n\nToken transmitted via BLE`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset navigation stack to prevent back navigation to payment flow
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Home'}],
                });
              },
            },
          ]
        );
      } else {
        // Show failure message with error details
        Alert.alert('Payment Failed', result.message);
      }
    } catch (error) {
      setIsLoading(false);
      setStatusMessage('');

      // Surface all unexpected errors using Alert
      console.error('Send payment error:', error);
      Alert.alert('Payment Failed', error.message || 'An unexpected error occurred');
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
            Payment will be sent via offline BLE token transfer.
          </Text>
        </View>

        {/* Loading Status Message */}
        {isLoading && statusMessage && (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#007AFF" size="small" />
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

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
  statusBox: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    marginLeft: 10,
    fontWeight: '500',
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
