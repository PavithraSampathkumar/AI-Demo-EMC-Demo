import { useEffect, useState } from 'react';

// One helper for every API call: sends JSON, throws a readable error on failure.
async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null; // DELETE returns no body
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  // Load todos once when the component first appears
  useEffect(() => {
    request('/todos')
      .then(setTodos)
      .catch((err) => setError(err.message));
  }, []);

  async function addTodo(e) {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    try {
      const todo = await request('/todos', {
        method: 'POST',
        body: JSON.stringify({ title: text }),
      });
      setTodos((prev) => [todo, ...prev]);
      setTitle('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleTodo(todo) {
    try {
      const updated = await request(`/todos/${todo._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !todo.completed }),
      });
      setTodos((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTodo(id) {
    try {
      await request(`/todos/${id}`, { method: 'DELETE' });
      setTodos((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="container">
      <h1>My Todos</h1>

      <form onSubmit={addTodo} className="add-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo._id} className={todo.completed ? 'done' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo)}
            />
            <span>{todo.title}</span>
            <button className="delete" onClick={() => deleteTodo(todo._id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && !error && <p className="empty">No todos yet.</p>}
    </main>
  );
}
