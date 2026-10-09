import { User, AuthSession, UserRole } from '../types/auth';

const SESSION_KEY = 'makerpixel_auth_session';
const USERS_KEY = 'makerpixel_users_list';

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'Administrador MakerPixel',
    email: 'admin@makerpixeltech.com',
    role: 'admin',
    department: 'TI & Controladoria',
    active: true,
    createdAt: '2026-01-15T09:00:00Z',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user-contador-2',
    name: 'Mariana Silva',
    email: 'contador@makerpixeltech.com',
    role: 'contador',
    department: 'Contabilidade & Fiscal',
    active: true,
    createdAt: '2026-02-10T14:30:00Z',
    lastLogin: '2026-10-07T18:15:00Z',
  },
  {
    id: 'user-operador-3',
    name: 'Carlos Santos',
    email: 'operador@makerpixeltech.com',
    role: 'operador',
    department: 'Financeiro & Conciliação',
    active: true,
    createdAt: '2026-03-01T11:20:00Z',
    lastLogin: '2026-10-06T11:00:00Z',
  },
];

export const AuthService = {
  getUsers(): User[] {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Erro ao salvar usuários:', e);
    }
  },

  getSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored) as AuthSession;
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  async login(email: string, pass: string, remember = false): Promise<AuthSession> {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o e-mail digitado.');
    }

    if (!user.active) {
      throw new Error('Este usuário está desativado. Contate o administrador.');
    }

    // Validação de senha simples / demo
    const valid =
      (user.role === 'admin' && (pass === 'admin123' || pass === '123456')) ||
      (user.role === 'contador' && (pass === 'conta123' || pass === '123456')) ||
      (user.role === 'operador' && (pass === 'oper123' || pass === '123456')) ||
      pass === 'admin' ||
      pass === '123';

    if (!valid) {
      throw new Error('Senha incorreta. Use as credenciais de demonstração.');
    }

    // Atualiza lastLogin
    user.lastLogin = new Date().toISOString();
    this.saveUsers(users.map((u) => (u.id === user.id ? user : u)));

    const expiresHours = remember ? 24 * 7 : 12;
    const expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString();

    const session: AuthSession = {
      user,
      token: `jwt_mock_${user.id}_${Date.now()}`,
      rememberMe: remember,
      expiresAt,
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Erro ao gravar sessão:', e);
    }

    return session;
  },

  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  },

  createUser(data: { name: string; email: string; role: UserRole; department?: string }): User {
    const users = this.getUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      department: data.department?.trim() || 'Operações',
      active: true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  updateUser(id: string, updates: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado.');

    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    this.saveUsers(users);

    // Se atualizou o usuário atual, atualiza a sessão
    const session = this.getSession();
    if (session && session.user.id === id) {
      session.user = updated;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return updated;
  },

  toggleUserStatus(id: string): User {
    const users = this.getUsers();
    const u = users.find((x) => x.id === id);
    if (!u) throw new Error('Usuário não encontrado.');
    return this.updateUser(id, { active: !u.active });
  },

  deleteUser(id: string): void {
    const session = this.getSession();
    if (session && session.user.id === id) {
      throw new Error('Não é possível excluir o próprio usuário logado.');
    }
    const users = this.getUsers().filter((u) => u.id !== id);
    this.saveUsers(users);
  },
};
