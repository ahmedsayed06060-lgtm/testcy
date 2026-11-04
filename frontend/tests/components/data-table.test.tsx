import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { DataTable } from '@/components/common/data-table';

const columns: ColumnDef<{ name: string; risk: number }>[] = [
  { accessorKey: 'name', header: 'Name' }, { accessorKey: 'risk', header: 'Risk' },
];
const data = [{ name: 'Acme', risk: 9 }, { name: 'Helix', risk: 4 }];

describe('DataTable', () => {
  it('filters and sorts records', async () => {
    const user = userEvent.setup();
    render(<DataTable data={data} columns={columns} />);
    expect(screen.getByText('2 records')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Filter table'), 'Helix');
    expect(screen.getByText('1 records')).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Filter table'));
    await user.click(screen.getByRole('button', { name: 'Risk' }));
    const cells = screen.getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(cells[0]).toContain('Helix');
  });
});
