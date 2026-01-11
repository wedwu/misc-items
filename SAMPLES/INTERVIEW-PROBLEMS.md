# React Interview Coding Problems

## 🎯 Most Common Questions with Solutions

---

## PROBLEM 1: Counter (5 minutes)

**Task:** Build a counter with increment/decrement buttons

```typescript
const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{count}</h1>
      <button onClick={() => setCount(prev => prev + 1)}>+</button>
      <button onClick={() => setCount(prev => prev - 1)}>-</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
};
```

**Follow-up:** "Add increment by 5"
```typescript
<button onClick={() => setCount(prev => prev + 5)}>+5</button>
```

---

## PROBLEM 2: Todo List (15 minutes)

**Task:** Add, complete, delete todos

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos(prev => [...prev, {
      id: Date.now().toString(),
      text: input,
      completed: false
    }]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && addTodo()}
      />
      <button onClick={addTodo}>Add</button>
      
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.text}
          </span>
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

---

## PROBLEM 3: Fetch and Display Users (10 minutes)

**Task:** Fetch users from API, show loading/error states

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## PROBLEM 4: Search/Filter List (10 minutes)

**Task:** Filter items based on search input

```typescript
const SearchableList = () => {
  const [items] = useState(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul>
        {filteredItems.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{filteredItems.length} results</p>
    </div>
  );
};
```

**Follow-up:** "Make it work with objects"
```typescript
const users = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

const filtered = users.filter(user =>
  user.name.toLowerCase().includes(search.toLowerCase()) ||
  user.email.toLowerCase().includes(search.toLowerCase())
);
```

---

## PROBLEM 5: Form with Validation (15 minutes)

**Task:** Form with email/password validation

```typescript
const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error on change
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    console.log('Submit:', formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
        />
        {errors.email && <span style={{ color: 'red' }}>{errors.email}</span>}
      </div>
      
      <div>
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
        />
        {errors.password && <span style={{ color: 'red' }}>{errors.password}</span>}
      </div>
      
      <button type="submit">Login</button>
    </form>
  );
};
```

---

## PROBLEM 6: Toggle Visibility (5 minutes)

**Task:** Show/hide content with button

```typescript
const Toggle = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <button onClick={() => setIsVisible(prev => !prev)}>
        {isVisible ? 'Hide' : 'Show'}
      </button>
      {isVisible && <div>Content here</div>}
    </div>
  );
};
```

---

## PROBLEM 7: Debounced Search (15 minutes)

**Task:** Search that waits 500ms after typing stops

```typescript
const DebouncedSearch = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery) {
      console.log('Searching for:', debouncedQuery);
      // Perform search here
    }
  }, [debouncedQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <p>Searching for: {debouncedQuery}</p>
    </div>
  );
};
```

---

## PROBLEM 8: Tabs Component (10 minutes)

**Task:** Switch between multiple tabs

```typescript
const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  const tabs = [
    { label: 'Tab 1', content: 'Content 1' },
    { label: 'Tab 2', content: 'Content 2' },
    { label: 'Tab 3', content: 'Content 3' }
  ];

  return (
    <div>
      <div>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            style={{
              fontWeight: activeTab === index ? 'bold' : 'normal',
              borderBottom: activeTab === index ? '2px solid blue' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[activeTab].content}</div>
    </div>
  );
};
```

---

## PROBLEM 9: Accordion (10 minutes)

**Task:** Expand/collapse sections

```typescript
interface Section {
  id: string;
  title: string;
  content: string;
}

const Accordion = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  
  const sections: Section[] = [
    { id: '1', title: 'Section 1', content: 'Content 1' },
    { id: '2', title: 'Section 2', content: 'Content 2' },
    { id: '3', title: 'Section 3', content: 'Content 3' }
  ];

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div>
      {sections.map(section => (
        <div key={section.id}>
          <button onClick={() => toggle(section.id)}>
            {section.title} {openId === section.id ? '▲' : '▼'}
          </button>
          {openId === section.id && <div>{section.content}</div>}
        </div>
      ))}
    </div>
  );
};
```

---

## PROBLEM 10: Pagination (15 minutes)

**Task:** Paginate a list of items

```typescript
const Pagination = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <div>
      <ul>
        {currentItems.map((item, index) => (
          <li key={startIndex + index}>{item}</li>
        ))}
      </ul>
      
      <div>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <span>Page {currentPage} of {totalPages}</span>
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## PROBLEM 11: Modal (10 minutes)

**Task:** Show/hide modal with backdrop

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

// Usage
const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2>Modal Content</h2>
        <p>This is a modal</p>
      </Modal>
    </div>
  );
};
```

---

## PROBLEM 12: Custom Hook (10 minutes)

**Task:** Create useLocalStorage hook

```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage
const App = () => {
  const [name, setName] = useLocalStorage('name', '');

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Your name"
    />
  );
};
```

---

## QUICK PRACTICE PLAN

### Day Before Interview:
1. Counter (5 min)
2. Todo List (15 min)
3. Fetch Users (10 min)
4. Search Filter (10 min)

### Morning of Interview:
1. Form Validation (15 min)
2. Debounced Search (15 min)
3. Review cheat sheet

### In Interview:
- Start with the simplest solution
- Think out loud
- Ask about edge cases
- Add features incrementally
- Explain trade-offs

---

**Practice these until you can write them without looking! 💪**
