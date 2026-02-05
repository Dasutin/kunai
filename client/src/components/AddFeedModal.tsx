import React, { useState } from 'react';

type Props = {
  onSubmit: (url: string, title?: string) => Promise<void>;
  onClose: () => void;
};

export const AddFeedModal: React.FC<Props> = ({ onSubmit, onClose }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(url, title || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3 style={{ margin: 0 }}>Add RSS feed</h3>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <input className="input" placeholder="Feed URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input className="input" placeholder="Optional title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        <button className="btn" onClick={handle} disabled={loading}>
          {loading ? 'Adding...' : 'Add feed'}
        </button>
      </div>
    </div>
  );
};
