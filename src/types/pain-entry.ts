export interface PainEntry {
  id: string
  user_id: string
  tracker_id: string
  timestamp: number
  intensity: number
  locations: string[]
  notes: string
  triggers: string[]
  hashtags: string[]
}

export type BodyLocation = 
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'upper-back'
  | 'lower-back'
  | 'chest'
  | 'abdomen'
  | 'hips'
  | 'arms'
  | 'hands'
  | 'legs'
  | 'knees'
  | 'feet'

export const BODY_LOCATIONS: { value: BodyLocation; label: string }[] = [
  { value: 'head', label: 'Head' },
  { value: 'neck', label: 'Neck' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'upper-back', label: 'Upper Back' },
  { value: 'lower-back', label: 'Lower Back' },
  { value: 'chest', label: 'Chest' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'hips', label: 'Hips' },
  { value: 'arms', label: 'Arms' },
  { value: 'hands', label: 'Hands' },
  { value: 'legs', label: 'Legs' },
  { value: 'knees', label: 'Knees' },
  { value: 'feet', label: 'Feet' },
]

export const COMMON_TRIGGERS = [
  'Stress',
  'Weather',
  'Physical Activity',
  'Sleep Issues',
  'Diet',
  'Medication Change',
  'Prolonged Sitting',
  'Cold',
  'Heat',
]
