import SQLite from 'react-native-sqlite-storage';

// Enable promise-based API for cleaner async/await usage
SQLite.enablePromise(true);

let db;

/**
 * Initialize database connection and create tables if they don't exist
 * Creates offline_wallet and transactions tables with proper schema
 */
export const initDatabase = async () => {
  try {
    // Open or create the tokpay.db database
    db = await SQLite.openDatabase({
      name: 'tokpay.db',
      location: 'default',
    });

    // Create offline_wallet table to store the current balance
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS offline_wallet (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        balance REAL NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table to log all credit/debit operations
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('credit','debit')),
        amount REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize offline_wallet with 0 balance if no record exists
    const [result] = await db.executeSql('SELECT COUNT(*) as count FROM offline_wallet');
    if (result.rows.item(0).count === 0) {
      await db.executeSql('INSERT INTO offline_wallet (balance) VALUES (0)');
    }

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

/**
 * Get current balance from offline wallet
 * @returns {Promise<number>} Current wallet balance
 */
export const getBalance = async () => {
  try {
    // Query the most recent balance from offline_wallet table
    const [result] = await db.executeSql(
      'SELECT balance FROM offline_wallet ORDER BY id DESC LIMIT 1'
    );

    // Return balance if record exists, otherwise return 0
    if (result.rows.length > 0) {
      return result.rows.item(0).balance;
    }
    return 0;
  } catch (error) {
    console.error('Error getting balance:', error);
    throw error;
  }
};

/**
 * Add money to offline wallet and log as credit transaction
 * @param {number} amount - Amount to add to wallet
 * @returns {Promise<number>} New balance after addition
 */
export const addMoney = async (amount) => {
  try {
    // Validate that amount is positive
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Get current balance
    const currentBalance = await getBalance();
    const newBalance = currentBalance + amount;

    // Update the balance in offline_wallet table
    await db.executeSql(
      'UPDATE offline_wallet SET balance = ?, last_updated = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM offline_wallet ORDER BY id DESC LIMIT 1)',
      [newBalance]
    );

    // Log the credit transaction in transactions table
    await db.executeSql(
      'INSERT INTO transactions (type, amount) VALUES (?, ?)',
      ['credit', amount]
    );

    console.log(`Added ${amount} to wallet. New balance: ${newBalance}`);
    return newBalance;
  } catch (error) {
    console.error('Error adding money:', error);
    throw error;
  }
};

/**
 * Deduct money from offline wallet and log as debit transaction
 * @param {number} amount - Amount to deduct from wallet
 * @returns {Promise<number>} New balance after deduction
 * @throws {Error} If insufficient funds
 */
export const deductMoney = async (amount) => {
  try {
    // Validate that amount is positive
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Get current balance to check if sufficient funds available
    const currentBalance = await getBalance();
    
    // Throw error if insufficient funds to prevent negative balance
    if (currentBalance < amount) {
      throw new Error(`Insufficient funds. Current balance: ${currentBalance}, Required: ${amount}`);
    }

    const newBalance = currentBalance - amount;

    // Update the balance in offline_wallet table
    await db.executeSql(
      'UPDATE offline_wallet SET balance = ?, last_updated = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM offline_wallet ORDER BY id DESC LIMIT 1)',
      [newBalance]
    );

    // Log the debit transaction in transactions table
    await db.executeSql(
      'INSERT INTO transactions (type, amount) VALUES (?, ?)',
      ['debit', amount]
    );

    console.log(`Deducted ${amount} from wallet. New balance: ${newBalance}`);
    return newBalance;
  } catch (error) {
    console.error('Error deducting money:', error);
    throw error;
  }
};

/**
 * Get all transactions ordered by most recent first
 * @returns {Promise<Array>} Array of transaction objects
 */
export const getTransactions = async () => {
  try {
    // Query all transactions ordered by timestamp in descending order (newest first)
    const [result] = await db.executeSql(
      'SELECT * FROM transactions ORDER BY timestamp DESC'
    );

    // Convert SQLite result to array of transaction objects
    const transactions = [];
    for (let i = 0; i < result.rows.length; i++) {
      transactions.push(result.rows.item(i));
    }

    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
};

/**
 * Close database connection
 * Should be called when app is closing or no longer needs database
 */
export const closeDatabase = async () => {
  try {
    if (db) {
      await db.close();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
};
