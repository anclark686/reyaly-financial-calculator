import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import { CalculatorStore } from "../utils/store";

interface ExpensesModalProps {
  open: boolean;
  onClose: () => void;
  store: CalculatorStore;
}

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
  color: "#000",
};

function ExpensesModal({ open, onClose, store }: ExpensesModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const { expenses, selectedBankAccount } = store.getState();

  const fullClose = () => {
    setIsEditing(false);
    setSelectedExpenseIds([]);
    onClose();
  };

  const handleExpenseToggle = (expenseId: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleAddExpenses = async () => {
    if (selectedBankAccount) {
      for (const expenseId of selectedExpenseIds) {
        await store.addExpenseToBankAccount(selectedBankAccount.id, expenseId);
      }
      setIsEditing(false);
      setSelectedExpenseIds([]);
    }
  };

  const handleRemoveExpense = async (expenseId: string) => {
    if (selectedBankAccount) {
      await store.removeExpenseFromBankAccount(
        selectedBankAccount.id,
        expenseId
      );
    }
  };

  // Get expenses for the selected bank account
  const bankAccountExpenses = selectedBankAccount
    ? store.getExpensesForBankAccount(selectedBankAccount.id)
    : [];

  return (
    <Modal open={open} onClose={fullClose}>
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Expenses for {selectedBankAccount?.name || "Selected Account"}
        </Typography>
        <Typography id="modal-modal-description" sx={{ mt: 2 }}>
          {selectedBankAccount ? (
            <div>
              {bankAccountExpenses.length > 0 ? (
                bankAccountExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      <strong>{expense.name}:</strong> $
                      {expense.amount.toFixed(2)}
                    </span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveExpense(expense.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p>No expenses assigned to this account</p>
              )}
            </div>
          ) : (
            <p>No account selected</p>
          )}
        </Typography>

        {/* Show total expenses amount */}
        {selectedBankAccount && bankAccountExpenses.length > 0 && (
          <Typography variant="h6" sx={{ mt: 2, fontWeight: "bold" }}>
            Total Expenses: $
            {bankAccountExpenses
              .reduce((total, expense) => total + expense.amount, 0)
              .toFixed(2)}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Button variant="contained" color="secondary" onClick={fullClose}>
            Close
          </Button>
          <Button
            variant="contained"
            sx={{ ml: 2 }}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel Edit" : "Add Expense"}
          </Button>
        </Box>

        {isEditing && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">Add Existing Expense</Typography>
            {expenses &&
              expenses.map((expense) => {
                const assignedAccounts = store.getBankAccountsForExpense(
                  expense.id
                );
                const isAssignedToOtherAccount = assignedAccounts.some(
                  (account) => account.id !== selectedBankAccount?.id
                );
                const isAssignedToCurrentAccount = assignedAccounts.some(
                  (account) => account.id === selectedBankAccount?.id
                );

                return (
                  <FormGroup key={expense.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            selectedExpenseIds.includes(expense.id) ||
                            isAssignedToCurrentAccount
                          }
                          onChange={() =>
                            !isAssignedToOtherAccount &&
                            handleExpenseToggle(expense.id)
                          }
                          disabled={
                            isAssignedToOtherAccount ||
                            isAssignedToCurrentAccount
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography
                            sx={{
                              textDecoration: isAssignedToOtherAccount
                                ? "line-through"
                                : "none",
                              color: isAssignedToOtherAccount
                                ? "text.secondary"
                                : "text.primary",
                              fontSize: "0.875rem",
                            }}
                          >
                            {expense.name}: ${expense.amount.toFixed(2)}
                          </Typography>
                          {isAssignedToOtherAccount && (
                            <Typography variant="caption" color="error">
                              Already in:{" "}
                              {assignedAccounts
                                .map((acc) => acc.name)
                                .join(", ")}
                            </Typography>
                          )}
                          {isAssignedToCurrentAccount && (
                            <Typography variant="caption" color="primary">
                              ✓ Already in this account
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </FormGroup>
                );
              })}

            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={handleAddExpenses}
              disabled={selectedExpenseIds.length === 0}
            >
              Add Selected Expenses ({selectedExpenseIds.length})
            </Button>
          </Box>
        )}
      </Box>
    </Modal>
  );
}

export default ExpensesModal;
