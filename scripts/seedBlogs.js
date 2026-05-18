// scripts/seedBlogs.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Blog from '../models/Blog.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const sampleBlogs = [
  {
    title: "How to Brew the Perfect French Press Coffee",
    excerpt: "Unlock the full potential of your coffee beans with our comprehensive, step-by-step guide to mastering the classic French Press.",
    content: `
      <h2>The Art of the Plunge</h2>
      <p>The French Press is one of the most beloved and enduring coffee brewing methods in the world. Favored by coffee connoisseurs for its rich, full-bodied cup, it allows direct immersion of the grounds in hot water, extracting the natural essential oils and complex flavors that filters often catch.</p>
      
      <blockquote>"A great French Press is all about patience, precise ratios, and the right grind size. It's the ultimate way to taste the true character of single-origin highland beans."</blockquote>

      <h3>What You'll Need</h3>
      <ul>
        <li><strong>Freshly roasted coffee beans:</strong> Medium or Dark roast (we recommend our <em>Bomet Sunrise Blend</em>).</li>
        <li><strong>Grinder:</strong> Coarse grind is essential (texture of sea salt).</li>
        <li><strong>Water:</strong> Filtered water heated to 93°C - 96°C (about 30 seconds off a rolling boil).</li>
        <li><strong>Ratio:</strong> 1:15 ratio (e.g., 30g of coffee to 450ml of water).</li>
      </ul>

      <h3>Step-by-Step Instructions</h3>
      <ol>
        <li><strong>Preheat the Press:</strong> Swirl warm water in your French Press and discard it. This keeps the brewing temperature stable.</li>
        <li><strong>Add Coffee Grounds:</strong> Pour in your coarsely ground coffee and shake gently to level the bed.</li>
        <li><strong>The Bloom:</strong> Pour in just enough hot water to saturate the grounds (about 60g). Let it sit for 30 seconds. You'll see beautiful bubbles forming—this is carbon dioxide escaping, allowing optimal extraction.</li>
        <li><strong>The Fill:</strong> Pour the remaining water slowly in a circular motion. Place the plunger top on but do not plunge.</li>
        <li><strong>Steep:</strong> Let the coffee steep undisturbed for exactly 4 minutes.</li>
        <li><strong>The Crust Breakthrough:</strong> After 4 minutes, gently stir the crust that forms on top with a wooden spoon. This causes the grounds to sink to the bottom.</li>
        <li><strong>The Plunge:</strong> Press down slowly and evenly. If the plunge is too hard, your grind is too fine; if it drops too easily, the grind is too coarse.</li>
        <li><strong>Serve Immediately:</strong> Decant all the brewed coffee immediately into mugs or a carafe to prevent over-extraction, which makes coffee bitter.</li>
      </ol>

      <p>Enjoy your rich, velvety brew! Experiment slightly with steep time to dial in your absolute favorite cup.</p>
    `,
    category: "Recipes",
    tags: ["brewing", "frenchpress", "coffee-guide", "recipes"],
    featuredImage: {
      url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80"
    },
    status: "published",
    isFeatured: true,
    views: 142
  },
  {
    title: "A Day in the Life at Rerendet Farm: High-Altitude Harvests",
    excerpt: "Journey with us up into the volcanic slopes of Kenya, where every coffee cherry is hand-picked at peak ripeness.",
    content: `
      <h2>Born in the Highlands</h2>
      <p>High above the rift, nested along the rich volcanic slopes of Bomet, lies Rerendet Farm. Here, the air is cool, the soil is incredibly fertile, and the coffee grows slowly, developing dense, flavor-rich cherries that capture the true essence of East African terroir.</p>
      
      <p>A typical harvest day starts long before sunrise. At 5:00 AM, the mist still hangs thick over the coffee trees. Our harvesting team gathers, carrying woven baskets and ready to hand-select only the perfect, ruby-red cherries.</p>

      <blockquote>"Unlike industrial farms, we don't strip-harvest. We walk every row of trees multiple times, hand-picking only the cherries that have achieved perfect sweetness. It's labor-intensive, but it's the only way to ensure premium quality."</blockquote>

      <h3>Processing the Harvest</h3>
      <p>Once the baskets are filled, they are brought to the wet mill for processing on the very same afternoon:</p>
      <ul>
        <li><strong>Floating & Sorting:</strong> Cherries are placed in water channels. Under-ripe or defective cherries float and are skimmed off. Only dense, heavy, sweet cherries advance.</li>
        <li><strong>Depulping:</strong> The skin is gently removed using eco-pulpers, leaving the sweet mucilage surrounding the bean.</li>
        <li><strong>Fermentation:</strong> The beans ferment in clean water tanks for 12 to 24 hours to break down the mucilage, imparting a bright, clean acidity characteristic of premium Kenyan coffees.</li>
        <li><strong>African Raised Beds:</strong> The wet parchment is transferred to elevated wire tables. Over the next 10-14 days, the beans are turned constantly under the brilliant African sun until they reach a perfect 11-12% moisture level.</li>
      </ul>

      <p>This dedication to detail at every step is why farm-to-cup coffee is so special. When you sip your morning cup of Bomet Sunrise, you are directly tasting the soil, the sun, and the craftsmanship of Bomet's highlands.</p>
    `,
    category: "Farming",
    tags: ["harvest", "kenya-coffee", "farm-life", "organic"],
    featuredImage: {
      url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80"
    },
    status: "published",
    isFeatured: false,
    views: 89
  },
  {
    title: "Unlocking Coffee Flavors: A Tasting & Sensory Guide",
    excerpt: "Learn how professional tasters identify flavor notes, acidity, body, and aroma, and how you can do it at home.",
    content: `
      <h2>The Science of Sensory Evaluation</h2>
      <p>Did you know that coffee has over 800 aromatic compounds? That's more than double the flavor complexity of red wine! Yet, many people only describe coffee as "strong" or "bitter." With a few simple techniques, you can begin unlocking a kaleidoscope of flavors, from bright lemon and sweet honey to deep dark chocolate and warm spices.</p>

      <blockquote>"Tasting coffee is like listening to music. First, you hear the loud instruments (bitterness or sweetness), but as you listen closely, you start hearing the subtle melodies (the hidden notes of berries, flowers, or stone fruits)."</blockquote>

      <h3>The Four Pillars of Coffee Tasting</h3>
      <p>When professional graders (Q-Graders) evaluate coffee, they focus on four distinct characteristics:</p>
      
      <h4>1. Aroma</h4>
      <p>The smell of the freshly ground dry coffee, followed by the wet aroma when hot water is added. Try closing your eyes. Does it smell fruity, nutty, floral, or like roasted grain?</p>

      <h4>2. Acidity</h4>
      <p>Often misunderstood, acidity is a desirable trait in high-quality coffee. It's not stomach acid; it's the pleasant, tongue-tingling brightness that makes coffee refreshing. Think of the bright pop of a ripe orange or the crispness of a green apple.</p>

      <h4>3. Body</h4>
      <p>This is the mouthfeel and weight of the coffee. Does it feel light and clean like tea? Or heavy, creamy, and velvety like whole milk or syrup?</p>

      <h4>4. Flavor Notes</h4>
      <p>The actual flavor profile that lingers on your palate. Professional coffee tasters refer to the <strong>SCA Flavor Wheel</strong> to categorize these:</p>
      <ul>
        <li><strong>Fruity:</strong> Berries, citrus, stone fruits (apricot, peach).</li>
        <li><strong>Sweet:</strong> Caramel, brown sugar, honey, chocolate.</li>
        <li><strong>Floral:</strong> Jasmine, orange blossom, rose.</li>
        <li><strong>Spicy / Nutty:</strong> Cinnamon, clove, hazelnut, almond.</li>
      </ul>

      <h3>How to Practice at Home</h3>
      <p>The best way to train your palate is side-by-side comparison. Brew a cup of a dark roast next to a bright, light-to-medium single-origin Kenyan coffee. Take a spoonful, slurp it vigorously (this vaporizes the coffee across your entire palate), and note the differences. You'll be amazed at how fast your tasting skills grow!</p>
    `,
    category: "Coffee",
    tags: ["tasting", "sensory", "cupping", "flavors"],
    featuredImage: {
      url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80"
    },
    status: "published",
    isFeatured: false,
    views: 215
  }
];

const seedBlogs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for Blog Seeding');

    // Fetch an admin user to assign as author
    const adminUser = await User.findOne({ role: { $in: ['admin', 'super-admin'] } });
    let authorId;
    let authorName = 'System Administrator';

    if (adminUser) {
      authorId = adminUser._id;
      authorName = `${adminUser.firstName} ${adminUser.lastName}`;
      console.log(`👤 Using existing Admin user as author: ${authorName}`);
    } else {
      // Create a dummy admin ID for fallback to maintain data integrity
      authorId = new mongoose.Types.ObjectId();
      console.log(`⚠️ No Admin user found. Generating fallback author ID.`);
    }

    // Clear existing blogs to avoid duplicates
    await Blog.deleteMany({});
    console.log('🗑️  Cleared existing blog posts');

    // Attach author info
    const finalBlogs = sampleBlogs.map(b => ({
      ...b,
      author: authorId,
      authorName: authorName,
      publishedAt: new Date()
    }));

    // Insert sample blogs using a loop to trigger pre-save hooks (for slug generation)
    const createdBlogs = [];
    for (const b of finalBlogs) {
      const created = await Blog.create(b);
      createdBlogs.push(created);
    }
    console.log(`🎉 ${createdBlogs.length} premium Coffee Academy articles seeded successfully!`);

    createdBlogs.forEach(blog => {
      console.log(`   - "${blog.title}" (${blog.category})`);
    });

    console.log('\n🌟 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    process.exit(1);
  }
};

// Run seed script
seedBlogs();
