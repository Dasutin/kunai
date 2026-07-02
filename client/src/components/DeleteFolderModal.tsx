import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

type Props = {
  folderName: string;
  feedCount: number;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const DeleteFolderModal: React.FC<Props> = ({ folderName, feedCount, loading = false, onConfirm, onClose }) => {
  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Delete folder</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography color="var(--muted)">This removes the folder only. RSS feeds are kept and moved to Newsfeed.</Typography>
          {feedCount > 0 && (
            <Alert icon={<WarningIcon />} severity="warning" variant="outlined">
              {feedCount === 1 ? '1 feed' : `${feedCount} feeds`} will be moved out of this folder.
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete <strong>{folderName}</strong>?
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete folder'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
