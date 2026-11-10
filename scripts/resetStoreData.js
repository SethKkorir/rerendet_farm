// scripts/resetStoreData.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import PaymentAuditLog from '../models/PaymentAuditLog.js';
import AbandonedCheckout from '../models/AbandonedCheckout.js';
import Cart from '../models/Cart.js';
import AdminAlert from '../models/AdminAlert.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI missing from environment.');
  process.exit(1);
}

const freshCatalog = [
  {
    name: 'Rerendet AA Arabica Reserve',
    description: 'Single-origin specialty Arabica harvested at high altitude in Bomet, Kenya. Rich tasting notes of citrus, blackcurrant, and smooth dark chocolate with a creamy finish.',
    origin: 'Bomet, Kenya (1,950m ASL)',
    roastLevel: 'medium-dark',
    badge: 'Top Harvest',
    isFeatured: true,
    isActive: true,
    inStock: true,
    flavorNotes: ['Blackcurrant', 'Citrus', 'Caramel', 'Dark Chocolate'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Whole Beans',
    inventory: {
      physicalStock: 50,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 750, originalPrice: null },
      { size: '500g', price: 1450, originalPrice: null },
      { size: '1kg', price: 2800, originalPrice: null }
    ],
    images: [
      {
        public_id: 'rerendet-coffee/products/zxasno92l57dkcgdpybo',
        url: 'https://res.cloudinary.com/dln2pifwf/image/upload/v1794291989/rerendet-coffee/products/zxasno92l57dkcgdpybo.png'
      }
    ],
    tags: ['specialty', 'arabica', 'single-origin', 'rerendet', 'top-harvest']
  },
  {
    name: 'Rerendet Espresso 1kg',
    description: 'Authentic 1 kg Barista value pack. Single Origin Highland Arabica roasted to a deep, resonant espresso profile. Delivers thick golden crema and bold berry-cocoa depth.',
    origin: 'Rerendet Highlands (2,150m ASL)',
    roastLevel: 'espresso',
    badge: '1 kg Barista Value Pack',
    isFeatured: true,
    isActive: true,
    inStock: true,
    flavorNotes: ['Dark Berries', 'Cocoa', 'Molasses', 'Caramel'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Espresso',
    inventory: {
      physicalStock: 40,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '1kg', price: 2800, originalPrice: null }
    ],
    images: [
      {
        public_id: 'rerendet-espresso-1kg',
        url: '/images/coffee/rerendet-espresso-1kg.png'
      }
    ],
    tags: ['espresso', 'barista', '1kg', 'single-origin']
  },
  {
    name: 'Rerendet Espresso 250g',
    description: 'Handcrafted micro-batch artisan reserve. High-elevation beans roasted slowly to preserve complex floral aromas while developing full-bodied espresso character.',
    origin: 'Rerendet Highlands (2,150m ASL)',
    roastLevel: 'espresso',
    badge: '250 g Artisan Reserve',
    isFeatured: true,
    isActive: true,
    inStock: true,
    flavorNotes: ['Dark Berries', 'Cocoa', 'Spiced Caramel', 'Honey'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Espresso',
    inventory: {
      physicalStock: 60,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 850, originalPrice: null }
    ],
    images: [
      {
        public_id: 'rerendet-espresso-250g',
        url: '/images/coffee/rerendet-espresso-250g.png'
      }
    ],
    tags: ['espresso', 'artisan', '250g', 'micro-batch']
  },
  {
    name: 'Bomet Sunrise Blend',
    description: 'A bright and uplifting morning roast with refreshing citrus brightness, sweet wildflower honey, and a clean, silky body. Perfect for start-of-day pour-overs and drip brews.',
    origin: 'Bomet High Plains, Kenya (1,900m ASL)',
    roastLevel: 'medium',
    badge: 'Morning Favorite',
    isFeatured: true,
    isActive: true,
    inStock: true,
    flavorNotes: ['Citrus', 'Wildflower Honey', 'Caramel', 'Sweet Apple'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Whole Beans',
    inventory: {
      physicalStock: 50,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 850, originalPrice: null },
      { size: '500g', price: 1600, originalPrice: null },
      { size: '1kg', price: 3000, originalPrice: null }
    ],
    images: [
      {
        public_id: 'bomet-sunrise',
        url: '/images/coffee/bomet-sunrise.png'
      }
    ],
    tags: ['morning', 'medium-roast', 'citrus', 'bomet']
  },
  {
    name: 'Dark Forest Blend',
    description: 'Deep and brooding volcanic dark roast. Robust body infused with intense dark chocolate, aromatic cedar wood, roasted almond, and a lingering, velvety finish.',
    origin: 'Mau Forest Escarpment, Kenya (2,100m ASL)',
    roastLevel: 'dark',
    badge: 'Rich & Bold',
    isFeatured: false,
    isActive: true,
    inStock: true,
    flavorNotes: ['Dark Chocolate', 'Earthy Cedar', 'Roasted Almonds', 'Spice'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'French Press',
    inventory: {
      physicalStock: 45,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 900, originalPrice: null },
      { size: '500g', price: 1700, originalPrice: null },
      { size: '1kg', price: 3200, originalPrice: null }
    ],
    images: [
      {
        public_id: 'dark-forest',
        url: '/images/coffee/dark-forest.png'
      }
    ],
    tags: ['dark-roast', 'bold', 'french-press', 'chocolate']
  },
  {
    name: 'Caramel Cloud Blend',
    description: 'Smooth, creamy, and naturally sweet. A gentle medium-light roast displaying rich buttery caramel, melted brown sugar, and bourbon vanilla notes.',
    origin: 'Special Highland Estate Blend (1,850m ASL)',
    roastLevel: 'medium-light',
    badge: 'Artisan Blend',
    isFeatured: false,
    isActive: true,
    inStock: true,
    flavorNotes: ['Buttery Caramel', 'Vanilla Bean', 'Toffee', 'Milk Chocolate'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Pour-Over',
    inventory: {
      physicalStock: 40,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 950, originalPrice: null },
      { size: '500g', price: 1800, originalPrice: null },
      { size: '1kg', price: 3400, originalPrice: null }
    ],
    images: [
      {
        public_id: 'caramel-cloud',
        url: '/images/coffee/caramel-cloud.jpg'
      }
    ],
    tags: ['sweet', 'smooth', 'dessert', 'caramel']
  },
  {
    name: 'Highland Espresso Reserve',
    description: 'A traditional heavy-bodied Italian style roast using strictly high-altitude Kenyan peaberry and AA beans. Crafted for optimal crema extraction with vibrant black currant brightness.',
    origin: 'Central Kenya Highlands (2,050m ASL)',
    roastLevel: 'espresso',
    badge: 'Barista Choice',
    isFeatured: false,
    isActive: true,
    inStock: true,
    flavorNotes: ['Blackcurrant', 'Dark Cacao', 'Cardamom', 'Smoky Oak'],
    grindOptions: ['Whole Beans', 'French Press', 'Pour-Over', 'AeroPress', 'Espresso'],
    defaultGrind: 'Espresso',
    inventory: {
      physicalStock: 35,
      reservedStock: 0,
      lowStockThreshold: 5
    },
    sizes: [
      { size: '250g', price: 920, originalPrice: null },
      { size: '500g', price: 1750, originalPrice: null },
      { size: '1kg', price: 3300, originalPrice: null }
    ],
    images: [
      {
        public_id: 'highland-espresso',
        url: '/images/coffee/highland-espresso.png'
      }
    ],
    tags: ['espresso', 'peaberry', 'crema', 'highland']
  }
];

async function resetAll() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.');

    // 1. Purge all test orders and transactional logs
    console.log('\n🧹 Clearing test orders and transactional records...');
    const deletedOrders = await Order.deleteMany({});
    const deletedTransactions = await PaymentTransaction.deleteMany({});
    const deletedAuditLogs = await PaymentAuditLog.deleteMany({});
    const deletedInvoices = await Invoice.deleteMany({});
    const deletedCheckouts = await AbandonedCheckout.deleteMany({});
    const deletedCarts = await Cart.deleteMany({});
    const deletedAlerts = await AdminAlert.deleteMany({});

    console.log(`   - Deleted ${deletedOrders.deletedCount} Orders`);
    console.log(`   - Deleted ${deletedTransactions.deletedCount} Payment Transactions`);
    console.log(`   - Deleted ${deletedAuditLogs.deletedCount} Payment Audit Logs`);
    console.log(`   - Deleted ${deletedInvoices.deletedCount} Invoices`);
    console.log(`   - Deleted ${deletedCheckouts.deletedCount} Abandoned Checkouts`);
    console.log(`   - Deleted ${deletedCarts.deletedCount} Shopping Carts`);
    console.log(`   - Deleted ${deletedAlerts.deletedCount} Admin Alerts`);

    // 2. Reset customer accounts metrics
    console.log('\n👤 Resetting customer loyalty & order streaks...');
    const userReset = await User.updateMany(
      { role: 'customer' },
      {
        $set: {
          loyaltyPoints: 0,
          storeCredit: 0,
          reorderStreak: 0,
          lastOrderDate: null
        }
      }
    );
    console.log(`   - Cleaned test order history for ${userReset.modifiedCount} customer accounts.`);

    // 3. Ensure Coffee Category exists
    let coffeeCat = await Category.findOne({ name: 'Coffee' });
    if (!coffeeCat) {
      coffeeCat = await Category.create({
        name: 'Coffee',
        slug: 'coffee',
        description: 'Single-origin highland coffee beans & artisan blends',
        isActive: true
      });
      console.log('✅ Created fresh Coffee Category');
    }

    // 4. Reset Product Catalog
    console.log('\n☕ Cleaning and reseeding product catalog...');
    const deletedProducts = await Product.deleteMany({});
    console.log(`   - Removed ${deletedProducts.deletedCount} old/test products`);

    const created = [];
    for (const prodData of freshCatalog) {
      const p = new Product({
        ...prodData,
        categoryId: coffeeCat._id,
        categoryAttributes: {
          roastLevel: prodData.roastLevel,
          origin: prodData.origin
        }
      });
      await p.save();
      created.push(p);
      console.log(`   + Added: ${p.name} (${p.sizes.map(s => `${s.size}: KES ${s.price}`).join(', ')}) [Stock: ${p.inventory.physicalStock}]`);
    }

    console.log(`\n🎉 Reset complete! ${created.length} pristine products created. All test orders & transactions erased.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during store reset:', err);
    process.exit(1);
  }
}

resetAll();
