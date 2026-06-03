
export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  CONSOLIDATOR = 'CONSOLIDATOR',
  SCHOOL_USER = 'SCHOOL_USER'
}

export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  fullName: string;
  designation: string;
  role: UserRole;
  status: UserStatus;
  lastActive?: number; // Timestamp of last activity
  schoolName?: string;
  schoolId?: string;
  schoolYear?: string;
  district?: string;
  legislativeDistrict?: string;
  districtSupervisorName?: string;
  districtSupervisorDesignation?: string;
  kindergartenCoordinatorName?: string;
  kindergartenCoordinatorDesignation?: string;
  schoolHeadName?: string;
  schoolHeadDesignation?: string;
  passwordRequest?: {
    message: string;
    timestamp: number;
    resolved: boolean;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string; // Specific recipient (null for general district broadcast)
  targetDistrict: string;
  text: string;
  timestamp: number;
  read: boolean;
  isFromConsolidator: boolean;
}

export interface Learner {
  id: string;
  lrn: string;
  schoolId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  birthday: string;
  address: string;
  fathersName: string;
  fathersAge?: number;
  mothersName: string;
  mothersAge?: number;
  handedness: 'Right' | 'Left' | 'Both';
  fathersOccupation: string;
  mothersOccupation: string;
  fathersEducation: string;
  mothersEducation: string;
  numSiblings: number;
  birthOrder: string;
  status: 'ENROLLED' | 'Transferred-In' | 'Transferred-Out';
  excelColG?: string; // Captured from Column G of Excel
  schoolYear: string;
  dateOfBeginningOfClasses?: string; // New field added
  dateOfEndOfClasses?: string; // Added end of school year date
  section: string;
  adviser?: string; // Teacher name from imported data
  schoolHeadName?: string; // School Head name from imported data
}

export interface ECCDScore {
  grossMotor: number;
  fineMotor: number;
  selfHelp: number;
  receptiveLanguage: number;
  expressiveLanguage: number;
  cognitive: number;
  socioEmotional: number;
}

export interface Assessment {
  id: string;
  learnerId: string;
  date: string;
  period: 'FIRST ASSESSMENT' | 'MID-ASSESSMENT' | 'THIRD ASSESSMENT';
  scores: ECCDScore;
  remarks: string;
  checklist?: Record<string, boolean[]>;
}

export interface ProgressReportAttendanceMonth {
  classDays: number;
  daysPresent: number;
  timesAbsent: number;
}

export interface ProgressReport {
  id: string;
  learnerId: string;
  schoolYear: string;
  ratings: Record<string, string[]>;
  comments: string[]; // [T1, T2, T3]
  attendance: Record<string, ProgressReportAttendanceMonth>; // month name -> attendance
}

export interface School {
  id: string;
  name: string;
  district: string;
  legislativeDistrict: string;
}

export interface SubmissionStatus {
  id: string;
  userId: string;
  period: 'FIRST ASSESSMENT' | 'MID-ASSESSMENT' | 'THIRD ASSESSMENT';
  schoolYear: string;
  isFinalized: boolean;
  unfinalizeCount: number;
  requestUnfinalize: boolean;
  requestMessage?: string;
  lastUpdated: number;
}
