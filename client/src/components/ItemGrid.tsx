import React from 'react';
import { Item } from '@shared/types';
import clsx from 'clsx';

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
  <div className="cards">
    {items.map((item) => (
      <article key={item.id} className={clsx('card', item.isRead && 'card-read')} onClick={() => onOpen(item)}>
        {item.imageUrl && <img src={item.imageUrl} alt="" />}
        <div className="card-body">
          <div className="card-title">{item.title}</div>
          <div className="card-feed muted">{item.feedTitle}</div>
          {item.tags && item.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {item.tags.slice(0, 4).map((tag) => (
                <span key={`${item.id}-${tag.id}`} className="tag-pill">{tag.name}</span>
              ))}
            </div>
          )}
          <div className="card-footer">
            <div className="card-footer-left muted">{formatDate(item.publishedAt)}</div>
            <button
              className="btn-ghost icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(item);
              }}
              title={savedIds.has(item.id) ? 'Remove from saved' : 'Save article'}
            >
              <span className="material-icons">{savedIds.has(item.id) ? 'bookmark' : 'bookmark_border'}</span>
            </button>
            <button
              className="btn-ghost icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(item, !item.isRead);
              }}
              title={item.isRead ? 'Mark unread' : 'Mark read'}
            >
              <span className="material-icons">{item.isRead ? 'radio_button_unchecked' : 'radio_button_checked'}</span>
            </button>
          </div>
        </div>
      </article>
    ))}
  </div>
);
