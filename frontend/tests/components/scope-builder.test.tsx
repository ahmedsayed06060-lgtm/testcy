import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScopeBuilder } from '@/components/engagements/scope-builder';
import { ToastProvider } from '@/components/ui/toast';

describe('ScopeBuilder', () => {
  it('adds an unverified asset and prevents duplicates', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ScopeBuilder /></ToastProvider>);
    const input = screen.getByLabelText('Scope target');
    await user.type(input, 'new.acme.example');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText('new.acme.example')).toBeInTheDocument();
    expect(screen.getByText('Ownership verification is required before execution.')).toBeInTheDocument();
    await user.type(input, 'new.acme.example');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText('This asset is already in the scope')).toBeInTheDocument();
  });

  it('rejects command-line options as targets', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ScopeBuilder /></ToastProvider>);
    await user.type(screen.getByLabelText('Scope target'), '--script=exploit');
    await user.click(screen.getByRole('button', { name: /add asset/i }));
    expect(screen.getByText('Options are not valid targets')).toBeInTheDocument();
  });
});
