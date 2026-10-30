import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import CountdownWidget from './CountdownWidget.jsx';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-30T12:00:00+06:00'));
});
afterEach(() => vi.useRealTimers());

const values = () => within(screen.getByRole('timer')).getAllByText(/^\d\d$/).map((e) => e.textContent);

test('has a tab for every exam and starts on the nearest one (MBBS)', () => {
  render(<CountdownWidget />);
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['DU Science', 'DU Arts', 'DU Business', 'MBBS', 'BUET']);
  expect(screen.getByRole('tab', { name: 'MBBS' })).toHaveAttribute('aria-selected', 'true');
  expect(values()).toEqual(['34', '12', '00', '00']);          // 30 Oct 12:00 -> 4 Dec 00:00 (Dhaka)
  expect(screen.getByText(/Friday, 4 December 2026/)).toBeInTheDocument();
});

test('switching tabs changes the target, and the clock ticks every second', () => {
  render(<CountdownWidget />);
  fireEvent.click(screen.getByRole('tab', { name: 'DU Science' }));
  expect(values()).toEqual(['42', '12', '00', '00']);
  expect(localStorage.getItem('tmk-countdown')).toBe('du-science');

  act(() => { vi.advanceTimersByTime(1000); });
  expect(values()).toEqual(['42', '11', '59', '59']);

  fireEvent.click(screen.getByRole('tab', { name: 'BUET' }));
  expect(screen.getByText(/BUET Admission Test/)).toBeInTheDocument();
});

test('a past date shows zeros and a friendly note', () => {
  vi.setSystemTime(new Date('2027-02-01T12:00:00+06:00'));
  render(<CountdownWidget />);
  expect(values()).toEqual(['00', '00', '00', '00']);
  expect(screen.getByText(/exam date has passed/i)).toBeInTheDocument();
});
