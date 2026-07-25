import apiClient from './apiClient'
import type { DropdownState } from '../types'

export const settingsService = {
  async listDropdowns(): Promise<DropdownState> {
    const { data } = await apiClient.get('/settings/dropdowns')
    return data
  },

  async addDropdownValue(type: 'departments' | 'locations', value: string) {
    const { data } = await apiClient.post(`/settings/dropdowns/${type}`, { value })
    return data
  },

  async deleteDropdownValue(type: 'departments' | 'locations', id: string) {
    const { data } = await apiClient.delete(`/settings/dropdowns/${type}/${id}`)
    return data
  },
}
