import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { 
  AuthCard, 
  AuthLogo, 
  FormField, 
  FormInput, 
  PasswordInput, 
  PrimaryButton, 
  DemoAccountSelector 
} from '../components/auth/AuthComponents';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('manager@routepilot.io');
  const [password, setPassword] = useState('manager123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const loggedUser = await login(email, password);
      // Route based on role credentials
      const isExec = loggedUser?.role === 'EXECUTIVE' || 
                     email.toLowerCase().includes('executive') || 
                     /^e\d+/i.test(email.trim());
      if (isExec) {
        navigate('/executive/home');
      } else {
        navigate('/manager/overview');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials or unauthorized account. Please check and try again.');
    }
  };

  const handleDemoSelect = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <AuthLayout>
      <AuthCard>
        {/* Brand Logo */}
        <AuthLogo />

        {/* Title & Short Description */}
        <div className="text-center space-y-1.5 mb-6">
          <h1 className="text-2xl font-bold text-[#173B56] tracking-tight">
            Welcome back to RoutePilot
          </h1>
          <p className="text-xs sm:text-sm text-[#687F91] leading-relaxed max-w-sm mx-auto">
            Sign in to manage today&apos;s collection routes and continue your field operations.
          </p>
        </div>

        {/* Compact Demo Account Quick Selector */}
        <div className="mb-5">
          <DemoAccountSelector 
            onSelect={handleDemoSelect} 
            selectedEmail={email} 
          />
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#D94B4B]/10 border border-[#D94B4B]/20 text-[#D94B4B] text-xs font-medium flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Corporate Email or Executive ID">
            <FormInput
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@routepilot.io or E02"
              icon={<Mail className="w-4 h-4" />}
            />
          </FormField>

          <FormField label="Password">
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
            />
          </FormField>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-[#687F91] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-[#DCE8EC] text-[#F58220] focus:ring-[#F58220] w-4 h-4"
              />
              <span>Remember me</span>
            </label>
            <span className="text-[#687F91] hover:text-[#173B56] transition cursor-pointer">
              Forgot password?
            </span>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <PrimaryButton 
              type="submit" 
              loading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Workspace
            </PrimaryButton>
          </div>
        </form>

        {/* Secondary Navigation to Register */}
        <div className="mt-6 pt-5 border-t border-[#DCE8EC] text-center text-xs text-[#687F91]">
          <span>New to RoutePilot? </span>
          <Link 
            to="/register" 
            className="font-bold text-[#F58220] hover:text-[#e07216] transition inline-flex items-center gap-1 ml-1"
          >
            <span>Create an account</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};
