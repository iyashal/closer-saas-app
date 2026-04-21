import { useState, useRef } from 'react';
import { Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import type { Framework, FrameworkCard } from '@/types';
import { api } from '@/lib/api';

interface ImportResult {
  imported: number;
  errors: string[];
}

interface Props {
  framework: Framework;
  onImported: () => void;
}

export function ImportExportButtons({ framework, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<FrameworkCard[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [exporting, setExporting] = useState(false);

  const FRAMEWORK_LABELS: Record<string, string> = {
    nepq: 'nepq',
    straight_line: 'straight_line',
    unicorn_closer: 'unicorn_closer',
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.get<FrameworkCard[]>(`/frameworks/cards/export?framework=${framework}`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `closeforce-${FRAMEWORK_LABELS[framework]}-cards-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as FrameworkCard[];
        if (!Array.isArray(parsed)) throw new Error('Expected an array of cards');
        setPreview(parsed);
        setResult(null);
      } catch {
        setResult({ imported: 0, errors: ['Invalid JSON file'] });
      }
    };
    reader.readAsText(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await api.post<ImportResult>('/frameworks/cards/import', {
        cards: preview,
        framework,
      });
      setResult(res);
      setPreview(null);
      if (res.imported > 0) onImported();
    } catch (err) {
      setResult({ imported: 0, errors: [err instanceof Error ? err.message : 'Import failed'] });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download size={13} />
          Export
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <Upload size={13} />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Import preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold">Import Cards</h3>
            <p className="text-gray-300 text-sm">
              <span className="text-white font-medium">{preview.length} card{preview.length !== 1 ? 's' : ''}</span>{' '}
              found. Import into your custom {framework} cards?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-3 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import result toast */}
      {result && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-1 shadow-xl w-72"
          onClick={() => setResult(null)}
        >
          <div className="flex items-center gap-2">
            {result.errors.length === 0 ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <AlertCircle size={16} className="text-amber-400" />
            )}
            <span className="text-sm text-white font-medium">
              Imported {result.imported} card{result.imported !== 1 ? 's' : ''}
              {result.errors.length > 0 && `, ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          {result.errors.slice(0, 2).map((e, i) => (
            <p key={i} className="text-xs text-red-400 ml-6">{e}</p>
          ))}
          <p className="text-xs text-gray-600 ml-6">Click to dismiss</p>
        </div>
      )}
    </>
  );
}
