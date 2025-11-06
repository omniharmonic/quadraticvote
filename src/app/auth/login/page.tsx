import LoginForm from '@/components/auth/LoginForm';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm />;
}