import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api';
import type { UserProfile } from '@shared/types';

type Props = { onAuthenticated: (user: UserProfile) => void };

export const AuthPage: React.FC<Props> = ({ onAuthenticated }) => {
  const [creatingAccount, setCreatingAccount] = useState(() => window.location.pathname === '/register');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setMode = (nextCreatingAccount: boolean) => {
    setCreatingAccount(nextCreatingAccount);
    setError(null);
    window.history.replaceState({}, '', nextCreatingAccount ? '/register' : '/login');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = creatingAccount ? await api.register(email, name, password) : await api.login(email, password);
      window.history.replaceState({}, '', '/');
      onAuthenticated(user);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        bgcolor: '#0d0f12',
        background: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.12), transparent 36%), #0d0f12'
      }}
    >
      <Paper component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Stack spacing={2.25}>
          <Box>
            <Typography variant="h4" fontWeight={900} letterSpacing={-0.8}>
              Kunai
            </Typography>
            <Typography color="var(--muted)">{creatingAccount ? 'Create your account' : 'Sign in to your reader'}</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label={creatingAccount ? 'Email Address' : 'Email'} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
          {creatingAccount && <TextField label="Name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />}
          <TextField label="Password" type="password" autoComplete={creatingAccount ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth helperText={creatingAccount ? 'Use at least 10 characters.' : undefined} />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{
              background: '#4177c2',
              '&:hover': { background: '#4177c2' }
            }}
          >
            {creatingAccount ? 'Create account' : 'Sign in'}
          </Button>
          <Button type="button" variant="text" onClick={() => setMode(!creatingAccount)} disabled={submitting}>
            {creatingAccount ? 'Back to sign in' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
