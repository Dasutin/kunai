import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';

type Props = {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

export const CreateFolderModal: React.FC<Props> = ({ onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>New folder</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handle();
            }}
            autoFocus
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose} disabled={loading}>
          Close
        </Button>
        <Button variant="contained" onClick={handle} disabled={loading}>
          {loading ? 'Creating...' : 'Create folder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
