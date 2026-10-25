import axios, { AxiosInstance } from 'axios';
import { getAuthToken } from './auth';

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'healthy'
  | 'unhealthy'
  | 'rolled_back';

export interface Diagnosis {
  id: string;
  incidentId: string;
  aiOutput: string;
  evidence: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  deploymentId: string;
  deployment?: Deployment;
  reason: string;
  createdAt: string;
  diagnoses?: Diagnosis[];
  diagnosis?: Diagnosis | null;
}

export interface Deployment {
  id: string;
  version: string;
  image?: string;
  status: DeploymentStatus;
  repositoryId: string;
  repository?: Repository;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  namespace?: string;
  logs?: string;
  createdAt: string;
  updatedAt?: string;
  incident?: Incident | null;
}

export interface Repository {
  id: string;
  name: string;
  githubUrl: string;
  branch: string;
  userId?: string;
  createdAt: string;
  updatedAt?: string;
  deployments?: Deployment[];
  environments?: { id: string; name: string }[];
  webhookSecret?: string;
  githubToken?: string;
}

export interface CreateRepositoryData {
  name: string;
  githubUrl: string;
  branch?: string;
  githubToken?: string;
  webhookSecret?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth functions
export async function register(data: {
  email: string;
  name?: string;
  password?: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(
    '/auth/register',
    data
  );
  return 'data' in response.data && 'token' in (response.data as { data: AuthResponse }).data
    ? (response.data as { data: AuthResponse }).data
    : (response.data as AuthResponse);
}

export async function login(data: {
  email: string;
  password?: string;
}): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(
    '/auth/login',
    data
  );
  return 'data' in response.data && 'token' in (response.data as { data: AuthResponse }).data
    ? (response.data as { data: AuthResponse }).data
    : (response.data as AuthResponse);
}

// Repositories
export async function getRepositories(): Promise<Repository[]> {
  const response = await apiClient.get<Repository[] | { data: Repository[] }>('/repositories');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray((response.data as { data: Repository[] }).data)) {
    return (response.data as { data: Repository[] }).data;
  }
  return [];
}

export async function getRepository(id: string): Promise<Repository> {
  const response = await apiClient.get<Repository | { data: Repository }>(`/repositories/${id}`);
  return 'data' in response.data && (response.data as { data: Repository }).data?.id
    ? (response.data as { data: Repository }).data
    : (response.data as Repository);
}

export async function createRepository(
  data: CreateRepositoryData
): Promise<Repository> {
  const response = await apiClient.post<Repository | { data: Repository }>('/repositories', data);
  return 'data' in response.data && (response.data as { data: Repository }).data?.id
    ? (response.data as { data: Repository }).data
    : (response.data as Repository);
}

export async function deleteRepository(id: string): Promise<void> {
  await apiClient.delete(`/repositories/${id}`);
}

// Deployments
export async function getDeployment(id: string): Promise<Deployment> {
  const response = await apiClient.get<Deployment | { data: Deployment }>(`/deployments/${id}`);
  return 'data' in response.data && (response.data as { data: Deployment }).data?.id
    ? (response.data as { data: Deployment }).data
    : (response.data as Deployment);
}

// Incidents
export async function getIncidents(): Promise<Incident[]> {
  const response = await apiClient.get<Incident[] | { data: Incident[] }>('/incidents');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  if (response.data && Array.isArray((response.data as { data: Incident[] }).data)) {
    return (response.data as { data: Incident[] }).data;
  }
  return [];
}

export async function getIncident(id: string): Promise<Incident> {
  const response = await apiClient.get<Incident | { data: Incident }>(`/incidents/${id}`);
  return 'data' in response.data && (response.data as { data: Incident }).data?.id
    ? (response.data as { data: Incident }).data
    : (response.data as Incident);
}
