import { ROLES } from './constants';

/**
 * Check if user profile has a specific role
 */
export const hasRole = (profile, role) => profile?.role === role;

/**
 * Check if user is a teacher
 */
export const isTeacher = (profile) => hasRole(profile, ROLES.TEACHER);

/**
 * Check if user is a student
 */
export const isStudent = (profile) => hasRole(profile, ROLES.STUDENT);

/**
 * Check if user is an admin (superuser)
 */
export const isAdmin = (profile) => hasRole(profile, ROLES.ADMIN);

/**
 * Check if user can toggle between roles (admin only)
 */
export const canToggleRole = (profile) => isAdmin(profile);

/**
 * Get role from URL query params
 * @returns 'teacher' | 'student'
 */
export const getRoleFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role');
  return ['teacher', 'student'].includes(role) ? role : 'student';
};

/**
 * Get referral teacher ID from URL query params
 * @returns string | null
 */
export const getReferralFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || null;
};

/**
 * Generate referral link for teacher
 */
export const generateReferralLink = (teacherId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?role=student&ref=${teacherId}`;
};
