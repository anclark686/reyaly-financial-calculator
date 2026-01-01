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

// Type for creating PayPeriodExpense without Firestore ID
type PayPeriodExpenseCreate = Omit<PayPeriodExpense, "id">;

// Type for creating PayPeriodBankAccount without Firestore ID
type PayPeriodBankAccountCreate = Omit<PayPeriodBankAccount, "id">;
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

  // MASTER BANK ACCOUNT FUNCTIONS
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
        "payPeriodBankAccounts",
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

        this.setState(({ payPeriodBankAccounts }) => ({
          payPeriodBankAccounts: (payPeriodBankAccounts || []).map(
            (account: PayPeriodBankAccount) =>
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
        "payPeriodBankAccounts",
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

        this.setState(({ payPeriodBankAccounts }) => ({
          payPeriodBankAccounts: (payPeriodBankAccounts || []).map(
            (account: PayPeriodBankAccount) =>
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

  getExpensesForBankAccount(bankAccountId: string): PayPeriodExpense[] {
    const { payPeriodBankAccounts, payPeriodExpenses } = this.getState();
    const bankAccount = payPeriodBankAccounts?.find(
      (account: PayPeriodBankAccount) => account.id === bankAccountId
    );

    if (!bankAccount || !payPeriodExpenses) {
      return [];
    }

    const expenseIds = bankAccount.expenseIds || [];

    return expenseIds.length > 0
      ? expenseIds
          .map((expenseId: string) =>
            payPeriodExpenses?.find(
              (expense: PayPeriodExpense) => expense.id === expenseId
            )
          )
          .filter(
            (expense): expense is PayPeriodExpense => expense !== undefined
          )
      : [];
  }

  getCurrentBalance(bankAccountId: string): number {
    const bankAccount = this.getState().payPeriodBankAccounts?.find(
      (account: PayPeriodBankAccount) => account.id === bankAccountId
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

  getBankAccountsForExpense(expenseId: string): PayPeriodBankAccount[] {
    const { payPeriodBankAccounts } = this.getState();

    if (!payPeriodBankAccounts) {
      return [];
    }

    return payPeriodBankAccounts.filter((bankAccount: PayPeriodBankAccount) => {
      const expenseIds = bankAccount.expenseIds || [];
      return expenseIds.includes(expenseId);
    });
  }

  // MASTER EXPENSE FUNCTIONS
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

      this.setState(({ masterExpenses }) => ({
        masterExpenses: [
          ...(masterExpenses || []),
          { ...newExpense, id: docRef.id } as Expense,
        ],
      }));

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
      const bankAccounts = this.getState().masterBankAccounts || [];
      for (const bankAccount of bankAccounts) {
        const expenseIds = bankAccount.expenseIds || [];
        if (expenseIds.includes(expenseId)) {
          await this.removeExpenseFromBankAccount(bankAccount.id, expenseId);
        }
      }

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

  // PAY PERIOD FUNCTIONS
  async saveUserPayInfo(payInfoData: Partial<PayInfo>) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      const payInfoRef = doc(db, TABLE_NAME, user.uid, "payInfo", "main");
      const payInfoDoc = await getDoc(payInfoRef);

      if (payInfoDoc.exists()) {
        await updateDoc(payInfoRef, {
          ...payInfoData,
          updatedAt: new Date().toISOString(),
        });

        const updatedPayInfo = {
          id: payInfoDoc.id,
          ...payInfoData,
          userUID: user.uid,
        } as PayInfo;

        this.setState(() => ({ payInfo: updatedPayInfo }));
      } else {
        const newPayInfo = {
          ...payInfoData,
          userUID: user.uid,
          createdAt: new Date().toISOString(),
        } as PayInfo;

        await setDoc(payInfoRef, newPayInfo);

        this.setState(() => ({
          payInfo: { ...newPayInfo, id: payInfoRef.id },
        }));
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

        const currentPayDate = this.findCurrentPayPeriodBasedOnToday(payInfo);

        await this.getCurrentPayPeriod(currentPayDate);
      }
    } catch (error) {
      console.error("Error loading pay info:", error);
    }
  }

  getCurrentPayPeriodDisplay(): string {
    const { currentPayPeriod } = this.getState();
    if (!currentPayPeriod) return "No Period Selected";

    const startISO = currentPayPeriod.startDate.split("T")[0];
    const endISO = currentPayPeriod.endDate.split("T")[0];

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
        const daysSinceStart = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const currentPeriodStart = new Date(startDate);
        currentPeriodStart.setDate(startDate.getDate() + weeksSinceStart * 7);

        if (currentPeriodStart > today) {
          currentPeriodStart.setDate(
            startDate.getDate() + (weeksSinceStart - 1) * 7
          );
        }

        return currentPeriodStart;
      }

      case "bi-weekly": {
        const daysSinceStartBi = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const periodsSinceStartBi = Math.floor(daysSinceStartBi / 14);

        const currentPeriodStartBi = new Date(startDate);
        currentPeriodStartBi.setDate(
          startDate.getDate() + periodsSinceStartBi * 14
        );

        if (currentPeriodStartBi > today) {
          currentPeriodStartBi.setDate(
            startDate.getDate() + (periodsSinceStartBi - 1) * 14
          );
        }

        return currentPeriodStartBi;
      }

      case "monthly": {
        return new Date(today.getFullYear(), today.getMonth(), 1);
      }

      case "semi-monthly": {
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
      const existingBankAccounts = await this.getPayPeriodBankAccounts(
        payPeriodId
      );
      if (existingBankAccounts.length === 0) {
        console.log("No bank accounts found for pay period, creating them");
        await this.createPayPeriodBankAccounts(payPeriodId);
        await this.getPayPeriodBankAccounts(payPeriodId);
      }

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
        const payPeriodAccount: PayPeriodBankAccountCreate = {
          compositeId: `${payPeriodId}-${masterAccount.id}`,
          payPeriodId,
          masterBankAccountId: masterAccount.id,
          name: masterAccount.name,
          color: masterAccount.color,
          startingBalance: masterAccount.startingBalance,
          currentBalance: masterAccount.startingBalance,
          expenseIds: masterAccount.expenseIds || [],
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(
          collection(db, TABLE_NAME, user.uid, "payPeriodBankAccounts"),
          payPeriodAccount
        );

        // Update the object with the actual Firestore document ID
        const payPeriodAccountWithId: PayPeriodBankAccount = {
          ...payPeriodAccount,
          id: docRef.id,
        };

        payPeriodBankAccounts.push(payPeriodAccountWithId);
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

  async updatePayPeriodBankAccounts(payPeriodId: string) {
    const user = this.getState().user;
    const masterBankAccounts = this.getState().masterBankAccounts || [];

    if (!user) return false;

    try {
      const existingAccounts = await this.getPayPeriodBankAccounts(payPeriodId);

      const existingMasterIds = existingAccounts.map(
        (acc) => acc.masterBankAccountId
      );
      const newMasterAccounts = masterBankAccounts.filter(
        (master) => !existingMasterIds.includes(master.id)
      );

      for (const masterAccount of newMasterAccounts) {
        const payPeriodAccount: PayPeriodBankAccountCreate = {
          compositeId: `${payPeriodId}-${masterAccount.id}`,
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

      await this.getPayPeriodBankAccounts(payPeriodId);
      return true;
    } catch (error) {
      console.error("Error updating pay period bank accounts:", error);
      return false;
    }
  }

  findPayPeriodBankAccountById(
    compositeId: string
  ): PayPeriodBankAccount | null {
    const { payPeriodBankAccounts } = this.getState();
    return (
      payPeriodBankAccounts?.find(
        (account) => account.compositeId === compositeId
      ) || null
    );
  }

  async deletePayPeriodBankAccount(payPeriodAccountId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      await deleteDoc(
        doc(
          db,
          TABLE_NAME,
          user.uid,
          "payPeriodBankAccounts",
          payPeriodAccountId
        )
      );

      // Update local state
      this.setState(({ payPeriodBankAccounts }) => ({
        payPeriodBankAccounts: (payPeriodBankAccounts || []).filter(
          (account: PayPeriodBankAccount) => account.id !== payPeriodAccountId
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error deleting pay period bank account:", error);
      return false;
    }
  }

  // PAY PERIOD EXPENSE FUNCTIONS
  private calculateDueDateForPayPeriod(
    masterExpense: Expense,
    payPeriodStart: string
  ): string {
    const startDate = masterExpense.nextDueDate || masterExpense.dueDate;

    if (masterExpense.frequency === "one-time") {
      return startDate;
    }

    const nextDueDate = findNextDueDate(
      startDate,
      masterExpense.frequency,
      new Date(payPeriodStart)
    );

    return nextDueDate || startDate;
  }

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
        if (this.shouldExpenseBeInPayPeriod(masterExpense, payPeriod)) {
          const nextDueDateForPeriod = this.calculateDueDateForPayPeriod(
            masterExpense,
            payPeriod.startDate
          );

          const periodExpense: PayPeriodExpenseCreate = {
            compositeId: `${payPeriodId}-${masterExpense.id}`,
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

          const docRef = await addDoc(
            collection(db, TABLE_NAME, user.uid, "payPeriodExpenses"),
            periodExpense
          );

          // Update the object with the actual Firestore document ID
          const periodExpenseWithId: PayPeriodExpense = {
            ...periodExpense,
            id: docRef.id,
          };

          payPeriodExpenses.push(periodExpenseWithId);
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

    if (expense.frequency === "one-time") {
      return expenseDate >= periodStart && expenseDate <= periodEnd;
    }

    const nextDueDateForPeriod = this.calculateDueDateForPayPeriod(
      expense,
      payPeriod.startDate
    );

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

    return (
      normalizedNextDueDate >= normalizedPeriodStart &&
      normalizedNextDueDate <= normalizedPeriodEnd
    );
  }

  async updateAllPayPeriodsWithNewMasterData() {
    const user = this.getState().user;
    const payPeriods = this.getState().payPeriods || [];

    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      for (const payPeriod of payPeriods) {
        await this.updatePayPeriodBankAccounts(payPeriod.id);

        await this.updatePayPeriodExpenses(payPeriod.id);
      }

      return true;
    } catch (error) {
      console.error("Error updating all pay periods:", error);
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

          const periodExpense: PayPeriodExpenseCreate = {
            compositeId: `${payPeriodId}-${masterExpense.id}`,
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

  // Helper function to find PayPeriodExpense by composite ID
  findPayPeriodExpenseByCompositeId(
    compositeId: string
  ): PayPeriodExpense | null {
    const { payPeriodExpenses } = this.getState();
    return (
      payPeriodExpenses?.find(
        (expense) => expense.compositeId === compositeId
      ) || null
    );
  }

  async updatePaidStatus(compositeId: string, isPaid: boolean) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    // Find the PayPeriodExpense to get the actual Firestore document ID
    const payPeriodExpense =
      this.findPayPeriodExpenseByCompositeId(compositeId);
    if (!payPeriodExpense) {
      console.error(
        "PayPeriodExpense not found for composite ID:",
        compositeId
      );
      return false;
    }

    try {
      const docRef = doc(
        db,
        TABLE_NAME,
        user.uid,
        "payPeriodExpenses",
        payPeriodExpense.id
      );
      await updateDoc(docRef, { isPaid });

      // Update local state
      const currentExpenses = this.getState().payPeriodExpenses || [];
      const updatedExpenses = currentExpenses.map((expense) =>
        expense.id === payPeriodExpense.id ? { ...expense, isPaid } : expense
      );
      this.setState(() => ({ payPeriodExpenses: updatedExpenses }));

      return true;
    } catch (error) {
      console.error("Error updating paid status:", error);
      return false;
    }
  }

  async deletePayPeriodExpense(payPeriodExpenseId: string) {
    const user = this.getState().user;
    if (!user) {
      console.error("No authenticated user found");
      return false;
    }

    try {
      await deleteDoc(
        doc(db, TABLE_NAME, user.uid, "payPeriodExpenses", payPeriodExpenseId)
      );

      // Update local state
      this.setState(({ payPeriodExpenses }) => ({
        payPeriodExpenses: (payPeriodExpenses || []).filter(
          (expense: PayPeriodExpense) => expense.id !== payPeriodExpenseId
        ),
      }));

      return true;
    } catch (error) {
      console.error("Error deleting pay period expense:", error);
      return false;
    }
  }
}
