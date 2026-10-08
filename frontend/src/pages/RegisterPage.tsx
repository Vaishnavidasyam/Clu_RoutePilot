import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { 
  AuthCard, 
  AuthLogo, 
  FormField, 
  FormInput, 
  PasswordInput, 
  PrimaryButton 
} from '../components/auth/AuthComponents';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OPERATIONS_MANAGER' | 'EXECUTIVE' | 'ADMIN'>('OPERATIONS_MANAGER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminService.createUser({
        full_name: fullName,
        email,
        password,
        role
      });
      setSuccess(true);
      setTimeout(async () => {
        try {
          await login(email, password);
          if (role === 'ADMIN') {
            navigate('/admin');
          } else if (role === 'EXECUTIVE') {
            navigate('/portal');
          } else {
            navigate('/dashboard');
          }
        } catch {
          navigate('/login');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Please complete the required fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        {/* Brand Logo */}
        <AuthLogo />

        {/* Title & Short Description */}
        <div className="text-center space-y-1.5 mb-6">
          <h1 className="text-2xl font-bold text-[#173B56] tracking-tight">
            Create your RoutePilot workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#687F91] leading-relaxed max-w-sm mx-auto">
            Set up your account to manage daily field visits and route planning.
          </p>
        </div>

        {/* Success Alert Banner */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-[#0FA968]/10 border border-[#0FA968]/20 text-[#0FA968] text-xs font-semibold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0FA968]" />
            <span>Workspace created! Redirecting to setup...</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#D94B4B]/10 border border-[#D94B4B]/20 text-[#D94B4B] text-xs font-medium flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name">
            <FormInput
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Priya Sharma"
              icon={<User className="w-4 h-4" />}
            />
          </FormField>

          <FormField label="Work Email">
            <FormInput
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="priya@company.com"
              icon={<Mail className="w-4 h-4" />}
            />
          </FormField>

          <FormField label="Password">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create secure password"
              icon={<Lock className="w-4 h-4" />}
            />
          </FormField>

          {/* Operational Role Dropdown */}
          <FormField label="Operational Role">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687F91] pointer-events-none">
                <Briefcase className="w-4 h-4" />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full h-[48px] rounded-xl border border-[#DCE8EC] bg-white text-xs sm:text-sm text-[#173B56] pl-10 pr-4 transition duration-200 focus:outline-none focus:border-[#F58220] focus:ring-3 focus:ring-[#F58220]/15 cursor-pointer"
              >
                <option value="OPERATIONS_MANAGER">Operations Manager</option>
                <option value="EXECUTIVE">Field Executive</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
          </FormField>

          {/* Primary Action Button */}
          <div className="pt-2">
            <PrimaryButton 
              type="submit" 
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Create Workspace
            </PrimaryButton>
          </div>
        </form>

        {/* Secondary Navigation to Login */}
        <div className="mt-6 pt-5 border-t border-[#DCE8EC] text-center text-xs text-[#687F91]">
          <span>Already have an account? </span>
          <Link 
            to="/login" 
            className="font-bold text-[#F58220] hover:text-[#e07216] transition inline-flex items-center gap-1 ml-1"
          >
            <span>Sign in</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
