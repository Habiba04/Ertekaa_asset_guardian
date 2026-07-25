import apiClient from './apiClient'
import type { AdminUser } from '../types'

export interface LoginResponse {
  token: string
  user: AdminUser
}

export interface SetupStatusResponse {
  isSetupComplete: boolean
  adminCount: number
}

export const authService = {
  async getSetupStatus(): Promise<SetupStatusResponse> {
    const { data } = await apiClient.get('/setup/status')
    return data
  },

  async initializeSetup(payload: {
    fullName: string
    email: string
    username: string
    password: string
  }): Promise<LoginResponse> {
    const { data } = await apiClient.post('/setup/init', payload)
    return data
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post('/auth/login', { username, password })
    return data
  },

  async me(): Promise<{ user: AdminUser }> {
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  async listAdmins(): Promise<{ admins: AdminUser[] }> {
    const { data } = await apiClient.get('/auth/admins')
    return data
  },

  async createAdmin(payload: {
    fullName: string
    email: string
    username: string
    password: string
    role: string
  }): Promise<{ admin: AdminUser }> {
    const { data } = await apiClient.post('/auth/admins', payload)
    return data
  },

  async updateAdminRole(id: string, role: string): Promise<{ admin: AdminUser }> {
    const { data } = await apiClient.patch(`/auth/admins/${id}/role`, { role })
    return data
  },

  async revokeAdmin(id: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete(`/auth/admins/${id}`)
    return data
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.patch('/auth/me/password', { currentPassword, newPassword })
    return data
  },

  async resetAdminPassword(id: string, newPassword: string): Promise<{ message: string }> {
    const { data } = await apiClient.patch(`/auth/admins/${id}/password`, { newPassword })
    return data
  },
}
