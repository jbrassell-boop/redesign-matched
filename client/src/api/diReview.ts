import apiClient from './client';
import type { DiQueueItem, LoadedRepair } from '../pages/di-review/types';

const BASE = '/di-review';

export const getDiQueue = async (): Promise<DiQueueItem[]> => {
  const { data } = await apiClient.get<DiQueueItem[]>(BASE);
  return data;
};

export const getDiDetail = async (repairKey: number): Promise<LoadedRepair[]> => {
  const { data } = await apiClient.get<LoadedRepair[]>(`${BASE}/${repairKey}`);
  return data;
};

export const removeDiItem = async (repairKey: number, tranKey: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${repairKey}/items/${tranKey}`);
};

export const approveDiReview = async (repairKey: number, techComments: string): Promise<void> => {
  await apiClient.post(`${BASE}/${repairKey}/approve`, { techComments });
};

export const holdDiReview = async (repairKey: number, note: string): Promise<void> => {
  await apiClient.post(`${BASE}/${repairKey}/hold`, { note });
};
