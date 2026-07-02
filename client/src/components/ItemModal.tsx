import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import CloseIcon from '@mui/icons-material/Close';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RefreshIcon from '@mui/icons-material/Refresh';
import SellIcon from '@mui/icons-material/Sell';
import { Item, Tag } from '@shared/types';
import { kunaiLayout, kunaiScrollbarSx } from '../theme';

type Props = {
  item: Item;
  onClose: () => void;
  onUpdateTags: (item: Item, add?: (number | string)[], remove?: (number | string)[]) => void;
  onFetchContent: () => void;
  fetchingContent: boolean;
  canFetchContent: boolean;
  onToggleRead: (item: Item, next: boolean) => void;
  onToggleSave: (item: Item) => void;
  saved: boolean;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const ItemModal: React.FC<Props> = ({
  item,
  onClose,
  onUpdateTags,
  onFetchContent,
  fetchingContent,
  canFetchContent,
  onToggleRead,
  onToggleSave,
  saved
}) => {
  const fullScreen = useMediaQuery('(max-width:640px)');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const addTag = () => {
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    onUpdateTags(item, [trimmed]);
    setTagDraft('');
    setTagDialogOpen(false);
  };

  const removeTag = (tag: Tag) => onUpdateTags(item, undefined, [tag.id]);

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: fullScreen ? '100vw' : 'min(900px, 96vw)',
            maxHeight: fullScreen ? '100vh' : '98vh',
            borderRadius: fullScreen ? 0 : 2
          }
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: 'var(--panel-2)',
            px: fullScreen ? 1.75 : 2.25,
            pr: fullScreen ? 7 : 7,
            py: 1,
            borderBottom: '2px solid rgba(56, 189, 248, 0.45)'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title={item.isRead ? 'Mark unread' : 'Mark read'}>
              <IconButton aria-label={item.isRead ? 'Mark unread' : 'Mark read'} onClick={() => onToggleRead(item, !item.isRead)}>
                {item.isRead ? <RadioButtonUncheckedIcon /> : <RadioButtonCheckedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={saved ? 'Remove from saved' : 'Save article'}>
              <IconButton aria-label={saved ? 'Remove from saved' : 'Save article'} onClick={() => onToggleSave(item)}>
                {saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              </IconButton>
            </Tooltip>
            {canFetchContent && (
              <Tooltip title={fetchingContent ? 'Fetching readable content...' : item.readableContent ? 'Refresh readable content' : 'Load readable content'}>
                <span>
                  <IconButton aria-label="Fetch readable content" onClick={onFetchContent} disabled={fetchingContent}>
                    {fetchingContent ? <CircularProgress size={22} /> : <RefreshIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )}
            <Tooltip title="Add tag">
              <IconButton aria-label="Add tag" onClick={() => setTagDialogOpen(true)}>
                <SellIcon />
              </IconButton>
            </Tooltip>
          </Stack>
          <Tooltip title="Close">
            <IconButton
              aria-label="Close"
              onClick={onClose}
              sx={{
                position: 'absolute',
                right: fullScreen ? 8 : 12,
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </DialogTitle>

        <DialogContent
          sx={{
            px: fullScreen ? 2.25 : 2.25,
            pb: 2,
            color: '#c1c4c7',
            fontFamily: "'Public Sans', sans-serif",
            '& .MuiTypography-root': {
              color: 'inherit',
              fontFamily: 'inherit'
            },
            '& .article-body': {
              color: 'inherit',
              fontFamily: "'Merriweather', Georgia, serif",
              fontSize: 16
            },
            ...kunaiScrollbarSx
          }}
        >
          <Stack spacing={1.5} sx={{ maxWidth: kunaiLayout.modalContentWidth, mx: 'auto', pt: 1.5 }}>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5, fontSize: 28, lineHeight: 1.2 }}>
                <a href={item.link} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                useFlexGap
                flexWrap="wrap"
                sx={{ color: '#8d8f91', '& .MuiTypography-root': { color: 'inherit' } }}
              >
                <Typography variant="body2">
                  {item.feedTitle}
                </Typography>
                <Typography variant="body2">
                  ·
                </Typography>
                <Typography variant="body2">
                  {timeAgo(item.publishedAt || null)}
                </Typography>
              </Stack>
            </Box>

            {!item.readableContent && item.imageUrl && (
              <Box component="img" src={item.imageUrl} alt="" sx={{ width: '100%', height: 'auto', borderRadius: 2, objectFit: 'cover' }} />
            )}
            {item.readableContent ? (
              <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.readableContent }} />
            ) : item.content ? (
              <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.content }} />
            ) : (
              <Typography color="var(--muted)">{item.snippet || 'No snippet available.'}</Typography>
            )}
            {item.tags && item.tags.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {item.tags.map((tag) => (
                  <Chip
                    key={`${item.id}-${tag.id}`}
                    label={tag.name}
                    size="small"
                    variant="outlined"
                    onDelete={() => removeTag(tag)}
                    sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add tag</DialogTitle>
        <DialogContent>
          <TextField
            label="Tag name"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag();
            }}
            autoFocus
            fullWidth
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setTagDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={addTag} disabled={!tagDraft.trim()}>
            Add tag
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
