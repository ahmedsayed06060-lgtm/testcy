import { AuthLayout } from '@/components/auth/auth-layout';
import { MFASetupForm } from '@/components/auth/mfa-setup-form';
export default function MFASetupPage() { return <AuthLayout title="Secure your account" subtitle="Set up mandatory time-based multi-factor authentication."><MFASetupForm /></AuthLayout>; }
