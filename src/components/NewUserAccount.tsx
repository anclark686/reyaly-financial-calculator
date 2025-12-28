import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { CalculatorStore } from "../utils/store";

interface NewAccountProps {
  store: CalculatorStore;
}

function NewUserAccount({ store }: NewAccountProps) {
  const { username, password, confirmPassword, loginError } = store.getState();

  return (
    <div>
      {loginError && (
        <div style={{ color: "red", marginBottom: "10px" }}>{loginError}</div>
      )}

      <TextField
        label="Username"
        variant="outlined"
        fullWidth
        margin="normal"
        value={username}
        onChange={(e) => store.setUsername(e.target.value)}
      />
      <TextField
        label="Password"
        type="password"
        variant="outlined"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => store.setPassword(e.target.value)}
      />
      <TextField
        label="Confirm Password"
        type="password"
        variant="outlined"
        fullWidth
        margin="normal"
        value={confirmPassword}
        onChange={(e) => store.setConfirmPassword(e.target.value)}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => store.createNewAccount()}
      >
        Create Account
      </Button>
    </div>
  );
}

export default NewUserAccount;
