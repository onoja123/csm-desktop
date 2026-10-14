export interface Project {
  dir: string;
  display: string;
  branch?: string;
  is_git: boolean;
  last_seen?: string;
  exists: boolean;
}
