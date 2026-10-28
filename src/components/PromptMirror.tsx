import type { UIEvent } from 'react';
import { mentionHandle, type MentionItem } from '../lib/mentions';

export function PromptMirror({
  value,
  lookup,
}: {
  value: string;
  lookup?: Map<string, MentionItem>;
}) {
  const parts = value.split(/(@[\p{L}\p{N}_-]+)/gu);
  return (
    <div className="prompt-mirror" aria-hidden="true">
      {parts.map((part, index) => {
        if (!part.startsWith('@')) return <span key={index}>{part}</span>;
        const item = lookup?.get(mentionHandle(part.slice(1)));
        if (!item) return <span key={index}>{part}</span>;
        return (
          <span className="prompt-mention-slot" key={index}>
            <span className="prompt-mention-reserve">{part}</span>
            <span className="prompt-mention-chip" title={item.label}>
              {item.kind === 'image' && item.url ? (
                <img src={item.url} alt="" />
              ) : (
                <span className="prompt-mention-kind">{item.kind === 'video' ? '▶' : '♪'}</span>
              )}
              <span>{item.label}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function syncMirrorScroll(field: HTMLTextAreaElement | null) {
  const mirror = field?.parentElement?.querySelector('.prompt-mirror') as HTMLElement | null;
  if (!mirror || !field) return;
  mirror.scrollTop = field.scrollTop;
  mirror.scrollLeft = field.scrollLeft;
}

export function syncPromptMirror(event: UIEvent<HTMLTextAreaElement>) {
  syncMirrorScroll(event.currentTarget);
}
