import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CVSSCalculator } from '@/components/findings/cvss-calculator';
import { calculateCVSS } from '@/lib/cvss';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/api-client')>(), api: vi.fn() }));

describe('CVSS calculator', () => {
  beforeEach(() => { vi.mocked(api).mockResolvedValue({ score: 9.8, severity: 'critical' }); });

  it('calculates a critical network vector using the CVSS v3.1 formula', () => {
    expect(calculateCVSS('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toEqual({ score: 10, severity: 'Critical' });
    expect(calculateCVSS('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H').score).toBe(9.8);
  });

  it('rejects incomplete vectors', () => {
    expect(() => calculateCVSS('CVSS:3.1/AV:N')).toThrow('All eight');
  });

  it('requests authoritative scoring and renders the result', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><CVSSCalculator /></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: /validate score/i }));
    expect(api).toHaveBeenCalledWith('/findings/cvss/calculate', expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByText(/9\.8/)).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });
});
