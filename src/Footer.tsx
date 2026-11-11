import { BookOpen } from 'lucide-react';
import { useLanguage } from './LanguageContext';

// lucide-react v1 ne fournit plus les logos de marque : glyphe GitHub en SVG inline
function GithubMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const TECHNOLOGIES = ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Firebase'];

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  const linkClass =
    'inline-flex items-center gap-1.5 rounded text-muted-foreground transition-colors hover:text-foreground';

  return (
    <footer className="mt-12 border-t border-border pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-sm text-muted-foreground md:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p>
            © {currentYear} {t.header.title} · {t.footer.developedWith}{' '}
            <a
              href="https://github.com/louisbertrand22"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded font-medium text-foreground underline-offset-4 hover:underline"
            >
              Louis Bertrand
            </a>
          </p>
          <p className="text-xs">
            {TECHNOLOGIES.join(' · ')} · {t.footer.license}
          </p>
        </div>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <li>
            <a
              href="https://github.com/louisbertrand22/Quarto"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              <GithubMark />
              {t.footer.sourceCode}
            </a>
          </li>
          <li>
            <a
              href="https://github.com/louisbertrand22/Quarto#readme"
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              <BookOpen className="size-4" aria-hidden="true" />
              {t.footer.documentation}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export default Footer;
