import { Link, useLocation } from 'react-router';
import { AuthLayout } from '../components/auth-layout';
import { SignUpForm } from '../components/sign-up-form';

export function SignUpPage() {
  const { search } = useLocation();
  return (
    <AuthLayout
      title="Criar conta"
      footer={
        <>
          Já tem conta?{' '}
          <Link
            to={`/entrar${search}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
