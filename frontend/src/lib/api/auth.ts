import { request } from './client';

export async function logoutApi(): Promise<void> {
    await request<void>('POST', '/auth/logout');
}
