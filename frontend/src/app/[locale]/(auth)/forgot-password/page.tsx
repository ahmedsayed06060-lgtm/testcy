import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/password-forms';
export default function ForgotPasswordPage() { return <AuthLayout title="Reset your password" subtitle="Enter your work email and we’ll send time-limited reset instructions."><ForgotPasswordForm /></AuthLayout>; }
