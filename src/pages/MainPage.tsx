import Button from "@mui/material/Button";

import ExpenseList from "../components/ExpenseList";
import BankAccountList from "../components/BankAccountList";
import { CalculatorStore } from "../utils/store";

function MainPage({ store }: { store: CalculatorStore }) {
  return (
    <div>
      <h1>Reyaly Financial Calculator</h1>
      <ExpenseList store={store} />
      <BankAccountList store={store} />
      <Button variant="contained" color="secondary" onClick={() => store.logoutUser()}>
        Logout
      </Button>
    </div>
  );
}

export default MainPage;
