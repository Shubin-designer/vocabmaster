import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { generateReferralLink } from '../../utils/roleUtils';
import { Mail, Link, Copy, Check, X, Loader, Users } from 'lucide-react';

/**
 * InviteStudent modal component
 * Two methods: invite by email or generate referral link
 */
export default function InviteStudent({ teacherId, onClose, onSuccess, isDark = true }) {
  const [method, setMethod] = useState('email'); // 'email' | 'link'
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const referralLink = generateReferralLink(teacherId);

  const handleEmailInvite = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Find user by email using RPC function
      const { data: users, error: lookupError } = await supabase
        .rpc('find_user_by_email', { email_address: email.trim().toLowerCase() });

      if (lookupError) {
        setError('Error looking up user: ' + lookupError.message);
        setLoading(false);
        return;
      }

      if (!users || users.length === 0) {
        setError('Student not found. They need to create an account first, or use the referral link.');
        setLoading(false);
        return;
      }

      const studentId = users[0].id;

      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('teacher_students')
        .select('id, status')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .single();

      if (existing) {
        setError(`This student is already ${existing.status === 'active' ? 'connected' : 'invited'}.`);
        setLoading(false);
        return;
      }

      // Create teacher-student relationship
      const { error: insertError } = await supabase
        .from('teacher_students')
        .insert({
          teacher_id: teacherId,
          student_id: studentId,
          status: 'invited'
        });

      if (insertError) {
        setError('Failed to send invitation: ' + insertError.message);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fadeIn"
      style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className={`relative liquid-glass rounded-3xl p-6 w-full max-w-md animate-scaleIn ${
          isDark ? 'text-gray-100 border-white/10' : 'text-gray-900 border-black/10'
        }`}
        style={{
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-pink-vibrant/20' : 'bg-indigo-100'
            }`}>
              <Users size={20} className="text-pink-vibrant" />
            </div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Invite Student
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Method tabs */}
        <div className={`flex rounded-xl p-1 mb-6 ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
          <button
            onClick={() => setMethod('email')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              method === 'email'
                ? 'bg-pink-vibrant text-white shadow-lg'
                : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} />
            By Email
          </button>
          <button
            onClick={() => setMethod('link')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              method === 'link'
                ? 'bg-pink-vibrant text-white shadow-lg'
                : isDark ? 'text-white/60 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link size={16} />
            Referral Link
          </button>
        </div>

        {/* Email method */}
        {method === 'email' && (
          <form onSubmit={handleEmailInvite} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                Student Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className={`w-full px-4 py-3 rounded-xl focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#1a1a1e] border border-white/10 text-white placeholder-gray-500 focus:border-pink-vibrant'
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                }`}
                required
              />
              <p className={`mt-2 text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                The student must already have an account. They will see you in their teacher list.
              </p>
            </div>

            {error && (
              <div className={`p-3 rounded-xl text-sm ${
                isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isDark
                    ? 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-pink-vibrant text-white rounded-xl font-medium hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Link method */}
        {method === 'link' && (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                Your Referral Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className={`flex-1 px-4 py-3 rounded-xl font-mono text-sm ${
                    isDark
                      ? 'bg-[#1a1a1e] border border-white/10 text-white/80'
                      : 'bg-gray-50 border border-gray-300 text-gray-700'
                  }`}
                />
                <button
                  onClick={copyReferralLink}
                  className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    linkCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-pink-vibrant text-white hover:brightness-110'
                  }`}
                >
                  {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className={`mt-2 text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Share this link with students. When they sign up using it, they will automatically be connected to you.
              </p>
            </div>

            {error && (
              <div className={`p-3 rounded-xl text-sm ${
                isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <button
              onClick={onClose}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-colors ${
                isDark
                  ? 'bg-white/[0.06] text-white/80 hover:bg-white/[0.1]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
