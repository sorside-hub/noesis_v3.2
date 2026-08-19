import React from 'react';
import { FileText, ExternalLink, Link2 } from 'lucide-react';
import { FileNode } from '../../../types/vault';
import { twMerge } from 'tailwind-merge';

interface LinksTabProps {
  type: 'BACKLINKS' | 'OUTGOING_LINKS';
  activeNodeName: string;
  backlinks: FileNode[];
  outgoingLinks: { targetName: string; matchedNode: FileNode | null }[];
  onSelectFile: (id: string) => void;
}

export const LinksTab: React.FC<LinksTabProps> = ({
  type,
  activeNodeName,
  backlinks,
  outgoingLinks,
  onSelectFile,
}) => {
  if (type === 'BACKLINKS') {
    return (
      <div className="space-y-3 animate-in fade-in duration-150">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Linked References ({backlinks.length})
          </h3>
          <p className="text-[11px] text-text-muted">
            Catatan lain yang mereferensikan &quot;{activeNodeName}&quot;
          </p>
        </div>

        {backlinks.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted">
            Belum ada catatan yang menautkan ke sini.
          </div>
        ) : (
          <div className="space-y-1.5">
            {backlinks.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectFile(node.id)}
                className="w-full p-2.5 bg-bg-primary hover:bg-bg-hover border border-border-default rounded-xl text-left transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileText size={14} className="text-accent-primary shrink-0" />
                  <span className="text-xs font-medium text-text-primary group-hover:text-accent-primary truncate">
                    {node.name}
                  </span>
                </div>
                <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Outgoing Links ({outgoingLinks.length})
        </h3>
        <p className="text-[11px] text-text-muted">
          Tautan internal wiki-link yang ada di catatan ini
        </p>
      </div>

      {outgoingLinks.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          Tidak ada tautan wiki-link <span className="font-mono text-accent-primary">[[...]]</span> ditemukan di catatan ini.
        </div>
      ) : (
        <div className="space-y-1.5">
          {outgoingLinks.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={!item.matchedNode}
              onClick={() => item.matchedNode && onSelectFile(item.matchedNode.id)}
              className={twMerge(
                'w-full p-2.5 bg-bg-primary border border-border-default rounded-xl text-left transition-colors flex items-center justify-between group',
                item.matchedNode
                  ? 'hover:bg-bg-hover cursor-pointer'
                  : 'opacity-60 cursor-default'
              )}
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                <Link2 size={14} className={item.matchedNode ? 'text-accent-primary shrink-0' : 'text-text-muted shrink-0'} />
                <span className="text-xs font-medium text-text-primary truncate">
                  {item.targetName}
                </span>
              </div>
              {item.matchedNode ? (
                <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
              ) : (
                <span className="text-[10px] text-text-muted shrink-0 ml-2">(Uncreated)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
