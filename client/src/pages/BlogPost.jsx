// pages/BlogPost.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { FaChevronLeft, FaTag } from 'react-icons/fa';
import Footer from '../components/Footer/Footer';
import './Blog.css';

const BlogPost = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { showNotification, publicSettings } = useContext(AppContext);
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (publicSettings?.features && publicSettings.features.coffeeAcademy === false) {
            navigate('/');
        }
    }, [publicSettings, navigate]);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/blogs/${slug}`);
                const data = await res.json();
                if (data.success) {
                    setBlog(data.data);
                    // Set page title
                    document.title = `${data.data.title} | Rerendet Coffee Academy`;
                } else {
                    showNotification('Story not found', 'error');
                    navigate('/blog');
                }
            } catch (err) {
                showNotification('Failed to fetch story', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
    }, [slug, navigate, showNotification]);

    if (loading) {
        return (
            <div className="blog-post-loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!blog) return null;

    // Calculate read time
    const wordCount = blog.content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    return (
        <div className="blog-post-page">
            <div className="blog-post-header">
                <div className="container" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button className="back-btn" onClick={() => navigate('/blog')}>
                        <FaChevronLeft /> Back to Academy
                    </button>
                </div>
            </div>

            <article className="blog-post-container">
                <header className="post-header">
                    <motion.div
                        className="post-meta"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="post-cat">{blog.category}</span>
                        <span className="dot-divider">•</span>
                        <span>{new Date(blog.publishedAt || blog.createdAt).toLocaleDateString('en-KE', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="dot-divider">•</span>
                        <span>{readTime} min read</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        {blog.title}
                    </motion.h1>

                    <motion.div
                        className="post-author"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="author-avatar">{blog.authorName.charAt(0)}</div>
                        <div className="author-info">
                            <span className="author-name">Written by {blog.authorName}</span>
                            <span className="author-role">Rerendet Associate</span>
                        </div>
                    </motion.div>
                </header>

                <motion.div
                    className="post-featured-img"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <img src={blog.featuredImage?.url || '/blog-placeholder.jpg'} alt={blog.title} />
                </motion.div>

                <motion.div
                    className="post-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                <footer className="post-footer">
                    {blog.tags?.length > 0 && (
                        <div className="post-tags">
                            <FaTag />
                            {blog.tags.map(tag => (
                                <span key={tag} className="tag-pill">#{tag}</span>
                            ))}
                        </div>
                    )}
                </footer>
            </article>

            <Footer />
        </div>
    );
};

export default BlogPost;
