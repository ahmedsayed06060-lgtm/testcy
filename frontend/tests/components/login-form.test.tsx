import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/login-form';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

describe('LoginForm', () => {
  beforeEach(() => push.mockReset());
  it('progresses through password and mandatory MFA verification', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole('button', { name: /sign in securely/i }));
    const code = await screen.findByPlaceholderText('000000');
    await user.type(code, '123456');
    await user.click(screen.getByRole('button', { name: /verify & sign in/i }));
    expect(await screen.findByText(/verification failed/i).catch(() => null)).not.toBeInTheDocument();
    expect(push).toHaveBeenCalledWith('/en/dashboard');
  }, 10_000);
});
