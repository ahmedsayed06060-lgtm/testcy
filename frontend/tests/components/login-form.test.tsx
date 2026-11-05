import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/login-form';
import { authApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('@/lib/api-client', () => ({ authApi: { login: vi.fn(), verifyMfa: vi.fn(), me: vi.fn() } }));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset(); useAuthStore.getState().clear();
    vi.mocked(authApi.login).mockResolvedValue({ requires_mfa: true, mfa_setup_required: false, temp_token: 'temporary-challenge' });
    vi.mocked(authApi.verifyMfa).mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' });
    vi.mocked(authApi.me).mockResolvedValue({ id: 'user-1', email: 'admin@example.com', full_name: 'Admin', role: 'admin', client_id: null, is_active: true, mfa_enabled: true, created_at: new Date().toISOString() });
  });
  it('progresses through password and mandatory MFA verification', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/work email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'AdminPass123!');
    await user.click(screen.getByRole('button', { name: /sign in securely/i }));
    const code = await screen.findByPlaceholderText('000000');
    await user.type(code, '123456');
    await user.click(screen.getByRole('button', { name: /verify & sign in/i }));
    expect(authApi.verifyMfa).toHaveBeenCalledWith('temporary-challenge', '123456');
    expect(authApi.me).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/en/dashboard');
  }, 10_000);
});
