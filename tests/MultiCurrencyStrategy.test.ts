import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiCurrencyStrategy } from '../src/strategies/MultiCurrencyStrategy.js';
import { ExchangeRateService } from '../src/services/ExchangeRateService.js';
import { Transaction } from '../src/models.js';

describe('MultiCurrencyStrategy (Feature 5)', () => {
  let strategy: MultiCurrencyStrategy;

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-05-01',
      amount: 100,
      category: 'Salary',
      description: 'Freelance work',
      status: 'completed',
    },
    {
      id: 'tx-2',
      date: '2026-05-02',
      amount: -50,
      category: 'Food',
      description: 'Groceries',
      status: 'completed',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    strategy = new MultiCurrencyStrategy();
    vi.spyOn(ExchangeRateService, 'getExchangeRates').mockResolvedValue({
      base: 'USD',
      rates: {
        EUR: 0.9,
        GBP: 0.8,
      },
    });
  });

 it('fetches exchange rates and uses the requested currency', async () => {
    const report = await strategy.execute(transactions, 'GBP');

    expect(ExchangeRateService.getExchangeRates).toHaveBeenCalledTimes(1);
    expect(report).toContain('Exchange rate: 1 USD = 0.8 GBP');
    expect(report).toContain('100.00 USD -> 80.00 GBP');
    expect(report).toContain('-50.00 USD -> -40.00 GBP');
  });

  // 2. Run the same default-currency test for several invalid inputs.
  // Each value becomes "customParam" in a separate test.
  it.each([undefined, '', '   ', '123', 'EURO'])(
    'defaults to EUR when customParam is %s',
    async (customParam) => {
      const report = await strategy.execute(transactions, customParam);

      expect(report).toContain('Exchange rate: 1 USD = 0.9 EUR');
      expect(report).toContain('100.00 USD -> 90.00 EUR');
    },
  );

  // 3. Verify that spaces and lowercase letters are handled.
  it('normalizes lowercase currency codes and surrounding spaces', async () => {
    const report = await strategy.execute(transactions, ' gbp ');

    expect(report).toContain('Exchange rate: 1 USD = 0.8 GBP');
  });

  // 4. CHF has a valid format, but our mocked service has no CHF rate.
  // Because execute() is async, use "rejects" to check the error.
  it('throws when the requested currency has no exchange rate', async () => {
    await expect(strategy.execute(transactions, 'CHF')).rejects.toThrow(
      'Exchange rate for CHF not found.',
    );
  });

  // 5. Verify that every transaction appears with its converted amount.
  it('converts individual transactions and preserves negative signs', async () => {
    const report = await strategy.execute(transactions, 'EUR');

    expect(report).toContain(
      'tx-1 | 2026-05-01 | Freelance work | 100.00 USD -> 90.00 EUR',
    );
    expect(report).toContain(
      'tx-2 | 2026-05-02 | Groceries | -50.00 USD -> -45.00 EUR',
    );
  });

  // 6. Verify all four summary calculations in both currencies.
  it('reports income, expenses, balance, and average in both currencies', async () => {
    const report = await strategy.execute(transactions, 'EUR');

    // Income: 100 USD; converted: 100 * 0.9 = 90 EUR.
    expect(report).toContain('Total Income: 100.00 USD | 90.00 EUR');

    // Expenses: abs(-50) = 50 USD; converted: 50 * 0.9 = 45 EUR.
    expect(report).toContain('Total Expenses: 50.00 USD | 45.00 EUR');

    // Balance: 100 - 50 = 50 USD; converted: 50 * 0.9 = 45 EUR.
    expect(report).toContain('Net Balance: 50.00 USD | 45.00 EUR');

    // Signed average: (100 - 50) / 2 = 25 USD.
    // Converted average: 25 * 0.9 = 22.50 EUR.
    expect(report).toContain(
      'Average Transaction Amount: 25.00 USD | 22.50 EUR',
    );
  });

  // 7. Verify that an empty array does not cause division by zero.
  it('handles an empty transaction list', async () => {
    const report = await strategy.execute([], 'EUR');

    expect(report).toContain('Total Income: 0.00 USD | 0.00 EUR');
    expect(report).toContain('Total Expenses: 0.00 USD | 0.00 EUR');
    expect(report).toContain('Net Balance: 0.00 USD | 0.00 EUR');
    expect(report).toContain(
      'Average Transaction Amount: 0.00 USD | 0.00 EUR',
    );
    expect(report).toContain('No transactions available.');
    expect(report).not.toContain('NaN');
    expect(report).not.toContain('Infinity');
  });
});
