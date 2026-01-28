import { render, screen, fireEvent } from '@testing-library/react';
import AuthPage from '@/components/AuthPage';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
        },
    },
}));

describe('AuthPage', () => {
    it('renders the login page with logo and title', () => {
        render(<AuthPage />);

        expect(screen.getByText('SplitEase')).toBeInTheDocument();
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText(/Split expenses effortlessly/i)).toBeInTheDocument();
    });

    it('renders the Google sign-in button', () => {
        render(<AuthPage />);

        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        expect(googleButton).toBeInTheDocument();
    });

    it('renders feature highlights', () => {
        render(<AuthPage />);

        expect(screen.getByText('Create Groups')).toBeInTheDocument();
        expect(screen.getByText('Track Balances')).toBeInTheDocument();
        expect(screen.getByText('Attach Receipts')).toBeInTheDocument();
    });

    it('calls sign in function when Google button is clicked', async () => {
        const { supabase } = require('@/lib/supabase');

        render(<AuthPage />);

        const googleButton = screen.getByRole('button', { name: /continue with google/i });
        fireEvent.click(googleButton);

        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: expect.objectContaining({
                redirectTo: expect.any(String),
            }),
        });
    });
});
