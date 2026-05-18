// controllers/blogController.js
import asyncHandler from 'express-async-handler';
import Blog from '../models/Blog.js';

// @desc    Get all blogs (public, with pagination)
// @route   GET /api/blogs
// @access  Public
export const getBlogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 9, category, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { status: 'published' };
    if (category && category !== 'all') query.category = category;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } }
        ];
    }

    const [blogs, total] = await Promise.all([
        Blog.find(query)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Blog.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: {
            blogs,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        }
    });
});

// @desc    Get single blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
export const getBlogBySlug = asyncHandler(async (req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' })
        .populate('author', 'firstName lastName');

    if (!blog) {
        res.status(404);
        throw new Error('Blog post not found');
    }

    // Increment views
    blog.views += 1;
    await blog.save();

    res.json({ success: true, data: blog });
});

// @desc    Get all blogs for admin (includes drafts)
// @route   GET /api/admin/blogs
// @access  Private/Admin
export const getAdminBlogs = asyncHandler(async (req, res) => {
    const blogs = await Blog.find()
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 });

    res.json({ success: true, data: blogs });
});

// @desc    Create new blog
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = asyncHandler(async (req, res) => {
    console.log(`📝 [BLOGS] Creating new blog: ${req.body.title}`);
    const { title, content, excerpt, category, tags, status, isFeatured, featuredImage } = req.body;

    if (!title || !content) {
        res.status(400);
        throw new Error('Title and content are required');
    }

    const blog = await Blog.create({
        title,
        content,
        excerpt,
        category,
        tags,
        status,
        isFeatured,
        featuredImage,
        author: req.user._id,
        authorName: `${req.user.firstName} ${req.user.lastName}`
    });

    res.status(201).json({ success: true, data: blog });
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = asyncHandler(async (req, res) => {
    // Use .lean() to avoid Mongoose CastError on hydration if the DB has "Admin" as author
    const blogData = await Blog.findById(req.params.id).lean();

    if (!blogData) {
        res.status(404);
        throw new Error('Blog not found');
    }

    // Protected fields that shouldn't be updated via req.body directly
    const protectedFields = ['author', 'authorName', '_id', 'createdAt', 'updatedAt'];
    
    const updateData = {};
    Object.keys(req.body).forEach(key => {
        if (!protectedFields.includes(key)) {
            updateData[key] = req.body[key];
        }
    });

    // DATA INTEGRITY FIX: If the blog has corrupt "Admin" author or is missing authorName, fix it now
    if (!blogData.author || blogData.author.toString() === 'Admin' || typeof blogData.author === 'string') {
        console.log(`🔧 [BLOG_FIX] Restoring missing/corrupt author ID for blog: ${req.params.id}`);
        updateData.author = req.user._id;
    }

    if (!blogData.authorName) {
        console.log(`🔧 [BLOG_FIX] Restoring missing authorName for blog: ${req.params.id}`);
        updateData.authorName = `${req.user.firstName} ${req.user.lastName}`;
    }

    // Use findByIdAndUpdate to apply changes
    const updatedBlog = await Blog.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('author', 'firstName lastName');

    res.json({ success: true, data: updatedBlog });
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
        res.status(404);
        throw new Error('Blog not found');
    }

    await blog.deleteOne();
    res.json({ success: true, message: 'Blog post removed' });
});

// @desc    Get blog categories
// @route   GET /api/blogs/categories
// @access  Public
export const getBlogCategories = asyncHandler(async (req, res) => {
    const categories = await Blog.distinct('category', { status: 'published' });
    res.json({ success: true, data: categories });
});
