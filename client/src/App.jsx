import { useEffect, useState } from 'react';

const emptyForm = {
  title: '',
  author: '',
  content: ''
};

const apiBase = import.meta.env.VITE_API_URL || '';
const formatDate = (value) => new Date(value).toLocaleDateString();

function App() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    const response = await fetch(`${apiBase}/posts`);
    const data = await response.json();
    setPosts(data);
    setSelectedPost((current) => {
      if (!current) {
        return data[0] ?? null;
      }
      return data.find((post) => post.id === current.id) ?? data[0] ?? null;
    });
    setLoading(false);
  };

  useEffect(() => {
    loadPosts().catch(() => {
      setMessage('Could not load posts. Make sure the backend is running.');
      setLoading(false);
    });
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = {
      title: form.title,
      author: form.author,
      content: form.content
    };

    const endpoint = editingId ? `${apiBase}/posts/${editingId}` : `${apiBase}/posts`;
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      setMessage(error.error || 'Unable to create post');
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    await loadPosts();
    setMessage(editingId ? 'Post updated successfully.' : 'Post created successfully.');
  };

  const handleDelete = async (postId) => {
    await fetch(`${apiBase}/posts/${postId}`, { method: 'DELETE' });
    await loadPosts();
    setMessage('Post deleted.');
  };

  const handleEdit = (post) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      author: post.author,
      content: post.content
    });
    setMessage(`Editing "${post.title}"`);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('Edit cancelled.');
  };

  return (
    <div className="page-shell">
      <aside className="hero-panel">
        <p className="eyebrow">Blog Studio</p>
        <h1>Write and manage posts with a clean publishing workflow.</h1>


        <div className="pill-row">
          <span className="pill">{posts.length} Posts</span>
          <span className="pill">API + DB Connected</span>
        </div>

        <form className="post-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit post' : 'Create a post'}</h2>
          <input name="title" value={form.title} onChange={handleChange} placeholder="Title" required />
          <input name="author" value={form.author} onChange={handleChange} placeholder="Author" />
          <textarea
            name="content"
            value={form.content}
            onChange={handleChange}
            placeholder="Write your blog post..."
            rows="9"
            required
          />
          <button type="submit">{editingId ? 'Save changes' : 'Publish post'}</button>
          {editingId ? (
            <button className="ghost-button" type="button" onClick={handleCancelEdit}>
              Cancel edit
            </button>
          ) : null}
          {message ? <p className="status-line">{message}</p> : null}
        </form>
      </aside>

      <main className="content-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">Posts</p>
            <h2>Recent Articles</h2>
          </div>
          <button className="ghost-button" type="button" onClick={loadPosts}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="card empty-state">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="card empty-state">No posts yet. Create the first article.</div>
        ) : (
          <div className="posts-grid">
            <section className="featured-card card">
              {selectedPost ? (
                <>
                  <div className="card-meta">
                    <span>{selectedPost.author}</span>
                    <span>{formatDate(selectedPost.createdAt)}</span>
                  </div>
                  <h3>{selectedPost.title}</h3>
                  <p>{selectedPost.content}</p>
                </>
              ) : (
                <p>Select a post to read it.</p>
              )}
            </section>

            <section className="list-stack">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className={`card post-card ${selectedPost?.id === post.id ? 'post-card-active' : ''}`}
                >
                  <button className="post-link" type="button" onClick={() => setSelectedPost(post)}>
                    <div className="card-meta">
                      <span>{post.author}</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                  </button>
                  <div className="card-actions">
                    <button className="ghost-button" type="button" onClick={() => handleEdit(post)}>
                      Edit
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDelete(post.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
