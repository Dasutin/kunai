import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';

type Props = {
  onSubmit: (url: string, title?: string) => Promise<void>;
  onClose: () => void;
};

export const AddFeedModal: React.FC<Props> = ({ onSubmit, onClose }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(url, title || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add RSS feed</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField label="Feed URL" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus fullWidth />
          <TextField label="Optional title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose} disabled={loading}>
          Close
        </Button>
        <Button variant="contained" onClick={handle} disabled={loading}>
          {loading ? 'Adding...' : 'Add feed'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
