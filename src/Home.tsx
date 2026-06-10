import type { GameMode } from './types';
import { useLanguage } from './LanguageContext';
import { Card, CardContent } from './components/ui/card';

interface HomeProps {
  onSelectMode: (mode: GameMode) => void;
}

/** Page d'accueil : choix du mode de jeu, chaque mode mène à sa propre page. */
function Home({ onSelectMode }: HomeProps) {
  const { t } = useLanguage();

  const modes = [
    { mode: 'two-player' as GameMode, emoji: '🎮', label: t.gameModes.twoPlayer, gradient: 'from-sky-500 to-blue-600', desc: t.gameModes.twoPlayerDesc },
    { mode: 'vs-ai' as GameMode, emoji: '🤖', label: t.gameModes.vsAI, gradient: 'from-purple-500 to-fuchsia-600', desc: t.gameModes.vsAIDesc },
    { mode: 'online' as GameMode, emoji: '🌐', label: t.gameModes.online, gradient: 'from-emerald-500 to-green-600', desc: t.gameModes.onlineDesc },
  ];

  return (
    <div className="min-h-full flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 sm:py-14 flex flex-col items-center justify-center">
        <div className="text-center mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
            {t.instructions.chooseGameMode}
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full max-w-6xl">
          {modes.map(({ mode, emoji, label, gradient, desc }) => (
            <Card
              key={mode}
              onClick={() => onSelectMode(mode)}
              className="group cursor-pointer rounded-2xl sm:rounded-3xl border-white/60 bg-white/55 backdrop-blur-xl shadow-lg shadow-indigo-500/5 hover:shadow-xl hover:shadow-indigo-500/15 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300"
            >
              <CardContent className="p-5 sm:p-8 lg:p-10">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-3xl shadow-lg transition-transform duration-300 group-hover:scale-110 sm:mb-5 sm:h-16 sm:w-16 sm:text-4xl`}>
                  {emoji}
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-800 mb-1">{label}</h3>
                <p className="text-slate-500 text-sm">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
