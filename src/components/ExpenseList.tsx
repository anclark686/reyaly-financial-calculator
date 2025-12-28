import { useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import { MoreHoriz, AccountBalance } from "@mui/icons-material";
import styled from "@emotion/styled";

import NewExpenseForm from "./NewExpenseForm";
import { CalculatorStore } from "../utils/store";
import { formatDate } from "../utils/helpers";

const HeaderRow = styled(TableRow)`
  background-color: #f5f5f5;

  th {
    font-weight: bold;
  }
`;

const StyledButtonContainer = styled.div`
  margin: 1.5rem auto;
`;

function ExpenseList({ store }: { store: CalculatorStore }) {
  const { newExpenseFormOpen } = store.getState();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null
  );

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    expenseId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpenseId(expenseId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExpenseId(null);
  };

  const handleDeleteExpense = () => {
    if (selectedExpenseId) {
      store.deleteExpense(selectedExpenseId);
    }
    handleMenuClose();
  };

  const handleEditExpense = () => {
    if (selectedExpenseId) {
      const expense = store
        .getState()
        .expenses?.find((e) => e.id === selectedExpenseId);
      if (expense) {
        store.setSelectedExpense(expense);
        store.setNewExpenseFormOpen(true);
      }
    }
    handleMenuClose();
  };

  return (
    <div className="expense-list">
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <HeaderRow>
              <TableCell>Expense Name</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Next Due Date</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Accounted For</TableCell>
              <TableCell>Actions</TableCell>
            </HeaderRow>
          </TableHead>
          <TableBody>
            {store.getState().expenses?.map((expense) => {
              const assignedAccounts = store.getBankAccountsForExpense(
                expense.id
              );
              const isAccountedFor = assignedAccounts.length > 0;

              return (
                <TableRow key={expense.id}>
                  <TableCell>{expense.name}</TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {formatDate(expense.nextDueDate || expense.dueDate)}
                  </TableCell>
                  <TableCell>{expense.frequency}</TableCell>
                  <TableCell>
                    {isAccountedFor ? (
                      <Tooltip
                        title={`Assigned to: ${assignedAccounts
                          .map((acc) => acc.name)
                          .join(", ")}`}
                        arrow
                      >
                        <Chip
                          icon={<AccountBalance />}
                          label={`${assignedAccounts.length} Account(s)`}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                    ) : (
                      <Chip
                        label="Unassigned"
                        color="default"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, expense.id)}
                      size="small"
                    >
                      <MoreHoriz />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteExpense}>Delete Expense</MenuItem>
        <MenuItem onClick={handleEditExpense}>Edit Expense</MenuItem>
      </Menu>

      {newExpenseFormOpen && <NewExpenseForm store={store} />}

      <StyledButtonContainer>
        <Button
          variant="contained"
          color="primary"
          onClick={() => store.setNewExpenseFormOpen(!newExpenseFormOpen)}
        >
          {newExpenseFormOpen ? "Cancel" : "Add New Expense"}
        </Button>
      </StyledButtonContainer>
    </div>
  );
}

export default ExpenseList;
