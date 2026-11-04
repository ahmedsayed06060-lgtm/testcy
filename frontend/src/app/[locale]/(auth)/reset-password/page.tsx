import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/password-forms';
export default function ResetPasswordPage() { return <AuthLayout title="Choose a new password" subtitle="Use a unique password that has not appeared in a known breach."><ResetPasswordForm /></AuthLayout>; }
