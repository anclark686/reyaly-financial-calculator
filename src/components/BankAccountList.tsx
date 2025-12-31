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
import Typography from "@mui/material/Typography";
import { MoreHoriz } from "@mui/icons-material";
import styled from "@emotion/styled";

import NewBankForm from "./NewBankForm";
import ExpensesModal from "./ExpensesModal";
import { getContrastColor } from "../utils/helpers";

import type { MainComponentProps } from "../utils/types";

const HeaderRow = styled(TableRow)`
  background-color: #f5f5f5;

  th {
    font-weight: bold;
  }
`;

// Helper function to determine if text should be white or black based on background color

const StyledButtonContainer = styled.div`
  margin: 1.5rem auto;
`;

function BankAccountList({ store, master }: MainComponentProps) {
  const { newBankAccountFormOpen, masterBankAccounts, payPeriodBankAccounts } =
    store.getState();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const bankAccountArray = master ? masterBankAccounts : payPeriodBankAccounts;

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    accountId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccountId(accountId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAccountId(null);
  };

  const handleViewExpenses = () => {
    if (selectedAccountId) {
      if (master) {
        const account = masterBankAccounts?.find(
          (a) => a.id === selectedAccountId
        );
        if (account) {
          store.setSelectedBankAccount(account);
          setModalOpen(true);
        }
      } else {
        const payPeriodAccount = payPeriodBankAccounts?.find(
          (a) => a.id === selectedAccountId
        );
        if (payPeriodAccount) {
          store.setSelectedPayPeriodBankAccount(payPeriodAccount);
          setModalOpen(true);
        }
      }
    }
    handleMenuClose();
  };

  const handleDeleteBankAccount = () => {
    if (selectedAccountId) {
      store.deleteBankAccount(selectedAccountId);
    }
    handleMenuClose();
  };

  const handleEditBankAccount = () => {
    if (selectedAccountId) {
      if (master) {
        const account = masterBankAccounts?.find(
          (a) => a.id === selectedAccountId
        );
        if (account) {
          store.setSelectedBankAccount(account);
          store.setNewBankAccountFormOpen(true);
        }
      } else {
        const payPeriodAccount = payPeriodBankAccounts?.find(
          (a) => a.id === selectedAccountId
        );
        if (payPeriodAccount) {
          store.setSelectedPayPeriodBankAccount(payPeriodAccount);
          store.setNewBankAccountFormOpen(true);
        }
      }
    }
    handleMenuClose();
  };

  return (
    <div className="bank-account-list">
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <HeaderRow>
              <TableCell>Account Name</TableCell>
              <TableCell>Starting Balance</TableCell>
              <TableCell>Current Balance</TableCell>
              <TableCell>Actions</TableCell>
            </HeaderRow>
          </TableHead>
          <TableBody>
            {bankAccountArray &&
              bankAccountArray.map((account) => (
                <TableRow
                  key={account.id}
                  style={{
                    backgroundColor: account.color || "inherit",
                    color: getContrastColor(account.color || "#000000"),
                  }}
                >
                  <TableCell
                    style={{
                      color: getContrastColor(account.color || "#000000"),
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {account.name}
                    </Typography>
                  </TableCell>
                  <TableCell
                    style={{
                      color: getContrastColor(account.color || "#000000"),
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      ${account.startingBalance.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    style={{
                      color: getContrastColor(account.color || "#000000"),
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      ${store.getCurrentBalance(account.id).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label="account actions"
                      aria-controls="account-menu"
                      aria-haspopup="true"
                      onClick={(event) => handleMenuClick(event, account.id)}
                    >
                      <MoreHoriz />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {!master && (
          <MenuItem onClick={handleViewExpenses}>View Expenses</MenuItem>
        )}
        <MenuItem onClick={handleDeleteBankAccount}>Delete Account</MenuItem>
        <MenuItem onClick={handleEditBankAccount}>Edit Account</MenuItem>
      </Menu>

      {master && (
        <>
          {newBankAccountFormOpen && <NewBankForm store={store} />}

          <StyledButtonContainer>
            <Button
              variant="contained"
              color="primary"
              onClick={() =>
                store.setNewBankAccountFormOpen(!newBankAccountFormOpen)
              }
            >
              {newBankAccountFormOpen ? "Cancel" : "Add New Bank Account"}
            </Button>
          </StyledButtonContainer>
        </>
      )}

      <ExpensesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        store={store}
      />
    </div>
  );
}

export default BankAccountList;
