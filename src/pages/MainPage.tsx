import { Button } from "@mui/material";
import styled from "@emotion/styled";

import ExpenseList from "../components/ExpenseList";
import BankAccountList from "../components/BankAccountList";
import PayInfo from "../components/PayInfo";
import LoadingSpinner from "../components/LoadingSpinner";

import { CalculatorStore } from "../utils/store";

const BtnContainer = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
`;

function MainPage({ store }: { store: CalculatorStore }) {
  const {
    user,
    payInfo,
    loading,
    payPeriodLoading,
    editMasterData,
  } = store.getState();

  // Show loading while user data is being fetched
  if (!user) {
    return <LoadingSpinner message="Authenticating..." />;
  }

  // Show loading while master data is being loaded
  if (loading) {
    return <LoadingSpinner message="Loading your financial data..." />;
  }

  // Show loading while pay period data is being loaded (only if payInfo exists)
  if (payPeriodLoading && payInfo) {
    return <LoadingSpinner message="Loading pay period data..." />;
  }

  return (
    <div>
      <h1>Reyaly Financial Calculator</h1>
      <PayInfo store={store} master={editMasterData} />
      <ExpenseList store={store} master={editMasterData} />
      <BankAccountList store={store} master={editMasterData} />
      <BtnContainer>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => store.toggleEditMode()}
        >
          {editMasterData ? "Done Editing" : "Edit Master Data"}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => store.logoutUser()}
        >
          Logout
        </Button>
      </BtnContainer>
    </div>
  );
}

export default MainPage;
