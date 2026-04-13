import apiClient from './client';
import type { DeliveryMethod } from '../pages/loaners/types';

export const getDeliveryMethods = () =>
  apiClient.get<DeliveryMethod[]>('/delivery-methods').then((r) => r.data);
