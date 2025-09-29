
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  email: string;
  phone?: string;
  pin?: string;
  createdAt?: Date;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed';
  notes?: string;
  eventId?: string; // Link to calendar event
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckIn {
  id: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  checkInTime: Date;
  checkOutTime?: Date;
  actualLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  signature?: string; // Base64 encoded signature
  photos?: string[]; // Array of photo URIs
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  hireDate: Date;
  isActive: boolean;
  pin?: string; // 5-digit PIN for login
  totalHours?: number;
}

export interface TimeReport {
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  date: string;
  hoursWorked: number;
  overtime?: number;
  checkIns: CheckIn[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  locationId: string;
  locationName: string;
  type: 'event' | 'meeting' | 'training' | 'maintenance';
  color: string;
  shifts?: Shift[]; // Shifts associated with this event
  createdAt: Date;
  updatedAt: Date;
}
