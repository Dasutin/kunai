import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import sanitizeHtml from 'sanitize-html';

export const fetchReadable = async (url: string): Promise<{ content: string | null }> => {
  const res = await fetch(url, { headers: { 'user-agent': 'kunai/1.0 (+https://example.com)' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch content: ${res.status}`);
  const html = await res.text();
  const virtualConsole = new VirtualConsole();
  // Drop noisy stylesheet parse errors from jsdom
  virtualConsole.on('jsdomError', () => {});

  const dom = new JSDOM(html, { url, virtualConsole, pretendToBeVisual: true });

  // Remove style/link tags to avoid CSS parsing errors and keep article clean
  dom.window.document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => node.remove());
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();
  if (!parsed?.content) return { content: null };

  const clean = sanitizeHtml(parsed.content, {
    allowedTags: ['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'strong', 'em', 'a', 'img', 'br', 'hr', 'span'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      span: ['class'],
      code: ['class']
    },
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: 'noreferrer noopener', target: '_blank' }
      })
    },
    allowedStyles: {}
  });

  return { content: clean || null };
};
