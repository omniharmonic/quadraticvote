import SignupForm from '@/components/auth/SignupForm';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return <SignupForm />;
}