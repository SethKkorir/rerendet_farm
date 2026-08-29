// ProductDetail.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { motion } from 'framer-motion';
import { FaShoppingBag, FaArrowLeft, FaLeaf, FaShieldAlt, FaTruck } from 'react-icons/fa';
// import FlavorChart from './FlavorChart'; // hidden for now
import './ProductDetail.css';

const ProductDetail = () => {
    const { slug } = useParams();
    const { addToCart, showAlert, user } = useContext(AppContext);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('');
    const [addingToCart, setAddingToCart] = useState(false);
    const [restockEmail, setRestockEmail] = useState(user?.email || '');
    const [submittingRestock, setSubmittingRestock] = useState(false);
    const [subscribedRestock, setSubscribedRestock] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/products/slug/${slug}`);
                if (!res.ok) throw new Error('Product not found');
                const result = await res.json();
                if (result.success) {
                    setProduct(result.data);
                    if (result.data.sizes?.length > 0) {
                        setSelectedSize(result.data.sizes[0].size);
                    }
                } else {
                    showAlert('Product not found', 'error');
                }
            } catch (err) {
                console.error(err);
                showAlert('Failed to load product', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug, showAlert]);

    const handleAddToCart = async () => {
        if (!selectedSize || !product) return;
        setAddingToCart(true);
        try {
            const sizeOption = product.sizes.find(s => s.size === selectedSize);
            await addToCart({ ...product, price: sizeOption.price }, 1, selectedSize);
        } catch (err) {
            console.error(err);
        } finally {
            setAddingToCart(false);
        }
    };

    const handleRestockSubscribe = async (e) => {
        e.preventDefault();
        if (!restockEmail || !product) return;
        setSubmittingRestock(true);
        try {
            const res = await fetch(`/api/products/${product._id}/restock-subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: restockEmail })
            });
            const data = await res.json();
            if (data.success) {
                setSubscribedRestock(true);
                showAlert(data.message, 'success');
            } else {
                showAlert(data.message || 'Subscription failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showAlert('Failed to subscribe for restock alerts', 'error');
        } finally {
            setSubmittingRestock(false);
        }
    };

    if (loading) return <div className="loading-full">Brewing your coffee details...</div>;
    if (!product) return <div className="not-found">Coffee not found. <Link to="/">Back to shop</Link></div>;

    const currentPrice = product.sizes?.find(s => s.size === selectedSize)?.price || 0;

    return (
        <motion.div
            className="product-detail-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="container">
                <Link to="/" className="back-link"><FaArrowLeft /> Back to Shop</Link>

                <div className="product-detail-grid">
                    {/* Left: Images */}
                    <div className="product-images">
                        <img src={product.images?.[0]?.url || '/default-coffee.jpg'} alt={product.name} className="main-img" />
                    </div>

                    {/* Right: Info */}
                    <div className="product-info">
                        <div className="product-badges">
                            {product.isFeatured && <span className="badge featured">Featured</span>}
                            {product.roastLevel && <span className="badge roast">{product.roastLevel} Roast</span>}
                        </div>

                        <h1>{product.name}</h1>
                        <p className="origin">{product.origin}</p>

                        <div className="price-tag">
                            <span className="currency">KES</span> {currentPrice.toLocaleString()}
                        </div>

                        <div className="description">
                            <h3 className="desc-heading">About This Coffee:</h3>
                            <p>{product.description}</p>
                        </div>

                        {product.flavorNotes && product.flavorNotes.length > 0 && (
                            <div className="product-flavor-notes-detail">
                                <h3 className="desc-heading">Tasting & Flavor Notes:</h3>
                                <div className="flavor-pills-list">
                                    {product.flavorNotes.map((note, idx) => (
                                        <span key={idx} className="flavor-badge-detail">✨ {note}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {product.categoryAttributes && Object.keys(product.categoryAttributes).length > 0 && (
                            <div className="category-attributes-display">
                                <h3 className="desc-heading">Farm & Processing Attributes:</h3>
                                <ul>
                                    {Object.entries(product.categoryAttributes).map(([key, val]) => (
                                        <li key={key}>
                                            <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val.toString()}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {product.sizes?.length > 0 && (
                            <div className="size-selector">
                                <h3>Select Size:</h3>
                                <div className="size-options">
                                    {product.sizes.map(s => (
                                        <button
                                            key={s.size}
                                            className={`size-btn ${selectedSize === s.size ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(s.size)}
                                        >
                                            {s.size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {product.inventory?.stock <= 0 || product.inStock === false ? (
                            <div className="out-of-stock-section" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    <span>⚠️ Currently Out of Stock</span>
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                                    We are roasting a new batch of this coffee! Enter your email below to get notified as soon as it is back in stock.
                                </p>
                                {!subscribedRestock ? (
                                    <form onSubmit={handleRestockSubscribe} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={restockEmail}
                                            onChange={e => setRestockEmail(e.target.value)}
                                            required
                                            style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={submittingRestock}
                                            style={{ background: '#6b4226', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            {submittingRestock ? 'Subscribing...' : '🔔 Notify Me'}
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                        ✓ Subscribed! We will email you the moment fresh stock arrives.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                className="add-cart-btn"
                                onClick={handleAddToCart}
                                disabled={addingToCart}
                            >
                                <FaShoppingBag /> {addingToCart ? 'Adding...' : 'Add to Cart'}
                            </button>
                        )}

                        <div className="product-features-mini">
                            {product.category === 'coffee-beans' ? (
                                <div className="f-item"><FaLeaf /> Freshly Roasted</div>
                            ) : (
                                <div className="f-item"><FaLeaf /> Premium Quality</div>
                            )}
                            <div className="f-item"><FaShieldAlt /> Secure Checkout</div>
                            <div className="f-item"><FaTruck /> Fast Delivery</div>
                        </div>
                    </div>
                </div>

                {/* Bottom Sections */}
                <div className="product-extra-info">
                    {/* Flavor profile hidden for now
                {product.flavorProfiles && (
                    <div className="flavor-profile-section">
                        <h2>Flavor Radar</h2>
                        <FlavorChart flavorProfiles={product.flavorProfiles} />
                    </div>
                )}
                */}
                </div>
            </div>
        </motion.div>
    );
};

export default ProductDetail;
