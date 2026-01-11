// SAMPLES.FUNCTIONS.ts
// QUICK REFERENCE

// MAP - Transform each element
const doubled = [1, 2, 3].map(x => x * 2); // [2, 4, 6]

// SET - Get unique values
const unique = [...new Set([1, 2, 2, 3])]; // [1, 2, 3]

// SPREAD - Copy/merge
const merged = [...arr1, ...arr2];
const copied = { ...original, updated: true };

// FOREACH - Side effects only
items.forEach(item => console.log(item));

// FILTER - Keep matching items
const adults = users.filter(u => u.age >= 18);

// REDUCE - Aggregate to single value
const sum = numbers.reduce((acc, num) => acc + num, 0);

// 1. MAP - Transform array elements
function mapExample(users: User[]) {
  return users.map(user => ({
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    isActive: user.status === 'active'
  }));
}

// 2. SET - Remove duplicates
function setExample(items: string[]) {
  return [...new Set(items)];
  // Or: return Array.from(new Set(items));
}

function setExampleObjects(users: User[]) {
  const uniqueIds = new Set(users.map(u => u.id));
  return Array.from(uniqueIds);
}

// 3. SPREAD OPERATOR - Copy/merge arrays and objects
function spreadArrayExample(arr1: number[], arr2: number[]) {
  return [...arr1, ...arr2]; // Merge arrays
}

function spreadObjectExample(user: User, updates: Partial<User>) {
  return { ...user, ...updates }; // Merge objects
}

function spreadAddToArray(items: string[], newItem: string) {
  return [...items, newItem]; // Add to array immutably
}

// 4. FOREACH - Iterate without returning
function forEachExample(users: User[]) {
  users.forEach(user => {
    console.log(user.name);
    // Side effects only, doesn't return anything
  });
}

function forEachWithIndex(items: string[]) {
  items.forEach((item, index) => {
    console.log(`${index}: ${item}`);
  });
}

// 5. FILTER - Keep elements that match condition
function filterExample(users: User[]) {
  return users.filter(user => user.age >= 18);
}

function filterMultipleConditions(tasks: Task[]) {
  return tasks.filter(task => 
    task.status === 'pending' && 
    task.priority === 'high'
  );
}

function filterRemoveDuplicates(items: number[]) {
  return items.filter((item, index, arr) => arr.indexOf(item) === index);
}

// 6. REDUCE - Aggregate to single value
function reduceSum(numbers: number[]) {
  return numbers.reduce((sum, num) => sum + num, 0);
}

function reduceGroupBy(users: User[]) {
  return users.reduce((groups, user) => {
    const key = user.role;
    if (!groups[key]) groups[key] = [];
    groups[key].push(user);
    return groups;
  }, {} as Record<string, User[]>);
}

function reduceCount(items: string[]) {
  return items.reduce((counts, item) => {
    counts[item] = (counts[item] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

function reduceToObject(users: User[]) {
  return users.reduce((obj, user) => {
    obj[user.id] = user;
    return obj;
  }, {} as Record<string, User>);
}

// COMBINATIONS

// Map + Filter
function mapFilterExample(users: User[]) {
  return users
    .filter(user => user.isActive)
    .map(user => user.name);
}

// Filter + Reduce
function filterReduceExample(orders: Order[]) {
  return orders
    .filter(order => order.status === 'completed')
    .reduce((total, order) => total + order.amount, 0);
}

// Map + Reduce
function mapReduceExample(products: Product[]) {
  return products
    .map(p => p.price)
    .reduce((sum, price) => sum + price, 0);
}

// Spread + Filter
function spreadFilterExample(tasks: Task[], completedId: string) {
  return tasks.filter(task => task.id !== completedId);
}

// Spread + Map
function spreadMapExample(users: User[]) {
  return users.map(user => ({
    ...user,
    fullName: `${user.firstName} ${user.lastName}`
  }));
}