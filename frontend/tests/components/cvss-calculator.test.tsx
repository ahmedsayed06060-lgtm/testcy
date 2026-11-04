import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CVSSCalculator } from '@/components/findings/cvss-calculator';
import { calculateCVSS } from '@/lib/cvss';

describe('CVSS calculator', () => {
  it('calculates a critical network vector using the CVSS v3.1 formula', () => {
    expect(calculateCVSS('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H')).toEqual({ score: 10, severity: 'Critical' });
    expect(calculateCVSS('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H').score).toBe(9.8);
  });

  it('rejects incomplete vectors', () => {
    expect(() => calculateCVSS('CVSS:3.1/AV:N')).toThrow('All eight');
  });

  it('renders a score after calculation', async () => {
    render(<CVSSCalculator />);
    await userEvent.click(screen.getByRole('button', { name: /calculate/i }));
    expect(screen.getByText('9.8 · Critical')).toBeInTheDocument();
  });
});
