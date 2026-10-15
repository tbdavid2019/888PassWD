import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';
import {
  DecisionService,
  type VaultTriageItemInput,
  type DuplicateClusterInput,
  type VaultCategorizeItemInput,
  type ExistingFolderInput,
} from '../services/decision-service';

async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return (body && typeof body === 'object') ? (body as T) : null;
  } catch {
    return null;
  }
}

export async function handleVaultTriage(
  request: Request,
  env: Env,
  _userId: string
): Promise<Response> {
  const body = await readJsonBody<{ items?: VaultTriageItemInput[] }>(request);
  const items = Array.isArray(body?.items) ? body!.items : [];
  const service = new DecisionService(env);
  const result = await service.evaluateVaultTriage(items);
  return jsonResponse(result);
}

export async function handleVaultClusters(
  request: Request,
  env: Env,
  _userId: string
): Promise<Response> {
  const body = await readJsonBody<{ clusters?: DuplicateClusterInput[] }>(request);
  const clusters = Array.isArray(body?.clusters) ? body!.clusters : [];
  const service = new DecisionService(env);
  const result = await service.evaluateDuplicateClusters(clusters);
  return jsonResponse(result);
}

export async function handleVaultCategorize(
  request: Request,
  env: Env,
  _userId: string
): Promise<Response> {
  const body = await readJsonBody<{ items?: VaultCategorizeItemInput[]; existingFolders?: ExistingFolderInput[] }>(request);
  const items = Array.isArray(body?.items) ? body!.items : [];
  const existingFolders = Array.isArray(body?.existingFolders) ? body!.existingFolders : [];
  const service = new DecisionService(env);
  const result = await service.evaluateWebsiteCategorization(items, existingFolders);
  return jsonResponse(result);
}

