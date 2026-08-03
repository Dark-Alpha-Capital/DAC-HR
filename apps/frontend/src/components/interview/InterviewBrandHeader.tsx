export default function InterviewBrandHeader() {
  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 px-4 py-3">
        <img
          src="/logo.png"
          alt="Dark Alpha Capital logo"
          className="h-6 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:text-sm">
          Dark Alpha Capital
        </p>
      </div>
    </header>
  );
}
