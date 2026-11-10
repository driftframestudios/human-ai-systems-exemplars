// The stable native button owns selection; its inner face carries the artwork.
// Consumers retain record identity, navigation, edits and recovery.
export function createTapePicker(document, { variant = 'plan', label, entries, selectedId, onSelect }) {
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const library = make('aside', 'studio-tape-library');
  library.dataset.tapeVariant = variant;
  library.setAttribute('aria-label', label);
  library.append(make('h4', 'studio-tape-library__title', label));
  const shelf = make('div', 'studio-tape-shelf');
  for (const entry of entries) {
    const key = make('button', 'studio-tape-key');
    key.type = 'button';
    if (entry.aggregate) {
      key.classList.add('studio-tape-key--aggregate');
      const stack = make('span', 'studio-tape-stack'); stack.setAttribute('aria-hidden', 'true'); key.append(stack);
    }
    for (const [name, value] of Object.entries(entry.attributes ?? {})) key.setAttribute(name, value);
    key.setAttribute('aria-pressed', String(entry.id === selectedId));
    const face = make('span', 'studio-tape-face');
    if (entry.eyebrow) face.append(make('small', 'studio-tape-face__strip', entry.eyebrow));
    face.append(make('strong', 'studio-tape-face__title', entry.title));
    const reels = make('span', 'studio-tape-face__reels');
    reels.setAttribute('aria-hidden', 'true');
    face.append(reels);
    if (entry.amount) face.append(make('span', 'studio-tape-face__amount', entry.amount));
    if (entry.detail) face.append(make('small', 'studio-tape-face__detail', entry.detail));
    key.append(face);
    key.addEventListener('click', () => onSelect(entry.id, key));
    shelf.append(key);
  }
  library.append(shelf);
  return library;
}
