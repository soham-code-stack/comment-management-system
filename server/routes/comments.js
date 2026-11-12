import { Router } from 'express';
import Comment from '../models/Comment.js';
import { auth, optionalAuth, adminOnly } from '../middleware/auth.js';

const router = Router();

const shape = (c, user) => {
  const isAdmin = user?.role === 'admin';
  return {
    id: c._id,
    text: c.text,
    parent: c.parent,
    status: c.status,
    author: { id: c.author?._id, name: c.author?.name || 'Deleted user' },
    createdAt: c.createdAt,
    edited: new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 1000,
    likes: c.likes.length,
    liked: !!user && c.likes.some((i) => String(i) === user.id),
    reported: !!user && c.reports.some((i) => String(i) === user.id),
    reports: isAdmin ? c.reports.length : undefined,
  };
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const all = req.user?.role === 'admin' && req.query.all === '1';
    const docs = await Comment.find(all ? {} : { status: 'visible' })
      .sort({ createdAt: -1 })
      .populate('author', 'name')
      .lean();
    res.json(docs.map((d) => shape(d, req.user)));
  } catch (e) { next(e); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Write something first' });
    let parent = null;
    if (req.body.parent) {
      const p = await Comment.findById(req.body.parent);
      if (!p || p.status !== 'visible') return res.status(404).json({ message: 'Comment not found' });
      parent = p.parent || p._id; // replies stay one level deep
    }
    const c = await Comment.create({ author: req.user.id, text, parent });
    res.status(201).json({ id: c._id });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    if (String(c.author) !== req.user.id) return res.status(403).json({ message: 'You can only edit your own comments' });
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    c.text = text;
    await c.save();
    res.json({ id: c._id });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    if (String(c.author) !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not allowed' });
    await Comment.deleteMany({ $or: [{ _id: c._id }, { parent: c._id }] });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const toggle = (field) => async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    const has = c[field].some((i) => String(i) === req.user.id);
    c[field] = has ? c[field].filter((i) => String(i) !== req.user.id) : [...c[field], req.user.id];
    await c.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
};
router.post('/:id/like', auth, toggle('likes'));
router.post('/:id/report', auth, toggle('reports'));

router.patch('/:id/status', auth, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['visible', 'hidden'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const update = { status };
    if (status === 'visible') update.reports = []; // restoring clears reports
    const c = await Comment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
