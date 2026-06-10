'use client'
import { useState, useTransition } from 'react'
import { importPlayers } from '@/lib/players/import-action'

export function ImportSection() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ imported: number; errors: string[]; headers?: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      startTransition(async () => {
        const r = await importPlayers(new Uint8Array(buffer))
        if ('error' in r) setError(r.error)
        else setResult(r)
      })
    }
    reader.onerror = () => setError('Errore lettura file')
    reader.readAsArrayBuffer(file)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Import Excel calciatori</h2>
      <p className="text-sm text-gray-500 mb-4">
        File Excel da fantacalcio.it. L&apos;import aggiorna i giocatori esistenti (upsert su Id).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        <button
          type="submit"
          disabled={!file || isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? 'Importazione...' : 'Importa'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg space-y-2">
          <p className="text-green-700 font-semibold">{result.imported} giocatori importati</p>
          {result.errors.length > 0 && (
            <ul className="text-xs text-red-500">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {result.headers && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Colonne trovate nell&apos;Excel (debug)</summary>
              <pre className="mt-1 text-[11px] bg-white border rounded p-2 max-h-32 overflow-y-auto">
                {result.headers.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  )
}
