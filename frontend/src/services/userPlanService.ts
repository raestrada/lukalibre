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

    // Guardar el plan en localStorage para que el servicio LLM pueda detectarlo
    const plan = res.data as UserPlan;
    localStorage.setItem('user_plan', JSON.stringify(plan));

    return plan;
  } catch (e) {
    console.error('Error al obtener el plan de usuario:', e);

    // Si hay un error, intentar recuperar el plan desde localStorage
    try {
      const cachedPlan = localStorage.getItem('user_plan');
      if (cachedPlan) {
        return JSON.parse(cachedPlan) as UserPlan;
      }
    } catch (storageErr) {
      console.error('Error al recuperar plan desde localStorage:', storageErr);
    }

    return null;
  }
}
