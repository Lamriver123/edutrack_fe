export type UserRole = "teacher";

export type User = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
};
