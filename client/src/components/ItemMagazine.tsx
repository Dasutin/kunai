import React from 'react';
import { Box, Card, IconButton, Stack, Typography } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Item } from '@shared/types';

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

type Props = {
  items: Item[];
  onOpen: (item: Item) => void;
  onToggleRead: (item: Item, next: boolean) => void;
  savedIds: Set<number>;
  onToggleSave: (item: Item) => void;
};

export const ItemMagazine: React.FC<Props> = ({ items, onOpen, onToggleRead, savedIds, onToggleSave }) => (
  <Stack spacing={1.5} sx={{ overflowX: 'hidden' }}>
    {items.map((item) => {
      const saved = savedIds.has(item.id);
      return (
        <Card
          key={item.id}
          data-kunai-item="true"
          onClick={() => onOpen(item)}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '120px minmax(0, 1fr)',
              sm: '150px minmax(0, 1fr)',
              md: '180px minmax(0, 1fr)',
              lg: '220px minmax(0, 1fr)'
            },
            width: '100%',
            bgcolor: 'var(--panel)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 2,
            boxShadow: 'var(--shadow)',
            color: 'var(--text)',
            cursor: 'pointer',
            overflow: 'hidden',
            opacity: item.isRead ? 0.6 : 1,
            filter: item.isRead ? 'grayscale(0.4)' : 'none'
          }}
        >
          {item.imageUrl ? (
            <Box
              component="img"
              src={item.imageUrl}
              alt=""
              sx={{
                width: '100%',
                height: { xs: 120, sm: 150, md: 180, lg: 220 },
                objectFit: 'cover',
                bgcolor: 'var(--panel-2)'
              }}
            />
          ) : (
            <Box sx={{ width: '100%', height: { xs: 120, sm: 150, md: 180, lg: 220 }, bgcolor: 'rgba(255, 255, 255, 0.04)' }} />
          )}
          <Box
            sx={{
              minHeight: { xs: 120, sm: 150, md: 180, lg: 220 },
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              minWidth: 0
            }}
          >
            <Typography
              fontWeight={800}
              lineHeight={1.3}
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {item.title}
            </Typography>
            <Typography variant="body2" color="var(--muted)" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {item.feedTitle}
            </Typography>
            <Typography
              color="var(--muted)"
              sx={{
                fontSize: { xs: 13, sm: 14, md: 15 },
                lineHeight: { xs: 1.35, sm: 1.4, md: 1.5 },
                display: '-webkit-box',
                WebkitLineClamp: { xs: 2, sm: 3, md: 4 },
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {item.snippet || item.content || ''}
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.25} sx={{ mt: 'auto' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" minWidth={0}>
                <Typography variant="caption" color="var(--muted)" noWrap>
                  {item.feedTitle}
                </Typography>
                <Typography variant="caption" color="var(--muted)">
                  ·
                </Typography>
                <Typography variant="caption" color="var(--muted)" noWrap>
                  {timeAgo(item.publishedAt)}
                </Typography>
              </Stack>
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
            </Stack>
          </Box>
        </Card>
      );
    })}
  </Stack>
);
