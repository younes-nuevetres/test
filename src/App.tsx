import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import axios from "axios";
import "./App.css";

const API_AUTH_URL =
  "https://vps-71a1beaa.vps.ovh.net:8443/authentification/get-token";
const API_HEALTH_URL =
  "https://vps-71a1beaa.vps.ovh.net:8443/documents/download/?project_id=aedd2576-7895-47a7-95e2-9e631b837454";

interface AuthContextType {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("jwt")
  );

  const logout = () => {
    setToken(null);
    localStorage.removeItem("jwt");
  };

  const login = async (username: string, password: string) => {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    try {
      const { data } = await axios.post(API_AUTH_URL, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (data?.access_token) {
        setToken(data.access_token);
        localStorage.setItem("jwt", data.access_token);
      } else {
        throw new Error("Token absent de la réponse.");
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-200 p-4'>
      <form
        onSubmit={handleSubmit}
        className='w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-2xl transition hover:shadow-3xl animate-fadeIn'
      >
        <h1 className='text-center text-3xl font-bold text-indigo-600'>
          Connexion
        </h1>

        <div>
          <label
            htmlFor='username'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Email
          </label>
          <input
            id='username'
            type='email'
            className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring focus:ring-indigo-200'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            htmlFor='password'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Mot de passe
          </label>
          <input
            id='password'
            type='password'
            className='w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:ring focus:ring-indigo-200'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className='text-center text-sm text-red-600'>{error}</p>}

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50'
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

function Health() {
  const { token, logout } = useAuth(); // 👈 ajout de logout
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchHealth = async () => {
      try {
        const { data } = await axios.get(API_HEALTH_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setHealth(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || err.message);
      }
    };

    fetchHealth();
  }, [token]);

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <p className='text-lg font-semibold text-red-600'>{error}</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <p className='text-lg font-semibold text-gray-700'>
          Chargement des documents…
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6'>
      <div className='flex justify-between items-center mb-6 max-w-4xl mx-auto'>
        <h1 className='text-4xl font-bold text-indigo-700'>
          Liste des documents
        </h1>
        <button
          onClick={logout}
          className='rounded-xl bg-red-500 px-4 py-2 text-white font-medium hover:bg-red-600 transition'
        >
          Se déconnecter
        </button>
      </div>

      <div className='mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-fadeIn'>
        <ul className='space-y-4'>
          {health.documents?.map((doc: any, index: number) => (
            <li
              key={index}
              className='flex items-center justify-between rounded-xl border p-4 hover:bg-indigo-50 transition'
            >
              <span className='text-gray-800 font-medium'>{doc.filename}</span>
              <a
                href={doc.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-sm text-indigo-600 hover:underline'
              >
                Voir
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Shell() {
  const { token } = useAuth();
  return token ? <Health /> : <Login />;
}

function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

export default App;
