import { NetworkError, ValidationError } from '@/lib/api/errors';

import { setFormErrors } from '../forms';

describe('setFormErrors', () => {
  it('puts each server field message under its input', () => {
    const setError = vi.fn();
    setFormErrors(
      setError,
      new ValidationError({ message: 'Invalid', fields: { title: 'Too long' } }),
    );
    expect(setError).toHaveBeenCalledWith('title', { type: 'server', message: 'Too long' });
  });

  it('puts a message for a name the form has no input for on the root, given the values', () => {
    const setError = vi.fn();
    setFormErrors(
      setError,
      new ValidationError({
        message: 'Invalid',
        fields: { email: 'Unknown email', account: 'Account is locked.' },
      }),
      { email: '', password: '' },
    );
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Unknown email' });
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Account is locked.',
    });
    expect(setError).not.toHaveBeenCalledWith('account', expect.anything());
  });

  it('keeps a nested name under the input whose first segment the form has', () => {
    const setError = vi.fn();
    setFormErrors(
      setError,
      new ValidationError({ message: 'Invalid', fields: { 'address.city': 'Required' } }),
      { address: { city: '' } },
    );
    expect(setError).toHaveBeenCalledWith('address.city', { type: 'server', message: 'Required' });
    expect(setError).toHaveBeenCalledTimes(1);
  });

  it('puts any other failure on the root of the form', () => {
    const setError = vi.fn();
    setFormErrors(setError, new NetworkError());
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });
});
