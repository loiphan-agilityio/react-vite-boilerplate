import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Alert, AlertDescription } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';

import { config } from '@/lib/config';
import { setFormErrors } from '@/lib/forms';

import { safeRedirect } from '../../model';
import { useSignIn } from '../../queries';
import { Credentials } from '../../schemas';

const resolver = effectTsResolver(Credentials);

export const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useSignIn();
  const {
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm({ resolver, defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit((credentials) => {
    signIn.mutate(credentials, {
      onSuccess: () => {
        void navigate(safeRedirect(searchParams.get('redirect')), { replace: true });
      },
      onError: (error) => {
        if (error._tag === 'UnauthorizedError') {
          setError('root.server', { type: 'server', message: 'Wrong email or password.' });
        } else {
          setFormErrors(setError, error, getValues());
        }
      },
    });
  });

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Sign in</h1>
        </CardTitle>
        <CardDescription>
          {config.apiMocking
            ? 'Demo account: demo@example.com / password'
            : 'Enter your email and password.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          <FieldGroup>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root?.server ? (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.server.message}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};
