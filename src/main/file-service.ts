import { net } from 'electron';
import { FILE_SERVICE_BASE } from './config';

interface UploadUriResponse {
  expires_in: string;
  key: string;
  uri: string;
}

export const getUploadUri = async (ext: string): Promise<{ key: string; uri: string }> => {
  const res = await net.fetch(`${FILE_SERVICE_BASE}/get-upload-uri?ext=${encodeURIComponent(ext)}`);
  if (!res.ok) throw new Error(`File service error: ${res.status}`);
  const json = (await res.json()) as UploadUriResponse;
  return { key: json.key, uri: json.uri };
};

export const putFile = async (uri: string, body: Buffer, contentType: string): Promise<void> => {
  // Hand the bytes over as a fresh Uint8Array so the DOM body type is happy.
  const view = new Uint8Array(body.byteLength);
  view.set(body);
  const res = await net.fetch(uri, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: view,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
};
