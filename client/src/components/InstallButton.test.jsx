import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar.jsx';

test('the iPhone install tip opens on <body>, not inside the blurred navbar', async () => {
  const user = userEvent.setup();
  window.matchMedia = () => ({ matches: false });
  Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', configurable: true });
  const { container } = render(<MemoryRouter><Navbar /></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: /install/i }));
  expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  const tip = screen.getByText(/install tmk exam hub/i).closest('.fixed');
  expect(container.querySelector('header').contains(tip)).toBe(false);
  expect(tip.parentElement).toBe(document.body);
});
