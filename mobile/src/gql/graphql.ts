/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  name: string;
  /** 8 to 128 characters. */
  password: string;
};

export type UpdateProfileInput = {
  name: string;
};

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, name: string, email: string } };

export type SignInMutationVariables = Exact<{
  input: SignInInput;
}>;


export type SignInMutation = { signIn: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string, user: { id: string, name: string, email: string } } };

export type SignUpMutationVariables = Exact<{
  input: SignUpInput;
}>;


export type SignUpMutation = { signUp: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string, user: { id: string, name: string, email: string } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, name: string, email: string } };

export type RefreshTokenMutationVariables = Exact<{
  token: string;
}>;


export type RefreshTokenMutation = { refreshToken: { accessToken: string, accessTokenExpiresAt: string, refreshToken: string } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const UpdateProfileDocument = new TypedDocumentString(`
    mutation UpdateProfile($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    id
    name
    email
  }
}
    `) as unknown as TypedDocumentString<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const SignInDocument = new TypedDocumentString(`
    mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    accessToken
    accessTokenExpiresAt
    refreshToken
    user {
      id
      name
      email
    }
  }
}
    `) as unknown as TypedDocumentString<SignInMutation, SignInMutationVariables>;
export const SignUpDocument = new TypedDocumentString(`
    mutation SignUp($input: SignUpInput!) {
  signUp(input: $input) {
    accessToken
    accessTokenExpiresAt
    refreshToken
    user {
      id
      name
      email
    }
  }
}
    `) as unknown as TypedDocumentString<SignUpMutation, SignUpMutationVariables>;
export const MeDocument = new TypedDocumentString(`
    query Me {
  me {
    id
    name
    email
  }
}
    `) as unknown as TypedDocumentString<MeQuery, MeQueryVariables>;
export const RefreshTokenDocument = new TypedDocumentString(`
    mutation RefreshToken($token: String!) {
  refreshToken(token: $token) {
    accessToken
    accessTokenExpiresAt
    refreshToken
  }
}
    `) as unknown as TypedDocumentString<RefreshTokenMutation, RefreshTokenMutationVariables>;