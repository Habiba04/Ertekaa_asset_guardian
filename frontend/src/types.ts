export type DeviceType = 'Laptop' | 'PC' | 'Switch' | 'Server' | 'Printer' | 'Router' | 'Other'
export type AssetStatus = 'online' | 'remote' | 'unregistered'
export type DataSource = 'Agent' | 'Manual' | 'CSV Import'
export type UserRole = 'SUPER_ADMIN' | 'IT_ADMIN' | 'READ_ONLY_AUDITOR'
export type DrawerTab = 'hardware' | 'admin' | 'activity'
export type StagingStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type EventCategory = 'created' | 'updated' | 'checkin' | 'alert' | 'deleted' | 'approved'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  username: string
  role: UserRole
  mfaEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface Asset {
  id: string
  oldHostName: string
  hostName: string
  ipAddress: string
  deviceType: DeviceType
  manufacturer: string
  model: string
  processor: string
  memory: string
  operatingSystem: string
  serialNumber: string
  macAddress: string
  location: string
  lastUser: string
  owner: string
  department: string
  dataSource: DataSource
  lastMaintenanceDate: string | null
  achievedBy: string
  notes: string
  status: AssetStatus
  lastSeen: string
  createdAt: string
  updatedAt: string
}

export interface NewAssetForm {
  hostName: string
  deviceType: DeviceType
  serialNumber: string
  macAddress: string
  owner: string
  department: string
  location: string
  notes: string
}

export interface StagingDevice {
  id: string
  hostName: string
  ipAddress: string
  serialNumber: string | null
  macAddress: string
  processor: string
  memory: string
  operatingSystem: string
  manufacturer: string
  model: string
  deviceType: DeviceType
  status: StagingStatus
  submittedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  owner: string | null
  department: string | null
  location: string | null
  notes: string | null
  approvedDeviceId: string | null
}

export interface AuditLogEntry {
  id: string
  deviceId: string | null
  hostname: string
  eventType: string
  eventCategory: EventCategory
  userSource: string
  changeSummary: string
  changeDetails: Array<{ field: string; from: string; to: string }> | null
  timestamp: string
}

export interface DropdownValue {
  id: string
  value: string
}

export interface DropdownState {
  departments: DropdownValue[]
  locations: DropdownValue[]
}

export interface StagingCounts {
  enrolled: number
  pending: number
  failed: number
}
