const EVENT = 'framegraph:popover-open';

export function announcePopover(source: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: source }));
}

export function subscribePopoverOpen(source: string, onOtherOpened: () => void) {
  const handler = (event: Event) => {
    if ((event as CustomEvent<string>).detail === source) return;
    onOtherOpened();
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
