'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', destructive = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; destructive?: boolean }) {
  return <Modal open={open} onClose={onClose} title={title} description={description} size="sm"><div className="flex justify-end gap-3 p-6"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={destructive ? 'danger' : 'default'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></div></Modal>;
}
