import type { User } from "firebase/auth";

import { CalculatorStore } from "../utils/store";

export interface CalculatorState {
  username: string;
  password: string;
  confirmPassword: string;
  user: User | null;
  loginError: string | null;

  // Master data (global across all periods)
  masterBankAccounts: BankAccount[] | null;
  masterExpenses: Expense[] | null;
  payInfo: PayInfo | null;

  // Period-specific data
  payPeriods: PayPeriod[] | null;
  currentPayPeriod: PayPeriod | null;
  payPeriodBankAccounts: PayPeriodBankAccount[] | null;
  payPeriodExpenses: PayPeriodExpense[] | null;

  // UI state
  selectedBankAccount: BankAccount | null;
  selectedExpense: Expense | null;
  selectedPayPeriodBankAccount: PayPeriodBankAccount | null;
  selectedPayPeriodExpense: PayPeriodExpense | null;
  newBankAccountFormOpen: boolean;
  newExpenseFormOpen: boolean;

  // Loading states
  loading: boolean;
  payPeriodLoading: boolean;
}

export interface BankAccount {
  id: string;
  userUID: string;
  name: string;
  startingBalance: number;
  currentBalance: number;
  expenseIds: string[];
  color: string;
}

export interface Expense {
  id: string;
  bankAccountId: string;
  userUID: string;
  name: string;
  amount: number;
  type: "withdrawal" | "deposit";
  dueDate: string;
  frequency: "monthly" | "bi-weekly" | "every 30 days" | "one-time";
  createdAt: string;
  nextDueDate?: string;
  isPaid?: boolean;
}

export interface PayInfo {
  id: string;
  takeHomePay: number;
  payFrequency: "bi-weekly" | "monthly" | "semi-monthly" | "weekly";
  startDate: string;
  userUID: string;
}

export interface PayPeriod {
  id: string;
  userUID: string;
  payInfoId: string;
  startDate: string;
  endDate: string;
  year: number;
  isActive: boolean;
  createdAt: string;
}

export interface PayPeriodBankAccount {
  id: string;
  payPeriodId: string;
  masterBankAccountId: string;
  compositeId: string;
  name: string;
  color: string;
  startingBalance: number;
  currentBalance: number;
  expenseIds: string[];
  createdAt: string;
}

export interface PayPeriodExpense {
  id: string;
  payPeriodId: string;
  masterExpenseId: string;
  compositeId: string;
  name: string;
  amount: number;
  type: "withdrawal" | "deposit";
  nextDueDate: string;
  frequency: "monthly" | "bi-weekly" | "every 30 days" | "one-time";
  isPaid: boolean;
  createdAt: string;
}

export interface MainComponentProps {
  store: CalculatorStore;
  master: boolean;
}
