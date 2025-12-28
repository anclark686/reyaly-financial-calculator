import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import styled from '@emotion/styled';

import { CalculatorStore } from '../utils/store';
import ExistingLogin from '../components/ExistingLogin';
import NewUserAccount from '../components/NewUserAccount';

const StyledCard = styled(Card)`
  margin: 20px auto;
  max-width: 400px;
  min-width: 200px;
`;

interface LoginPageProps {
  store: CalculatorStore;
}

function LoginPage({ store }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  const handleGoogleSignIn = async () => {
    await store.signInWithGoogle();
  };
  
  return (
    <div className="login-page">
    <StyledCard>
      <CardHeader title={isLogin ? "Login" : "Create Account"} />
      <CardContent>
        {isLogin ? <ExistingLogin store={store} /> : <NewUserAccount store={store} />}
        
        <Box sx={{ my: 2 }}>
          <Divider>OR</Divider>
        </Box>
        
        <Button
          variant="outlined"
          fullWidth
          onClick={handleGoogleSignIn}
          sx={{ mb: 2 }}
        >
          Sign in with Google
        </Button>
        
        <Button 
          variant="text" 
          onClick={() => setIsLogin(!isLogin)}
          fullWidth
        >
          {isLogin ? 'Create new account' : 'Back to login'}
        </Button>
      </CardContent>
    </StyledCard>
    </div>
  );
}

export default LoginPage;