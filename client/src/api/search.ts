import apiClient from './client';

export interface SearchResult {
  key: number;
  title: string;
  subtitle: string;
}

export interface SearchResponse {
  repairs: SearchResult[];
  clients: SearchResult[];
  departments: SearchResult[];
  contracts: SearchResult[];
}

export const globalSearch = (q: string): Promise<SearchResponse> =>
  apiClient.get('/search', { params: { q } }).then(r => r.data);
