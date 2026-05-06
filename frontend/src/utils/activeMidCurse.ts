import type { MidCurseType } from '../types'

export const activeMidCurse: {
  type: MidCurseType | null
  activeUntil: number
} = { type: null, activeUntil: 0 }
