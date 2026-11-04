/**
 * Stock validation helper for Rerendet Farm
 * Strictly verifies whether a product is in stock or depleted across all inventory formats.
 */

export const isProductOutOfStock = (product) => {
  if (!product) return true;

  // Explicit flags
  if (product.isActive === false || product.isActive === 'false') return true;
  if (product.inStock === false || product.inStock === 'false') return true;
  if (product.isUnavailable === true || product.isOutOfStock === true) return true;

  // Available stock virtual or computed field
  if (product.availableStock !== undefined && product.availableStock !== null) {
    if (Number(product.availableStock) <= 0) return true;
  }

  // Inventory object fields
  if (product.inventory) {
    if (typeof product.inventory === 'number') {
      if (product.inventory <= 0) return true;
    } else if (typeof product.inventory === 'object') {
      const physical = product.inventory.physicalStock !== undefined && product.inventory.physicalStock !== null
        ? Number(product.inventory.physicalStock)
        : undefined;
      const reserved = product.inventory.reservedStock !== undefined && product.inventory.reservedStock !== null
        ? Number(product.inventory.reservedStock)
        : 0;

      if (physical !== undefined && (physical - reserved) <= 0) {
        return true;
      }

      if (product.inventory.stock !== undefined && product.inventory.stock !== null && Number(product.inventory.stock) <= 0) {
        return true;
      }
      if (product.inventory.quantity !== undefined && product.inventory.quantity !== null && Number(product.inventory.quantity) <= 0) {
        return true;
      }
    }
  }

  // Direct stock / quantity fields on product root
  if (product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) {
    return true;
  }
  if (product.quantity !== undefined && product.quantity !== null && Number(product.quantity) <= 0) {
    return true;
  }

  return false;
};

export const getAvailableStockCount = (product) => {
  if (isProductOutOfStock(product)) return 0;

  if (product.availableStock !== undefined && product.availableStock !== null) {
    return Math.max(0, Number(product.availableStock));
  }

  if (product.inventory?.physicalStock !== undefined) {
    const physical = Number(product.inventory.physicalStock);
    const reserved = Number(product.inventory.reservedStock || 0);
    return Math.max(0, physical - reserved);
  }

  if (product.inventory?.stock !== undefined) {
    return Math.max(0, Number(product.inventory.stock));
  }

  if (product.stock !== undefined) {
    return Math.max(0, Number(product.stock));
  }

  return 999;
};

