// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignInPage from './page';

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    mockSearchParams.delete('error');
    mockSearchParams.delete('callbackUrl');
  });

  it('renders sign-in form with all provider options', () => {
    render(<SignInPage />);

    expect(screen.getByText(/digital bullet journal/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('calls signIn with google provider when Google button clicked', () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });

  it('calls signIn with github provider when GitHub button clicked', () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue with github/i }));
    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/' });
  });

  it('shows validation error when email is empty on submit', () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows validation error when password is empty on submit', () => {
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signIn with credentials on valid email/password submit', async () => {
    mockSignIn.mockResolvedValue({ url: '/', error: null });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
        callbackUrl: '/',
      });
    });
  });

  it('displays error when credentials are invalid', async () => {
    mockSignIn.mockResolvedValue({ error: 'CredentialsSignin', url: null });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows session expiry message when error=SessionRequired', () => {
    mockSearchParams.set('error', 'SessionRequired');

    render(<SignInPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/your session has expired/i)
    ).toBeInTheDocument();
  });

  it('toggles between sign in and sign up mode', () => {
    render(<SignInPage />);

    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/don't have an account\? sign up/i));

    expect(screen.getByText(/create a new account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

    fireEvent.click(screen.getByText(/already have an account\? sign in/i));

    expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
  });

  it('uses callbackUrl from search params', () => {
    mockSearchParams.set('callbackUrl', '/dashboard');

    render(<SignInPage />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
  });
});
