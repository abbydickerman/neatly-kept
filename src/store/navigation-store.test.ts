import { describe, it, expect, beforeEach } from 'vitest';
import { useNavigationStore } from './navigation-store';

describe('navigation-store', () => {
  beforeEach(() => {
    // Reset store state between tests
    useNavigationStore.setState({
      activeSection: 'my-stuff',
      activeView: 'weekly',
      currentDate: new Date('2024-06-15T12:00:00.000Z'),
    });
  });

  describe('default state', () => {
    it('defaults activeSection to my-stuff', () => {
      const state = useNavigationStore.getState();
      expect(state.activeSection).toBe('my-stuff');
    });

    it('defaults activeView to weekly', () => {
      const state = useNavigationStore.getState();
      expect(state.activeView).toBe('weekly');
    });

    it('defaults currentDate to a Date instance', () => {
      // Reset to true default (today)
      useNavigationStore.setState({ currentDate: new Date() });
      const state = useNavigationStore.getState();
      expect(state.currentDate).toBeInstanceOf(Date);
    });
  });

  describe('setSection', () => {
    it('sets activeSection to layout-pick', () => {
      useNavigationStore.getState().setSection('layout-pick');
      expect(useNavigationStore.getState().activeSection).toBe('layout-pick');
    });

    it('sets activeSection to plan-picks', () => {
      useNavigationStore.getState().setSection('plan-picks');
      expect(useNavigationStore.getState().activeSection).toBe('plan-picks');
    });

    it('sets activeSection back to my-stuff', () => {
      useNavigationStore.getState().setSection('plan-picks');
      useNavigationStore.getState().setSection('my-stuff');
      expect(useNavigationStore.getState().activeSection).toBe('my-stuff');
    });
  });

  describe('setView', () => {
    it('sets activeView to monthly', () => {
      useNavigationStore.getState().setView('monthly');
      expect(useNavigationStore.getState().activeView).toBe('monthly');
    });

    it('sets activeView to daily', () => {
      useNavigationStore.getState().setView('daily');
      expect(useNavigationStore.getState().activeView).toBe('daily');
    });

    it('sets activeView back to weekly', () => {
      useNavigationStore.getState().setView('daily');
      useNavigationStore.getState().setView('weekly');
      expect(useNavigationStore.getState().activeView).toBe('weekly');
    });
  });

  describe('setCurrentDate', () => {
    it('sets the currentDate to the provided date', () => {
      const newDate = new Date('2025-01-01T00:00:00.000Z');
      useNavigationStore.getState().setCurrentDate(newDate);
      expect(useNavigationStore.getState().currentDate).toEqual(newDate);
    });
  });

  describe('navigateDay', () => {
    it('advances currentDate by 1 day when direction is next', () => {
      useNavigationStore.getState().navigateDay('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-06-16T12:00:00.000Z');
    });

    it('moves currentDate back by 1 day when direction is prev', () => {
      useNavigationStore.getState().navigateDay('prev');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-06-14T12:00:00.000Z');
    });

    it('handles month boundary crossing forward', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-06-30T12:00:00.000Z') });
      useNavigationStore.getState().navigateDay('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-07-01T12:00:00.000Z');
    });

    it('handles month boundary crossing backward', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-07-01T12:00:00.000Z') });
      useNavigationStore.getState().navigateDay('prev');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-06-30T12:00:00.000Z');
    });
  });

  describe('navigateWeek', () => {
    it('advances currentDate by 7 days when direction is next', () => {
      useNavigationStore.getState().navigateWeek('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-06-22T12:00:00.000Z');
    });

    it('moves currentDate back by 7 days when direction is prev', () => {
      useNavigationStore.getState().navigateWeek('prev');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-06-08T12:00:00.000Z');
    });

    it('handles month boundary crossing forward', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-06-28T12:00:00.000Z') });
      useNavigationStore.getState().navigateWeek('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.toISOString()).toBe('2024-07-05T12:00:00.000Z');
    });
  });

  describe('navigateMonth', () => {
    it('advances currentDate by 1 month when direction is next', () => {
      useNavigationStore.getState().navigateMonth('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2024);
      expect(state.currentDate.getMonth()).toBe(6); // July (0-indexed)
      expect(state.currentDate.getDate()).toBe(15);
    });

    it('moves currentDate back by 1 month when direction is prev', () => {
      useNavigationStore.getState().navigateMonth('prev');
      const state = useNavigationStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2024);
      expect(state.currentDate.getMonth()).toBe(4); // May (0-indexed)
      expect(state.currentDate.getDate()).toBe(15);
    });

    it('handles year boundary crossing forward', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-12-15T12:00:00.000Z') });
      useNavigationStore.getState().navigateMonth('next');
      const state = useNavigationStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2025);
      expect(state.currentDate.getMonth()).toBe(0); // January
    });

    it('handles year boundary crossing backward', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-01-15T12:00:00.000Z') });
      useNavigationStore.getState().navigateMonth('prev');
      const state = useNavigationStore.getState();
      expect(state.currentDate.getFullYear()).toBe(2023);
      expect(state.currentDate.getMonth()).toBe(11); // December
    });

    it('handles end-of-month overflow (Jan 31 -> next month)', () => {
      useNavigationStore.setState({ currentDate: new Date('2024-01-31T12:00:00.000Z') });
      useNavigationStore.getState().navigateMonth('next');
      const state = useNavigationStore.getState();
      // JavaScript's setMonth(1) on Jan 31 overflows: Feb 31 doesn't exist, so it becomes Mar 2 (2024 is leap year)
      expect(state.currentDate).toBeInstanceOf(Date);
      expect(state.currentDate.toISOString()).toBe('2024-03-02T12:00:00.000Z');
    });
  });
});
