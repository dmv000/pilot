// Patterns shared by pilot hooks. Kept in one file so REGISTRY reviews see them together.

// Files no agent may edit (F06, F16). Projects add more in manifest.protectedPaths.
export const DEFAULT_PROTECTED = [
  '.env', '.env.*', '**/.env', '**/.env.*',
  '.git/**',
  '**/*.pem', '**/id_rsa*', '**/id_ed25519*',
  // Evidence files: only scripts/pilot.js and the hooks write these (F01, F20).
  '.pilot/reviews/**', '.pilot/state.json'
];

// Files that switch the gates themselves. The main session needs the owner's approval;
// subagents may not change them at all.
export const GATE_CONFIG = ['.pilot/manifest.json', '.claude/settings.json', '.claude/settings.local.json'];

// Shell writes into pilot's evidence and config files.
export const SHELL_WRITES_PILOT = /(?:>{1,2}|\btee\b|\bcp\b|\bmv\b|\bcopy\b|\bmove\b|Set-Content|Add-Content|Out-File|\bsed\s+-i)[^;&|\n]*\.pilot[\\/](?:reviews|state\.json|manifest\.json)/i;
// Files whose contents must never enter the transcript (Read is blocked too).
export const SECRET_GLOBS = ['.env', '.env.*', '**/.env', '**/.env.*', '**/*.pem', '**/id_rsa*', '**/id_ed25519*', '**/.netrc', '**/credentials.json', '**/.credentials.json'];
export const PROTECTED_EXCEPTIONS =['.env.example', '**/.env.example', '.env.sample', '**/.env.sample'];

export const DEFAULT_ACCEPTANCE = ['tests/acceptance/**'];

// New test skips need a "pilot-allow-skip: #<issue>" marker (F02).
export const SKIP_PATTERNS = [
  /\b(?:it|test|describe|context|suite)\.(?:skip|only|todo)\s*\(/g,
  /\bx(?:it|describe|test)\s*\(/g,
  /\bf(?:it|describe)\s*\(/g,
  /@pytest\.mark\.(?:skip|skipif|xfail)\b/g,
  /\bpytest\.skip\s*\(/g,
  /@unittest\.skip/g,
  /\bt\.Skip(?:Now|f)?\s*\(/g,
  /@Disabled\b/g,
  /#\[ignore\]/g
];
export const SKIP_ALLOW = /pilot-allow-skip:\s*#\d+/;

// Test-runner config files, and text that excludes tests from a run (F02).
export const TEST_CONFIG = [
  '**/vitest.config.*', '**/vite.config.*', '**/jest.config.*', '**/playwright.config.*',
  '**/pytest.ini', '**/pyproject.toml', '**/setup.cfg', '**/tox.ini', '**/package.json', '**/.mocharc*'
];
export const TEST_EXCLUSION = /(testPathIgnorePatterns|exclude\s*[:=]|--deselect|--ignore[=\s]|addopts\s*=.*(-k\s|--deselect|--ignore)|"test"\s*:\s*"[^"]*(--testPathIgnorePatterns|--exclude|-k\s))/;

// Shell commands that reveal secrets (F06).
const SECRET_FILE = String.raw`(?:\.env(?!\.example\b|\.sample\b)(?:\.[\w-]+)?\b|\S+\.pem\b|id_rsa\S*|id_ed25519\S*|\.credentials\.json|\.aws[\\/]credentials|\.netrc\b)`;
const READERS = String.raw`(?:cat|type|less|more|head|tail|bat|nl|strings|xxd|od|hexdump|sed|awk|grep|rg|base64|Get-Content|gc|Select-String|copy|cp|scp)`;
export const SECRET_READ = new RegExp(String.raw`(?:^|[\s;&|(])` + READERS + String.raw`\b[^;&|\n]*?` + SECRET_FILE, 'i');
export const SECRET_REDIRECT = new RegExp(String.raw`<\s*` + SECRET_FILE, 'i');
export const ENV_DUMP = /(?:^|[;&|]\s*)(?:printenv|env|set|export\s+-p|Get-ChildItem\s+env:|gci\s+env:|dir\s+env:)\s*(?:$|[;&|])/i;

// Git safety (F02: bypassing hooks; destructive history rewrites on the default branch).
export const NO_VERIFY = /\bgit\b[^;&|\n]*\s--no-verify\b/;
export const FORCE_PUSH_MAIN = /\bgit\s+push\b(?=[^;&|\n]*\s(?:-f|--force(?!-with-lease)|--force-with-lease)\b)(?=[^;&|\n]*\b(?:main|master)\b)/;

// Commands that do not change files: they leave the session clean (H04).
export const READ_ONLY_COMMANDS = /^\s*(?:git\s+(?:status|diff|log|show|branch|rev-parse|ls-files|blame|remote\s+-v)|ls|dir|pwd|cat|type|head|tail|less|grep|rg|find|wc|echo|which|where|node\s+--version|npm\s+(?:ls|view|--version)|gh\s+(?:issue|pr)\s+(?:list|view)|Get-ChildItem|Get-Content|Select-String)\b(?![^\n]*(?:>|\|\s*tee\b))/i;

// Text that tries to instruct the agent (F14).
export const INJECTION_PATTERNS = [
  /ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|prompts|messages)/i,
  /disregard (?:the |all |your )?(?:system|previous|prior) (?:prompt|instructions)/i,
  /(?:new|updated) (?:system )?instructions\s*:/i,
  /you (?:must|should) now (?:run|execute|ignore|delete)/i,
  /(?:run|execute) (?:the following|this) (?:command|script|code)\b/i,
  /curl[^\n]{0,120}\|\s*(?:ba|z)?sh\b/i,
  /iwr[^\n]{0,120}\|\s*iex\b/i,
  /<\/?(?:system|system-reminder|assistant|tool_use|function_calls|antml:[a-z_]+)>/i,
  /\bas an ai (?:assistant|agent),? you (?:must|are required)/i
];

// Unanswered AskUserQuestion results (F13). Only fires when askUserQuestionTimeout is set.
export const UNANSWERED = /(without an answer|no response after|continued without)/i;

// TODO/FIXME without an issue reference (DoD).
export const TODO_WITHOUT_ISSUE = /\b(TODO|FIXME|XXX|HACK)\b(?![^\n]*\(#\d+\))/;
