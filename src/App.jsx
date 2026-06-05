import { useState, useEffect, useRef } from 'react';
import tmi from 'tmi.js';
import { Menu, X, Pencil } from 'lucide-react';
import './App.css';

const DEFAULT_GAMES = [
  { id: 'osu', name: 'Osu!', aliases: ['osu', 'osu!'], image: 'https://newzoo.com/wp-content/uploads/api/games/artworks/game--osu.jpg' },
  { id: 'mc2', name: 'Midnight Club 2', aliases: ['midnight', 'mc2', 'midnight club', 'midnight club 2', 'club2', 'club 2'], image: 'https://upload.wikimedia.org/wikipedia/en/1/13/Midnight_Club_II_Coverart.jpg' },
  { id: 'lol', name: 'League Of Legends', aliases: ['lol', 'league', 'league of legends'], image: 'https://store-images.s-microsoft.com/image/apps.18996.14127010465288187.f9de4a96-0ee4-4da3-bf66-d4132b38c599.caf661a7-e0b3-492d-b91b-63627e47283e' },
  { id: 'dibujos', name: 'Dibujitos', aliases: ['dibujo', 'dibujos', 'dibujitos'], image: 'https://static.vecteezy.com/system/resources/previews/007/634/716/non_2x/pencil-logo-icon-design-template-free-vector.jpg' }
];

function App() {
  const [theme, setTheme] = useState('mlp'); // 'mlp' or 'bubble'
  const [channel, setChannel] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGame, setEditingGame] = useState(null); // null or game object to edit
  const [splashState, setSplashState] = useState('visible'); // visible, hiding, hidden

  // Games state initialized from localStorage
  const [games, setGames] = useState(() => {
    const saved = localStorage.getItem('votos-stream-games');
    return saved ? JSON.parse(saved) : DEFAULT_GAMES;
  });

  const [votes, setVotes] = useState({ osu: 0, mc2: 0, lol: 0, dibujos: 0 });
  
  const votedUsers = useRef(new Set());
  const prevVotes = useRef(votes);

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  const winningGame = games.reduce((prev, current) => {
    return (votes[current.id] > votes[prev.id]) ? current : prev;
  }, games[0]);
  const isTieOrZero = totalVotes === 0;

  // Splash screen timers
  useEffect(() => {
    const timer1 = setTimeout(() => setSplashState('hiding'), 2000); // start hiding after 2s
    const timer2 = setTimeout(() => setSplashState('hidden'), 2500); // fully hidden after 2.5s
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  // Save games to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('votos-stream-games', JSON.stringify(games));
  }, [games]);

  useEffect(() => {
    if (!channel) return;

    const client = new tmi.Client({
      connection: { secure: true, reconnect: true },
      channels: [channel]
    });

    client.connect().catch(console.error);

    client.on('message', (channel, tags, message, self) => {
      if (self) return;

      const msg = message.toLowerCase().trim();
      const username = tags.username;

      // Extract the vote argument, either with !vote prefix or just the raw message
      let voteArg = msg.startsWith('!vote ') ? msg.replace('!vote ', '').trim() : msg;

      const matchedOption = games.find(opt => opt.aliases.includes(voteArg));
      
      if (matchedOption) {
        if (!votedUsers.current.has(username)) {
          votedUsers.current.add(username);
          setVotes(prev => ({
            ...prev,
            [matchedOption.id]: prev[matchedOption.id] + 1
          }));
        }
      }
    });

    return () => client.disconnect();
  }, [channel, games]); // Added games to dependency array in case aliases change

  const handleSaveGame = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedGame = {
      ...editingGame,
      name: formData.get('name'),
      image: formData.get('image'),
      aliases: formData.get('aliases').split(',').map(a => a.trim().toLowerCase()).filter(a => a)
    };

    setGames(games.map(g => g.id === updatedGame.id ? updatedGame : g));
    setEditingGame(null);
  };

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Splash Screen */}
      {splashState !== 'hidden' && (
        <div className={`splash-screen ${splashState === 'hiding' ? 'hiding' : ''}`}>
          <div className="splash-logo-container">
            <img src="/logo.png" alt="Logo" className="splash-logo" />
            <div className="splash-ripple"></div>
            <div className="splash-ripple delay"></div>
          </div>
        </div>
      )}

      {/* Top Bar Header */}
      <header className="top-bar">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo-img" />
          <span className="logo-text">Alyre</span>
        </div>
        <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={32} color="#555" /> : <Menu size={32} color="#555" />}
        </button>
      </header>

      {/* Main Layout */}
      <div className="main-content">
        
        {/* Left Column */}
        <div className="left-column">
          <div className="instruction-text">
            <h2>Que sale chat?</h2>
            <h2>USEN:</h2>
            <h2>!vote "juego"</h2>
            <h2>PARA VOTAR!!</h2>
            
            <div className="winner-display">
              <span className="winner-label">¡Ganando ahora!</span>
              <div className="winner-name">
                {isTieOrZero ? "Esperando votos..." : winningGame.name}
              </div>
            </div>
          </div>
          
          <img src={theme === 'mlp' ? '/pinkie_sunglasses.png' : '/cuteanimecatgirl.png'} alt="Mascot" className="mascot-img" />
          {theme === 'bubble' && <div className="clouds-bottom"></div>}
        </div>

        {/* Right Column: Grid */}
        <div className="right-column">
          <div className="voting-grid">
            {games.map((opt) => {
              const voteCount = votes[opt.id] || 0;
              const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
              const isBouncing = (prevVotes.current[opt.id] || 0) < voteCount;
              
              return (
                <div key={opt.id} className={`vote-grid-card ${isBouncing ? 'bounce' : ''}`} 
                     style={{ backgroundImage: `url('${opt.image}')` }}
                     onAnimationEnd={() => {
                  prevVotes.current = votes;
                }}>
                  {isEditMode && (
                    <button 
                      className="edit-game-btn" 
                      onClick={() => setEditingGame(opt)}
                      title="Editar Juego"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  <div className="card-content">
                    <h3 className="grid-vote-name">{opt.name}</h3>
                    <div className="grid-vote-stats">
                      {percentage}% <span style={{fontSize: '1rem', opacity: 0.8}}>({voteCount})</span>
                    </div>
                    <div className="horizontal-progress-container">
                      <div className="horizontal-progress-bar" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="grid-progress-container">
                    <div className="grid-progress-bar" style={{ height: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Menu Overlay (from hamburger menu) */}
      {isMenuOpen && (
        <div className="settings-menu">
          <h3>Configuración</h3>
          
          <div className="settings-group">
            <label>Canal de Twitch</label>
            <input 
              type="text" 
              placeholder="Ej: tu_canal" 
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />
          </div>

          <div className="settings-group">
            <label>Temática</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="mlp">My Little Pony (Pinkie Pie)</option>
              <option value="bubble">Burbujas (Bubble)</option>
            </select>
          </div>

          <div className="settings-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input 
              type="checkbox" 
              id="edit-mode-toggle"
              checked={isEditMode}
              onChange={(e) => setIsEditMode(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="edit-mode-toggle" style={{ cursor: 'pointer' }}>Habilitar Modo Edición</label>
          </div>

          <button 
            className="reset-btn"
            onClick={() => {
              setVotes({ osu: 0, mc2: 0, lol: 0, dibujos: 0 });
              votedUsers.current.clear();
              setIsMenuOpen(false);
            }}
          >
            Reiniciar Votos
          </button>
        </div>
      )}

      {/* Edit Game Modal */}
      {editingGame && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingGame(null); }}>
          <div className="edit-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Editar Juego</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingGame(null)}>
                <X size={24} color="#555" />
              </button>
            </div>
            
            <form onSubmit={handleSaveGame} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="settings-group">
                <label>Nombre del Juego</label>
                <input name="name" defaultValue={editingGame.name} required />
              </div>
              
              <div className="settings-group">
                <label>Link de la Imagen (URL)</label>
                <input name="image" defaultValue={editingGame.image} required />
              </div>
              
              <div className="settings-group">
                <label>Comandos para votar (separados por coma)</label>
                <textarea 
                  name="aliases" 
                  defaultValue={editingGame.aliases.join(', ')} 
                  required 
                  style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc', fontFamily: 'inherit', resize: 'vertical' }}
                  rows={3}
                />
                <small style={{ color: '#666' }}>Ej: osu, jugar osu, osu!</small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingGame(null)} style={{ padding: '8px 15px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer', background: '#f5f5f5' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: '#00bfff', color: 'white', fontWeight: 'bold' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
