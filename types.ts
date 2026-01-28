
export enum UserRole {
  ADMIN = 'ADMIN',
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
  password?: string;
  fullName: string;
  designation: string;
  role: UserRole;
  status: UserStatus;
  lastActive?: number; // Timestamp of last activity
  schoolName?: string;
  schoolId?: string;
  district?: string;
  legislativeDistrict?: string;
  districtSupervisorName?: string;
  districtSupervisorDesignation?: string;
  kindergartenCoordinatorName?: string;
  kindergartenCoordinatorDesignation?: string;
  schoolHeadName?: string;
  schoolHeadDesignation?: string;
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
  status: 'New Student/Enrolled' | 'Transferred-In' | 'Transferred-Out';
  excelColG?: string; // Captured from Column G of Excel
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

export interface School {
  id: string;
  name: string;
  district: string;
  legislativeDistrict: string;
}
