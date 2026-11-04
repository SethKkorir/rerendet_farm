// utils/brewCardGenerator.js
// High-resolution (1080x1350 4:5 Instagram/WhatsApp portrait) Coffee Recipe Card Generator

export const DEFAULT_BREW_METHODS = [
  {
    id: 'french-press',
    name: 'French Press',
    tagline: 'Rich, full-bodied & comforting',
    icon: '☕',
    ratio: '1:15',
    baseCoffee: 30,
    baseWater: 450,
    grind: 'Coarse',
    grindDesc: 'Texture of coarse sea salt',
    temp: '94°C (201°F)',
    tempDesc: '30s off rolling boil',
    time: '4:00 mins',
    profile: 'Velvety mouthfeel, deep chocolate undertones, low perceived acidity.',
    steps: [
      {
        title: 'Preheat & Dose',
        text: 'Rinse your French press with hot water to preheat the glass, then discard. Add coarsely ground coffee and gently level the bed.'
      },
      {
        title: 'The 30-Second Bloom',
        text: 'Pour 60ml of hot water evenly over the grounds. Watch the coffee bloom as trapped CO₂ escapes, unlocking fresh aromatics. Rest 30 seconds.'
      },
      {
        title: 'Fill & Rest',
        text: 'Slowly pour the remaining water in a circular motion until your target weight is reached. Place the plunger top on to trap heat, but do not plunge.'
      },
      {
        title: 'Break the Crust & Plunge',
        text: 'At the 4:00 minute mark, use a spoon to gently break the crust of grounds floating on top. Slowly press the filter down with light, steady pressure.'
      },
      {
        title: 'Serve Promptly',
        text: 'Decant the entire brew immediately into mugs or a carafe to avoid over-extraction and bitter astringency.'
      }
    ],
    proTip: 'Never plunge with excessive force. If the plunger feels stuck, lift slightly and press down gently again.'
  },
  {
    id: 'pour-over',
    name: 'Pour Over (V60)',
    tagline: 'Bright, sparkling & floral',
    icon: '🫗',
    ratio: '1:16',
    baseCoffee: 18,
    baseWater: 290,
    grind: 'Medium-Fine',
    grindDesc: 'Like fine kosher table salt',
    temp: '92°C - 94°C',
    tempDesc: '45s off rolling boil',
    time: '3:00 - 3:30 mins',
    profile: 'Crisp blackcurrant acidity, jasmine floral notes, translucent golden clarity.',
    steps: [
      {
        title: 'Rinse Filter',
        text: 'Place your paper filter in the cone and rinse thoroughly with hot water to eliminate paper flavor and preheat the dripper. Discard water.'
      },
      {
        title: 'Dose & Well',
        text: 'Add medium-fine ground coffee. Shake gently to level, and create a small shallow thumb indent in the center.'
      },
      {
        title: 'The Bloom',
        text: 'Start your timer. Pour 50g of water starting from the center outward in tight concentric circles. Let bloom undisturbed for 45 seconds.'
      },
      {
        title: 'Continuous Pulsing Pour',
        text: 'Pour steadily in gentle spirals, keeping the water level halfway up the cone until reaching the target weight. Avoid pouring onto the paper walls.'
      },
      {
        title: 'Draw Down',
        text: 'Give the brewer one gentle swirl to ensure a flat coffee bed as the water draws down. Enjoy the sparkling cup at 60°C for peak flavor.'
      }
    ],
    proTip: 'Kenyan highland beans shine brightest in a V60—allow the cup to cool slightly to taste crisp berry notes.'
  },
  {
    id: 'aeropress',
    name: 'AeroPress',
    tagline: 'Bold, sweet & espresso-like',
    icon: '⚡',
    ratio: '1:12',
    baseCoffee: 16,
    baseWater: 195,
    grind: 'Fine-Medium',
    grindDesc: 'Slightly finer than sand',
    temp: '90°C (194°F)',
    tempDesc: 'Gentle temperature for smooth sweetness',
    time: '1:30 mins',
    profile: 'Dense caramel sweetness, clean mouthfeel, highly concentrated finish.',
    steps: [
      {
        title: 'Setup Inverted Method',
        text: 'Insert the plunger 1cm into the chamber and stand it upside down on your counter. Rinse the circular paper filter in the cap.'
      },
      {
        title: 'Add Grounds & Water',
        text: 'Add 16g fine-medium coffee into the chamber. Start the timer and rapidly pour 195g of hot water (90°C) over 15 seconds.'
      },
      {
        title: 'Stir & Cap',
        text: 'Stir vigorously with the paddle for 10 seconds to fully immerse all grounds. Screw the rinsed filter cap on firmly.'
      },
      {
        title: 'Flip & Plunge',
        text: 'At 1:15, carefully flip the AeroPress onto your sturdy mug. Press the plunger steadily for 20-30 seconds until you hear a gentle hiss.'
      }
    ],
    proTip: 'Stop plunging as soon as you hear air hissing to leave bitter residual tannins in the puck.'
  },
  {
    id: 'cold-brew',
    name: 'Highland Cold Brew',
    tagline: 'Ultra-smooth, chocolatey & refreshing',
    icon: '🧊',
    ratio: '1:8',
    baseCoffee: 80,
    baseWater: 640,
    grind: 'Extra Coarse',
    grindDesc: 'Coarse breadcrumbs texture',
    temp: 'Cold / Room Temp',
    tempDesc: 'Filtered chilled spring water',
    time: '16 - 18 hours',
    profile: 'Zero acidity, naturally sweet cocoa nibs, rich molasses and refreshing finish.',
    steps: [
      {
        title: 'Combine in Glass Pitcher',
        text: 'Add 80g of extra-coarsely ground Rerendet beans into a clean glass jar, French press, or cold brew pitcher.'
      },
      {
        title: 'Saturate Evenly',
        text: 'Pour 640ml of cold, filtered water slowly over the grounds. Stir gently with a spoon to ensure every particle is wet.'
      },
      {
        title: 'Chill & Steep',
        text: 'Cover and place in your refrigerator (or a cool dark pantry) for 16 to 18 hours. Avoid exceeding 20 hours to prevent woodiness.'
      },
      {
        title: 'Filter & Serve',
        text: 'Filter the concentrate through a fine mesh or paper filter. Serve over generous ice, optionally diluted 1:1 with water or creamy oat milk.'
      }
    ],
    proTip: 'Store your brewed concentrate in an airtight glass bottle in the fridge for up to 10 days of fresh iced coffee.'
  }
];

export const generateBrewCardBlob = (method, storeName = 'RERENDET COFFEE') => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    // ── 1. Luxury Dark Roast Espresso Gradient Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
    bgGrad.addColorStop(0, '#120A07');
    bgGrad.addColorStop(0.5, '#1E120D');
    bgGrad.addColorStop(1, '#0D0705');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle warm radial glow behind the header
    const radialGlow = ctx.createRadialGradient(540, 200, 50, 540, 200, 450);
    radialGlow.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, 1080, 700);

    // ── 2. Architectural Borders & Golden Accents ──
    // Outer border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1000, 1270);

    // Inner thin border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(52, 52, 976, 1246);

    // Corner decorative diamond marks
    const drawDiamond = (x, y, s = 8) => {
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(40, 40);
    drawDiamond(1040, 40);
    drawDiamond(40, 1310);
    drawDiamond(1040, 1310);

    // ── 3. Brand Header ──
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 18px "Outfit", -apple-system, sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('• HIGHLAND SPECIALTY BREW GUIDE •', 540, 105);

    ctx.fillStyle = '#F5EFEB';
    ctx.font = '700 46px "Outfit", -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(storeName.toUpperCase(), 540, 160);

    ctx.fillStyle = 'rgba(245, 239, 235, 0.65)';
    ctx.font = '500 18px "Outfit", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('1,800m Elevation • Single Origin Kenyan Arabica', 540, 195);

    // Divider line with center emblem
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 225);
    ctx.lineTo(460, 225);
    ctx.moveTo(620, 225);
    ctx.lineTo(940, 225);
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 20px "Outfit", sans-serif';
    ctx.fillText('☕', 540, 232);

    // ── 4. Method Title & Tagline ──
    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 52px "Outfit", -apple-system, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(method.name.toUpperCase(), 540, 305);

    ctx.fillStyle = 'rgba(245, 239, 235, 0.85)';
    ctx.font = 'italic 500 22px "Outfit", sans-serif';
    ctx.fillText(`"${method.tagline}"`, 540, 345);

    // ── 5. Four Key Metric Cards (Ratio, Grind, Temp, Time) ──
    const metrics = [
      { label: 'RATIO', val: method.ratio || '1:15' },
      { label: 'GRIND', val: method.grind || 'Medium' },
      { label: 'WATER TEMP', val: method.temp ? method.temp.split('(')[0].trim() : '94°C' },
      { label: 'BREW TIME', val: method.time || '4:00 mins' }
    ];

    const cardY = 385;
    const cardW = 220;
    const cardH = 92;
    const cardGap = 20;
    const totalW = 4 * cardW + 3 * cardGap;
    const startX = (1080 - totalW) / 2;

    metrics.forEach((m, idx) => {
      const cx = startX + idx * (cardW + cardGap);
      // Card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 12);
      ctx.fill();

      // Card border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
      ctx.font = '700 13px "Outfit", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(m.label, cx + cardW / 2, cardY + 30);

      // Value
      ctx.fillStyle = '#FAF6F0';
      ctx.font = '700 22px "Outfit", sans-serif';
      ctx.letterSpacing = '0px';
      ctx.fillText(m.val, cx + cardW / 2, cardY + 66);
    });

    // ── 6. Step-by-Step Instructions ──
    const stepsY = 520;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 17px "Outfit", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('STEP-BY-STEP CALIBRATION', 90, stepsY);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(90, stepsY + 12);
    ctx.lineTo(990, stepsY + 12);
    ctx.stroke();

    let curY = stepsY + 45;
    const steps = method.steps || [];

    // Helper to wrap text cleanly
    const wrapText = (text, maxWidth) => {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    steps.slice(0, 5).forEach((step, idx) => {
      // Number circle
      ctx.fillStyle = 'rgba(212, 175, 55, 0.15)';
      ctx.beginPath();
      ctx.arc(115, curY + 14, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 16px "Outfit", sans-serif';
      ctx.fillText(`${idx + 1}`, 115, curY + 20);

      // Step title
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FAF6F0';
      ctx.font = '700 19px "Outfit", sans-serif';
      ctx.fillText(step.title, 150, curY + 12);

      // Step text wrapped
      ctx.fillStyle = 'rgba(245, 239, 235, 0.75)';
      ctx.font = '400 16px "Outfit", sans-serif';
      const lines = wrapText(step.text, 830);
      lines.forEach((line, lIdx) => {
        ctx.fillText(line, 150, curY + 36 + lIdx * 22);
      });

      curY += 45 + lines.length * 22 + 10;
    });

    // ── 7. Barista Pro-Tip Banner ──
    const proTipY = 1115;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
    ctx.beginPath();
    ctx.roundRect(85, proTipY, 910, 88, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#D4AF37';
    ctx.font = '700 16px "Outfit", sans-serif';
    ctx.fillText('💡 BARISTA PRO-TIP:', 110, proTipY + 32);

    ctx.fillStyle = '#FAF6F0';
    ctx.font = '500 15px "Outfit", sans-serif';
    const tipLines = wrapText(method.proTip || 'Always grind fresh just before brewing to preserve volatile aromatic compounds.', 860);
    tipLines.forEach((tLine, i) => {
      ctx.fillText(tLine, 110, proTipY + 56 + i * 20);
    });

    // ── 8. Footer Watermark & Origin ──
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
    ctx.font = '700 16px "Outfit", sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('RERENDETCOFFEE.COM', 540, 1260);

    ctx.fillStyle = 'rgba(245, 239, 235, 0.5)';
    ctx.font = '500 14px "Outfit", sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('Ethically Grown • Artisan Roasted • Hand-Selected in Kenya', 540, 1285);

    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
};

export const downloadBrewCard = async (method, storeName = 'Rerendet Coffee') => {
  const blob = await generateBrewCardBlob(method, storeName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = (method.name || 'brew-guide').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.download = `rerendet-${slug}-guide.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const getWhatsAppShareUrl = (method, storeName = 'Rerendet Coffee') => {
  const lines = [
    `☕ *${storeName.toUpperCase()} — ${method.name.toUpperCase()} BREW GUIDE*`,
    `"${method.tagline}"`,
    ``,
    `📏 *Ratio:* ${method.ratio}`,
    `⚙️ *Grind:* ${method.grind} (${method.grindDesc || ''})`,
    `🌡️ *Water Temp:* ${method.temp}`,
    `⏱️ *Time:* ${method.time}`,
    ``,
    `📋 *INSTRUCTIONS:*`,
    ...(method.steps || []).map((s, i) => `${i + 1}. *${s.title}* - ${s.text}`),
    ``,
    `💡 *Pro-Tip:* ${method.proTip}`,
    ``,
    `🌱 Single-origin Arabica from Rerendet Highlands (1,800m ASL).`,
    `🛒 Discover beans at: https://rerendetcoffee.com`
  ];

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n'))}`;
};

export const getSocialCaption = (method, storeName = 'Rerendet Coffee') => {
  const lines = [
    `Master the perfect cup with our ${method.name} Highland Brew Guide ☕✨`,
    ``,
    `Cultivated at 1,800m in the lush highlands of Kenya, our single-origin beans unlock delicate floral aromatics and rich caramel notes when brewed with precision:`,
    ``,
    `📊 The Golden Specs:`,
    `• Ratio: ${method.ratio}`,
    `• Grind: ${method.grind}`,
    `• Temp: ${method.temp}`,
    `• Brew Time: ${method.time}`,
    ``,
    `👨‍🍳 How to Brew:`,
    ...(method.steps || []).map((s, i) => `${i + 1}️⃣ ${s.title}: ${s.text}`),
    ``,
    `💡 Barista Pro-Tip: ${method.proTip}`,
    ``,
    `Taste the difference of true highland craftsmanship. Order freshly roasted beans at rerendetcoffee.com 📦🇰🇪`,
    ``,
    `#RerendetCoffee #KenyanCoffee #SpecialtyCoffee #HomeBarista #${method.name.replace(/[^a-zA-Z]/g, '')} #SingleOrigin #CoffeeLovers #HighlandCoffee #CoffeeBrewing`
  ];

  return lines.join('\n');
};
