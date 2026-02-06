import React from 'react';
import { Item } from '@shared/types';
import clsx from 'clsx';

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
  <div className="magazine-list">
    {items.map((item) => (
      <article key={item.id} className={clsx('mag-card', item.isRead && 'card-read')} onClick={() => onOpen(item)}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="mag-image" />
        ) : (
          <div className="mag-image placeholder" />
        )}
        <div className="mag-body">
          <div className="mag-title">{item.title}</div>
          <div className="mag-feed muted">{item.feedTitle}</div>
          <div className="mag-snippet muted">{item.snippet || item.content || ''}</div>
          <div className="mag-footer muted">
            <span className="mag-meta-footer">
              <span className="mag-meta-feed">{item.feedTitle}</span>
              <span>·</span>
              <span>{timeAgo(item.publishedAt)}</span>
            </span>
            <div className="mag-actions">
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
        </div>
      </article>
    ))}
  </div>
);
