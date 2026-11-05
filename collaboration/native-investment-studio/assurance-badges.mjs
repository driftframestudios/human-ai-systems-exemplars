// People and team cards share a compact route to accepted supporting work.
// The consequence model owns the standing; these controls only open its source.
export function appendAssuranceBadges(document, parent, badges, owner) {
  if (!badges.length) return;
  const list = document.createElement('ul');
  list.className = 'native-support-badges';
  list.dataset.supportOwnerKind = owner.kind;
  list.dataset.supportOwnerId = owner.id;
  list.setAttribute('aria-label', `${owner.label}: planned support and observations`);
  for (const badge of badges) {
    const item = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.className = 'native-support-badge native-control--navigate';
    button.dataset.supportKind = badge.source.kind;
    button.dataset.supportId = badge.source.id;
    button.dataset.supportStanding = badge.kind;
    const standing = document.createElement('strong'), source = document.createElement('small');
    standing.textContent = badge.label; source.textContent = badge.sourceLabel;
    button.append(standing, source); item.append(button); list.append(item);
  }
  parent.append(list);
}
