import { createPortal } from 'react-dom';

// Renders its children straight into <body>. Popups and sheets use this so they are always positioned
// against the screen: an ancestor with a transform, animation or backdrop-blur would otherwise turn
// "fixed" into "relative to that ancestor" and push the popup far down a long page.
export default function Portal({ children }) {
  return typeof document === 'undefined' ? null : createPortal(children, document.body);
}
