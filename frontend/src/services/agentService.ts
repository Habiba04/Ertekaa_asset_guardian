import apiClient from './apiClient'
import type { StagingDevice, StagingCounts, Asset } from '../types'

export const agentService = {
  async listStagingQueue(status: string = 'PENDING_REVIEW'): Promise<{ queue: StagingDevice[] }> {
    const { data } = await apiClient.get('/agent/staging', { params: { status } })
    return data
  },

  async getStagingCounts(): Promise<StagingCounts> {
    const { data } = await apiClient.get('/agent/staging/counts')
    return data
  },

  async approve(
    id: string,
    payload: { owner: string; department: string; location: string; notes?: string }
  ): Promise<{ device: Asset; staging: StagingDevice }> {
    const { data } = await apiClient.post(`/agent/staging/${id}/approve`, payload)
    return data
  },

  async reject(id: string): Promise<{ message: string; staging: StagingDevice }> {
    const { data } = await apiClient.post(`/agent/staging/${id}/reject`)
    return data
  },
}
