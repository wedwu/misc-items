// 1. Simple Fetch
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

// Usage: const users = await fetchData<User[]>('https://api.example.com/users');

// 2. Fetch with Options
async function apiCall<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}

// Usage:
// const users = await apiCall<User[]>('https://api.example.com/users');
// const newUser = await apiCall<User>('https://api.example.com/users', 'POST', { name: 'John' });

// 3. React Hook for API
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// Usage:
// const { data, loading, error } = useApi<User[]>('https://api.example.com/users');

// 4. API Client Class
class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  }
}

// Usage:
// const api = new ApiClient('https://api.example.com');
// const users = await api.get<User[]>('/users');
// const user = await api.post<User>('/users', { name: 'John' });

// 5. With Authorization
async function fetchWithAuth<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Unauthorized');
  return response.json();
}

// 6. Quick CRUD Operations
const api = {
  get: <T>(url: string) => 
    fetch(url).then(r => r.json() as Promise<T>),
  
  post: <T>(url: string, data: any) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json() as Promise<T>),
  
  put: <T>(url: string, data: any) =>
    fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json() as Promise<T>),
  
  delete: <T>(url: string) =>
    fetch(url, { method: 'DELETE' }).then(r => r.json() as Promise<T>)
};

// Usage:
// const users = await api.get<User[]>('https://api.example.com/users');
// const user = await api.post<User>('https://api.example.com/users', { name: 'John' });

// 7. Quick Component Example
const DataFetcher = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then(r => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{data.map(item => <div key={item.id}>{item.name}</div>)}</div>;
};

// 8. With Retry Logic
async function fetchWithRetry<T>(
  url: string,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed');
    return response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry<T>(url, retries - 1, delay);
    }
    throw error;
  }
}




// One-liner
const data = await fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json());


// JSONPlaceholder (fake data)
const users = await fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json());
const posts = await fetch('https://jsonplaceholder.typicode.com/posts').then(r => r.json());

// Random User API
const randomUsers = await fetch('https://randomuser.me/api/?results=10').then(r => r.json());


