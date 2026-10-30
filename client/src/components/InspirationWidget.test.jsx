import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InspirationWidget from './InspirationWidget.jsx';

test('shows a quote and an Arabic dua with its Quran reference', () => {
  const { container } = render(<InspirationWidget />);
  expect(container.querySelector('blockquote p')).toBeTruthy();
  const ar = container.querySelector('[lang="ar"]');
  expect(ar).toBeTruthy();
  expect(ar.getAttribute('dir')).toBe('rtl');
  expect(screen.getByText(/Surah .* · \d+:\d+/)).toBeInTheDocument();
});

test('the buttons show a different quote and a different dua', async () => {
  const user = userEvent.setup();
  const { container } = render(<InspirationWidget />);
  const q1 = container.querySelector('blockquote p').textContent;
  const d1 = container.querySelector('[lang="ar"]').textContent;
  await user.click(screen.getByRole('button', { name: /new quote/i }));
  await user.click(screen.getByRole('button', { name: /next dua/i }));
  expect(container.querySelector('blockquote p').textContent).not.toBe(q1);
  expect(container.querySelector('[lang="ar"]').textContent).not.toBe(d1);
});
