import { useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import styled from "@emotion/styled";

import type { MainComponentProps } from "../utils/types";
// import LoadingSpinner from "./LoadingSpinner";

const PayInfoContainer = styled.div`
  margin: 2rem 0;
`;

const InputContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
`;

const ButtonContainer = styled.div`
  margin: 1rem 0;
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const DateContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;


const InfoContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem;
  justify-content: center;
`;


function PayInfo({ store, master }: MainComponentProps) {
  const { payInfo } = store.getState();
  const [editing, setEditing] = useState(false);
  const [takeHome, setTakeHome] = useState(
    payInfo?.takeHomePay?.toString() || ""
  );
  const [startDate, setStartDate] = useState(payInfo?.startDate || "");
  const [frequency, setFrequency] = useState<
    "bi-weekly" | "monthly" | "weekly" | "semi-monthly"
  >(payInfo?.payFrequency || "bi-weekly");

  const handleSave = async () => {
    console.log("Save clicked with:", { takeHome, startDate, frequency });
    if (!takeHome || !startDate) {
      alert("Missing required fields");
      return;
    }
    
    const success = await store.saveUserPayInfo({
      takeHomePay: parseFloat(takeHome),
      startDate,
      payFrequency: frequency,
    });
    
    if (success) {
      setEditing(false);
    } else {
      alert("Error saving pay information");
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setTakeHome(payInfo?.takeHomePay?.toString() || "");
    setStartDate(payInfo?.startDate || "");
    setFrequency(payInfo?.payFrequency || "bi-weekly");
    setEditing(false);
  };

  return (
    <PayInfoContainer>
      <Card>
        <CardContent>
          {master ? (
            <Typography variant="h6">Pay Information</Typography>
          ) : (
            <Typography variant="h6">Pay Period</Typography>
          )}

          {!editing && (
            <>
            {master ? (
              <InfoContainer>
              <Typography variant="body1" color="text.secondary">
                <strong>Take Home: </strong>${payInfo?.takeHomePay?.toFixed(2) || "0.00"}
              </Typography>
              <Typography variant="body1" color="text.secondary"> | </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Frequency: </strong>{payInfo?.payFrequency || "bi-weekly"}
              </Typography>
              <Typography variant="body1" color="text.secondary"> | </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Start Date: </strong>{payInfo?.startDate || "N/A"}
              </Typography>
            </InfoContainer>
            ) : (
              <InfoContainer>
              <Typography variant="body1" color="text.secondary">
                <strong>Take Home: </strong>${payInfo?.takeHomePay?.toFixed(2) || "0.00"}
              </Typography>
            </InfoContainer>
            )}
            </>
          )}

          {!master && (
            <DateContainer>
            <IconButton
              onClick={() => store.onDateChange("previous")}
            >
              <ChevronLeft />
            </IconButton>

            <Typography
              variant="body1"
              style={{ minWidth: "150px", textAlign: "center" }}
            >
              {store.getCurrentPayPeriodDisplay()}
            </Typography>

            <IconButton
              onClick={() => store.onDateChange("next")}
            >
              <ChevronRight />
            </IconButton>
          </DateContainer>
          )}
          
          {editing && master && (
            <div>
              <InputContainer>
                <TextField
                  label="Est. Take Home"
                  variant="outlined"
                  fullWidth
                  focused
                  value={takeHome}
                  onChange={(e) => setTakeHome(e.target.value)}
                />
                <TextField
                  label="Start Date"
                  variant="outlined"
                  type="date"
                  fullWidth
                  focused
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </InputContainer>

              <FormControl fullWidth margin="normal" focused>
                <InputLabel>Frequency</InputLabel>
                <Select
                  label="Frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <MenuItem value="bi-weekly">Bi-Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="semi-monthly">Semi-Monthly</MenuItem>
                </Select>
              </FormControl>
            </div>
          )}

          {master && (
            <ButtonContainer>
              {editing ? (
                <>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color={editing ? "secondary" : "primary"}
                  onClick={() => setEditing(!editing)}
                >
                  Edit
                </Button>
              )}
            </ButtonContainer>
          )}
        </CardContent>
      </Card>
    </PayInfoContainer>
  );
}

export default PayInfo;
