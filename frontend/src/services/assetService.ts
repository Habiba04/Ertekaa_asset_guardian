import apiClient from './apiClient'
import type { Asset, NewAssetForm, AuditLogEntry, PingResult } from '../types'

export interface ListAssetsParams {
  search?: string
  department?: string
  location?: string
  deviceType?: string
  page?: number
  pageSize?: number
}

export interface ListAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  pageSize: number
}

export interface BulkImportResponse {
  message: string
  assets: Asset[]
  created: number
  updated: number
  skipped: Array<{ row: Record<string, unknown>; reason: string }>
}

export const assetService = {
  async list(params: ListAssetsParams = {}): Promise<ListAssetsResponse> {
    const { data } = await apiClient.get('/assets', { params })
    return data
  },

  async get(id: string): Promise<{ asset: Asset }> {
    const { data } = await apiClient.get(`/assets/${id}`)
    return data
  },

  async getActivity(id: string): Promise<{ activity: AuditLogEntry[] }> {
    const { data } = await apiClient.get(`/assets/${id}/activity`)
    return data
  },

  async create(payload: Partial<NewAssetForm>): Promise<{ asset: Asset }> {
    const { data } = await apiClient.post('/assets', payload)
    return data
  },

  async update(id: string, payload: Partial<Asset>): Promise<{ asset: Asset }> {
    const { data } = await apiClient.patch(`/assets/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/assets/${id}`)
    return data
  },

  async bulkRemove(ids: string[]): Promise<{ message: string }> {
    const { data } = await apiClient.post('/assets/bulk-delete', { ids })
    return data
  },

  async sync(ids?: string[]): Promise<{ message: string; syncedCount: number }> {
    const { data } = await apiClient.post('/assets/sync', { ids: ids ?? [] })
    return data
  },

  async bulkImport(rows: Record<string, unknown>[]): Promise<BulkImportResponse> {
    const { data } = await apiClient.post('/assets/import', { rows })
    return data
  },

  async ping(id: string): Promise<PingResult> {
    const { data } = await apiClient.get(`/assets/${id}/ping`)
    return data
  },
}
