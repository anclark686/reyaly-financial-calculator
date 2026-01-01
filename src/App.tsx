import { useEffect } from "react";

import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import { CalculatorStore } from "./utils/store";

import "./App.css";

function App() {
  const store = CalculatorStore.useModel({
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
    editMasterData: false,

    // Loading states
    loading: false,
    payPeriodLoading: false,
  });
  const { user } = store.getState();

  useEffect(() => {
    // Initialize auth listener
    store.init();

    // Cleanup auth listener on unmount
    return () => {
      store.cleanup();
    };
  }, [store]);

  return (
    <div>{user ? <MainPage store={store} /> : <LoginPage store={store} />}</div>
  );
}

export default App;
