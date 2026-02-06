import React, { useEffect } from 'react';
import { Item, Tag } from '@shared/types';

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

export const ItemModal: React.FC<Props> = ({ item, onClose, onUpdateTags, onFetchContent, fetchingContent, canFetchContent, onToggleRead, onToggleSave, saved }) => {
  // Lock background scroll while the modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

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

  const addTag = () => {
    const val = window.prompt('Add tag');
    const trimmed = (val || '').trim();
    if (!trimmed) return;
    onUpdateTags(item, [trimmed]);
  };

  const removeTag = (tag: Tag) => onUpdateTags(item, undefined, [tag.id]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-top-row">
            <div className="modal-toolbar">
              <button
                className="icon-btn btn-ghost"
                title={item.isRead ? 'Mark unread' : 'Mark read'}
                onClick={() => onToggleRead(item, !item.isRead)}
              >
                <span className="material-icons">{item.isRead ? 'radio_button_unchecked' : 'radio_button_checked'}</span>
              </button>
              <button
                className="icon-btn btn-ghost"
                title={saved ? 'Remove from saved' : 'Save article'}
                onClick={() => onToggleSave(item)}
              >
                <span className="material-icons">{saved ? 'bookmark' : 'bookmark_border'}</span>
              </button>
              {canFetchContent && (
                <button
                  className="icon-btn btn-ghost"
                  title={fetchingContent ? 'Fetching readable content…' : item.readableContent ? 'Refresh readable content' : 'Load readable content'}
                  onClick={onFetchContent}
                  disabled={fetchingContent}
                >
                  <span className="material-icons">refresh</span>
                </button>
              )}
              <button
                className="icon-btn btn-ghost"
                title="Add tag"
                onClick={addTag}
              >
                <span className="material-icons">sell</span>
              </button>
            </div>
            <button className="btn-ghost close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="modal-divider prominent" />
        </header>
        <div className="modal-title-block">
          <h2 style={{ margin: '6px 0 4px 0' }}>
            <a href={item.link} target="_blank" rel="noreferrer">
              {item.title}
            </a>
          </h2>
          <div className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{item.feedTitle}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt || null)}</span>
          </div>
        </div>
        <div className="modal-body">
          {!item.readableContent && item.imageUrl && <img src={item.imageUrl} alt="" className="modal-image" />}
          {item.readableContent ? (
            <div className="article-body" dangerouslySetInnerHTML={{ __html: item.readableContent }} />
          ) : item.content ? (
            <div className="article-body" dangerouslySetInnerHTML={{ __html: item.content }} />
          ) : (
            <p className="snippet">{item.snippet || 'No snippet available.'}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {item.tags?.map((tag) => (
              <span key={`${item.id}-${tag.id}`} className="tag-pill">
                {tag.name}
                <button
                  className="btn-ghost"
                  style={{ padding: '2px 6px', marginLeft: 6 }}
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
