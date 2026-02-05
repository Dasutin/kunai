import React, { useState } from 'react';
import { Item, Tag } from '@shared/types';
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
  expandedId: number | null;
  onExpand: (id: number) => void;
  onToggleRead: (item: Item, next: boolean) => void;
  onOpenModal: (item: Item) => void;
  onUpdateTags: (item: Item, add?: (number | string)[], remove?: (number | string)[]) => void;
  savedIds: Set<number>;
  onToggleSave: (item: Item) => void;
};

export const ItemList: React.FC<Props> = ({ items, expandedId, onExpand, onToggleRead, onOpenModal, onUpdateTags, savedIds, onToggleSave }) => {
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const saveTag = (item: Item) => {
    const val = (drafts[item.id] || '').trim();
    if (!val) return;
    onUpdateTags(item, [val]);
    setDrafts((prev) => ({ ...prev, [item.id]: '' }));
  };

  const removeTag = (item: Item, tag: Tag) => {
    onUpdateTags(item, undefined, [tag.id]);
  };

  return (
    <div className="list">
      {items.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <div key={item.id} className={clsx('list-row', !item.isRead && 'unread')} onClick={() => onExpand(item.id)}>
            <div className="list-row-main">
              <button
                className="icon-btn btn-ghost status-btn"
                title={item.isRead ? 'Mark unread' : 'Mark read'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(item, !item.isRead);
                }}
              >
                <span className="material-icons">{item.isRead ? 'radio_button_unchecked' : 'radio_button_checked'}</span>
              </button>
              <button
                className="icon-btn btn-ghost bookmark-btn"
                title={savedIds.has(item.id) ? 'Remove from saved' : 'Save article'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(item);
                }}
              >
                <span className="material-icons">{savedIds.has(item.id) ? 'bookmark' : 'bookmark_border'}</span>
              </button>
              <span className="row-feed" title={item.feedTitle || ''}>{item.feedTitle}</span>
              <span className="row-title" title={item.title}>{item.title}</span>
              <span className="row-time" title={item.publishedAt || ''}>{timeAgo(item.publishedAt)}</span>
            </div>
            {expanded && (
              <div className="list-expanded" onClick={(e) => e.stopPropagation()}>
                <div className="list-expanded-header">
                  <div className="list-expanded-toolbar">
                    <button
                      className="icon-btn btn-ghost status-btn"
                      title={item.isRead ? 'Mark unread' : 'Mark read'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleRead(item, !item.isRead);
                      }}
                    >
                      <span className="material-icons">{item.isRead ? 'radio_button_unchecked' : 'radio_button_checked'}</span>
                    </button>
                    <button
                      className="icon-btn btn-ghost bookmark-btn"
                      title={savedIds.has(item.id) ? 'Remove from saved' : 'Save article'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(item);
                      }}
                    >
                      <span className="material-icons">{savedIds.has(item.id) ? 'bookmark' : 'bookmark_border'}</span>
                    </button>
                  </div>
                  <div className="modal-divider prominent" />
                  <div className="list-expanded-title">
                    <h3>
                      <a href={item.link} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    </h3>
                    <div className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{item.feedTitle}</span>
                      <span>·</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                    </div>
                  </div>
                </div>
                {!item.readableContent && item.imageUrl && (
                  <img src={item.imageUrl} alt="" style={{ width: 180, height: 'auto', maxHeight: 200, objectFit: 'cover', borderRadius: 12 }} />
                )}
                <div style={{ flex: 1, minWidth: 280 }}>
                  {item.readableContent ? (
                    <div className="article-body" dangerouslySetInnerHTML={{ __html: item.readableContent }} />
                  ) : item.content ? (
                    <div className="article-body" dangerouslySetInnerHTML={{ __html: item.content }} />
                  ) : (
                    <p className="snippet">{item.snippet || 'No snippet available.'}</p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                      {item.tags.map((tag) => (
                        <span key={`${item.id}-${tag.id}`} className="tag-pill">
                          {tag.name}
                          <button
                            className="btn-ghost"
                            style={{ padding: '2px 6px', marginLeft: 6 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTag(item, tag);
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
