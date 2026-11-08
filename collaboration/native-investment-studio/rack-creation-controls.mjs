// An empty rack slot is a native action target. Its controller owns the meaning
// of adding a record, occurrence or contribution and the resulting Undo entry.
export function createRackAddControl(document, { label, text = '', className = '', dataset = {} }) {
  const control = document.createElement('button');
  control.type = 'button';
  control.className = `native-control--create studio-rack-create-zone ${className}`.trim();
  control.setAttribute('aria-label', label);
  control.title = label;
  Object.assign(control.dataset, dataset);
  const icon = document.createElement('span');
  icon.className = 'studio-rack-create-zone__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '+';
  control.append(icon);
  if (text) {
    const words = document.createElement('span');
    words.textContent = text;
    control.append(words);
  }
  return control;
}
