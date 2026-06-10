import { useLanguage } from './LanguageContext';

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  const technologies = ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Firebase'];

  return (
    <footer className="mt-12 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-4 md:pb-4">
      <div className="mx-auto max-w-7xl rounded-2xl border border-white/60 bg-white/55 px-5 py-8 shadow-lg shadow-indigo-500/5 backdrop-blur-xl sm:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About Section */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-600">{t.footer.aboutTitle}</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {t.footer.aboutDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-600">{t.footer.quickLinksTitle}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/louisbertrand22/Quarto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-slate-600 transition-colors hover:text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{t.footer.sourceCode}</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/louisbertrand22/Quarto#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-slate-600 transition-colors hover:text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{t.footer.documentation}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Technology Stack */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-indigo-600">{t.footer.technologiesTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-indigo-200/60 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-slate-900/10 pt-6">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-slate-500">
              © {currentYear} Quarto. {t.footer.developedWith} ❤️ {t.footer.by}{' '}
              <a
                href="https://github.com/louisbertrand22"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 transition-colors hover:text-indigo-500"
              >
                Louis Bertrand
              </a>
            </p>
            <p className="text-xs text-slate-400">
              {t.footer.license}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
