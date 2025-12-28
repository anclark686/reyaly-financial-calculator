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

import { CalculatorStore } from "../utils/store";

const FormContainer = styled(Card)`
  margin: 16px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

function NewExpenseForm({ store }: { store: CalculatorStore }) {
  const { selectedExpense } = store.getState();
  const [name, setName] = useState(selectedExpense?.name || "");
  const [amount, setAmount] = useState(
    selectedExpense?.amount.toString() || ""
  );
  const [dueDate, setDueDate] = useState(selectedExpense?.dueDate || "");
  const [frequency, setFrequency] = useState<
    "monthly" | "bi-weekly" | "every 30 days" | "one-time"
  >(selectedExpense?.frequency || "monthly");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle form submission
    console.log({ name, amount, dueDate, frequency });
    const newExpenseData = {
      name,
      amount: parseFloat(amount),
      dueDate,
      frequency,
    };
    console.log("New expense:", newExpenseData);
    // Call the store method to add the expense
    if (selectedExpense) {
      store.updateExpense(selectedExpense.id, newExpenseData);
    } else {
      store.addExpenseToUser(newExpenseData);
    }
    // Reset form after submission
    setName("");
    setAmount("");
    setDueDate("");
    setFrequency("monthly");
  };

  return (
    <FormContainer>
      <CardContent>
        <h3>{selectedExpense ? "Edit Expense" : "Add New Expense"}</h3>
        <TextField
          label="Expense Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Amount"
          variant="outlined"
          fullWidth
          margin="normal"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextField
          label="Due Date"
          variant="outlined"
          fullWidth
          margin="normal"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Frequency</InputLabel>
          <Select
            label="Frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
            <MenuItem value="every 30 days">Every 30 Days</MenuItem>
            <MenuItem value="one-time">One-Time</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {selectedExpense ? "Update Expense" : "Add Expense"}
        </Button>
      </CardContent>
    </FormContainer>
  );
}

export default NewExpenseForm;
