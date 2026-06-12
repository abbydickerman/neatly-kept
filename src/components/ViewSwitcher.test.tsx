// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ViewSwitcher } from './ViewSwitcher';
import { useNavigationStore } from '@/store/navigation-store';

describe('ViewSwitcher', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useNavigationStore.setState({
      activeSection: 'my-stuff',
      activeView: 'weekly',
      currentDate: new Date('2024-06-15'),
    });
  });

  it('renders view tabs for daily, weekly, and monthly (Requirement 12.1)', () => {
    render(<ViewSwitcher />);

    expect(screen.getByRole('tab', { name: /daily/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /monthly/i })).toBeInTheDocument();
  });

  it('marks the active view tab as selected', () => {
    render(<ViewSwitcher />);

    const weeklyTab = screen.getByRole('tab', { name: /weekly/i });
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true');

    const dailyTab = screen.getByRole('tab', { name: /daily/i });
    expect(dailyTab).toHaveAttribute('aria-selected', 'false');
  });

  it('switches view when a tab is clicked (Requirement 12.2)', () => {
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByRole('tab', { name: /daily/i }));

    const state = useNavigationStore.getState();
    expect(state.activeView).toBe('daily');
  });

  it('renders prev and next navigation buttons', () => {
    render(<ViewSwitcher />);

    expect(screen.getByRole('button', { name: /previous weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next weekly/i })).toBeInTheDocument();
  });

  it('navigates to previous week when prev is clicked in weekly view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'weekly' });
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /previous weekly/i }));

    const state = useNavigationStore.getState();
    const expected = new Date('2024-06-08');
    expect(state.currentDate.toDateString()).toBe(expected.toDateString());
  });

  it('navigates to next week when next is clicked in weekly view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'weekly' });
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /next weekly/i }));

    const state = useNavigationStore.getState();
    const expected = new Date('2024-06-22');
    expect(state.currentDate.toDateString()).toBe(expected.toDateString());
  });

  it('navigates by day in daily view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'daily' });
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /next daily/i }));

    const state = useNavigationStore.getState();
    const expected = new Date('2024-06-16');
    expect(state.currentDate.toDateString()).toBe(expected.toDateString());
  });

  it('navigates by month in monthly view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'monthly' });
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /previous monthly/i }));

    const state = useNavigationStore.getState();
    const expected = new Date('2024-05-15');
    expect(state.currentDate.toDateString()).toBe(expected.toDateString());
  });

  it('displays the current date range label for weekly view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'weekly' });
    render(<ViewSwitcher />);

    // June 15, 2024 is a Saturday. The week starts on Monday June 10.
    // The label should show something like "Jun 10 – Jun 16, 2024"
    const label = screen.getByText(/jun/i);
    expect(label).toBeInTheDocument();
  });

  it('displays the current date range label for monthly view', () => {
    useNavigationStore.setState({ currentDate: new Date('2024-06-15'), activeView: 'monthly' });
    render(<ViewSwitcher />);

    // Should show "June 2024"
    expect(screen.getByText(/june 2024/i)).toBeInTheDocument();
  });
});
