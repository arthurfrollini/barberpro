import { Link, useLocation } from 'react-router';
import { AuthLayout } from '../components/auth-layout';
import { SignInForm } from '../components/sign-in-form';

export function SignInPage() {
  const { search } = useLocation();
  return (
    <AuthLayout
      title="Entrar"
      footer={
        <>
          Primeira vez aqui?{' '}
          <Link
            to={`/criar-conta${search}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}
