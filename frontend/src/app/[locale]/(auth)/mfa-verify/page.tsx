import { AuthLayout } from '@/components/auth/auth-layout';
import { MFAVerifyForm } from '@/components/auth/mfa-verify-form';
export default function MFAVerifyPage() { return <AuthLayout title="Verify your identity" subtitle="A second factor is required for every CyberOps Hub role."><MFAVerifyForm /></AuthLayout>; }
