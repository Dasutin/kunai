import React from 'react';
import { Box, Card, CardActions, CardContent, CardMedia, Chip, IconButton, Stack, Typography } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Item } from '@shared/types';

const formatDate = (iso: string | null) => {
  if (!iso) return 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h`;
  return `${mins}m`;
};

type Props = {
  items: Item[];
  onOpen: (item: Item) => void;
  onToggleRead: (item: Item, next: boolean) => void;
  savedIds: Set<number>;
  onToggleSave: (item: Item) => void;
};

export const ItemGrid: React.FC<Props> = ({ items, onOpen, onToggleRead, savedIds, onToggleSave }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 2,
      width: '100%',
      '@media (max-width: 640px)': {
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
      }
    }}
  >
    {items.map((item) => {
      const saved = savedIds.has(item.id);
      return (
        <Card
          key={item.id}
          data-kunai-item="true"
          onClick={() => onOpen(item)}
          sx={{
            bgcolor: item.isRead ? 'var(--surface-read)' : 'var(--surface-raised)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow)',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: item.isRead ? 0.6 : 1,
            filter: item.isRead ? 'grayscale(0.4)' : 'none',
            transition: 'transform 0.1s ease, border-color 0.15s ease, background-color 0.15s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: 'rgba(56, 189, 248, 0.35)'
            }
          }}
        >
          {item.imageUrl ? (
            <CardMedia component="img" image={item.imageUrl} alt="" sx={{ height: 220, bgcolor: 'var(--panel-2)', objectFit: 'cover' }} />
          ) : (
            <Box sx={{ height: 220, bgcolor: 'var(--panel-2)' }} />
          )}
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minHeight: 108, p: 1.75 }}>
            <Typography
              fontWeight={800}
              sx={{
                color: '#c1c4c7',
                display: '-webkit-box',
                fontWeight: 800,
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.35 }}>
              {item.feedTitle}
            </Typography>
            {item.tags && item.tags.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {item.tags.slice(0, 4).map((tag) => (
                  <Chip key={`${item.id}-${tag.id}`} label={tag.name} size="small" variant="outlined" sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
                ))}
              </Stack>
            )}
          </CardContent>
          <CardActions
            sx={{
              justifyContent: 'space-between',
              px: 1.75,
              pb: 1.5,
              pt: 0,
              color: 'var(--muted)',
              '& .MuiTypography-root': {
                fontSize: 12,
                lineHeight: 1.35
              }
            }}
          >
            <Typography variant="body2" sx={{ color: 'var(--muted)' }}>
              {formatDate(item.publishedAt)}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
              <IconButton
                aria-label={saved ? 'Remove from saved' : 'Save article'}
                title={saved ? 'Remove from saved' : 'Save article'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(item);
                }}
              >
                {saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              </IconButton>
              <IconButton
                aria-label={item.isRead ? 'Mark unread' : 'Mark read'}
                title={item.isRead ? 'Mark unread' : 'Mark read'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(item, !item.isRead);
                }}
              >
                {item.isRead ? <RadioButtonUncheckedIcon /> : <RadioButtonCheckedIcon />}
              </IconButton>
            </Stack>
          </CardActions>
        </Card>
      );
    })}
  </Box>
);
