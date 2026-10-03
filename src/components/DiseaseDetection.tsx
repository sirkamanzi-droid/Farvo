import React, { useState } from 'react';
import { runBeansInference } from '../lib/beansModel';

export default function DiseaseDetection() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [rawResult, setRawResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawResult('Running...');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoUrl(dataUrl);
      try {
        const result = await runBeansInference(dataUrl);
        setRawResult(JSON.stringify(result, null, 2));
      } catch (err: any) {
        setErrorMsg(err?.message || String(err));
        setRawResult('FAILED');
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>RAW BEANS MODEL TEST — no styling, no logic, just truth</h2>
      <input type="file" accept="image/*" onChange={handleFile} />
      {photoUrl && <img src={photoUrl} style={{ width: 200, marginTop: 10 }} />}
      <pre style={{ background: '#eee', padding: 10, marginTop: 10, whiteSpace: 'pre-wrap' }}>
        {rawResult}
      </pre>
      {errorMsg && (
        <pre style={{ background: '#fdd', padding: 10, color: 'red' }}>
          ERROR: {errorMsg}
        </pre>
      )}
    </div>
  );
}