// Local Baking Substitutions Database
const SUBSTITUTIONS = {
  "egg": [
    { "name": "Applesauce (unsweetened)", "ratio": 0.25, "unit": "cup", "desc": "Adds moisture; best for cakes, muffins & quick breads" },
    { "name": "Mashed Banana", "ratio": 0.25, "unit": "cup", "desc": "Adds sweetness and banana flavor; great for pancakes & muffins" },
    { "name": "Flaxseed + Water (Flax Egg)", "ratio": 1, "unit": "tbsp flax + 3 tbsp water", "desc": "1 tbsp ground flaxseed + 3 tbsp water; let sit 5 mins before using" },
    { "name": "Mayonnaise", "ratio": 3, "unit": "tbsp", "desc": "3 tbsp per egg; rich binder (do not use for whipped egg white recipes)" },
    { "name": "Yogurt (plain)", "ratio": 0.25, "unit": "cup", "desc": "Keeps baked goods rich and soft" },
    { "name": "Chia Egg", "ratio": 1, "unit": "tbsp chia + 3 tbsp water", "desc": "Nutty texture; let gel 5 mins. Good for dense baked goods" }
  ],
  "eggs": [
    { "name": "Applesauce (unsweetened)", "ratio": 0.25, "unit": "cup", "desc": "Adds moisture; best for cakes, muffins & quick breads" },
    { "name": "Mashed Banana", "ratio": 0.25, "unit": "cup", "desc": "Adds sweetness and banana flavor; great for pancakes & muffins" },
    { "name": "Flaxseed + Water (Flax Egg)", "ratio": 1, "unit": "tbsp flax + 3 tbsp water", "desc": "1 tbsp ground flaxseed + 3 tbsp water; let sit 5 mins before using" },
    { "name": "Mayonnaise", "ratio": 3, "unit": "tbsp", "desc": "3 tbsp per egg; rich binder (do not use for whipped egg white recipes)" },
    { "name": "Yogurt (plain)", "ratio": 0.25, "unit": "cup", "desc": "Keeps baked goods rich and soft" },
    { "name": "Chia Egg", "ratio": 1, "unit": "tbsp chia + 3 tbsp water", "desc": "Nutty texture; let gel 5 mins. Good for dense baked goods" }
  ],
  "butter": [
    { "name": "Vegetable Oil", "ratio": 0.875, "unit": "ratio", "desc": "Use 7/8 cup per cup of butter; use when recipe doesn't require creaming" },
    { "name": "Coconut Oil", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; solid or melted. Adds a faint tropical aroma" },
    { "name": "Vegan Butter / Margarine", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; matches texture and moisture perfectly" },
    { "name": "Applesauce (unsweetened)", "ratio": 0.5, "unit": "ratio", "desc": "Use half the amount; makes it fudgier and reduces fat" },
    { "name": "Greek Yogurt", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; cuts calories, keeps it fluffy and tangy" }
  ],
  "milk": [
    { "name": "Almond Milk", "ratio": 1, "unit": "ratio", "desc": "1:1 dairy-free replacement; light and slightly nutty" },
    { "name": "Oat Milk", "ratio": 1, "unit": "ratio", "desc": "1:1 dairy-free replacement; creamy texture, excellent for baking" },
    { "name": "Soy Milk", "ratio": 1, "unit": "ratio", "desc": "1:1 dairy-free replacement; high protein, bakes similarly to cow's milk" },
    { "name": "Coconut Milk (light)", "ratio": 1, "unit": "ratio", "desc": "1:1 dairy-free replacement; adds a rich coconut flavor" }
  ],
  "whole milk": [
    {
      "name": "Skim / Low-Fat Milk + Melted Butter Mix",
      "desc": "1 cup skim or low-fat milk + 2 tbsp melted butter per cup of whole milk",
      "components": [
        { "name": "skim or low-fat milk", "ratio": 1, "unit": "ratio" },
        { "name": "melted butter", "ratio": 0.125, "unit": "ratio" }
      ]
    }
  ],
  "buttermilk": [
    { "name": "Plain Yogurt (not Greek)", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement for buttermilk" },
    {
      "name": "Milk + Vinegar / Lemon Juice Mix",
      "desc": "1 cup milk + 1 tbsp vinegar or lemon juice. Let sit 10 mins until curdled",
      "components": [
        { "name": "milk (or non-dairy milk)", "ratio": 1, "unit": "ratio" },
        { "name": "vinegar or lemon juice", "ratio": 0.0625, "unit": "ratio" }
      ]
    },
    {
      "name": "Yogurt + Milk",
      "desc": "Mix 3/4 cup plain yogurt with 1/4 cup milk to match consistency",
      "components": [
        { "name": "Yogurt", "ratio": 0.75, "unit": "ratio" },
        { "name": "Milk", "ratio": 0.25, "unit": "ratio" }
      ]
    }
  ],
  "all-purpose flour": [
    { "name": "Whole Wheat Flour", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; creates a denser, nuttier bake (recommend using 50/50)" },
    {
      "name": "Oat Flour",
      "desc": "If you have rolled oats in the pantry, you can make a reliable, high-fiber substitute right in a blender.",
      "components": [
        { "name": "Oat Flour", "ratio": 1, "unit": "cup" },
        { "name": "Cornstarch", "ratio": 1, "unit": "tbsp" }
      ]
    },
    { "name": "Gluten-Free 1:1 Baking Flour", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution. Choose a blend containing xanthan gum" },
    { "name": "Almond Flour", "ratio": 0.75, "unit": "ratio", "desc": "Use 3/4 cup per cup of AP flour; richer, nuttier, and gluten-free" },
    {
      "name": "Almond Flour + Egg",
      "desc": "Almond flour + an egg to make up for the lacks starch and gluten.",
      "components": [
        { "name": "Almond Flour", "ratio": 1, "unit": "cup" },
        { "name": "Egg", "ratio": 1, "unit": "unit" }
      ]
    },
    {
      "name": "Almond & AP Flour Mix",
      "desc": "A mix of almond and AP flour, for a healthier, nuttier version of your recipe.",
      "components": [
        { "name": "All Purpose Flour", "ratio": 0.75, "unit": "ratio" },
        { "name": "Almond Flour", "ratio": 0.25, "unit": "ratio" }
      ]
    }
  ],
  "flour": [
    { "name": "Whole Wheat Flour", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; creates a denser, nuttier bake (recommend using 50/50)" },
    {
      "name": "Oat Flour",
      "desc": "If you have rolled oats in the pantry, you can make a reliable, high-fiber substitute right in a blender.",
      "components": [
        { "name": "Oat Flour", "ratio": 1, "unit": "cup" },
        { "name": "Cornstarch", "ratio": 1, "unit": "tbsp" }
      ]
    },
    { "name": "Gluten-Free 1:1 Baking Flour", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution. Choose a blend containing xanthan gum" },
    { "name": "Almond Flour", "ratio": 0.75, "unit": "ratio", "desc": "Use 3/4 cup per cup of AP flour; richer, nuttier, and gluten-free" },
    {
      "name": "Almond Flour + Egg",
      "desc": "Almond flour + an egg to make up for the lacks starch and gluten.",
      "components": [
        { "name": "Almond Flour", "ratio": 1, "unit": "cup" },
        { "name": "Egg", "ratio": 1, "unit": "unit" }
      ]
    },
    {
      "name": "Almond & AP Flour Mix",
      "desc": "A mix of almond and AP flour, for a healthier, nuttier version of your recipe.",
      "components": [
        { "name": "All Purpose Flour", "ratio": 0.75, "unit": "ratio" },
        { "name": "Almond Flour", "ratio": 0.25, "unit": "ratio" }
      ]
    }
  ],
  "cake flour": [
    {
      "name": "AP Flour + Cornstarch Mix",
      "desc": "1 cup minus 2 tbsp AP flour + 2 tbsp cornstarch per cup of cake flour",
      "components": [
        { "name": "all-purpose flour", "ratio": 0.875, "unit": "ratio" },
        { "name": "cornstarch", "ratio": 0.125, "unit": "ratio" }
      ]
    }
  ],
  "self-rising flour": [
    {
      "name": "AP Flour + Baking Powder + Salt Mix",
      "desc": "1 cup AP flour + 1 1/2 tsp baking powder + 1/4 tsp salt per cup of self-rising flour",
      "components": [
        { "name": "all-purpose flour", "ratio": 1, "unit": "ratio" },
        { "name": "baking powder", "ratio": 0.03125, "unit": "ratio" },
        { "name": "salt", "ratio": 0.0052, "unit": "ratio" }
      ]
    }
  ],
  "baking powder": [
    {
      "name": "Cream of Tartar + Baking Soda Mix",
      "desc": "1/2 tsp cream of tartar + 1/4 tsp baking soda per 1 tsp baking powder",
      "components": [
        { "name": "cream of tartar", "ratio": 0.5, "unit": "ratio" },
        { "name": "baking soda", "ratio": 0.25, "unit": "ratio" }
      ]
    },
    {
      "name": "Baking Soda + Lemon Juice",
      "desc": "1/4 tsp baking soda + 1/2 tsp lemon juice per 1 tsp baking powder",
      "components": [
        { "name": "baking soda", "ratio": 0.25, "unit": "ratio" },
        { "name": "lemon juice", "ratio": 0.5, "unit": "ratio" }
      ]
    }
  ],
  "baking soda": [
    { "name": "Baking Powder", "ratio": 4, "unit": "ratio", "desc": "Use 1 tsp baking powder per 1/4 tsp baking soda (recipe will have a tangier flavor)" },
    { "name": "Potassium Bicarbonate", "ratio": 1, "unit": "ratio", "desc": "1:1 sodium-free substitute for baking soda" }
  ],
  "cream of tartar": [
    { "name": "Lemon Juice", "ratio": 2, "unit": "ratio", "desc": "Use double the amount of lemon juice (1/2 tsp per 1/4 tsp cream of tartar)" }
  ],
  "dutch process cocoa powder": [
    { "name": "Natural Cocoa Powder", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement + replace baking powder in recipe with half the amount of baking soda" }
  ],
  "dutch cocoa": [
    { "name": "Natural Cocoa Powder", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement + replace baking powder in recipe with half the amount of baking soda" }
  ],
  "natural cocoa powder": [
    { "name": "Dutch Process Cocoa Powder", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement + replace baking soda in recipe with twice the amount of baking powder" }
  ],
  "cocoa powder": [
    { "name": "Dutch Process Cocoa Powder", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement + replace baking soda in recipe with twice the amount of baking powder" }
  ],
  "half-and-half": [
    {
      "name": "Whole Milk + Heavy Cream Mix",
      "desc": "1/2 cup whole milk + 1/2 cup heavy cream per cup of half-and-half",
      "components": [
        { "name": "whole milk", "ratio": 0.5, "unit": "ratio" },
        { "name": "heavy cream", "ratio": 0.5, "unit": "ratio" }
      ]
    }
  ],
  "heavy cream": [
    {
      "name": "Whole Milk + Melted Butter Mix",
      "desc": "1 cup whole milk + 1 tbsp melted butter per cup of heavy cream",
      "components": [
        { "name": "whole milk", "ratio": 1, "unit": "ratio" },
        { "name": "melted butter", "ratio": 0.0625, "unit": "ratio" }
      ]
    }
  ],
  "pumpkin pie spice": [
    {
      "name": "Cinnamon + Ginger + Clove + Nutmeg Mix",
      "desc": "1/2 tsp cinnamon + 1/4 tsp ginger + 1/8 tsp clove + 1/8 tsp nutmeg per tsp spice",
      "components": [
        { "name": "ground cinnamon", "ratio": 0.5, "unit": "ratio" },
        { "name": "ground ginger", "ratio": 0.25, "unit": "ratio" },
        { "name": "ground clove", "ratio": 0.125, "unit": "ratio" },
        { "name": "freshly grated nutmeg", "ratio": 0.125, "unit": "ratio" }
      ]
    }
  ],
  "sugar": [
    { "name": "Coconut Sugar", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; warm caramel flavor, less refined" },
    { "name": "Erythritol / Monk Fruit Blend", "ratio": 1, "unit": "ratio", "desc": "1:1 sugar-free alternative; might have a cooling sensation" },
    { "name": "Maple Syrup", "ratio": 0.75, "unit": "ratio", "desc": "Use 3/4 cup per cup of sugar. Reduce other liquids by 3 tbsp" },
    { "name": "Honey", "ratio": 0.75, "unit": "ratio", "desc": "Use 3/4 cup per cup of sugar. Reduce other liquids by 3 tbsp" }
  ],
  "brown sugar": [
    {
      "name": "White Sugar + Molasses Mix",
      "desc": "1 cup white sugar + 1 tbsp molasses per cup of brown sugar",
      "components": [
        { "name": "white granulated sugar", "ratio": 1, "unit": "ratio" },
        { "name": "molasses", "ratio": 0.0625, "unit": "ratio" }
      ]
    },
    { "name": "Coconut Sugar", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution; excellent caramel flavor and brown texture" }
  ],
  "dark brown sugar": [
    {
      "name": "White Sugar + Molasses Mix",
      "desc": "1 cup granulated sugar + 2 tbsp molasses per cup of dark brown sugar",
      "components": [
        { "name": "granulated sugar", "ratio": 1, "unit": "ratio" },
        { "name": "molasses", "ratio": 0.125, "unit": "ratio" }
      ]
    },
    { "name": "Light Brown Sugar", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution" }
  ],
  "light brown sugar": [
    {
      "name": "White Sugar + Molasses Mix",
      "desc": "1 cup granulated sugar + 1 tbsp molasses per cup of light brown sugar",
      "components": [
        { "name": "granulated sugar", "ratio": 1, "unit": "ratio" },
        { "name": "molasses", "ratio": 0.0625, "unit": "ratio" }
      ]
    },
    { "name": "Dark Brown Sugar", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution" }
  ],
  "honey": [
    { "name": "Maple Syrup", "ratio": 1, "unit": "ratio", "desc": "1:1 vegan replacement; earthy and delicious" },
    { "name": "Agave Nectar", "ratio": 1, "unit": "ratio", "desc": "1:1 vegan replacement; neutral sweetness and thin consistency" }
  ],
  "salt": [
    { "name": "Kosher Salt", "ratio": 1.5, "unit": "ratio", "desc": "Use 1.5x the amount (3/4 tsp kosher salt per 1/2 tsp iodized salt)" }
  ],
  "iodized salt": [
    { "name": "Kosher Salt", "ratio": 1.5, "unit": "ratio", "desc": "Use 1.5x the amount (3/4 tsp kosher salt per 1/2 tsp iodized salt)" }
  ],
  "kosher salt": [
    { "name": "Iodized Salt / Table Salt", "ratio": 0.5, "unit": "ratio", "desc": "Use half the amount (1/4 tsp iodized salt per 1/2 tsp kosher salt)" }
  ],
  "semisweet chocolate": [
    {
      "name": "Cocoa Powder + Sugar + Oil/Butter Mix",
      "desc": "3 tbsp cocoa powder + 3 tbsp sugar + 1 tbsp oil/butter per 1 oz chocolate",
      "components": [
        { "name": "cocoa powder", "ratio": 3, "unit": "tbsp" },
        { "name": "granulated sugar", "ratio": 3, "unit": "tbsp" },
        { "name": "vegetable oil or melted butter", "ratio": 1, "unit": "tbsp" }
      ]
    },
    { "name": "Chopped Dark Chocolate", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; melts into delicious puddles in baked goods" }
  ],
  "nuts": [
    { "name": "Pumpkin Seeds (Pepitas)", "ratio": 1, "unit": "ratio", "desc": "1:1 nut-free substitute; great crunch and texture" },
    { "name": "Sunflower Seeds", "ratio": 1, "unit": "ratio", "desc": "1:1 nut-free substitute; mild flavor and good crunch" },
    { "name": "Toasted Rolled Oats", "ratio": 1, "unit": "ratio", "desc": "Provides a warm, chewy texture in cookies & quick breads" }
  ],
  "walnuts": [
    { "name": "Pumpkin Seeds (Pepitas)", "ratio": 1, "unit": "ratio", "desc": "1:1 nut-free substitute; great crunch and texture" },
    { "name": "Sunflower Seeds", "ratio": 1, "unit": "ratio", "desc": "1:1 nut-free substitute; mild flavor and good crunch" },
    { "name": "Pecans", "ratio": 1, "unit": "ratio", "desc": "1:1 nut substitute; rich and buttery" }
  ],
  "chocolate chips": [
    { "name": "Cacao Nibs", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; dark chocolate flavor, sugar-free crunch" },
    { "name": "Chopped Dark Chocolate", "ratio": 1, "unit": "ratio", "desc": "1:1 replacement; melts into delicious puddles in baked goods" },
    { "name": "Carob Chips", "ratio": 1, "unit": "ratio", "desc": "1:1 caffeine-free chocolate alternative" }
  ],
  "vanilla extract": [
    { "name": "Bourbon or Rum", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution; adds rich depth to baked goods" },
    { "name": "Maple Syrup", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution; warm, sweet flavor profile" },
    { "name": "Almond Extract", "ratio": 0.5, "unit": "ratio", "desc": "Use half the amount; potent nutty aroma" }
  ],
  "lemon juice": [
    { "name": "Apple Cider Vinegar", "ratio": 0.5, "unit": "ratio", "desc": "Use half the amount (1/2 tsp per 1 tsp lemon juice)" }
  ],
  "sour cream": [
    { "name": "Plain Yogurt", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution" }
  ],
  "yogurt": [
    { "name": "Sour Cream", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution" }
  ],
  "oil": [
    { "name": "Applesauce (unsweetened)", "ratio": 1, "unit": "ratio", "desc": "1:1 fat substitute; keeps baked goods moist and lower calorie" },
    { "name": "Melted Butter", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution; adds rich flavor and golden color" },
    { "name": "Melted Coconut Oil", "ratio": 1, "unit": "ratio", "desc": "1:1 substitution; great moisture and subtle aroma" }
  ]
};
