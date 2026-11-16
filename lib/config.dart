// Supabase project: worship-portal-mobile (Ransu's own test database).
// The anon key is a public key (it ships inside every app build), but the
// tables are still open to anyone who has it. Move to Supabase Auth before launch.
const supabaseUrl = 'https://wyeqjkezfzoiezsrfikp.supabase.co';
const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXFqa2V6ZnpvaWV6c3JmaWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjExNDcsImV4cCI6MjExMDM5NzE0N30.6m79JxJCgT0VRz74K1-yPj35h0iZUl6VBXkElnN7VBE';

const defaultPassword = 'cogvet';

// Set by the build (GitHub Actions passes --dart-define). Local runs show "dev".
const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');
const appBuild = String.fromEnvironment('APP_BUILD', defaultValue: 'dev');
