import type { MentionGroup, MentionItem } from '../lib/mentions';
import { VideoStill } from './VideoStill';

interface MentionMenuProps {
  groups: MentionGroup[];
  onSelect: (item: MentionItem) => void;
}

export function MentionMenu({ groups, onSelect }: MentionMenuProps) {
  return (
    <div className="mention-menu" role="listbox" aria-label="Reference mentions">
      {groups.length === 0 && <div className="mention-menu__empty">No references match</div>}
      {groups.map((group) => (
        <div key={group.label} className="mention-menu__group">
          <span className="mention-menu__label">{group.label}</span>
          {group.items.map((item) => (
            <button
              type="button"
              role="option"
              aria-selected={false}
              key={`${group.label}-${item.id}`}
              className="mention-menu__item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <span className="mention-menu__thumb">
                {item.kind === 'video' ? (
                  <VideoStill src={item.url} />
                ) : (
                  <img src={item.url} alt="" />
                )}
              </span>
              <span className="mention-menu__name">{item.label}</span>
              <span className="mention-menu__kind">{item.kind}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
