// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionGuard } from './SessionGuard';

const mockSignIn = vi.fn();
let mockSessionStatus = 'authenticated';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: mockSessionStatus }),
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe('SessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStatus = 'authenticated';
  });

  it('renders children when authenticated', () => {
    mockSessionStatus = 'authenticated';

    render(
      <SessionGuard>
        <div>Protected Content</div>
      </SessionGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading state while session is being checked', () => {
    mockSessionStatus = 'loading';

    render(
      <SessionGuard>
        <div>Protected Content</div>
      </SessionGuard>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to sign-in when unauthenticated (session expired)', () => {
    mockSessionStatus = 'unauthenticated';

    render(
      <SessionGuard>
        <div>Protected Content</div>
      </SessionGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockSignIn).toHaveBeenCalledWith(undefined, {
      callbackUrl: expect.any(String),
    });
  });
});
