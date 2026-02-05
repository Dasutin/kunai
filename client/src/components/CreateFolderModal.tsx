import React, { useState } from 'react';

type Props = {
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

export const CreateFolderModal: React.FC<Props> = ({ onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3 style={{ margin: 0 }}>New folder</h3>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <input
          className="input"
          placeholder="Folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handle(); }}
        />
        {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button className="btn" onClick={handle} disabled={loading}>
          {loading ? 'Creating…' : 'Create folder'}
        </button>
      </div>
    </div>
  );
};
