import React from 'react';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Item, Tag } from '@shared/types';
import { kunaiLayout } from '../theme';

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
  expandedId: number | null;
  onExpand: (id: number) => void;
  onToggleRead: (item: Item, next: boolean) => void;
  onOpenModal: (item: Item) => void;
  onUpdateTags: (item: Item, add?: (number | string)[], remove?: (number | string)[]) => void;
  savedIds: Set<number>;
  onToggleSave: (item: Item) => void;
};

const readIcon = (isRead?: boolean) => (isRead ? <RadioButtonUncheckedIcon /> : <RadioButtonCheckedIcon />);
const savedIcon = (saved: boolean) => (saved ? <BookmarkIcon /> : <BookmarkBorderIcon />);

export const ItemList: React.FC<Props> = ({ items, expandedId, onExpand, onToggleRead, onUpdateTags, savedIds, onToggleSave }) => {
  const removeTag = (item: Item, tag: Tag) => {
    onUpdateTags(item, undefined, [tag.id]);
  };

  return (
    <Stack spacing={1.25}>
      {items.map((item) => {
        const expanded = expandedId === item.id;
        const saved = savedIds.has(item.id);
        return (
          <Paper
            key={item.id}
            data-kunai-item="true"
            onClick={() => onExpand(item.id)}
            sx={{
              bgcolor: 'var(--panel)',
              border: '1px solid',
              borderColor: !item.isRead ? 'rgba(56, 189, 248, 0.55)' : 'rgba(255, 255, 255, 0.06)',
              borderRadius: 2,
              color: 'var(--text)',
              cursor: 'pointer',
              overflow: 'hidden',
              p: 1.5
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr) auto',
                  sm: 'auto auto minmax(110px, 150px) minmax(0, 1fr) auto'
                },
                gridTemplateAreas: {
                  xs: '"feed time" "title title"',
                  sm: '"read save feed title time"'
                },
                alignItems: 'center',
                gap: { xs: 0.75, sm: 1.25 }
              }}
            >
              <IconButton
                aria-label={item.isRead ? 'Mark unread' : 'Mark read'}
                title={item.isRead ? 'Mark unread' : 'Mark read'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(item, !item.isRead);
                }}
                sx={{ gridArea: 'read', display: { xs: 'none', sm: 'inline-flex' }, width: 34, height: 34 }}
              >
                {readIcon(item.isRead)}
              </IconButton>
              <IconButton
                aria-label={saved ? 'Remove from saved' : 'Save article'}
                title={saved ? 'Remove from saved' : 'Save article'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(item);
                }}
                sx={{ gridArea: 'save', display: { xs: 'none', sm: 'inline-flex' }, width: 34, height: 34 }}
              >
                {savedIcon(saved)}
              </IconButton>
              <Typography variant="body2" color="var(--muted)" noWrap title={item.feedTitle || ''} sx={{ gridArea: 'feed' }}>
                {item.feedTitle}
              </Typography>
              <Typography fontWeight={800} noWrap title={item.title} sx={{ gridArea: 'title' }}>
                {item.title}
              </Typography>
              <Typography variant="caption" color="var(--muted)" textAlign="right" title={item.publishedAt || ''} noWrap sx={{ gridArea: 'time' }}>
                {timeAgo(item.publishedAt)}
              </Typography>
            </Box>

            {expanded && (
              <Box
                onClick={(e) => e.stopPropagation()}
                sx={{
                  maxWidth: kunaiLayout.modalContentWidth,
                  width: '100%',
                  mx: 'auto',
                  mt: 1.5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'flex-start'
                }}
              >
                <Stack spacing={1} width="100%">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      aria-label={item.isRead ? 'Mark unread' : 'Mark read'}
                      title={item.isRead ? 'Mark unread' : 'Mark read'}
                      onClick={() => onToggleRead(item, !item.isRead)}
                    >
                      {readIcon(item.isRead)}
                    </IconButton>
                    <IconButton
                      aria-label={saved ? 'Remove from saved' : 'Save article'}
                      title={saved ? 'Remove from saved' : 'Save article'}
                      onClick={() => onToggleSave(item)}
                    >
                      {savedIcon(saved)}
                    </IconButton>
                  </Stack>
                  <Box sx={{ height: 2, bgcolor: 'rgba(56, 189, 248, 0.45)', boxShadow: '0 0 0 1px rgba(56, 189, 248, 0.3)' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      <a href={item.link} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
                      <Typography variant="body2" color="var(--muted)">
                        {item.feedTitle}
                      </Typography>
                      <Typography variant="body2" color="var(--muted)">
                        ·
                      </Typography>
                      <Typography variant="body2" color="var(--muted)">
                        {timeAgo(item.publishedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                {!item.readableContent && item.imageUrl && (
                  <Box
                    component="img"
                    src={item.imageUrl}
                    alt=""
                    sx={{ width: 180, height: 'auto', maxHeight: 200, objectFit: 'cover', borderRadius: 2 }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 280, maxWidth: kunaiLayout.modalContentWidth, overflowWrap: 'break-word' }}>
                  {item.readableContent ? (
                    <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.readableContent }} />
                  ) : item.content ? (
                    <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.content }} />
                  ) : (
                    <Typography color="var(--muted)">{item.snippet || 'No snippet available.'}</Typography>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                      {item.tags.map((tag) => (
                        <Chip
                          key={`${item.id}-${tag.id}`}
                          label={tag.name}
                          size="small"
                          variant="outlined"
                          onDelete={() => removeTag(item, tag)}
                          sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
};
