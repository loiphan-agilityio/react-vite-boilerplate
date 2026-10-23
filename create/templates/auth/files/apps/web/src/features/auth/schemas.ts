import { Schema } from 'effect';

export const User = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
});
export type User = (typeof User)['Type'];

export const Credentials = Schema.Struct({
  email: Schema.String.pipe(
    Schema.check(
      Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: 'Enter a valid email address.' }),
    ),
  ),
  password: Schema.String.pipe(
    Schema.check(Schema.isMinLength(1, { message: 'Enter your password.' })),
  ),
});
export type Credentials = (typeof Credentials)['Type'];

/** What `POST /auth/login` answers: the JWT and the user it belongs to. */
export const Session = Schema.Struct({ token: Schema.String, user: User });
export type Session = (typeof Session)['Type'];
