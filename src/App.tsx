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
    bankAccounts: null,
    selectedBankAccount: null,
    newBankAccountFormOpen: false,
    expenses: null,
    selectedExpense: null,
    newExpenseFormOpen: false,
  });
  const { user } = store.getState();

  useEffect(() => {
    // Initialize auth listener
    store.init();

    // Load expenses and bank accounts when component mounts
    if (user) {
      store.getAllExpensesForUser();
      store.getAllBankAccountsForUser();
    }

    // Cleanup auth listener on unmount
    return () => {
      store.cleanup();
    };
  }, [user, store]);

  return (
    <div>{user ? <MainPage store={store} /> : <LoginPage store={store} />}</div>
  );
}

export default App;
