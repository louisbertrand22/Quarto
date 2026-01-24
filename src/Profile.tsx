import React from 'react';

interface ProfileProps {
  user: {
    name: string;
    email: string;
    username: string;
    id: string;
  } | null;
  onBack: () => void;
}

export function Profile({ user, onBack }: ProfileProps) {
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={onBack} className="mb-6 text-indigo-600 hover:text-indigo-800 flex items-center gap-2">
        ← Retour au jeu
      </button>
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-32"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-12 mb-6">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
              <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-3xl font-bold text-indigo-700">
                {user.username.charAt(0)}
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
          <p className="text-gray-500 mb-8">{user.email}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-600 text-sm font-semibold uppercase">Parties Jouées</p>
              <p className="text-3xl font-bold text-blue-900">0</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <p className="text-green-600 text-sm font-semibold uppercase">Victoires</p>
              <p className="text-3xl font-bold text-green-900">0%</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-purple-600 text-sm font-semibold uppercase">Dernière Connexion</p>
              <p className="text-lg font-bold text-purple-900">Aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}