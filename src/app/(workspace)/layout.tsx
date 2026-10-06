import { AppShell } from '@/components/layout/AppShell';

/**
 * Route group layout for the authenticated workspace pages
 * (/overview, /jobs, /applications, /resumes, /profile, /upload).
 * Route groups do not affect URLs — every page keeps its original path,
 * but now renders inside the shared AppShell (Sidebar + DashboardNavbar).
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}