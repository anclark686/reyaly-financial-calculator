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
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import type {
  CalculatorState,
  BankAccount,
  Expense,
  PayInfo,
  PayPeriod,
  PayPeriodBankAccount,
  PayPeriodExpense,
} from "./types";
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

    // Master data (global across all periods)
    masterBankAccounts: null,
    masterExpenses: null,
    payInfo: null,

    // Period-specific data
    payPeriods: null,
    currentPayPeriod: null,
    payPeriodBankAccounts: null,
    payPeriodExpenses: null,

    // UI state
    selectedBankAccount: null,
    selectedExpense: null,
    selectedPayPeriodBankAccount: null,
    selectedPayPeriodExpense: null,
    newBankAccountFormOpen: false,
    newExpenseFormOpen: false,
    expensesDate: "",

    // Loading states
    loading: false,
    payPeriodLoading: false,
  };

  authUnsubscribe: (() => void) | null = null;

  init() {
    this.authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        this.setState(() => ({ user }));
        this.getAllExpensesForUser();
        this.getAllBankAccountsForUser();
      } else {
        this.setState(() => ({
          user: null,
          masterExpenses: [],
          masterBankAccounts: [],
          payPeriods: [],
          currentPayPeriod: null,
          payPeriodBankAccounts: [],
          payPeriodExpenses: [],
          selectedExpense: null,
          selectedBankAccount: null,
          selectedPayPeriodExpense: null,
          selectedPayPeriodBankAccount: null,
          loading: false,
          payPeriodLoading: false,
        }));
      }
    });
  }

  cleanup() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  // SETTERS
  setUsername(username: string) {
    this.setState(() => ({ username }));
  }

  setPassword(password: string) {
    this.setState(() => ({ password }));
  }

  setConfirmPassword(confirmPassword: string) {
    this.setState(() => ({ confirmPassword }));
  }

  setNewBankAccountFormOpen(open: boolean) {
    this.setState(() => ({ newBankAccountFormOpen: open }));
  }

  setSelectedBankAccount(account: BankAccount | null) {
    this.setState(() => ({ selectedBankAccount: account }));
  }

  setSelectedExpense(expense: Expense | null) {
    this.setState(() => ({ selectedExpense: expense }));
  }

  setNewExpenseFormOpen(open: boolean) {
    this.setState(() => ({ newExpenseFormOpen: open }));
  }

  setSelectedPayPeriodExpense(expense: PayPeriodExpense | null) {
    this.setState(() => ({ selectedPayPeriodExpense: expense }));
  }

  setSelectedPayPeriodBankAccount(account: PayPeriodBankAccount | null) {
    this.setState(() => ({ selectedPayPeriodBankAccount: account }));
  }

  setCurrentPayPeriod(payPeriod: PayPeriod | null) {
    this.setState(() => ({ currentPayPeriod: payPeriod }));
  }

  setUser(user: User | null) {
    this.setState(() => ({ user }));
  }

  /*
   * API FUNCTIONS
   * All functions related to user authentication and data management
   */

  // LOGIN/LOGOUT FUNCTIONS
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
      console.error(`errorCode: ${errorCode} - errorMessage: ${errorMessage}`);
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
      console.error(`errorCode: ${errorCode} - errorMessage: ${errorMessage}`);
      this.setState(() => ({ loginError: errorMessage }));
      return false;
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      return true;
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const authError = error as AuthError;
      const errorCode = authError.code;

      // Handle specific Google sign-in errors
      if (errorCode === "auth/popup-closed-by-user") {
        console.error("Sign-in popup was closed by user");
      } else if (errorCode === "auth/popup-blocked") {
        console.error("Sign-in popup was blocked by browser");
      } else {
        this.setState(() => ({
          loginError: "Google sign-in failed. Please try again.",
        }));
      }

      return false;
    }
  }

  async logoutUser() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  // EXPENSE FUNCTIONS
  async getAllExpensesForUser() {
    const user = this.getState().user;
    if (!user) return;

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "expenses")
      );
      const expenses = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          nextDueDate: findNextDueDate(
            data.dueDate,
            data.frequency,
            new Date()
          ),
          ...data,
        };
      }) as Expense[];
      this.setState({ masterExpenses: expenses });
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  }

  async addExpenseToUser(expenseData: {
    name: string;
    amount: number;
    type: "withdrawal" | "deposit";
    dueDate: string;
    frequency: "monthly" | "bi-weekly" | "every 30 days" | "one-time";
  }) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const newExpense = {
        userUID: user.uid,
        name: expenseData.name,
        amount: expenseData.amount,
        type: expenseData.type,
        dueDate: expenseData.dueDate,
        frequency: expenseData.frequency,
        nextDueDate: findNextDueDate(
          expenseData.dueDate!,
          expenseData.frequency!,
          new Date()
        ),
        isPaid: false,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(
        collection(db, TABLE_NAME, user.uid, "expenses"),
        newExpense
      );
      console.log("Document written with ID: ", docRef.id);
      this.setState(({ masterExpenses }) => ({
        masterExpenses: [
          ...(masterExpenses || []),
          { ...newExpense, id: docRef.id } as Expense,
        ],
      }));

      // Update all existing pay periods with the new expense
      await this.updateAllPayPeriodsWithNewMasterData();

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

      this.setState(({ masterExpenses }) => ({
        masterExpenses: (masterExpenses || []).map((exp: Expense) =>
          exp.id === expenseId
            ? {
                ...exp,
                ...expenseData,
                nextDueDate:
                  expenseData.dueDate && expenseData.frequency
                    ? findNextDueDate(
                        expenseData.dueDate,
                        expenseData.frequency,
                        new Date()
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
      const bankAccounts = this.getState().masterBankAccounts || [];
      for (const bankAccount of bankAccounts) {
        const expenseIds = bankAccount.expenseIds || [];
        if (expenseIds.includes(expenseId)) {
          await this.removeExpenseFromBankAccount(bankAccount.id, expenseId);
        }
      }

      // Then delete the expense document
      await deleteDoc(doc(db, TABLE_NAME, user.uid, "expenses", expenseId));
      this.setState(({ masterExpenses }) => ({
        masterExpenses: (masterExpenses || []).filter(
          (expense: Expense) => expense.id !== expenseId
        ),
      }));
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

      this.setState(() => ({ masterBankAccounts: bankAccounts }));
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

    try {
      const docRef = await addDoc(
        collection(db, TABLE_NAME, user.uid, "bankAccounts"),
        {
          ...bankAccountData,
          createdAt: new Date().toISOString(),
        }
      );
      const newBankAccount = {
        id: docRef.id,
        ...bankAccountData,
        userUID: user.uid,
        expenseIds: [],
        createdAt: new Date().toISOString(),
      };
      this.setState(({ masterBankAccounts }) => ({
        masterBankAccounts: [
          ...(masterBankAccounts || []),
          newBankAccount as BankAccount,
        ],
      }));

      // Update all existing pay periods with the new bank account
      await this.updateAllPayPeriodsWithNewMasterData();

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

      this.setState(({ masterBankAccounts }) => ({
        masterBankAccounts: (masterBankAccounts || []).map((acc: BankAccount) =>
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
      this.setState(({ masterBankAccounts }) => ({
        masterBankAccounts: (masterBankAccounts || []).filter(
          (account: BankAccount) => account.id !== bankAccountId
        ),
      }));
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

      if (!expenseIds.includes(expenseId)) {
        await updateDoc(bankAccountRef, {
          expenseIds: [...expenseIds, expenseId],
          updatedAt: new Date().toISOString(),
        });

        this.setState(({ masterBankAccounts }) => ({
          masterBankAccounts: (masterBankAccounts || []).map(
            (account: BankAccount) =>
              account.id === bankAccountId
                ? { ...account, expenseIds: [...expenseIds, expenseId] }
                : account
          ),
        }));
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

      if (expenseIds.includes(expenseId)) {
        await updateDoc(bankAccountRef, {
          expenseIds: expenseIds.filter((id: string) => id !== expenseId),
          updatedAt: new Date().toISOString(),
        });

        this.setState(({ masterBankAccounts }) => ({
          masterBankAccounts: (masterBankAccounts || []).map(
            (account: BankAccount) =>
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
      }

      return true;
    } catch (error) {
      console.error("Error removing expense from bank account:", error);
      return false;
    }
  }

  getExpensesForBankAccount(bankAccountId: string): Expense[] {
    const { masterExpenses, masterBankAccounts } = this.getState();
    const bankAccount = masterBankAccounts?.find(
      (account: BankAccount) => account.id === bankAccountId
    );

    if (!bankAccount || !masterExpenses) {
      return [];
    }

    // Handle case where expenseIds might be undefined (from existing data)
    const expenseIds = bankAccount.expenseIds || [];

    // Map expense IDs to full expense objects
    return expenseIds.length > 0
      ? expenseIds
          .map((expenseId: string) =>
            masterExpenses?.find((expense: Expense) => expense.id === expenseId)
          )
          .filter((expense): expense is Expense => expense !== undefined)
      : [];
  }

  getCurrentBalance(bankAccountId: string): number {
    const bankAccount = this.getState().masterBankAccounts?.find(
      (account: BankAccount) => account.id === bankAccountId
    );

    if (!bankAccount) {
      return 0;
    }

    const expenses = this.getExpensesForBankAccount(bankAccountId);
    const totalExpenses = expenses.reduce(
      (total, expense) => total + expense.amount,
      0
    );

    return bankAccount.startingBalance + totalExpenses;
  }

  getBankAccountsForExpense(expenseId: string): BankAccount[] {
    const { masterBankAccounts } = this.getState();

    if (!masterBankAccounts) {
      return [];
    }

    return masterBankAccounts.filter((bankAccount: BankAccount) => {
      const expenseIds = bankAccount.expenseIds || [];
      return expenseIds.includes(expenseId);
    });
  }

  // PAY PERIOD FUNCTIONS
  async saveUserPayInfo(payInfoData: Partial<PayInfo>) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const payInfoRef = doc(db, TABLE_NAME, user.uid, "payInfo", "main");

      // Check if pay info already exists
      const payInfoDoc = await getDoc(payInfoRef);

      if (payInfoDoc.exists()) {
        // Update existing pay info
        await updateDoc(payInfoRef, {
          ...payInfoData,
          updatedAt: new Date().toISOString(),
        });

        // Update state with existing `document ID
        const updatedPayInfo = {
          id: payInfoDoc.id,
          ...payInfoData,
          userUID: user.uid,
        } as PayInfo;

        this.setState(() => ({ payInfo: updatedPayInfo }));

        // Generate pay periods if they don't exist
        // await this.getAllPayPeriodsForUser();
      } else {
        // Create new pay info
        const newPayInfo = {
          ...payInfoData,
          userUID: user.uid,
          createdAt: new Date().toISOString(),
        } as PayInfo;

        await setDoc(payInfoRef, newPayInfo);

        // Update state
        this.setState(() => ({
          payInfo: { ...newPayInfo, id: payInfoRef.id },
        }));

        // Generate initial pay periods
        // await this.createPayPeriodsForUser({ ...newPayInfo, id: payInfoRef.id });
      }

      return true;
    } catch (error) {
      console.error("Error saving pay info:", error);
      return false;
    }
  }

  async loadUserPayInfo() {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    try {
      const payInfoRef = doc(db, TABLE_NAME, user.uid, "payInfo", "main");
      const payInfoDoc = await getDoc(payInfoRef);

      if (payInfoDoc.exists()) {
        const payInfo = {
          id: payInfoDoc.id,
          ...payInfoDoc.data(),
        } as PayInfo;

        this.setState(() => ({ payInfo }));

        // Set the current pay period based on the calculated date
        const currentPayDate = this.findCurrentPayPeriodBasedOnToday(payInfo);

        await this.getCurrentPayPeriod(currentPayDate);
        // Load pay periods for this user
        // await this.getAllPayPeriodsForUser();
      }
    } catch (error) {
      console.error("Error loading pay info:", error);
    }
  }

  // generatePayPeriodsForYear(payInfo: PayInfo, year: number): PayPeriod[] {
  //   const periods: PayPeriod[] = [];
  //   const startDate = new Date(payInfo.startDate);

  //   let periodCount = 0;
  //   switch (payInfo.payFrequency) {
  //     case 'weekly':
  //       periodCount = 52;
  //       break;
  //     case 'bi-weekly':
  //       periodCount = 26;
  //       break;
  //     case 'monthly':
  //       periodCount = 12;
  //       break;
  //     case 'semi-monthly':
  //       periodCount = 24;
  //       break;
  //     default:
  //       periodCount = 12;
  //   }

  //   for (let i = 1; i <= periodCount; i++) {
  //     const periodStartDate = new Date(startDate);
  //     const periodEndDate = new Date(startDate);

  //     switch (payInfo.payFrequency) {
  //       case 'weekly':
  //         periodStartDate.setDate(startDate.getDate() + (i - 1) * 7);
  //         periodEndDate.setDate(periodStartDate.getDate() + 6);
  //         break;
  //       case 'bi-weekly':
  //         periodStartDate.setDate(startDate.getDate() + (i - 1) * 14);
  //         periodEndDate.setDate(periodStartDate.getDate() + 13);
  //         break;
  //       case 'monthly':
  //         periodStartDate.setMonth(startDate.getMonth() + (i - 1));
  //         periodEndDate.setMonth(periodStartDate.getMonth() + 1);
  //         periodEndDate.setDate(periodEndDate.getDate() - 1);
  //         break;
  //       case 'semi-monthly':
  //         if (i % 2 === 1) {
  //           periodStartDate.setMonth(startDate.getMonth() + Math.floor((i - 1) / 2));
  //           periodStartDate.setDate(1);
  //           periodEndDate.setDate(15);
  //         } else {
  //           periodStartDate.setMonth(startDate.getMonth() + Math.floor((i - 1) / 2));
  //           periodStartDate.setDate(16);
  //           periodEndDate.setMonth(periodStartDate.getMonth() + 1);
  //           periodEndDate.setDate(0);
  //         }
  //         break;
  //     }

  //     periods.push({
  //       id: `${payInfo.id}-${year}-${i}`,
  //       userUID: payInfo.userUID,
  //       payInfoId: payInfo.id,
  //       startDate: periodStartDate.toISOString(),
  //       endDate: periodEndDate.toISOString(),
  //       periodNumber: i,
  //       year,
  //       isActive: this.isDateInPayPeriod(new Date(), periodStartDate, periodEndDate),
  //       createdAt: new Date().toISOString(),
  //     });
  //   }

  //   return periods;
  // }

  private isDateInPayPeriod(
    date: Date,
    startDate: Date,
    endDate: Date
  ): boolean {
    return date >= startDate && date <= endDate;
  }

  // async createPayPeriodsForUser(payInfo: PayInfo) {
  //   const user = this.getState().user;
  //   if (!user) {
  //     console.error("No authenticated user found");
  //     return false;
  //   }

  //   try {
  //     // const currentYear = new Date().getFullYear();
  //     // const payPeriods = this.generatePayPeriodsForYear(payInfo, currentYear);
  //     const payPeriods: PayPeriod[] = []

  //     // Save all pay periods to Firestore
  //     for (const payPeriod of payPeriods) {
  //       await addDoc(
  //         collection(db, TABLE_NAME, user.uid, "payPeriods"),
  //         payPeriod
  //       );
  //     }

  //     // Update state
  //     this.setState(() => ({
  //       payPeriods,
  //       currentPayPeriod: payPeriods.find(pp => pp.isActive) || null
  //     }));

  //     return true;
  //   } catch (error) {
  //     console.error("Error creating pay periods:", error);
  //     return false;
  //   }
  // }

  // async getAllPayPeriodsForUser() {
  //   const user = this.getState().user;
  //   console.log("Getting pay periods for user:", user?.uid);
  //   if (!user) {
  //     console.error("No authenticated user found");
  //     return [];
  //   }

  //   try {
  //     const querySnapshot = await getDocs(
  //       collection(db, TABLE_NAME, user.uid, "payPeriods")
  //     );
  //     let payPeriods = querySnapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     })) as PayPeriod[];

  //     if (payPeriods.length === 0) {
  //       const payInfo = this.getState().payInfo;
  //       if (payInfo) {
  //         payPeriods = this.generatePayPeriodsForYear(payInfo, new Date().getFullYear());
  //       } else {
  //         return [];
  //       }
  //     }

  //     this.setState(() => ({
  //       payPeriods,
  //       currentPayPeriod: payPeriods.find(pp => pp.isActive) || null
  //     }));
  //     console.log("Loaded pay periods:", payPeriods);
  //     return payPeriods;
  //   } catch (error) {
  //     console.error("Error getting pay periods:", error);
  //     return [];
  //   }
  // }

  // PAY PERIOD NAVIGATION METHODS
  // async navigateToNextPayPeriod() {
  //   const { currentPayPeriod, payInfo, payPeriods } = this.getState();
  //   if (!currentPayPeriod || !payInfo) return;

  //   const nextPeriodNumber = currentPayPeriod.periodNumber + 1;
  //   const nextYear = currentPayPeriod.year;

  //   // Check if next period exists, if not create it
  //   let nextPeriod = payPeriods?.find(p =>
  //     p.periodNumber === nextPeriodNumber && p.year === nextYear
  //   );

  //   if (!nextPeriod) {
  //     // Generate the next period
  //     const generatedPeriods = this.generatePayPeriodsForYear(payInfo, nextYear);
  //     nextPeriod = generatedPeriods.find(p => p.periodNumber === nextPeriodNumber);

  //     if (nextPeriod) {
  //       // Save to database
  //       await this.savePayPeriodToDatabase(nextPeriod);

  //       // Update state
  //       this.setState(({ payPeriods: existing }) => ({
  //         payPeriods: [...(existing || []), nextPeriod!]
  //       }));
  //     }
  //   }

  //   if (nextPeriod) {
  //     await this.loadPayPeriodData(nextPeriod);
  //     this.setCurrentPayPeriod(nextPeriod);
  //   }
  // }

  // async navigateToPreviousPayPeriod() {
  //   const { currentPayPeriod, payInfo, payPeriods } = this.getState();
  //   if (!currentPayPeriod || !payInfo) return;

  //   const prevPeriodNumber = currentPayPeriod.periodNumber - 1;
  //   const prevYear = currentPayPeriod.year;

  //   // Check if previous period exists, if not create it
  //   let prevPeriod = payPeriods?.find(p =>
  //     p.periodNumber === prevPeriodNumber && p.year === prevYear
  //   );

  //   if (!prevPeriod && prevPeriodNumber > 0) {
  //     // Generate the previous period
  //     const generatedPeriods = this.generatePayPeriodsForYear(payInfo, prevYear);
  //     prevPeriod = generatedPeriods.find(p => p.periodNumber === prevPeriodNumber);

  //     if (prevPeriod) {
  //       // Save to database
  //       await this.savePayPeriodToDatabase(prevPeriod);

  //       // Update state
  //       this.setState(({ payPeriods: existing }) => ({
  //         payPeriods: [...(existing || []), prevPeriod!]
  //       }));
  //     }
  //   }

  //   if (prevPeriod) {
  //     await this.loadPayPeriodData(prevPeriod);
  //     this.setCurrentPayPeriod(prevPeriod);
  //   }
  // }

  private async savePayPeriodToDatabase(payPeriod: PayPeriod) {
    const user = this.getState().user;
    if (!user) return;

    try {
      await addDoc(
        collection(db, TABLE_NAME, user.uid, "payPeriods"),
        payPeriod
      );
    } catch (error) {
      console.error("Error saving pay period:", error);
    }
  }

  private async loadPayPeriodData(payPeriod: PayPeriod) {
    // Load pay period specific data
    await this.getPayPeriodBankAccounts(payPeriod.id);
    await this.getPayPeriodExpenses(payPeriod.id);
  }

  // canNavigateToNext(): boolean {
  //   const { currentPayPeriod, payInfo } = this.getState();
  //   if (!currentPayPeriod || !payInfo) return false;

  //   const maxPeriods = this.getMaxPeriodsForFrequency(payInfo.payFrequency);
  //   return currentPayPeriod.periodNumber < maxPeriods;
  // }

  // canNavigateToPrevious(): boolean {
  //   const { currentPayPeriod } = this.getState();
  //   if (!currentPayPeriod) return false;

  //   return currentPayPeriod.periodNumber > 1;
  // }

  getCurrentPayPeriodDisplay(): string {
    const { currentPayPeriod } = this.getState();
    if (!currentPayPeriod) return "No Period Selected";

    // Manually parse date strings to avoid timezone issues
    const startISO = currentPayPeriod.startDate.split("T")[0];
    const endISO = currentPayPeriod.endDate.split("T")[0];

    // Create dates from YYYY-MM-DD format
    const [startYear, startMonth, startDay] = startISO.split("-").map(Number);
    const [endYear, endMonth, endDay] = endISO.split("-").map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    return `${startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  private getMaxPeriodsForFrequency(frequency: string): number {
    switch (frequency) {
      case "weekly":
        return 52;
      case "bi-weekly":
        return 26;
      case "monthly":
        return 12;
      case "semi-monthly":
        return 24;
      default:
        return 12;
    }
  }

  // My Stuff
  findCurrentPayPeriodBasedOnToday(payInfo?: PayInfo): Date {
    const info = payInfo || this.getState().payInfo;
    if (!info) {
      console.error("No pay info found");
      return new Date();
    }

    const today = new Date();
    const startDate = new Date(info.startDate);

    switch (info.payFrequency) {
      case "weekly": {
        // Find the most recent start date that's <= today
        const daysSinceStart = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const currentPeriodStart = new Date(startDate);
        currentPeriodStart.setDate(startDate.getDate() + weeksSinceStart * 7);

        // If this calculated date is in the future, go back one period
        if (currentPeriodStart > today) {
          currentPeriodStart.setDate(
            startDate.getDate() + (weeksSinceStart - 1) * 7
          );
        }

        return currentPeriodStart;
      }

      case "bi-weekly": {
        // Find the most recent start date that's <= today
        const daysSinceStartBi = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const periodsSinceStartBi = Math.floor(daysSinceStartBi / 14);

        console.log("Bi-weekly calculation:", {
          today: today.toISOString().split("T")[0],
          startDate: startDate.toISOString().split("T")[0],
          daysSinceStartBi,
          periodsSinceStartBi,
        });

        // Calculate the most recent period start date
        const currentPeriodStartBi = new Date(startDate);
        currentPeriodStartBi.setDate(
          startDate.getDate() + periodsSinceStartBi * 14
        );

        // If this calculated date is in the future, go back one period
        if (currentPeriodStartBi > today) {
          currentPeriodStartBi.setDate(
            startDate.getDate() + (periodsSinceStartBi - 1) * 14
          );
        }

        return currentPeriodStartBi;
      }

      case "monthly": {
        // Current period starts on 1st of current month
        return new Date(today.getFullYear(), today.getMonth(), 1);
      }

      case "semi-monthly": {
        // If today is 1st-15th, current period started on 1st
        // If today is 16th+, current period started on 16th
        if (today.getDate() <= 15) {
          return new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
          return new Date(today.getFullYear(), today.getMonth(), 16);
        }
      }
      default:
        console.error("Unknown pay frequency:", info.payFrequency);
        return new Date();
    }
  }

  makeEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);

    switch (this.getState().payInfo?.payFrequency) {
      case "bi-weekly":
        endDate.setDate(startDate.getDate() + 13);
        break;
      case "weekly":
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "semi-monthly": {
        const startDay = startDate.getDate();
        if (startDay === 1) {
          endDate.setDate(15);
        } else if (startDay === 16) {
          endDate.setMonth(startDate.getMonth() + 1);
          endDate.setDate(0);
        } else if (startDay <= 15) {
          endDate.setDate(15);
        } else {
          endDate.setMonth(startDate.getMonth() + 1);
          endDate.setDate(0);
        }
        break;
      }
      case "monthly":
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        break;
      default:
        endDate.setDate(startDate.getDate() + 13);
    }
    return endDate;
  }

  async createNewPayPeriod(startDate: Date) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return;
    }
    const payInfo = this.getState().payInfo;
    if (!payInfo) {
      console.error("No pay info found");
      return;
    }

    const payPeriodData = {
      userUID: user.uid,
      payInfoId: payInfo.id,
      startDate: startDate.toISOString(),
      endDate: this.makeEndDate(startDate).toISOString(),
      year: startDate.getFullYear(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const payPeriodRef = await addDoc(
      collection(
        db,
        TABLE_NAME,
        user.uid,
        "payPeriods",
        "main",
        startDate.toISOString().split("T")[0]
      ),
      {
        ...payPeriodData,
      }
    );

    this.setState((state) => ({
      ...state,
      currentPayPeriodId: payPeriodRef.id,
      currentPayPeriod: { ...payPeriodData, id: payPeriodRef.id },
      payPeriods: [
        ...(state.payPeriods || []),
        { ...payPeriodData, id: payPeriodRef.id },
      ],
    }));

    await this.createPayPeriodBankAccounts(payPeriodRef.id);
    await this.assignExpensesToPayPeriod(payPeriodRef.id);
    // Return the created pay period data for immediate use
    return { ...payPeriodData, id: payPeriodRef.id };
  }

  async findSpecifiedPayPeriod(startDate: Date) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    const dateStr = startDate.toISOString().split("T")[0];

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "payPeriods", "main", dateStr)
      );
      if (querySnapshot.empty) {
        return null;
      }

      const newPayPeriod = {
        ...querySnapshot.docs[0]?.data(),
        id: querySnapshot.docs[0]?.id,
      };

      return (newPayPeriod as PayPeriod) || null;
    } catch (error) {
      console.error("Error checking for existing pay period:", error);
      return null;
    }
  }

  async onDateChange(direction: string) {
    const payFrequency = this.getState().payInfo?.payFrequency;

    const { currentPayPeriod } = this.getState();
    if (!currentPayPeriod) return;

    const currentDate = new Date(currentPayPeriod.startDate);
    const newDate = new Date(currentDate);

    switch (payFrequency) {
      case "weekly":
        newDate.setDate(
          currentDate.getDate() + (direction === "next" ? 7 : -7)
        );
        break;
      case "bi-weekly":
        newDate.setDate(
          currentDate.getDate() + (direction === "next" ? 14 : -14)
        );
        break;
      case "monthly":
        newDate.setMonth(
          currentDate.getMonth() + (direction === "next" ? 1 : -1)
        );
        break;
      case "semi-monthly": {
        const currentDay = currentDate.getDate();

        if (direction === "next") {
          if (currentDay <= 15) {
            newDate.setDate(16);
          } else {
            newDate.setMonth(currentDate.getMonth() + 1);
            newDate.setDate(1);
          }
        } else {
          if (currentDay > 15) {
            newDate.setDate(15);
          } else {
            newDate.setMonth(currentDate.getMonth() - 1);
            newDate.setDate(16);
          }
        }
        break;
      }
      default:
        console.log("Unknown pay frequency:", payFrequency);
        return;
    }

    await this.getCurrentPayPeriod(newDate);
  }

  async getCurrentPayPeriod(date: Date) {
    let payPeriodId = "";

    const existingPayPeriod = await this.findSpecifiedPayPeriod(date);
    if (existingPayPeriod) {
      this.setState((state) => ({
        ...state,
        payPeriods: [...(state.payPeriods || []), existingPayPeriod],
        currentPayPeriod: existingPayPeriod,
      }));
      payPeriodId = existingPayPeriod.id;
    } else {
      // Create a new pay period if one doesn't exist
      const newPayPeriod = await this.createNewPayPeriod(date);
      if (newPayPeriod) {
        this.setState((state) => ({
          ...state,
          payPeriods: [...(state.payPeriods || []), newPayPeriod],
          currentPayPeriod: newPayPeriod,
        }));
        payPeriodId = newPayPeriod.id;
      }
    }
    if (payPeriodId) {
      // Check if pay period bank accounts exist, if not create them
      const existingBankAccounts = await this.getPayPeriodBankAccounts(
        payPeriodId
      );
      if (existingBankAccounts.length === 0) {
        console.log("No bank accounts found for pay period, creating them");
        await this.createPayPeriodBankAccounts(payPeriodId);
        await this.getPayPeriodBankAccounts(payPeriodId);
      }

      // Check if pay period expenses exist, if not create them
      const existingExpenses = await this.getPayPeriodExpenses(payPeriodId);
      if (existingExpenses.length === 0) {
        console.log("No expenses found for pay period, creating them");
        await this.assignExpensesToPayPeriod(payPeriodId);
        await this.getPayPeriodExpenses(payPeriodId);
      }
    }
  }

  // PAY PERIOD BANK ACCOUNT FUNCTIONS
  async createPayPeriodBankAccounts(payPeriodId: string) {
    const user = this.getState().user;
    const masterBankAccounts = this.getState().masterBankAccounts || [];

    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const payPeriodBankAccounts: PayPeriodBankAccount[] = [];

      for (const masterAccount of masterBankAccounts) {
        const payPeriodAccount: PayPeriodBankAccount = {
          id: `${payPeriodId}-${masterAccount.id}`,
          payPeriodId,
          masterBankAccountId: masterAccount.id,
          name: masterAccount.name,
          color: masterAccount.color,
          startingBalance: masterAccount.startingBalance,
          currentBalance: masterAccount.startingBalance,
          expenseIds: masterAccount.expenseIds || [],
          createdAt: new Date().toISOString(),
        };

        await addDoc(
          collection(db, TABLE_NAME, user.uid, "payPeriodBankAccounts"),
          payPeriodAccount
        );

        payPeriodBankAccounts.push(payPeriodAccount);
      }

      this.setState(({ payPeriodBankAccounts: existing }) => ({
        payPeriodBankAccounts: [...(existing || []), ...payPeriodBankAccounts],
      }));

      return true;
    } catch (error) {
      console.error("Error creating pay period bank accounts:", error);
      return false;
    }
  }

  async getPayPeriodBankAccounts(payPeriodId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "payPeriodBankAccounts")
      );
      const accounts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PayPeriodBankAccount[];

      const filteredAccounts = accounts.filter(
        (account: PayPeriodBankAccount) => account.payPeriodId === payPeriodId
      );

      this.setState(() => ({ payPeriodBankAccounts: filteredAccounts }));
      return filteredAccounts;
    } catch (error) {
      console.error("Error getting pay period bank accounts:", error);
      return [];
    }
  }

  private calculateDueDateForPayPeriod(
    masterExpense: Expense,
    payPeriodStart: string
  ): string {
    // Use the current next due date as the starting point, not the original due date
    const startDate = masterExpense.nextDueDate || masterExpense.dueDate;

    // For one-time expenses, return the current due date
    if (masterExpense.frequency === "one-time") {
      return startDate;
    }

    console.log("Calculating due date for pay period:", {
      payPeriodStart,
      startDate,
      frequency: masterExpense.frequency,
    });

    // Use the helper function to find the next due date after the pay period start
    const nextDueDate = findNextDueDate(
      startDate,
      masterExpense.frequency,
      new Date(payPeriodStart)
    );

    console.log("findNextDueDate result:", {
      startDate,
      frequency: masterExpense.frequency,
      payPeriodStart,
      nextDueDate,
    });
    return nextDueDate || startDate;
  }

  // PAY PERIOD EXPENSE FUNCTIONS
  async assignExpensesToPayPeriod(payPeriodId: string) {
    const user = this.getState().user;
    const masterExpenses = this.getState().masterExpenses || [];
    const payPeriod = this.getState().currentPayPeriod;

    if (!user || !payPeriod) {
      console.error("No authenticated user found or pay period not found");
      return false;
    }

    try {
      const payPeriodExpenses: PayPeriodExpense[] = [];

      for (const masterExpense of masterExpenses) {
        // Check if expense falls within this pay period based on frequency
        if (this.shouldExpenseBeInPayPeriod(masterExpense, payPeriod)) {
          // Calculate the next due date specifically for this pay period
          const nextDueDateForPeriod = this.calculateDueDateForPayPeriod(
            masterExpense,
            payPeriod.startDate
          );

          const periodExpense: PayPeriodExpense = {
            id: `${payPeriodId}-${masterExpense.id}`,
            payPeriodId,
            masterExpenseId: masterExpense.id,
            name: masterExpense.name,
            amount: masterExpense.amount,
            type: masterExpense.type,
            nextDueDate: nextDueDateForPeriod,
            frequency: masterExpense.frequency,
            isPaid: false,
            createdAt: new Date().toISOString(),
          };

          await addDoc(
            collection(db, TABLE_NAME, user.uid, "payPeriodExpenses"),
            periodExpense
          );

          payPeriodExpenses.push(periodExpense);
        }
      }

      this.setState(({ payPeriodExpenses: existing }) => ({
        payPeriodExpenses: [...(existing || []), ...payPeriodExpenses],
      }));

      return true;
    } catch (error) {
      console.error("Error assigning expenses to pay period:", error);
      return false;
    }
  }

  private shouldExpenseBeInPayPeriod(
    expense: Expense,
    payPeriod: PayPeriod
  ): boolean {
    const expenseDate = new Date(expense.dueDate);
    const periodStart = new Date(payPeriod.startDate);
    const periodEnd = new Date(payPeriod.endDate);

    // For one-time expenses, check if due date falls within period
    if (expense.frequency === "one-time") {
      return expenseDate >= periodStart && expenseDate <= periodEnd;
    }

    // For recurring expenses, calculate the next due date for this pay period
    const nextDueDateForPeriod = this.calculateDueDateForPayPeriod(
      expense,
      payPeriod.startDate
    );
    const nextDueDate = new Date(nextDueDateForPeriod);

    // Normalize dates to local timezone for comparison
    const nextDueDateParts = nextDueDateForPeriod.split("-");
    const periodStartParts = payPeriod.startDate.split("T")[0].split("-");
    const periodEndParts = payPeriod.endDate.split("T")[0].split("-");

    const normalizedNextDueDate = new Date(
      parseInt(nextDueDateParts[0]),
      parseInt(nextDueDateParts[1]) - 1,
      parseInt(nextDueDateParts[2])
    );
    const normalizedPeriodStart = new Date(
      parseInt(periodStartParts[0]),
      parseInt(periodStartParts[1]) - 1,
      parseInt(periodStartParts[2])
    );
    const normalizedPeriodEnd = new Date(
      parseInt(periodEndParts[0]),
      parseInt(periodEndParts[1]) - 1,
      parseInt(periodEndParts[2])
    );

    console.log("shouldExpenseBeInPayPeriod check:", {
      expenseName: expense.name,
      expenseDueDate: expense.dueDate,
      calculatedNextDueDate: nextDueDateForPeriod,
      periodStart: payPeriod.startDate,
      periodEnd: payPeriod.endDate,
      nextDueDateObj: nextDueDate.toISOString(),
      periodStartObj: periodStart.toISOString(),
      periodEndObj: periodEnd.toISOString(),
      normalizedNextDueDate: normalizedNextDueDate.toDateString(),
      normalizedPeriodStart: normalizedPeriodStart.toDateString(),
      normalizedPeriodEnd: normalizedPeriodEnd.toDateString(),
      nextDueDateTime: normalizedNextDueDate.getTime(),
      periodStartTime: normalizedPeriodStart.getTime(),
      periodEndTime: normalizedPeriodEnd.getTime(),
      isInPeriod:
        normalizedNextDueDate >= normalizedPeriodStart &&
        normalizedNextDueDate <= normalizedPeriodEnd,
    });

    // Check if the calculated due date falls within this pay period (using normalized dates)
    return (
      normalizedNextDueDate >= normalizedPeriodStart &&
      normalizedNextDueDate <= normalizedPeriodEnd
    );
  }

  async updateAllPayPeriodsWithNewMasterData() {
    const user = this.getState().user;
    const payPeriods = this.getState().payPeriods || [];

    console.log("Updating all pay periods with new master data", {
      user: user?.uid,
      payPeriodCount: payPeriods.length,
    });

    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      for (const payPeriod of payPeriods) {
        // Update pay period bank accounts if new master bank accounts exist
        await this.updatePayPeriodBankAccounts(payPeriod.id);

        // Update pay period expenses if new master expenses exist
        await this.updatePayPeriodExpenses(payPeriod.id);
      }

      return true;
    } catch (error) {
      console.error("Error updating all pay periods:", error);
      return false;
    }
  }

  async updatePayPeriodBankAccounts(payPeriodId: string) {
    const user = this.getState().user;
    const masterBankAccounts = this.getState().masterBankAccounts || [];

    if (!user) return false;

    try {
      // Get existing pay period bank accounts
      const existingAccounts = await this.getPayPeriodBankAccounts(payPeriodId);

      // Find master bank accounts that don't have corresponding pay period accounts
      const existingMasterIds = existingAccounts.map(
        (acc) => acc.masterBankAccountId
      );
      const newMasterAccounts = masterBankAccounts.filter(
        (master) => !existingMasterIds.includes(master.id)
      );

      // Create pay period accounts for new master accounts
      for (const masterAccount of newMasterAccounts) {
        const payPeriodAccount: PayPeriodBankAccount = {
          id: `${payPeriodId}-${masterAccount.id}`,
          payPeriodId,
          masterBankAccountId: masterAccount.id,
          name: masterAccount.name,
          color: masterAccount.color,
          startingBalance: masterAccount.startingBalance,
          currentBalance: masterAccount.startingBalance,
          expenseIds: masterAccount.expenseIds || [],
          createdAt: new Date().toISOString(),
        };

        await addDoc(
          collection(db, TABLE_NAME, user.uid, "payPeriodBankAccounts"),
          payPeriodAccount
        );
      }

      // Refresh the pay period bank accounts
      await this.getPayPeriodBankAccounts(payPeriodId);
      return true;
    } catch (error) {
      console.error("Error updating pay period bank accounts:", error);
      return false;
    }
  }

  async updatePayPeriodExpenses(payPeriodId: string) {
    const user = this.getState().user;
    const masterExpenses = this.getState().masterExpenses || [];
    const payPeriod = this.getState().payPeriods?.find(
      (pp) => pp.id === payPeriodId
    );

    if (!user || !payPeriod) return false;

    try {
      // Get existing pay period expenses
      const existingExpenses = await this.getPayPeriodExpenses(payPeriodId);

      // Find master expenses that don't have corresponding pay period expenses
      const existingMasterIds = existingExpenses.map(
        (exp) => exp.masterExpenseId
      );
      const newMasterExpenses = masterExpenses.filter(
        (master) => !existingMasterIds.includes(master.id)
      );

      // Create pay period expenses for new master expenses
      for (const masterExpense of newMasterExpenses) {
        // Check if expense should be in this pay period
        if (this.shouldExpenseBeInPayPeriod(masterExpense, payPeriod)) {
          const nextDueDateForPeriod = this.calculateDueDateForPayPeriod(
            masterExpense,
            payPeriod.startDate
          );

          const periodExpense: PayPeriodExpense = {
            id: `${payPeriodId}-${masterExpense.id}`,
            payPeriodId,
            masterExpenseId: masterExpense.id,
            name: masterExpense.name,
            amount: masterExpense.amount,
            type: masterExpense.type,
            nextDueDate: nextDueDateForPeriod,
            frequency: masterExpense.frequency,
            isPaid: false,
            createdAt: new Date().toISOString(),
          };

          await addDoc(
            collection(db, TABLE_NAME, user.uid, "payPeriodExpenses"),
            periodExpense
          );
        }
      }

      // Refresh the pay period expenses
      await this.getPayPeriodExpenses(payPeriodId);
      return true;
    } catch (error) {
      console.error("Error updating pay period expenses:", error);
      return false;
    }
  }

  async getPayPeriodExpenses(payPeriodId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return [];
    }

    try {
      const querySnapshot = await getDocs(
        collection(db, TABLE_NAME, user.uid, "payPeriodExpenses")
      );
      const expenses = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PayPeriodExpense[];

      const filteredExpenses = expenses.filter(
        (expense: PayPeriodExpense) => expense.payPeriodId === payPeriodId
      );

      this.setState(() => ({ payPeriodExpenses: filteredExpenses }));
      return filteredExpenses;
    } catch (error) {
      console.error("Error getting pay period expenses:", error);
      return [];
    }
  }
}
