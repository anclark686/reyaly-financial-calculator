import { baseModel } from "react-junco";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import type { User, AuthError } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import type { CalculatorState, BankAccount, Expense } from "./types";
import { findNextDueDate } from "./helpers";

const ERROR_MAP: Record<string, string> = {
  "auth/email-already-in-use": "Email already in use",
  "auth/invalid-credential": "Invalid credentials",
  "auth/weak-password": "Password should be at least 6 characters",
  "auth/user-not-found": "User not found",
  "auth/missing-password": "Password cannot be empty",
};

const TABLE_NAME = "userData";

export class CalculatorStore extends baseModel<CalculatorState>() {
  // Initialize default state
  state = {
    username: "",
    password: "",
    confirmPassword: "",
    user: null,
    loginError: null,
    bankAccounts: null,
    selectedBankAccount: null,
    newBankAccountFormOpen: false,
    expenses: null,
    selectedExpense: null,
    newExpenseFormOpen: false,
  };

  // Initialize auth state listener
  authUnsubscribe: (() => void) | null = null;

  // Set up auth listener when store is created
  init() {
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        // Update store state with authenticated user
        this.setState(() => ({ user }));
        // Load user data when they're automatically signed in
        this.getAllExpensesForUser();
        this.getAllBankAccountsForUser();
      } else {
        console.log("User is signed out");
        // Clear user state
        this.setState(() => ({
          user: null,
          expenses: [],
          bankAccounts: [],
          selectedExpense: null,
          selectedBankAccount: null,
        }));
      }
    });
  }

  // Cleanup auth listener
  cleanup() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  // SETTERS
  setUsername(username: string) {
    this.setState(() => ({ username }));
    console.log("Username updated:", username);
  }

  setPassword(password: string) {
    this.setState(() => ({ password }));
    console.log("Password updated:", password);
  }

  setConfirmPassword(confirmPassword: string) {
    this.setState(() => ({ confirmPassword }));
    console.log("Confirm Password updated:", confirmPassword);
  }

  setNewBankAccountFormOpen(open: boolean) {
    this.setState(() => ({ newBankAccountFormOpen: open }));
    console.log("New bank account form open:", open);
  }

  setSelectedBankAccount(account: BankAccount | null) {
    this.setState(() => ({ selectedBankAccount: account }));
    console.log("Selected bank account updated:", account);
  }

  setSelectedExpense(expense: Expense | null) {
    this.setState(() => ({ selectedExpense: expense }));
    console.log("Selected expense updated:", expense);
  }

  setNewExpenseFormOpen(open: boolean) {
    this.setState(() => ({ newExpenseFormOpen: open }));
    console.log("New expense form open:", open);
  }

  setUser(user: User | null) {
    this.setState(() => ({ user }));
    console.log("User updated:", user);
  }

  async logoutUser() {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      // The auth state listener will handle clearing the store state
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  /*
   * API FUNCTIONS
   * All functions related to user authentication and data management
   */

  // LOGIN FUNCTIONS
  async createNewAccount() {
    const { username, password, confirmPassword } = this.getState();
    if (password !== confirmPassword) {
      console.error("Passwords do not match");
      return false;
    }

    if (!username || !password) {
      console.error("Username and password are required");
      return false;
    }

    try {
      console.log("Creating account with:", { username, password });

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        username,
        password
      );
      this.setState(() => ({ user: userCredential.user }));
      return true;
    } catch (error: unknown) {
      const authError = error as AuthError;
      const errorCode = authError.code;
      const errorMessage = ERROR_MAP[errorCode] || "An unknown error occurred";
      console.log(`errorCode: ${errorCode} - errorMessage: ${errorMessage}`);
      this.setState(() => ({ loginError: errorMessage }));
      return false;
    }
  }

  async loginWithEmailAndPassword() {
    const { username, password } = this.getState();

    if (!username || !password) {
      console.error("Username and password are required");
      return false;
    }

    try {
      console.log("Logging in with:", { username, password });

      const userCredential = await signInWithEmailAndPassword(
        auth,
        username,
        password
      );
      this.setState(() => ({ user: userCredential.user }));
      return true;
    } catch (error: unknown) {
      const authError = error as AuthError;
      const errorCode = authError.code;
      const errorMessage = ERROR_MAP[errorCode] || "An unknown error occurred";
      console.log(`errorCode: ${errorCode} - errorMessage: ${errorMessage}`);
      this.setState(() => ({ loginError: errorMessage }));
      return false;
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log("Google sign-in successful:", user.uid);
      // The auth state listener will handle updating the store state
      return true;
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const authError = error as AuthError;
      const errorCode = authError.code;

      // Handle specific Google sign-in errors
      if (errorCode === "auth/popup-closed-by-user") {
        console.log("Sign-in popup was closed by user");
      } else if (errorCode === "auth/popup-blocked") {
        console.log("Sign-in popup was blocked by browser");
      } else {
        this.setState(() => ({
          loginError: "Google sign-in failed. Please try again.",
        }));
      }

      return false;
    }
  }

  // EXPENSE FUNCTIONS
  async getAllExpensesForUser() {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "expenses")
      );
      const expenses = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nextDueDate: findNextDueDate(data.dueDate, data.frequency),
          ...data,
        };
      }) as Expense[];

      this.setState(() => ({ expenses }));
      console.log("Loaded expenses:", expenses);
      return expenses;
    } catch (error) {
      console.error("Error getting expenses:", error);
      return [];
    }
  }

  async addExpenseToUser(expenseData: Partial<Expense>) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    console.log("Adding expense to user:", expenseData);

    try {
      // Use nested collection: expenses/{userId}/expenses
      const docRef = await addDoc(
        collection(db, TABLE_NAME, user.uid, "expenses"),
        {
          ...expenseData,
          createdAt: new Date().toISOString(),
        }
      );
      console.log("Expense added with ID:", docRef.id);
      const newExpense = {
        id: docRef.id,
        ...expenseData,
        userUID: user.uid,
        nextDueDate: findNextDueDate(
          expenseData.dueDate!,
          expenseData.frequency!
        ),
        createdAt: new Date().toISOString(),
      };
      this.setState(({ expenses }) => ({
        expenses: [...(expenses || []), newExpense as Expense],
      }));
      console.log("New expense object:", newExpense);
      return true;
    } catch (error) {
      console.error("Error adding expense:", error);
      return false;
    }
  }

  async updateExpense(expenseId: string, expenseData: Partial<Expense>) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      await updateDoc(doc(db, TABLE_NAME, user.uid, "expenses", expenseId), {
        ...expenseData,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      this.setState(({ expenses }) => ({
        expenses: (expenses || []).map((exp) =>
          exp.id === expenseId
            ? {
                ...exp,
                ...expenseData,
                nextDueDate:
                  expenseData.dueDate && expenseData.frequency
                    ? findNextDueDate(
                        expenseData.dueDate,
                        expenseData.frequency
                      ) || undefined
                    : exp.nextDueDate,
              }
            : exp
        ),
        selectedExpense: null,
        newExpenseFormOpen: false,
      }));

      return true;
    } catch (error) {
      console.error("Error updating expense:", error);
      return false;
    }
  }

  async deleteExpense(expenseId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      // First, remove expense from all bank accounts that reference it
      const bankAccounts = this.getState().bankAccounts || [];
      for (const bankAccount of bankAccounts) {
        const expenseIds = bankAccount.expenseIds || [];
        if (expenseIds.includes(expenseId)) {
          await this.removeExpenseFromBankAccount(bankAccount.id, expenseId);
        }
      }

      // Then delete the expense document
      await deleteDoc(doc(db, TABLE_NAME, user.uid, "expenses", expenseId));
      this.setState(({ expenses }) => ({
        expenses: (expenses || []).filter(
          (expense) => expense.id !== expenseId
        ),
      }));
      console.log("Expense deleted:", expenseId);
      return true;
    } catch (error) {
      console.error("Error deleting expense:", error);
      return false;
    }
  }

  // BANK ACCOUNT FUNCTIONS
  async getAllBankAccountsForUser() {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "bankAccounts")
      );
      const bankAccounts = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      }) as BankAccount[];

      this.setState(() => ({ bankAccounts }));
      console.log("Loaded bank accounts:", bankAccounts.length, "accounts");
      return bankAccounts;
    } catch (error) {
      console.error("Error getting bank accounts:", error);
      return [];
    }
  }

  async addBankAccountToUser(bankAccountData: Partial<BankAccount>) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    console.log("Adding bank account to user:", bankAccountData);

    try {
      // Use nested collection: expenses/{userId}/bankAccounts
      const docRef = await addDoc(
        collection(db, TABLE_NAME, user.uid, "bankAccounts"),
        {
          ...bankAccountData,
          createdAt: new Date().toISOString(),
        }
      );
      console.log("Bank account added with ID:", docRef.id);
      const newBankAccount = {
        id: docRef.id,
        ...bankAccountData,
        userUID: user.uid,
        expenseIds: [],
        createdAt: new Date().toISOString(),
      };
      this.setState(({ bankAccounts }) => ({
        bankAccounts: [...(bankAccounts || []), newBankAccount as BankAccount],
      }));
      console.log("New bank account object:", newBankAccount);
      return true;
    } catch (error) {
      console.error("Error adding bank account:", error);
      return false;
    }
  }

  async updateBankAccount(
    bankAccountId: string,
    bankAccountData: Partial<BankAccount>
  ) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      await updateDoc(
        doc(db, TABLE_NAME, user.uid, "bankAccounts", bankAccountId),
        {
          ...bankAccountData,
          updatedAt: new Date().toISOString(),
        }
      );

      // Update local state
      this.setState(({ bankAccounts }) => ({
        bankAccounts: (bankAccounts || []).map((acc) =>
          acc.id === bankAccountId
            ? {
                ...acc,
                ...bankAccountData,
              }
            : acc
        ),
        selectedBankAccount: null,
        newBankAccountFormOpen: false,
      }));

      return true;
    } catch (error) {
      console.error("Error updating bank account:", error);
      return false;
    }
  }

  async deleteBankAccount(bankAccountId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      await deleteDoc(
        doc(db, TABLE_NAME, user.uid, "bankAccounts", bankAccountId)
      );
      this.setState(({ bankAccounts }) => ({
        bankAccounts: (bankAccounts || []).filter(
          (account) => account.id !== bankAccountId
        ),
      }));
      console.log("Bank account deleted:", bankAccountId);
      return true;
    } catch (error) {
      console.error("Error deleting bank account:", error);
      return false;
    }
  }

  // EXPENSE-BANK ACCOUNT RELATIONSHIP FUNCTIONS
  async addExpenseToBankAccount(bankAccountId: string, expenseId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const bankAccountRef = doc(
        db,
        TABLE_NAME,
        user.uid,
        "bankAccounts",
        bankAccountId
      );
      const bankAccountDoc = await getDoc(bankAccountRef);

      if (!bankAccountDoc.exists()) {
        console.error("Bank account not found:", bankAccountId);
        return false;
      }

      const currentData = bankAccountDoc.data();
      const expenseIds = currentData.expenseIds || [];

      // Add expense ID if not already present
      if (!expenseIds.includes(expenseId)) {
        await updateDoc(bankAccountRef, {
          expenseIds: [...expenseIds, expenseId],
          updatedAt: new Date().toISOString(),
        });

        // Update local state
        this.setState(({ bankAccounts }) => ({
          bankAccounts: (bankAccounts || []).map((account) =>
            account.id === bankAccountId
              ? { ...account, expenseIds: [...expenseIds, expenseId] }
              : account
          ),
        }));

        console.log("Expense added to bank account:", expenseId, bankAccountId);
      }

      return true;
    } catch (error) {
      console.error("Error adding expense to bank account:", error);
      return false;
    }
  }

  async removeExpenseFromBankAccount(bankAccountId: string, expenseId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const bankAccountRef = doc(
        db,
        TABLE_NAME,
        user.uid,
        "bankAccounts",
        bankAccountId
      );
      const bankAccountDoc = await getDoc(bankAccountRef);

      if (!bankAccountDoc.exists()) {
        console.error("Bank account not found:", bankAccountId);
        return false;
      }

      const currentData = bankAccountDoc.data();
      const expenseIds = currentData.expenseIds || [];

      // Remove expense ID if present
      if (expenseIds.includes(expenseId)) {
        await updateDoc(bankAccountRef, {
          expenseIds: expenseIds.filter((id: string) => id !== expenseId),
          updatedAt: new Date().toISOString(),
        });

        // Update local state
        this.setState(({ bankAccounts }) => ({
          bankAccounts: (bankAccounts || []).map((account) =>
            account.id === bankAccountId
              ? {
                  ...account,
                  expenseIds: expenseIds.filter(
                    (id: string) => id !== expenseId
                  ),
                }
              : account
          ),
        }));

        console.log(
          "Expense removed from bank account:",
          expenseId,
          bankAccountId
        );
      }

      return true;
    } catch (error) {
      console.error("Error removing expense from bank account:", error);
      return false;
    }
  }

  getExpensesForBankAccount(bankAccountId: string): Expense[] {
    const { expenses, bankAccounts } = this.getState();
    const bankAccount = bankAccounts?.find(
      (account) => account.id === bankAccountId
    );

    if (!bankAccount || !expenses) {
      return [];
    }

    // Handle case where expenseIds might be undefined (from existing data)
    const expenseIds = bankAccount.expenseIds || [];

    // Map expense IDs to full expense objects
    return expenseIds.length > 0
      ? expenseIds
          .map((expenseId) =>
            expenses.find((expense) => expense.id === expenseId)
          )
          .filter((expense): expense is Expense => expense !== undefined)
      : [];
  }

  getCurrentBalance(bankAccountId: string): number {
    const bankAccount = this.getState().bankAccounts?.find(
      (account) => account.id === bankAccountId
    );

    if (!bankAccount) {
      return 0;
    }

    const expenses = this.getExpensesForBankAccount(bankAccountId);
    const totalExpenses = expenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );

    return bankAccount.startingBalance - totalExpenses;
  }

  getBankAccountsForExpense(expenseId: string): BankAccount[] {
    const { bankAccounts } = this.getState();

    if (!bankAccounts) {
      return [];
    }

    return bankAccounts.filter((bankAccount) => {
      const expenseIds = bankAccount.expenseIds || [];
      return expenseIds.includes(expenseId);
    });
  }
}
