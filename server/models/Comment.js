import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Comment', commentSchema);
