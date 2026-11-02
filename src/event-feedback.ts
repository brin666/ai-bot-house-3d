type FeedbackType = 'like' | 'follow' | 'gift';
type Feedback = { type: FeedbackType; count: number };

/** Present local event notifications in order without letting bursts overwrite each other. */
export function createEventFeedback(target: HTMLElement) {
  const queue: Feedback[] = [];
  let showing = false;
  const messages: Record<FeedbackType, string> = {
    like: '♡ 点赞',
    follow: '✦ 谢谢关注',
    gift: '◇ 收到礼物',
  };

  function showNext() {
    if (showing || !queue.length) return;
    showing = true;
    const event = queue.shift()!;
    target.textContent = messages[event.type] + (event.count > 1 ? ` ×${event.count}` : '');
    target.hidden = false;
    setTimeout(() => {
      target.hidden = true;
      showing = false;
      showNext();
    }, 1600);
  }

  return (type: string) => {
    if (type !== 'like' && type !== 'follow' && type !== 'gift') return;
    const existing = queue.find(event => event.type === type);
    if (existing) existing.count++;
    else queue.push({ type, count: 1 });
    showNext();
  };
}
