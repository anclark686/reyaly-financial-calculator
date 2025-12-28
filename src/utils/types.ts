import type { User } from 'firebase/auth';

export interface CalculatorState {
  username: string;
  password: string;
  confirmPassword: string;
  user: User | null;
  loginError: string | null;
  bankAccounts: BankAccount[] | null;
  selectedBankAccount: BankAccount | null;
  newBankAccountFormOpen: boolean;
  expenses: Expense[] | null;
  selectedExpense: Expense | null;
  newExpenseFormOpen: boolean;
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
  dueDate: string;
  frequency: "monthly" | "bi-weekly" | "every 30 days" | "one-time";
  createdAt: string;
  nextDueDate?: string;
}

