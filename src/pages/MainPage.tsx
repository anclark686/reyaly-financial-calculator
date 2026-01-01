import { Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useState } from "react";
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
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    user,
    payInfo,
    loading,
    payPeriodLoading,
    editMasterData,
    currentPayPeriod,
  } = store.getState();

  const handleResetPayPeriod = async () => {
    setIsResetting(true);
    try {
      const success = await store.resetPayPeriod();
      if (success) {
        setResetDialogOpen(false);
      } else {
        alert("Failed to reset pay period. Please try again.");
      }
    } catch (error) {
      console.error("Error resetting pay period:", error);
      alert("An error occurred while resetting the pay period.");
    } finally {
      setIsResetting(false);
    }
  };

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
          color="warning"
          onClick={() => setResetDialogOpen(true)}
          disabled={!currentPayPeriod}
        >
          Reset Pay Period
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => store.logoutUser()}
        >
          Logout
        </Button>
      </BtnContainer>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Reset Pay Period</DialogTitle>
        <DialogContent>
          <p>
            Are you sure you want to reset this pay period? This will:
          </p>
          <ul>
            <li>Delete all modified bank accounts for this period</li>
            <li>Delete all modified expenses for this period</li>
            <li>Delete the current pay period</li>
            <li>Create a fresh pay period with the same dates</li>
            <li>Regenerate bank accounts and expenses from master data</li>
          </ul>
          <p><strong>This action cannot be undone.</strong></p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} disabled={isResetting}>
            Cancel
          </Button>
          <Button 
            onClick={handleResetPayPeriod} 
            color="warning" 
            variant="contained"
            disabled={isResetting}
          >
            {isResetting ? "Resetting..." : "Reset Pay Period"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default MainPage;
