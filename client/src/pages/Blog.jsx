// pages/Blog.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaChevronRight, FaSearch } from 'react-icons/fa';
import Footer from '../components/Footer/Footer';
import './Blog.css';

const Blog = () => {
    const { showNotification, publicSettings } = useContext(AppContext);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (publicSettings?.features && publicSettings.features.coffeeAcademy === false) {
            navigate('/');
        }
    }, [publicSettings, navigate]);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/blogs?category=${activeCategory}&search=${searchQuery}`);
                const data = await res.json();
                if (data.success) {
                    setBlogs(data.data.blogs);
                }
            } catch (err) {
                showNotification('Failed to fetch blog posts', 'error');
            } finally {
                setLoading(false);
            }
        };

        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/blogs/categories');
                const data = await res.json();
                if (data.success) {
                    setCategories(['all', ...data.data]);
                }
            } catch (err) { }
        };

        fetchBlogs();
        fetchCategories();
    }, [activeCategory, searchQuery, showNotification]);

    return (
        <div className="blog-page">
            {/* Hero Section */}
            <section className="blog-hero">
                <div className="container">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        Rerendet Coffee <span>Academy</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        A journey through the highland farms, brewing craftsmanship, and the rich culture of Kenyan coffee.
                    </motion.p>
                </div>
            </section>

            <div className="container blog-container">
                {/* Filters */}
                <aside className="blog-sidebar">
                    <div className="search-widget">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search stories..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="category-widget">
                        <h3>Categories</h3>
                        <ul>
                            {categories.map((cat) => (
                                <li
                                    key={cat}
                                    className={activeCategory === cat ? 'active' : ''}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Blog Grid */}
                <main className="blog-main">
                    {loading ? (
                        <div className="blog-loading">
                            <div className="spinner"></div>
                            <p>Brewing our stories...</p>
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="no-blogs">
                            <p>No stories found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="blog-grid-public">
                            {blogs.map((blog, i) => (
                                <motion.article
                                    key={blog._id}
                                    className="blog-card-public"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    onClick={() => navigate(`/blog/${blog.slug}`)}
                                >
                                    <div className="blog-card-img">
                                        <img src={blog.featuredImage?.url || '/blog-placeholder.jpg'} alt={blog.title} />
                                        <span className="blog-cat">{blog.category}</span>
                                    </div>
                                    <div className="blog-card-content">
                                        <div className="blog-meta-public">
                                            <span>
                                                <FaCalendarAlt size={12} />
                                                {new Date(blog.publishedAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            {/* We can also calculate read time for the card */}
                                            <span>
                                                <FaChevronRight size={10} />
                                                {Math.ceil(blog.content.split(/\s+/).length / 200)} min read
                                            </span>
                                        </div>
                                        <h2>{blog.title}</h2>
                                        <p>{blog.excerpt || blog.content.substring(0, 120).replace(/<[^>]*>/g, '') + '...'}</p>
                                        <button className="read-more">
                                            Explore Story <FaChevronRight />
                                        </button>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            <Footer />
        </div>
    );
};

export default Blog;
