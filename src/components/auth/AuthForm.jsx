import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { getRoleFromUrl, getReferralFromUrl } from '../../utils/roleUtils';
import { GraduationCap, BookOpen } from 'lucide-react';

/**
 * Authentication form component with role-based registration
 * Reads role from URL params: ?role=teacher or ?role=student (default)
 * Also handles referral links: ?ref=TEACHER_ID
 */
export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signin');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Get role and referral from URL
  const signupRole = getRoleFromUrl();
  const referralId = getReferralFromUrl();

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up with role in metadata
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: signupRole
            }
          }
        });

        if (error) {
          setMessage(error.message);
        } else {
          // If there's a referral, create teacher-student relationship
          if (referralId && signUpData.user) {
            try {
              await supabase.from('teacher_students').insert({
                teacher_id: referralId,
                student_id: signUpData.user.id,
                status: 'active',
                accepted_at: new Date().toISOString()
              });
            } catch (refError) {
              console.error('Failed to create referral relationship:', refError);
            }
          }
          setMessage('✅ Check your email to confirm!');
        }
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMessage(error.message);
      }
    } catch (err) {
      setMessage(err.message);
    }

    setLoading(false);
  };

  const isTeacherSignup = mode === 'signup' && signupRole === 'teacher';
  const hasReferral = mode === 'signup' && referralId;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-800">
        {/* Logo */}
        <h1 className="text-3xl font-bold text-pink-vibrant mb-2 text-center">VocabMaster</h1>

        {/* Role indicator for signup */}
        {mode === 'signup' && (
          <div className={`mb-6 p-4 rounded-xl text-center ${
            isTeacherSignup
              ? 'bg-purple-500/10 border border-purple-500/30'
              : 'bg-blue-500/10 border border-blue-500/30'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {isTeacherSignup ? (
                <GraduationCap size={20} className="text-purple-400" />
              ) : (
                <BookOpen size={20} className="text-blue-400" />
              )}
              <span className={`font-semibold ${isTeacherSignup ? 'text-purple-400' : 'text-blue-400'}`}>
                {isTeacherSignup ? 'Teacher Account' : 'Student Account'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {isTeacherSignup
                ? 'Create and manage learning materials for your students'
                : hasReferral
                  ? 'You were invited by a teacher'
                  : 'Start your language learning journey'
              }
            </p>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-[#0f0f0f] text-gray-100 placeholder-gray-500 focus:border-pink-vibrant focus:outline-none transition-colors"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-[#0f0f0f] text-gray-100 placeholder-gray-500 focus:border-pink-vibrant focus:outline-none transition-colors"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-vibrant text-white py-3 rounded-xl hover:brightness-110 disabled:opacity-50 font-medium transition-all"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle mode */}
        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>

        {/* Message */}
        {message && (
          <p className={`mt-4 text-sm text-center ${message.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}

        {/* Role switch link (only in signup mode) */}
        {mode === 'signup' && !hasReferral && (
          <div className="mt-6 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-500 mb-2">
              {isTeacherSignup ? 'Not a teacher?' : 'Are you a teacher?'}
            </p>
            <a
              href={isTeacherSignup ? '/?role=student' : '/?role=teacher'}
              className={`text-sm font-medium ${
                isTeacherSignup ? 'text-blue-400 hover:text-blue-300' : 'text-purple-400 hover:text-purple-300'
              } transition-colors`}
            >
              {isTeacherSignup ? 'Sign up as Student' : 'Sign up as Teacher'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
