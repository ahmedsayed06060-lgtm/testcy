'use client';

import { useRef, useState } from 'react';
import { FileCheck2, UploadCloud } from 'lucide-react';

export function FileUpload({ accept, maxBytes = 100 * 1024 * 1024, onFile }: { accept: string; maxBytes?: number; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const select = (file?: File) => {
    if (!file) return;
    if (file.size > maxBytes) { setError('The selected file exceeds the size limit'); return; }
    setError(''); setName(file.name); onFile(file);
  };
  return <div><input ref={input} type="file" accept={accept} className="hidden" onChange={(event) => select(event.target.files?.[0])} /><button type="button" onClick={() => input.current?.click()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files[0]); }} onDragOver={(event) => event.preventDefault()} className="flex w-full flex-col items-center rounded-xl border border-dashed border-line bg-canvas/30 px-5 py-8 hover:border-brand-400">{name ? <FileCheck2 className="h-7 w-7 text-brand-600" /> : <UploadCloud className="h-7 w-7 text-brand-600" />}<span className="mt-2 text-xs font-semibold">{name || 'Choose a file or drop it here'}</span><span className="mt-1 text-[10px] text-muted">Maximum {Math.round(maxBytes / 1024 / 1024)} MB · validated before storage</span></button>{error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}</div>;
}
