import { useState } from "react";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import styled from "@emotion/styled";

import type { MainComponentProps, PayPeriodExpense } from "../utils/types";

const FormContainer = styled(Card)`
  margin: 16px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;

  div[role="combobox"] {
    text-align: left;
  }
`;

function NewExpenseForm({ store, master }: MainComponentProps) {
  const { selectedExpense, selectedPayPeriodExpense } = store.getState();
  const expense = master ? selectedExpense : selectedPayPeriodExpense;
  const dueDateValue = master
    ? selectedExpense?.dueDate
    : selectedPayPeriodExpense?.nextDueDate;
  const [name, setName] = useState(expense?.name || "");
  const [amount, setAmount] = useState(
    expense?.amount ? Math.abs(expense.amount).toString() : ""
  );
  const [type, setType] = useState<"withdrawal" | "deposit">(
    expense?.type || "withdrawal"
  );
  const [dueDate, setDueDate] = useState(dueDateValue || "");
  const [frequency, setFrequency] = useState<
    "monthly" | "bi-weekly" | "every 30 days" | "one-time"
  >(expense?.frequency || (master ? "monthly" : "one-time"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !dueDate) {
      alert("Please fill in all required fields");
      return;
    }

    const newExpenseData = {
      name,
      amount: type === "withdrawal" ? -parseFloat(amount) : parseFloat(amount),
      frequency,
      dueDate,
      type,
    };

    if (expense) {
      if (master) {
        store.updateExpense(expense.id, newExpenseData);
      } else {
        const modifiedPayPeriodExpense = {
          ...(expense as PayPeriodExpense),
          name,
          amount:
            type === "withdrawal" ? -parseFloat(amount) : parseFloat(amount),
          frequency,
          type,
        };
        store.updatePayPeriodExpense(modifiedPayPeriodExpense);
      }
    } else {
      store.addExpenseToUser(newExpenseData);
    }

    setName("");
    setAmount("");
    setDueDate("");
    setFrequency("monthly");
  };

  return (
    <FormContainer>
      <CardContent>
        <h3>{expense ? "Edit Expense" : "Add New Expense"}</h3>
        <TextField
          label="Expense Name"
          variant="outlined"
          fullWidth
          margin="normal"
          focused
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextField
          label="Amount"
          variant="outlined"
          fullWidth
          margin="normal"
          type="number"
          focused
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <FormControl fullWidth margin="normal" focused>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "withdrawal" | "deposit")
            }
          >
            <MenuItem value="withdrawal">Withdrawal</MenuItem>
            <MenuItem value="deposit">Deposit</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Due Date"
          variant="outlined"
          fullWidth
          margin="normal"
          type="date"
          focused
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {master && (
          <FormControl fullWidth margin="normal" focused>
            <InputLabel>Frequency</InputLabel>
            <Select
              label="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
              <MenuItem value="every 30 days">Every 30 Days</MenuItem>
              {!master && <MenuItem value="one-time">One-Time</MenuItem>}
            </Select>
          </FormControl>
        )}

        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {expense ? "Update Expense" : "Add Expense"}
        </Button>
      </CardContent>
    </FormContainer>
  );
}

export default NewExpenseForm;
