import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { type ApiError, toUserMessage } from '@/lib/api/errors';

/**
 * Shows an API failure on a React Hook Form form.
 *
 * A `ValidationError` with field messages puts each message under its input. Pass the form's
 * values (`form.getValues()`) so a message for a name the form has no input for (`account`, a
 * server-only rule) goes to `errors.root.server` instead of nowhere: React Hook Form keeps an error
 * under any name, but no input shows it. Anything else (or a validation error without field
 * details) goes to `errors.root.server`, which the form renders above the submit button.
 */
export const setFormErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: ApiError,
  values?: T,
) => {
  if (error._tag !== 'ValidationError' || Object.keys(error.fields).length === 0) {
    setError('root.server', { type: 'server', message: toUserMessage(error) });
    return;
  }
  // A nested name (`address.city`) belongs to the form when its first segment does.
  const hasInput = (field: string) =>
    values === undefined || Object.hasOwn(values, field.split('.')[0] ?? field);
  const unshown: string[] = [];
  for (const [field, message] of Object.entries(error.fields)) {
    if (hasInput(field)) {
      // Field names come from the server; they match the form when the API mirrors its schema.
      setError(field as Path<T>, { type: 'server', message });
    } else {
      unshown.push(message);
    }
  }
  if (unshown.length > 0) {
    setError('root.server', { type: 'server', message: unshown.join(' ') });
  }
};
