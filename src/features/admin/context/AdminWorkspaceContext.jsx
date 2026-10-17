import { createContext, useContext } from 'react';

export const AdminWorkspaceContext = createContext(null);

export function useAdminWorkspace() {
  const workspace = useContext(AdminWorkspaceContext);
  if (!workspace) throw new Error('Admin workspace is available only inside the Qualify dashboard.');
  return workspace;
}

// Keeping selection per signed-in user prevents a staff member's choice from
// leaking into another account on the same browser. This is UX, not authority.
export const workspaceStorageKey = userId => `qualify-workspace:${userId}`;

export function activeMemberships(access) {
  return (access?.institutions || []).filter(item =>
    item.member_status === 'active' && item.institution_status === 'active'
  );
}
