import { writable, derived, get } from 'svelte/store';
import type { Readable, Writable } from 'svelte/store';

export type Validator = (value: any, allValues?: any) => boolean | string;

export interface FieldConfig {
  validators?: Validator[];
  initialValue?: any;
}

export interface FormOptions {
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormApi {
  register: (
    name: string,
    config?: FieldConfig,
  ) => {
    name: string;
    value: Writable<any>;
    error: Readable<string | null>;
    onChange: (e: Event) => void;
    onBlur: () => void;
  };
  handleSubmit: (e?: Event) => Promise<void>;
  reset: () => void;
  setValues: (values: Record<string, any>) => void;
  setValue: (name: string, value: any) => void;
  setError: (name: string, error: string | null) => void;
  clearErrors: () => void;
  state: Readable<FormState>;
  getState: () => FormState;
}

/**
 * Hook para gestión de formularios en Svelte
 * @param fields Configuración de campos
 * @param options Opciones generales
 * @returns API del formulario
 */
export function useForm(
  fields: Record<string, FieldConfig> = {},
  options: FormOptions = {},
): FormApi {
  // Opciones por defecto
  const { onSubmit = () => {}, validateOnChange = true, validateOnBlur = true } = options;

  // Estado del formulario
  const initialValues = Object.entries(fields).reduce(
    (acc, [name, config]) => ({ ...acc, [name]: config.initialValue ?? '' }),
    {},
  );

  const formStore = writable<FormState>({
    values: { ...initialValues },
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
    isDirty: false,
  });

  // Método para validar un campo individual
  function validateField(name: string, value: any): string | null {
    const fieldConfig = fields[name];
    if (!fieldConfig || !fieldConfig.validators) return null;

    for (const validator of fieldConfig.validators) {
      const state = get(formStore);
      const result = validator(value, state.values);
      if (result !== true) {
        return result as string;
      }
    }
    return null;
  }

  // Método para validar todos los campos
  function validateForm(): Record<string, string | null> {
    const state = get(formStore);
    const errors: Record<string, string | null> = {};
    let isValid = true;

    Object.entries(fields).forEach(([name, config]) => {
      if (config.validators) {
        const error = validateField(name, state.values[name]);
        errors[name] = error;
        if (error) isValid = false;
      }
    });

    formStore.update((state) => ({
      ...state,
      errors,
      isValid,
    }));

    return errors;
  }

  // Registrar un campo en el formulario
  function register(name: string, config: FieldConfig = {}) {
    const value = writable(get(formStore).values[name] ?? '');

    // Sincronizar valor con el estado del formulario
    value.subscribe((currentValue) => {
      formStore.update((state) => {
        const newValues = { ...state.values, [name]: currentValue };
        const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);

        // Validar si es necesario
        let errors = state.errors;
        if (validateOnChange && state.touched[name]) {
          const error = validateField(name, currentValue);
          errors = { ...errors, [name]: error };
        }

        return {
          ...state,
          values: newValues,
          errors,
          isDirty,
        };
      });
    });

    // Derivar error para este campo
    const error = derived(formStore, ($form) => $form.errors[name] || null);

    // Manejadores de eventos
    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      value.set(target.type === 'checkbox' ? target.checked : target.value);
    };

    const onBlur = () => {
      formStore.update((state) => {
        const touched = { ...state.touched, [name]: true };

        // Validar en blur si es necesario
        let errors = state.errors;
        if (validateOnBlur) {
          const error = validateField(name, state.values[name]);
          errors = { ...errors, [name]: error };
        }

        return { ...state, touched, errors };
      });
    };

    return { name, value, error, onChange, onBlur };
  }

  // Manejador de envío del formulario
  async function handleSubmit(e?: Event) {
    if (e) e.preventDefault();

    // Marcar todos los campos como tocados
    formStore.update((state) => ({
      ...state,
      touched: Object.keys(fields).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    }));

    // Validar el formulario completo
    const errors = validateForm();
    const hasErrors = Object.values(errors).some((error) => error !== null);

    if (!hasErrors) {
      formStore.update((state) => ({
        ...state,
        isSubmitting: true,
      }));

      try {
        await onSubmit(get(formStore).values);
      } finally {
        formStore.update((state) => ({
          ...state,
          isSubmitting: false,
        }));
      }
    }
  }

  // Reiniciar el formulario
  function reset() {
    formStore.set({
      values: { ...initialValues },
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false,
    });
  }

  // Establecer valores manualmente
  function setValues(values: Record<string, any>) {
    formStore.update((state) => {
      const newValues = { ...state.values, ...values };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);

      return {
        ...state,
        values: newValues,
        isDirty,
      };
    });
  }

  // Establecer un valor específico
  function setValue(name: string, value: any) {
    formStore.update((state) => {
      const newValues = { ...state.values, [name]: value };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);

      return {
        ...state,
        values: newValues,
        isDirty,
      };
    });
  }

  // Establecer un error específico
  function setError(name: string, error: string | null) {
    formStore.update((state) => ({
      ...state,
      errors: { ...state.errors, [name]: error },
    }));
  }

  // Limpiar todos los errores
  function clearErrors() {
    formStore.update((state) => ({
      ...state,
      errors: {},
    }));
  }

  // Devolver el estado actual
  function getState(): FormState {
    return get(formStore);
  }

  return {
    register,
    handleSubmit,
    reset,
    setValues,
    setValue,
    setError,
    clearErrors,
    state: formStore,
    getState,
  };
}
