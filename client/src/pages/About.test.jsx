import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from './About.jsx';

const view = () => render(<MemoryRouter><About /></MemoryRouter>);

test('shows exactly the profile details that were provided', () => {
  const { container } = view();
  expect(screen.getByRole('heading', { level: 1, name: 'Tamim Rahman' })).toBeInTheDocument();
  expect(screen.getByText('(মোঃ তামিম ইসলাম)')).toBeInTheDocument();
  expect(screen.getByText('Software Developer & Technical Contributor')).toBeInTheDocument();
  expect(screen.getByText('A dedicated and result-oriented software developer specializing in building digital platforms, web applications, and automated utility solutions. Committed to engineering high-performance, user-centric systems and maintaining strict personal integrity, financial independence, and high standards of execution. Creator and administrator of TMK Exam Hub, an open-access digital assessment platform designed to support science-background admission candidates.')).toBeInTheDocument();
  expect(screen.getByText('tamimrahman852@gmail.com')).toBeInTheDocument();
  expect(screen.getByText('01762324527')).toBeInTheDocument();
  // nothing about languages, skills or education
  expect(container.textContent).not.toMatch(/javascript|python|react|node\.?js|flutter|dart|c\+\+|html|css|sql|skills?|education|degree|b\.?sc|hsc|ssc|university|student/i);
});

test('contact buttons open email, WhatsApp and the phone dialer', () => {
  view();
  expect(screen.getByRole('link', { name: 'Send email' }).getAttribute('href')).toMatch(/^mailto:tamimrahman852@gmail\.com\?/);
  const wa = screen.getByRole('link', { name: 'WhatsApp' });
  expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/8801762324527\?text=/);
  expect(wa).toHaveAttribute('target', '_blank');
  expect(wa).toHaveAttribute('rel', expect.stringContaining('noopener'));
  expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+8801762324527');
});

test('links to the feedback form and the upload key page', () => {
  view();
  expect(screen.getByRole('link', { name: /send feedback/i })).toHaveAttribute('href', '/feedback');
  expect(screen.getByRole('link', { name: /get an upload key/i })).toHaveAttribute('href', '/upload-exam');
});
