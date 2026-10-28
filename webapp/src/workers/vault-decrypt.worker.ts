import { decryptSends, decryptVaultCore, type DecryptSendsArgs, type DecryptVaultCoreArgs } from '@/lib/vault-decrypt';

type WorkerRequest =
  | { id: number; kind: 'vault-core'; payload: DecryptVaultCoreArgs }
  | { id: number; kind: 'sends'; payload: DecryptSendsArgs };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  if (event.origin !== self.location.origin) return;
  const request = event.data;
  if (!request || !Number.isSafeInteger(request.id) || (request.kind !== 'vault-core' && request.kind !== 'sends')) return;
  try {
    if (request.kind === 'vault-core') {
      const result = await decryptVaultCore(request.payload);
      self.postMessage({ id: request.id, ok: true, result });
      return;
    }
    const result = await decryptSends(request.payload);
    self.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Decrypt failed',
    });
  }
};
