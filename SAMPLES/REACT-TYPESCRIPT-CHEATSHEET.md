# React + TypeScript Interview Cheat Sheet

## 🎯 Quick Reference for Technical Interviews

---

## REACT HOOKS

### useState
```typescript
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<string[]>([]);

// Functional update
setCount(prev => prev + 1);
setItems(prev => [...prev, newItem]);
```

### useEffect
```typescript
// Run once on mount
useEffect(() => {
  fetchData();
}, []);

// Run when dependency changes
useEffect(() => {
  console.log(count);
}, [count]);

// Cleanup
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);
```

### useRef
```typescript
const inputRef = useRef<HTMLInputElement>(null);
const countRef = useRef<number>(0);

// Access DOM
inputRef.current?.focus();

// Store mutable value (doesn't trigger re-render)
countRef.current += 1;
```

### useMemo
```typescript
// Expensive calculation - only recalculates when deps change
const expensiveValue = useMemo(() => {
  return items.filter(item => item.active).length;
}, [items]);

const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);
```

### useCallback
```typescript
// Memoize function - stable reference
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);

const handleSubmit = useCallback((data: FormData) => {
  api.post('/submit', data);
}, []);
```

### useContext
```typescript
const ThemeContext = createContext<'light' | 'dark'>('light');

const MyComponent = () => {
  const theme = useContext(ThemeContext);
  return <div className={theme}>Content</div>;
};
```

### useReducer
```typescript
type State = { count: number };
type Action = { type: 'increment' } | { type: 'decrement' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    case 'decrement': return { count: state.count - 1 };
    default: return state;
  }
};

const [state, dispatch] = useReducer(reducer, { count: 0 });
dispatch({ type: 'increment' });
```

---

## TYPESCRIPT TYPES

### Component Props
```typescript
interface Props {
  title: string;
  count?: number;  // Optional
  onClick: () => void;
  children: React.ReactNode;
}

const Component: React.FC<Props> = ({ title, count = 0, onClick, children }) => {
  return <div onClick={onClick}>{title} - {count}</div>;
};
```

### Events
```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {};
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {};
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {};
```

### Common Types
```typescript
type User = {
  id: string;
  name: string;
  email: string;
};

type Status = 'pending' | 'approved' | 'rejected';  // Union type

interface ApiResponse<T> {  // Generic
  data: T;
  error?: string;
}

type Partial<User> = { id?: string; name?: string; email?: string };  // All optional
type Required<User> = { id: string; name: string; email: string };  // All required
type Pick<User, 'id' | 'name'> = { id: string; name: string };  // Select properties
type Omit<User, 'email'> = { id: string; name: string };  // Exclude properties
```

---

## ARRAY METHODS (Critical!)

```typescript
// MAP - Transform
const names = users.map(u => u.name);

// FILTER - Keep matching
const active = users.filter(u => u.isActive);

// REDUCE - Aggregate
const total = orders.reduce((sum, o) => sum + o.amount, 0);

// FIND - First match
const user = users.find(u => u.id === '123');

// SOME - Check if any match
const hasAdmin = users.some(u => u.role === 'admin');

// EVERY - Check if all match
const allActive = users.every(u => u.isActive);

// SORT - Order (mutates!)
const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));

// FOREACH - Iterate (no return)
users.forEach(u => console.log(u.name));
```

---

## STATE PATTERNS

### Immutable Updates
```typescript
// ❌ WRONG - Mutates state
state.items.push(newItem);
state.user.name = 'New Name';

// ✅ RIGHT - Creates new reference
setState({ ...state, items: [...state.items, newItem] });
setState({ ...state, user: { ...state.user, name: 'New Name' } });

// Array updates
setItems(prev => [...prev, newItem]);  // Add
setItems(prev => prev.filter(item => item.id !== id));  // Remove
setItems(prev => prev.map(item => item.id === id ? updated : item));  // Update
```

### Derived State
```typescript
// ❌ WRONG - Storing calculated values
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce(...)), [items]);

// ✅ RIGHT - Calculate on render
const total = items.reduce((sum, item) => sum + item.price, 0);

// Or with useMemo for expensive calculations
const total = useMemo(() => 
  items.reduce((sum, item) => sum + item.price, 0), 
  [items]
);
```

---

## COMMON PATTERNS

### Conditional Rendering
```typescript
// If/else
{isLoggedIn ? <Dashboard /> : <Login />}

// Show if true
{isLoading && <Spinner />}

// Nullish coalescing
{user?.name ?? 'Guest'}

// Multiple conditions
{status === 'success' && data && <Results data={data} />}
```

### Lists
```typescript
// Always use key!
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// Key with index (only if no unique id and list doesn't change)
{items.map((item, index) => (
  <div key={index}>{item}</div>
))}
```

### Forms
```typescript
const [formData, setFormData] = useState({ email: '', password: '' });

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Submit logic
};

<form onSubmit={handleSubmit}>
  <input name="email" value={formData.email} onChange={handleChange} />
  <button type="submit">Submit</button>
</form>
```

### Custom Hooks
```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage
const [name, setName] = useLocalStorage('name', '');
```

---

## API CALLS

### Fetch Pattern
```typescript
const [data, setData] = useState<User[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetch('https://api.example.com/users')
    .then(res => {
      if (!res.ok) throw new Error('Failed');
      return res.json();
    })
    .then(data => {
      setData(data);
      setLoading(false);
    })
    .catch(err => {
      setError(err.message);
      setLoading(false);
    });
}, []);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{data.map(...)}</div>;
```

### Async/Await
```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.example.com/users');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

---

## PERFORMANCE OPTIMIZATION

### React.memo
```typescript
// Prevents re-render if props haven't changed
const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* expensive render */}</div>;
});
```

### useMemo
```typescript
// Memoize expensive calculations
const filtered = useMemo(() => 
  items.filter(item => item.category === category),
  [items, category]
);
```

### useCallback
```typescript
// Memoize functions passed as props
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);

<ChildComponent onClick={handleClick} />  // Won't cause re-render
```

### Key Takeaways
```typescript
// ✅ DO
- Use useMemo for expensive calculations
- Use useCallback for functions passed to children
- Use React.memo for expensive components
- Keep state as local as possible

// ❌ DON'T
- Premature optimization
- useMemo/useCallback everywhere
- Deep component trees
```

---

## COMMON INTERVIEW QUESTIONS

### 1. "Explain useState"
> Hook that adds state to functional components. Returns [value, setter]. Setter triggers re-render.

### 2. "When to use useMemo vs useCallback?"
> useMemo: Cache calculated **values**. useCallback: Cache **functions**.

### 3. "What's the virtual DOM?"
> In-memory representation of real DOM. React compares (diffs) old and new virtual DOM, then efficiently updates real DOM.

### 4. "Controlled vs Uncontrolled components?"
> Controlled: React controls value (via state). Uncontrolled: DOM controls value (use refs).

### 5. "What are keys in lists?"
> Unique identifiers that help React identify which items changed/added/removed for efficient updates.

### 6. "useEffect cleanup?"
> Function returned from useEffect that runs before next effect or unmount. Used to cancel subscriptions, clear timers, etc.

### 7. "Props vs State?"
> Props: Passed from parent, immutable in child. State: Internal to component, mutable via setState.

### 8. "Context vs Props?"
> Props: Direct parent-to-child. Context: Share data across component tree without prop drilling.

### 9. "When to use useReducer vs useState?"
> useReducer: Complex state logic, multiple related state updates. useState: Simple state.

### 10. "What causes re-renders?"
> State change, props change, parent re-render, context change.

---

## CODE SNIPPETS TO MEMORIZE

### 1. Toggle Boolean
```typescript
setIsOpen(prev => !prev);
```

### 2. Add to Array
```typescript
setItems(prev => [...prev, newItem]);
```

### 3. Remove from Array
```typescript
setItems(prev => prev.filter(item => item.id !== id));
```

### 4. Update Object in Array
```typescript
setItems(prev => prev.map(item => 
  item.id === id ? { ...item, ...updates } : item
));
```

### 5. Merge Objects
```typescript
setUser(prev => ({ ...prev, ...updates }));
```

### 6. Debounce
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something with query
  }, 500);
  return () => clearTimeout(timer);
}, [query]);
```

### 7. Fetch Data
```typescript
useEffect(() => {
  fetch(url).then(r => r.json()).then(setData);
}, [url]);
```

### 8. Event Handler
```typescript
const handleClick = () => {
  setState(prev => prev + 1);
};
```

---

## MISTAKES TO AVOID

```typescript
// ❌ WRONG
const [state, setState] = useState([]);
state.push(item);  // Mutating state!
setState(state);

// ✅ RIGHT
setState(prev => [...prev, item]);

// ❌ WRONG
useEffect(() => {
  setState(value);  // Infinite loop!
});

// ✅ RIGHT
useEffect(() => {
  setState(value);
}, [dependency]);

// ❌ WRONG
if (condition) {
  useEffect(() => {});  // Hooks can't be conditional!
}

// ✅ RIGHT
useEffect(() => {
  if (condition) {
    // Logic here
  }
}, [condition]);

// ❌ WRONG
const handleClick = () => {
  setState(count + 1);  // Stale closure!
  setState(count + 1);  // Both use same count
};

// ✅ RIGHT
const handleClick = () => {
  setState(prev => prev + 1);  // Each gets latest value
  setState(prev => prev + 1);
};
```

---

## TYPESCRIPT UTILITIES

```typescript
// Make all properties optional
type Partial<User> = Partial<User>;

// Make all properties required
type Required<User> = Required<User>;

// Pick specific properties
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit specific properties
type UserWithoutEmail = Omit<User, 'email'>;

// Record type
type UserMap = Record<string, User>;

// Union type
type Status = 'active' | 'inactive' | 'pending';

// Intersection type
type AdminUser = User & { role: 'admin' };

// Nullable
type MaybeUser = User | null;

// Array type
type Users = User[];
type Users = Array<User>;

// Function type
type Handler = (id: string) => void;
type AsyncHandler = (id: string) => Promise<void>;
```

---

## QUICK COMPONENT TEMPLATES

### Basic Component
```typescript
interface Props {
  title: string;
  onClose: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onClose }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default MyComponent;
```

### Stateful Component
```typescript
const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(prev => prev + 1)}>+</button>
    </div>
  );
};
```

### Form Component
```typescript
const Form = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" value={formData.name} onChange={handleChange} />
      <input name="email" value={formData.email} onChange={handleChange} />
      <button type="submit">Submit</button>
    </form>
  );
};
```

### List Component
```typescript
interface Item {
  id: string;
  name: string;
}

const List: React.FC<{ items: Item[] }> = ({ items }) => {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```

---

## BEFORE THE INTERVIEW

### Review These:
✅ Hooks (useState, useEffect, useMemo, useCallback)
✅ Array methods (map, filter, reduce)
✅ Immutable updates
✅ TypeScript types
✅ Event handling
✅ API calls with fetch
✅ Component patterns

### Practice:
✅ Build a todo list (20 min)
✅ Fetch and display data (15 min)
✅ Form with validation (15 min)
✅ Filter/search functionality (15 min)

### Remember:
- Think out loud
- Ask clarifying questions
- Start simple, then add features
- Write clean, readable code
- Handle edge cases
- Explain your decisions

---

## TIME-SAVING SHORTCUTS

```typescript
// Object shorthand
const name = 'John';
const obj = { name };  // Instead of { name: name }

// Arrow function implicit return
const double = (x: number) => x * 2;  // Instead of => { return x * 2; }

// Array destructuring
const [first, second] = items;

// Object destructuring
const { name, email } = user;

// Default parameters
const greet = (name = 'Guest') => `Hello, ${name}`;

// Optional chaining
const city = user?.address?.city;

// Nullish coalescing
const name = user.name ?? 'Unknown';

// Template literals
const message = `Hello, ${name}!`;

// Spread operator
const merged = { ...obj1, ...obj2 };
const combined = [...arr1, ...arr2];
```

---

**Good luck! 🚀**

Print this, review before interviews, and practice the patterns!
