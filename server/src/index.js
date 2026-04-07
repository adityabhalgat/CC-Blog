import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const app = express();
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

const toSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildExcerpt = (content) =>
  content.length > 160 ? `${content.slice(0, 157)}...` : content;

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/posts', async (_request, response) => {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' }
  });

  response.json(posts);
});

app.get('/posts/:id', async (request, response) => {
  const postId = Number(request.params.id);

  if (Number.isNaN(postId)) {
    return response.status(400).json({ error: 'Invalid post id' });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return response.status(404).json({ error: 'Post not found' });
  }

  response.json(post);
});

app.post('/posts', async (request, response) => {
  const { title, content, author = 'Anonymous' } = request.body;

  if (!title || !content) {
    return response.status(400).json({ error: 'Title and content are required' });
  }

  const baseSlug = toSlug(title);
  const excerpt = buildExcerpt(content);
  let slug = baseSlug;
  let attempt = 1;

  while (await prisma.post.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      author
    }
  });

  response.status(201).json(post);
});

app.put('/posts/:id', async (request, response) => {
  const postId = Number(request.params.id);

  if (Number.isNaN(postId)) {
    return response.status(400).json({ error: 'Invalid post id' });
  }

  const existingPost = await prisma.post.findUnique({ where: { id: postId } });

  if (!existingPost) {
    return response.status(404).json({ error: 'Post not found' });
  }

  const { title, content, author } = request.body;
  const nextTitle = title ?? existingPost.title;
  const nextContent = content ?? existingPost.content;
  const nextAuthor = author ?? existingPost.author;
  const nextSlug = title ? toSlug(title) : existingPost.slug;
  const nextExcerpt = content ? buildExcerpt(content) : existingPost.excerpt;

  const slugExists = await prisma.post.findFirst({
    where: {
      slug: nextSlug,
      NOT: { id: postId }
    }
  });

  if (slugExists) {
    return response.status(409).json({ error: 'Another post already uses that title' });
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      title: nextTitle,
      slug: nextSlug,
      excerpt: nextExcerpt,
      content: nextContent,
      author: nextAuthor
    }
  });

  response.json(updatedPost);
});

app.delete('/posts/:id', async (request, response) => {
  const postId = Number(request.params.id);

  if (Number.isNaN(postId)) {
    return response.status(400).json({ error: 'Invalid post id' });
  }

  try {
    await prisma.post.delete({ where: { id: postId } });
  } catch {
    return response.status(404).json({ error: 'Post not found' });
  }

  response.status(204).send();
});

app.listen(port, () => {
  console.log(`Blog API running on http://localhost:${port}`);
});
