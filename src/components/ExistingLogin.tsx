import { Button, TextField } from "@mui/material";

import { CalculatorStore } from "../utils/store";

interface ExistingLoginProps {
  store: CalculatorStore;
}

function ExistingLogin({ store }: ExistingLoginProps) {
  const { username, password, loginError } = store.getState();

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
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => store.loginWithEmailAndPassword()}
      >
        Login
      </Button>
    </div>
  );
}

export default ExistingLogin;
