import React from 'react';

type Props = {
  folderName: string;
  feedCount: number;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export const DeleteFolderModal: React.FC<Props> = ({ folderName, feedCount, loading = false, onConfirm, onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3 style={{ margin: 0 }}>Delete folder</h3>
          <p className="muted" style={{ margin: 0 }}>
            This removes the folder only. RSS feeds are kept and moved to Newsfeed.
          </p>
        </header>

        {feedCount > 0 && (
          <div className="warning-box">
            <div className="warning-title">
              <span className="material-icons" aria-hidden="true">warning</span>
              Folder is not empty
            </div>
            <p style={{ margin: '6px 0 0' }}>
              {feedCount === 1 ? '1 feed' : `${feedCount} feeds`} will be moved out of this folder.
            </p>
          </div>
        )}

        <p style={{ margin: 0 }}>
          Are you sure you want to delete <strong>{folderName}</strong>?
        </p>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete folder'}
          </button>
        </div>
      </div>
    </div>
  );
};
