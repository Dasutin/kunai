import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  viewMode: 'list' | 'card' | 'magazine';
  onViewChange: (mode: 'list' | 'card' | 'magazine') => void;
  unreadOnly: boolean;
  unreadCount: number;
  onUnreadChange: (val: boolean) => void;
  search: string;
  onSearch: (val: string) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  scopeLabel: string;
  condensed: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
};

export const HeaderBar: React.FC<Props> = ({
  viewMode,
  onViewChange,
  unreadOnly,
  unreadCount,
  onUnreadChange,
  search,
  onSearch,
  onRefresh,
  onMarkAllRead,
  scopeLabel,
  condensed,
  isMobile,
  onToggleSidebar
}) => {
  const [openMenu, setOpenMenu] = useState<'filter' | 'view' | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current?.contains(target)) return;
      if (viewRef.current?.contains(target)) return;
      setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectUnread = (val: boolean) => {
    onUnreadChange(val);
    setOpenMenu(null);
  };

  const selectView = (mode: 'list' | 'card' | 'magazine') => {
    onViewChange(mode);
    setOpenMenu(null);
  };

  return (
    <div className={clsx('header', condensed && 'header-collapsed')}>
      {!condensed && (
        <div className="header-top">
          <div className="header-title">{scopeLabel}</div>
        </div>
      )}

      <div className="header-row">
        {isMobile && (
          <button className="btn-ghost icon-btn mobile-menu-btn" onClick={onToggleSidebar} title="Toggle menu">
            <span className="material-icons">menu</span>
          </button>
        )}
        {condensed && <div className="header-title">{scopeLabel}</div>}
        {!condensed && (
          <div className="menu-wrap" ref={filterRef}>
            <button
              className="dropdown-btn"
              onClick={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
              aria-expanded={openMenu === 'filter'}
            >
              {unreadOnly ? `Unread (${unreadCount})` : 'All Articles'}
              <span className="material-icons">expand_more</span>
            </button>
            {openMenu === 'filter' && (
              <div className="menu">
                <button className={unreadOnly ? 'active' : ''} onClick={() => selectUnread(true)}>
                  <span className="material-icons">mark_email_unread</span> Unread ({unreadCount})
                </button>
                <button className={!unreadOnly ? 'active' : ''} onClick={() => selectUnread(false)}>
                  <span className="material-icons">article</span> All Articles
                </button>
              </div>
            )}
          </div>
        )}

        <input
          className="input header-search"
          placeholder="Search articles"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        <div className="header-actions">
          <button className="btn-ghost icon-btn" title="Mark all as read" onClick={onMarkAllRead}>
            <span className="material-icons">done_all</span>
          </button>
          <button className="btn-ghost icon-btn" title="Refresh" onClick={onRefresh}>
            <span className="material-icons">refresh</span>
          </button>
          <div className="menu-wrap" ref={viewRef}>
            <button
              className="btn-ghost icon-btn"
              title="Change view"
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            >
              <span className="material-icons">{viewMode === 'list' ? 'view_list' : viewMode === 'card' ? 'view_module' : 'view_quilt'}</span>
            </button>
            {openMenu === 'view' && (
              <div className="menu">
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => selectView('list')}>
                  <span className="material-icons">view_list</span> List view
                </button>
                <button className={viewMode === 'card' ? 'active' : ''} onClick={() => selectView('card')}>
                  <span className="material-icons">view_module</span> Card view
                </button>
                <button className={viewMode === 'magazine' ? 'active' : ''} onClick={() => selectView('magazine')}>
                  <span className="material-icons">view_quilt</span> Magazine view
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
