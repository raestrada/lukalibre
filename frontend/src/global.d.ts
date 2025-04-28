/// <reference types="svelte" />

// Extensión de tipos para svelte-spa-router
declare module 'svelte-spa-router' {
  import type { SvelteComponentTyped } from 'svelte';
  import type { ComponentType } from 'svelte/internal';

  export interface ConditionFail {
    redirect?: string;
    message?: string;
  }

  export type Conditions = ((location: string) => boolean | ConditionFail)[];

  export interface RouteDefinition {
    component: ComponentType<any>;
    conditions?: Conditions;
    userData?: Record<string, any>;
  }

  export function wrap(route: RouteDefinition): ComponentType<any>;

  export function push(location: string): void;

  export function pop(): void;

  export function replace(location: string): void;

  export let location: string;
}

// Definir interfaces faltantes para los servicios
interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  google_avatar?: string;
}
