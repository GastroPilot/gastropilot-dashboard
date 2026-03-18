export default function GlobalNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">
          Seite nicht gefunden.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Zur Startseite
        </a>
      </div>
    </div>
  );
}
