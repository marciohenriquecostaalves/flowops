export type AuthUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roles: string[];
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
