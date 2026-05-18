import os

filepath = 'src/components/CoffeeShop/CoffeeShop.jsx'
with open(filepath, 'rb') as f:
    content = f.read()

start_marker = b'            {/* Stock */}'
end_marker = b'              <Link to={`/product/${product.seo?.slug || product._id}`}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

print(f"start_idx: {start_idx}, end_idx: {end_idx}")

if start_idx != -1 and end_idx != -1:
    # Ensure end_idx is after start_idx
    if end_idx > start_idx:
        # Replacement text
        replacement = b'''            {/* Stock */}
            {product.inventory?.stock !== undefined && (
              <div className={`qv-stock ${product.inventory.stock <= 0 ? 'out' : product.inventory.stock <= (product.inventory.lowStockAlert || 5) ? 'low' : 'ok'}`}>
                <span className="qv-stock-dot" />
                {product.inventory.stock <= 0
                  ? 'Out of Stock'
                  : product.inventory.stock <= (product.inventory.lowStockAlert || 5)
                  ? `Low Stock: ${product.inventory.stock} left`
                  : 'In Stock'}
              </div>
            )}

            {/* CTA */}
            <div className="qv-actions">
              <motion.button
                className={`qv-cta${!productInStock ? ' qv-cta--disabled' : added ? ' qv-cta--added' : ''}`}
                onClick={handleAdd}
                disabled={!productInStock || adding}
                whileHover={productInStock && !adding ? { scale: 1.02 } : {}}
                whileTap={productInStock && !adding ? { scale: 0.97 } : {}}
                style={productInStock ? { '--c': meta.color, '--ca': meta.accent } : {}}
              >
                {added ? (
                  <><FaCheck /> Added!</>
                ) : adding ? (
                  <><span className="cs-cta-spinner" /> Adding\xe2\x80\xa6</>
                ) : !productInStock ? (
                  'Out of Stock'
                ) : (
                  <><FaPlus /> Add to Cart</>
                )}
              </motion.button>

'''
        replacement = replacement.replace(b'\n', b'\r\n')
        
        # Construct the new content
        new_content = content[:start_idx] + replacement + content[end_idx:]
        
        with open(filepath, 'wb') as f:
            f.write(new_content)
        print("REPLACEMENT SUCCESSFUL")
    else:
        print("Error: end_idx is before start_idx")
else:
    print("Error: markers not found")
