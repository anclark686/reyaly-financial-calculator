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
import { formatDate } from "../utils/helpers";

import type {
  MainComponentProps,
  Expense,
  PayPeriodExpense,
} from "../utils/types";

const HeaderRow = styled(TableRow)`
  background-color: #f5f5f5;

  th {
    font-weight: bold;
  }
`;

const StyledButtonContainer = styled.div`
  margin: 1.5rem auto;
`;

function ExpenseList({ store, master }: MainComponentProps) {
  const { newExpenseFormOpen, masterExpenses, payPeriodExpenses } =
    store.getState();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null
  );

  const expenseArray = master ? masterExpenses?.filter((expense) => expense.frequency !== 'one-time') : payPeriodExpenses;

  const getDisplayDate = (expense: Expense | PayPeriodExpense) => {
    if (master) {
      const masterExpense = expense as Expense;
      return formatDate(masterExpense.nextDueDate || masterExpense.dueDate);
    } else {
      const payPeriodExpense = expense as PayPeriodExpense;
      console.log("Pay period expense:", payPeriodExpense);
      console.log(
        "Pay period expense nextDueDate:",
        payPeriodExpense.nextDueDate
      );
      return formatDate(payPeriodExpense.nextDueDate);
    }
  };

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
      if (master) {
        const expense = masterExpenses?.find((e) => e.id === selectedExpenseId);

        if (expense) {
          store.setSelectedExpense(expense ?? null);
          store.setNewExpenseFormOpen(true);
        }
      } else {
        const payPeriodExpense = payPeriodExpenses?.find(
          (e) => e.id === selectedExpenseId
        );

        if (payPeriodExpense) {
          store.setSelectedPayPeriodExpense(payPeriodExpense ?? null);
          store.setNewExpenseFormOpen(true);
        }
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
              {master && <TableCell>Frequency</TableCell>}
              {!master && <TableCell>Accounted For</TableCell>}
              <TableCell>Actions</TableCell>
            </HeaderRow>
          </TableHead>
          <TableBody>
            {expenseArray &&
              expenseArray
                .sort(
                  (a, b) =>
                    new Date(a.nextDueDate!).getTime() -
                    new Date(b.nextDueDate!).getTime()
                )
                .map((expense) => {
                  const assignedAccounts = store.getBankAccountsForExpense(
                    expense.id
                  );
                  const isAccountedFor = assignedAccounts.length > 0;

                  return (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.name}</TableCell>
                      {expense.type === "withdrawal" ? (
                        <TableCell style={{ color: "red" }}>
                          -${Math.abs(expense.amount).toFixed(2)}
                        </TableCell>
                      ) : (
                        <TableCell style={{ color: "green" }}>
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell>{getDisplayDate(expense)}</TableCell>
                      {master && <TableCell>{expense.frequency}</TableCell>}
                      {!master && (
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
                      )}
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

      {newExpenseFormOpen && <NewExpenseForm store={store} master={master} />}

      {master ? (
        <StyledButtonContainer>
          <Button
            variant="contained"
            color="primary"
            onClick={() => store.setNewExpenseFormOpen(!newExpenseFormOpen)}
          >
            {newExpenseFormOpen ? "Cancel" : "Add New Expense"}
          </Button>
        </StyledButtonContainer>
      ) : (
        <StyledButtonContainer>
          <Button
            variant="contained"
            color="primary"
            onClick={() => store.setNewExpenseFormOpen(!newExpenseFormOpen)}
          >
            {newExpenseFormOpen ? "Cancel" : "Add One-Time Expense"}
          </Button>
        </StyledButtonContainer>
      )}
    </div>
  );
}

export default ExpenseList;
