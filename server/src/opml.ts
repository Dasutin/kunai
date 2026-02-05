import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import type { Feed, Folder } from '../../shared/types.js';

export type OpmlImportResult = {
  discovered: { title: string; url: string; folderName?: string }[];
};

export const parseOpml = (xml: string): OpmlImportResult => {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true });
  const parsed = parser.parse(xml);
  const body = parsed?.opml?.body;
  const discovered: OpmlImportResult['discovered'] = [];

  const walk = (outline: any, currentFolder?: string) => {
    if (!outline) return;
    const outlines = Array.isArray(outline) ? outline : [outline];
    for (const node of outlines) {
      if (node.xmlUrl) {
        discovered.push({ title: node.title || node.text || node.xmlUrl, url: node.xmlUrl, folderName: currentFolder });
      }
      if (node.outline) {
        const folderName = node.title || node.text;
        walk(node.outline, folderName || currentFolder);
      }
    }
  };

  if (body?.outline) {
    walk(body.outline, undefined);
  }

  return { discovered };
};

export const buildOpml = (feeds: Feed[], folders: Folder[]): string => {
  const byFolder: Record<string, Feed[]> = {};
  for (const feed of feeds) {
    const key = feed.folderId || '__root__';
    byFolder[key] = byFolder[key] || [];
    byFolder[key].push(feed);
  }

  const folderMap = new Map(folders.map((f) => [f.id, f] as const));
  const children = new Map<string | null, Folder[]>([...folderMap.values()].reduce((acc, f) => acc.set(f.parentId || null, []), new Map()));
  for (const f of folders) {
    const parent = f.parentId || null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(f);
  }

  const buildOutlines = (parentId: string | null): any[] => {
    const group = children.get(parentId) || [];
    const result: any[] = [];
    for (const folder of group) {
      const childFeeds = byFolder[folder.id] || [];
      result.push({
        text: folder.name,
        title: folder.name,
        outline: [
          ...childFeeds.map((f) => ({ text: f.title, title: f.title, type: 'rss', xmlUrl: f.url })),
          ...buildOutlines(folder.id)
        ]
      });
    }
    return result;
  };

  const rootFeeds = byFolder['__root__'] || [];

  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '', format: true });
  const opml = {
    opml: {
      '@_version': '2.0',
      head: { title: 'Kunai Export' },
      body: {
        outline: [
          ...rootFeeds.map((f) => ({ text: f.title, title: f.title, type: 'rss', xmlUrl: f.url })),
          ...buildOutlines(null)
        ]
      }
    }
  };
  return builder.build(opml);
};
