/** Footer on every page: © year, the app's name and the build it's running (package version + commit, set at build time). */
export function AppFooter({ name, className = "" }: { name: string; className?: string }) {
  const version = process.env.APP_VERSION;
  const build = process.env.APP_BUILD;
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className}`}>
      <span>© {new Date().getFullYear()} {name}</span>
      <span aria-hidden>·</span>
      <span title={build ? `Build ${build}` : "Development build"}>
        v{version}{build ? ` (${build})` : " (dev)"}
      </span>
    </footer>
  );
}
