import httpService from './httpService';

export interface UserPlan {
  id: number | null;
  user_id: number;
  plan_name: string | null;
  is_active: boolean;
  credits: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  developer?: boolean;
  is_developer?: boolean;
  dev_plan_active?: boolean;
}

export async function fetchUserPlan(): Promise<UserPlan | null> {
  try {
    const res = await httpService.get('/users/plan');
    if (!res.data) return null;
    return res.data as UserPlan;
  } catch (e) {
    console.error('Error al obtener el plan de usuario:', e);
    return null;
  }
}
