import apiClient from './client';
import type {
  InstrumentRepairListResponse,
  InstrumentRepairDetail,
  InstrumentCatalogResponse,
  InstrumentCatalogDetail,
  InstrumentRepairStats,
} from '../pages/instruments/types';

export const getInstrumentRepairs = (params: {
  search?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<InstrumentRepairListResponse>('/instruments/repairs', { params })
    .then((r) => r.data);

export const getInstrumentRepairDetail = (id: number) =>
  apiClient
    .get<InstrumentRepairDetail>(`/instruments/repairs/${id}`)
    .then((r) => r.data);

export const getInstrumentCatalog = (params: {
  search?: string;
  typeFilter?: string;
  activeFilter?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<InstrumentCatalogResponse>('/instruments/catalog', { params })
    .then((r) => r.data);

export const getInstrumentCatalogDetail = (id: number) =>
  apiClient
    .get<InstrumentCatalogDetail>(`/instruments/catalog/${id}`)
    .then((r) => r.data);

export const getInstrumentStats = () =>
  apiClient
    .get<InstrumentRepairStats>('/instruments/stats')
    .then((r) => r.data);
