import apiClient from './apiClient'
import type { AuditLogEntry } from '../types'

export interface ListAuditLogsParams {
  search?: string
  category?: string
  dateFrom?: string
  dateTo?: string
}

export interface ListAuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  categoryCounts: Record<string, number>
}

export const auditService = {
  async list(params: ListAuditLogsParams = {}): Promise<ListAuditLogsResponse> {
    const { data } = await apiClient.get('/audit-logs', { params })
    return data
  },
}
