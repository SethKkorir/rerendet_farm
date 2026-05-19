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
    const { addToCart, showAlert } = useContext(AppContext);
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState('');
    const [addingToCart, setAddingToCart] = useState(false);

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
                            {product.category === 'coffee-beans' && <span className="badge roast">{product.roastLevel} Roast</span>}
                        </div>

                        <h1>{product.name}</h1>
                        <p className="origin">{product.origin}</p>

                        <div className="price-tag">
                            <span className="currency">KES</span> {currentPrice.toLocaleString()}
                        </div>

                        <div className="description">
                            <p>{product.description}</p>
                        </div>

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

                        <button
                            className="add-cart-btn"
                            onClick={handleAddToCart}
                            disabled={addingToCart || product.inventory?.stock <= 0}
                        >
                            <FaShoppingBag /> {addingToCart ? 'Adding...' : 'Add to Cart'}
                        </button>

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
