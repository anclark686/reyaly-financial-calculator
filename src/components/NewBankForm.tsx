import { useState } from "react";
import { CalculatorStore } from "../utils/store";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import styled from "@emotion/styled";
import { SketchPicker } from "react-color";

const FormContainer = styled(Card)`
  margin: 16px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const ColorLabel = styled.p`
  margin: 8px 0 0;
  font-weight: bold;
  text-align: left;
`;

function NewBankForm({ store }: { store: CalculatorStore }) {
  const { selectedBankAccount } = store.getState();
  const [name, setName] = useState(selectedBankAccount?.name || "");
  const [startingBalance, setStartingBalance] = useState(
    selectedBankAccount?.startingBalance || parseFloat("")
  );
  const [color, setColor] = useState(selectedBankAccount?.color || "#000000");
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || startingBalance === undefined || startingBalance < 0) {
      alert(
        "Please enter a valid account name and starting balance (must be positive)"
      );
      return;
    }

    const bankAccountData = {
      name,
      startingBalance: parseFloat(startingBalance.toString()),
      color,
    };

    if (selectedBankAccount) {
      store.updateBankAccount(selectedBankAccount.id, bankAccountData);
    } else {
      store.addBankAccountToUser(bankAccountData);
    }

    setName("");
    setStartingBalance(0);
    setColor("#fff");

    store.setNewBankAccountFormOpen(false);
  };

  return (
    <FormContainer>
      <CardContent>
        <h3>
          {selectedBankAccount ? "Edit Bank Account" : "Add New Bank Account"}
        </h3>
        <TextField
          label="Account Name"
          variant="outlined"
          fullWidth
          margin="normal"
          focused
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Starting Balance"
          variant="outlined"
          fullWidth
          margin="normal"
          type="number"
          focused
          value={startingBalance}
          onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
        />

        <ColorLabel>Color: {color}</ColorLabel>
        <FormControl fullWidth margin="normal">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: color,
                border: "2px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              {showColorPicker ? "Hide" : "Show"} Color Picker
            </Button>
          </div>
          {showColorPicker && (
            <div style={{ marginTop: "10px", position: "relative" }}>
              <SketchPicker
                color={color}
                onChange={(newColor) => setColor(newColor.hex)}
                presetColors={[
                  "#000000",
                  "#FF0000",
                  "#00FF00",
                  "#0000FF",
                  "#FFFF00",
                  "#FF00FF",
                  "#00FFFF",
                  "#FFFFFF",
                  "#808080",
                  "#FFA500",
                  "#800080",
                  "#FFC0CB",
                ]}
              />
            </div>
          )}
        </FormControl>

        <Button variant="contained" color="primary" onClick={handleSubmit}>
          {selectedBankAccount ? "Update Bank Account" : "Add New Bank Account"}
        </Button>
      </CardContent>
    </FormContainer>
  );
}

export default NewBankForm;
