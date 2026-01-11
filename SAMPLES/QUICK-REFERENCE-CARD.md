# React + TypeScript Quick Reference Card

## ⚡ 5-Minute Review Before Interview

---

## HOOKS (Essential 6)

```typescript
// 1. STATE
const [count, setCount] = useState<number>(0);
setCount(prev => prev + 1);  // Always use functional update!

// 2. EFFECT
useEffect(() => {
  fetchData();
  return () => cleanup();  // Cleanup function
}, [dependency]);

// 3. REF
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();

// 4. MEMO (expensive calculations)
const value = useMemo(() => expensiveCalc(), [deps]);

// 5. CALLBACK (memoize functions)
const handler = useCallback(() => {}, [deps]);

// 6. REDUCER (complex state)
const [state, dispatch] = useReducer(reducer, initialState);
```

---

## ARRAY METHODS (Must Know!)

```typescript
map()     // Transform:    [1,2,3].map(x => x*2)  → [2,4,6]
filter()  // Keep:         [1,2,3].filter(x => x>1) → [2,3]
reduce()  // Aggregate:    [1,2,3].reduce((a,b) => a+b, 0) → 6
find()    // First match:  users.find(u => u.id === '1')
some()    // Any true:     users.some(u => u.admin)
every()   // All true:     users.every(u => u.active)
```

---

## STATE UPDATES (Immutable!)

```typescript
// Array
setItems([...items, newItem])           // Add
setItems(items.filter(i => i.id !== id)) // Remove
setItems(items.map(i => i.id === id ? updated : i)) // Update

// Object
setUser({...user, name: 'New'})         // Update property
```

---

## TYPES

```typescript
// Props
interface Props {
  name: string;
  age?: number;  // Optional
  onClick: () => void;
  children: React.ReactNode;
}

// Events
React.MouseEvent<HTMLButtonElement>
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>

// Generic
<T>(data: T): T => data
```

---

## PATTERNS

```typescript
// Conditional
{isTrue && <Component />}
{isTrue ? <A /> : <B />}

// List
{items.map(item => <div key={item.id}>{item.name}</div>)}

// Form
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setForm({...form, [e.target.name]: e.target.value});
};
```

---

## API CALL

```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetch(url)
    .then(r => r.json())
    .then(data => { setData(data); setLoading(false); })
    .catch(err => { setError(err.message); setLoading(false); });
}, []);

if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{data.map(...)}</div>;
```

---

## COMMON MISTAKES ❌

```typescript
// ❌ Mutating state
state.push(item)
// ✅ Immutable
setState([...state, item])

// ❌ Missing deps
useEffect(() => { doSomething(prop) })
// ✅ Include deps
useEffect(() => { doSomething(prop) }, [prop])

// ❌ Conditional hooks
if (x) { useState() }
// ✅ Always call at top level
useState()
```

---

## INTERVIEW ANSWERS

**"What's useState?"**
> Adds state to functional components. Returns [value, setter]. Setter triggers re-render.

**"useEffect?"**
> Runs side effects after render. Second arg controls when it runs. Return value = cleanup.

**"Virtual DOM?"**
> In-memory copy of DOM. React diffs old/new, updates real DOM efficiently.

**"Keys in lists?"**
> Unique IDs help React track which items changed for efficient updates.

**"Re-render causes?"**
> State change, props change, parent re-render, context change.

**"useMemo vs useCallback?"**
> useMemo caches **values**, useCallback caches **functions**.

---

## QUICK SNIPPETS

```typescript
// Toggle
setOpen(prev => !prev)

// Debounce
useEffect(() => {
  const timer = setTimeout(() => action(), 500);
  return () => clearTimeout(timer);
}, [query]);

// Fetch
useEffect(() => {
  fetch(url).then(r => r.json()).then(setData);
}, [url]);
```

---

## REMEMBER

✅ Think out loud
✅ Ask clarifying questions
✅ Start simple → add features
✅ Explain trade-offs
✅ Handle edge cases
✅ Write clean code

---

**You got this! 💪**
