
import { User, Learner, Assessment, ChatMessage, UserStatus, ProgressReport } from '../../types.ts';

const API_BASE = '/api';

export const supabaseService = {
  async getProfile(userId: string): Promise<User> {
    const res = await fetch(`${API_BASE}/profiles/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async getAllProfiles(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/profiles`);
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    const res = await fetch(`${API_BASE}/profiles/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
  },

  async getLearners(): Promise<Learner[]> {
    const res = await fetch(`${API_BASE}/learners`);
    if (!res.ok) throw new Error('Failed to fetch learners');
    return res.json();
  },

  async saveLearner(learner: Learner): Promise<void> {
    const res = await fetch(`${API_BASE}/learners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(learner),
    });
    if (!res.ok) throw new Error('Failed to save learner');
  },

  async deleteLearner(learnerId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/learners/${learnerId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete learner');
  },

  async getAssessments(): Promise<Assessment[]> {
    const res = await fetch(`${API_BASE}/assessments`);
    if (!res.ok) throw new Error('Failed to fetch assessments');
    return res.json();
  },

  async saveAssessment(assessment: Assessment): Promise<void> {
    const res = await fetch(`${API_BASE}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessment),
    });
    if (!res.ok) throw new Error('Failed to save assessment');
  },

  async deleteAssessment(assessmentId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete assessment');
  },

  async getMessages(): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendMessage(message: any): Promise<void> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) throw new Error('Failed to send message');
  },

  async markMessagesAsRead(messageIds: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/messages/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: messageIds }),
    });
    if (!res.ok) throw new Error('Failed to mark messages as read');
  },

  async signIn(username: string, password: string): Promise<{ user: any }> {
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid username or password');
    const data = await res.json();
    return { user: data.user };
  },

  async signUp(userData: any): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error('Registration failed');
  },

  async signOut(): Promise<void> {
    // Local sign out just clears state on client
    return Promise.resolve();
  },

  async getProgressReports(): Promise<ProgressReport[]> {
    const res = await fetch(`${API_BASE}/progress-reports`);
    if (!res.ok) throw new Error('Failed to fetch progress reports');
    return res.json();
  },

  async saveProgressReport(report: any): Promise<void> {
    const res = await fetch(`${API_BASE}/progress-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error('Failed to save progress report');
  },

  async deleteProgressReport(reportId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/progress-reports/${reportId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete progress report');
  }
};
