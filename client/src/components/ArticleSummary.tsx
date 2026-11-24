import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import type { ArticleSummary, Item } from '@shared/types';
import { api } from '../api';

type SummaryState = { show: boolean; status: 'idle' | 'loading' | 'ready' | 'error'; result?: ArticleSummary; error?: string };
const idle: SummaryState = { show: false, status: 'idle' };
const SummaryContext = createContext<{
  states: Record<number, SummaryState>;
  toggle: (id: number) => void;
} | null>(null);

export const ArticleSummaryProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [states, setStates] = useState<Record<number, SummaryState>>({});
  const latest = useRef(states);
  const requests = useRef(new Map<number, AbortController>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requests.current.forEach((controller) => controller.abort());
      requests.current.clear();
    };
  }, []);

  const update = useCallback((id: number, change: (current: SummaryState) => SummaryState) => {
    if (!mounted.current) return;
    latest.current = { ...latest.current, [id]: change(latest.current[id] || idle) };
    setStates(latest.current);
  }, []);

  const toggle = useCallback((id: number) => {
    const current = latest.current[id] || idle;
    if (current.show) {
      update(id, (state) => ({ ...state, show: false }));
      return;
    }
    if (current.result) {
      update(id, (state) => ({ ...state, show: true, status: 'ready', error: undefined }));
      return;
    }
    update(id, (state) => ({ ...state, show: true, status: 'loading', error: undefined }));
    if (requests.current.has(id)) return;
    const controller = new AbortController();
    requests.current.set(id, controller);
    api.summarizeItem(id, controller.signal)
      .then((result) => update(id, (state) => ({ ...state, status: 'ready', result })))
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          update(id, () => ({ show: false, status: 'error', error: error.message || 'Unable to summarize this article.' }));
        }
      })
      .finally(() => { requests.current.delete(id); });
  }, [update]);

  const value = useMemo(() => ({ states, toggle }), [states, toggle]);
  return <SummaryContext.Provider value={value}>{children}</SummaryContext.Provider>;
};

const useArticleSummary = (id: number) => {
  const context = useContext(SummaryContext);
  if (!context) throw new Error('ArticleSummaryProvider is required');
  return { state: context.states[id] || idle, toggle: () => context.toggle(id) };
};

export const SummaryButton: React.FC<{ item: Item; onShow?: () => void }> = ({ item, onShow }) => {
  const { state, toggle } = useArticleSummary(item.id);
  const label = state.show ? 'Original story' : 'AI summary';
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        aria-pressed={state.show}
        onClick={(event) => {
          event.stopPropagation();
          if (!state.show) onShow?.();
          toggle();
        }}
        sx={{ color: state.show ? 'var(--accent)' : 'var(--muted)' }}
      >
        {state.show && state.status === 'loading' ? <CircularProgress className="summary-spinner" size={20} /> : state.show ? <ArticleOutlinedIcon /> : <AutoAwesomeIcon />}
      </IconButton>
    </Tooltip>
  );
};

export const ArticleBody: React.FC<{ item: Item }> = ({ item }) => {
  const { state } = useArticleSummary(item.id);
  const loading = state.show && state.status === 'loading';
  return (
    <Box aria-label="Article text" aria-busy={loading} data-summary-state={loading ? 'loading' : state.show && state.result ? 'summary' : 'original'}>
      {state.error && <Alert severity="error" sx={{ mb: 1.5 }}>{state.error}</Alert>}
      {loading ? (
        <Box className="summary-loading" role="status" aria-live="polite">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, color: 'var(--accent)' }}>
            <AutoAwesomeIcon fontSize="small" />
            <Typography variant="body2">Summarizing article…</Typography>
          </Stack>
          {[100, 94, 82, 98, 68].map((width, index) => <Skeleton key={index} animation="wave" variant="rounded" width={`${width}%`} height={14} sx={{ mb: 1.5, bgcolor: 'var(--card-border)' }} />)}
        </Box>
      ) : state.show && state.result ? (
        <Box className="ai-summary" aria-live="polite">
          <Typography variant="caption" sx={{ display: 'block', color: 'var(--accent)', mb: 1.5 }}>
            {state.result.source === 'article' ? 'AI summary' : 'AI summary · available feed text'}{state.result.truncated ? ' (excerpt)' : ''}
          </Typography>
          <Box className="article-body" sx={{ whiteSpace: 'pre-wrap' }}>{state.result.summary}</Box>
        </Box>
      ) : item.readableContent ? (
        <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.readableContent }} />
      ) : item.content ? (
        <Box className="article-body" dangerouslySetInnerHTML={{ __html: item.content }} />
      ) : (
        <Typography color="var(--muted)">{item.snippet || 'No snippet available.'}</Typography>
      )}
    </Box>
  );
};
