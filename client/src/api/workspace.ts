import apiClient from './client';
import type { WorkspaceData } from '../pages/workspace/types';

export const getWorkspaceData = async (): Promise<WorkspaceData> => {
  const { data } = await apiClient.get<WorkspaceData>('/workspace');
  return data;
};
