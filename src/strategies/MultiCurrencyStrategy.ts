import { Transaction } from '../models.js';
import { ExchangeRateService } from '../services/ExchangeRateService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class MultiCurrencyStrategy implements AuditStrategy {
  public readonly name = 'Multi-Currency Auditor';
  public readonly description =
    'Converts and aggregates transactions in a foreign currency';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // TODO: Feature 5 - Implement this strategy.
    // 1. Call ExchangeRateService.getExchangeRates() asynchronously.
    const exchangeRates = await ExchangeRateService.getExchangeRates();
    // 2. Identify the target currency from `customParam` (default to 'EUR' if invalid/not provided).
    const normalized = customParam?.trim().toUpperCase() ?? '';
    const targetCurrency = /^[A-Z]{3}$/.test(normalized) ? normalized : 'EUR';
    // 3. Look up the exchange rate for the target currency (throw an error if not found in rates).
    const exchangeRate = exchangeRates.rates[targetCurrency];
    if (exchangeRate === undefined) {
      throw new Error(`Exchange rate for ${targetCurrency} not found.`);
    }
    // 4. Convert all transaction amounts to the target currency.
    const convertedTransactions = transactions.map((transaction) => ({
  ...transaction,
  convertedAmount: transaction.amount * exchangeRate,
}));
    // 5. Calculate total income, total expenses, and net balance in BOTH USD and target currency.
  let totalIncome = 0;
  let totalExpenses = 0;

for (const transaction of transactions) {
  if (transaction.amount > 0) {
    totalIncome += transaction.amount;
  } else if (transaction.amount < 0) {
    totalExpenses += Math.abs(transaction.amount);
  }
}

const netBalance = totalIncome - totalExpenses;

// An empty list gets an average of zero to avoid division by zero.
const average = transactions.length > 0
  ? netBalance / transactions.length
  : 0;

// Calculate the same four metrics in the target currency.
const convertedIncome = totalIncome * exchangeRate;
const convertedExpenses = totalExpenses * exchangeRate;
const convertedBalance = netBalance * exchangeRate;
const convertedAverage = average * exchangeRate ;
    // 6. Format and return a text-based audit report detailing conversion metrics, conversion rate used, and transaction summaries in both currencies.
const transactionLines = convertedTransactions.map((transaction) =>
  `${transaction.id} | ${transaction.date} | ${transaction.description} | ` +
  `${transaction.amount.toFixed(2)} USD -> ` +
  `${transaction.convertedAmount.toFixed(2)} ${targetCurrency}`
);

// join('\n') combines all lines into one report string.
return [
  'MULTI-CURRENCY AUDIT REPORT',
  `Exchange rate: 1 USD = ${exchangeRate} ${targetCurrency}`,
  '',
  `Total Income: ${totalIncome.toFixed(2)} USD | ${convertedIncome.toFixed(2)} ${targetCurrency}`,
  `Total Expenses: ${totalExpenses.toFixed(2)} USD | ${convertedExpenses.toFixed(2)} ${targetCurrency}`,
  `Net Balance: ${netBalance.toFixed(2)} USD | ${convertedBalance.toFixed(2)} ${targetCurrency}`,
  `Average Transaction Amount: ${average.toFixed(2)} USD | ${convertedAverage.toFixed(2)} ${targetCurrency}`,
  '',
  'Transactions:',
  ...(transactionLines.length > 0
    ? transactionLines
    : ['No transactions available.']),
].join('\n'); 
  }
}
