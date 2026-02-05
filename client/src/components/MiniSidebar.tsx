import React from 'react';

interface MiniSidebarProps {
  onSelectHome: () => void;
  onSelectSaved: () => void;
  onSettings: () => void;
  onAddFeed: () => void;
  isMobile: boolean;
  onToggleContext: () => void;
  sidebarPinned: boolean;
  onTogglePin: () => void;
  onTogglePeek: () => void;
  onPeekStart: () => void;
  onPeekEnd: () => void;
}

export const MiniSidebar: React.FC<MiniSidebarProps> = ({ onSelectHome, onSelectSaved, onSettings, onAddFeed, isMobile, onToggleContext, sidebarPinned, onTogglePin, onTogglePeek, onPeekStart, onPeekEnd }) => {
  return (
    <aside
      className="mini-sidebar"
      onMouseEnter={() => { if (!sidebarPinned && !isMobile) onPeekStart(); }}
      onMouseLeave={() => { if (!sidebarPinned && !isMobile) onPeekEnd(); }}
    >
      <button
        className="icon-btn"
        title="Newsfeed"
        onClick={() => {
          onSelectHome();
          if (!sidebarPinned && !isMobile) onTogglePeek();
          if (isMobile) onToggleContext();
        }}
      >
        <span className="material-icons">rss_feed</span>
      </button>
      <button
        className="icon-btn"
        title="Saved"
        onClick={() => {
          onSelectSaved();
          if (!sidebarPinned && !isMobile) onTogglePeek();
          if (isMobile) onToggleContext();
        }}
      >
        <span className="material-icons">bookmark</span>
      </button>
      <button className="icon-btn" title="Add feed" onClick={onAddFeed}>
        <span className="material-icons">add</span>
      </button>
      {isMobile && (
        <button className="icon-btn" title="Open menu" onClick={onToggleContext}>
          <span className="material-icons">menu_open</span>
        </button>
      )}
      <div className="mini-sidebar-spacer" />
      <button className="icon-btn" title="Settings" onClick={onSettings}>
        <span className="material-icons">settings</span>
      </button>
      <button className="icon-btn" title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'} onClick={onTogglePin}>
        <span className="material-icons">{sidebarPinned ? 'push_pin' : 'push_pin'}</span>
      </button>
    </aside>
  );
};
