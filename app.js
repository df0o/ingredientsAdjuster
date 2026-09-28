// Active State & Storage
let currentScaleFactor = 1.0;
let parsedRecipe = []; // holds list of line objects
let activeSubstitutions = {}; // maps ingredient index to selected substitute index

// WebGPU In-Browser Engine State
let webllmEngine = null;

// UI Element References
const ingredientsInput = document.getElementById('ingredientsInput');
const instructionsInput = document.getElementById('instructionsInput');
const presetBtns = document.querySelectorAll('.preset-btn');
const customScale = document.getElementById('customScale');
const scaleDisplay = document.getElementById('scaleDisplay');
const recipeOutputEmpty = document.getElementById('recipeOutputEmpty');
const recipeOutputContent = document.getElementById('recipeOutputContent');
const ingredientsList = document.getElementById('ingredientsList');
const instructionsWrapper = document.getElementById('instructionsWrapper');
const instructionsText = document.getElementById('instructionsText');
const copyBtn = document.getElementById('copyBtn');
const clearIngredientsBtn = document.getElementById('clearIngredientsBtn');
const clearInstructionsBtn = document.getElementById('clearInstructionsBtn');
const toggleSubstitutes = document.getElementById('toggleSubstitutes');
const ingredientWrapper = document.querySelector('.ingredientWrapper');

// Initialize Event Listeners
ingredientsInput.addEventListener('input', handleRecipeChange);
instructionsInput.addEventListener('input', handleRecipeChange);
customScale.addEventListener('input', handleCustomScaleChange);

if (clearIngredientsBtn) {
  clearIngredientsBtn.addEventListener('click', () => {
    ingredientsInput.value = '';
    handleRecipeChange();
    ingredientsInput.focus();
  });
}

if (clearInstructionsBtn) {
  clearInstructionsBtn.addEventListener('click', () => {
    instructionsInput.value = '';
    handleRecipeChange();
    instructionsInput.focus();
  });
}

if (toggleSubstitutes) {
  toggleSubstitutes.addEventListener('change', () => {
    const wrapper = document.querySelector('.ingredientWrapper');
    if (!wrapper) return;
    if (toggleSubstitutes.checked) {
      wrapper.classList.remove('hide-substitutes');
    } else {
      wrapper.classList.add('hide-substitutes');
      closeAllModals();
    }
  });
}

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const scale = parseFloat(btn.getAttribute('data-scale'));
    currentScaleFactor = scale;
    customScale.value = Math.log2(scale);
    scaleDisplay.textContent = scale % 1 === 0 ? scale.toFixed(1) : scale.toString();

    updateAdjustedRecipe();
  });
});

copyBtn.addEventListener('click', copyRecipeToClipboard);

// Seed initial recipe on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  ingredientsInput.value = `2 1/2 cups all-purpose flour
2 large eggs
3/4 tsp baking soda
1/8 tsp salt
1 cup unsalted butter, softened
3/4 cup packed brown sugar
1 tsp vanilla extract
1/3 cup semi-sweet chocolate chips
1/4 cup chopped nuts`;

  instructionsInput.value = `Preheat oven at 350°F (175°C).
Mix flour, baking soda, salt in medium bowl.
Cream the butter and sugar.
Add eggs one at a time, mixing well after each addition.
Add dry ingredients into wet mixture in three parts.
Stir in chocolate chips and nuts.
Spoon onto baking sheet.
Bake for 10-12 minutes.`;

  handleRecipeChange();
});


// Event Handler: Input text changed
function handleRecipeChange() {
  const ingText = ingredientsInput.value;
  const instText = instructionsInput.value;

  if (!ingText.trim() && !instText.trim()) {
    recipeOutputEmpty.classList.remove('hidden');
    recipeOutputContent.classList.add('hidden');
    parsedRecipe = [];
    activeSubstitutions = {};
    return;
  }

  recipeOutputEmpty.classList.add('hidden');
  recipeOutputContent.classList.remove('hidden');

  parseRecipeText(ingText);
  updateAdjustedRecipe();
}

// Event Handler: Custom slider changed
function handleCustomScaleChange(e) {
  const sliderVal = parseFloat(e.target.value);
  const rawScale = Math.pow(2, sliderVal);
  currentScaleFactor = Math.round(rawScale * 20) / 20 || 0.1;

  const displayStr = (currentScaleFactor % 1 === 0)
    ? currentScaleFactor.toFixed(1)
    : currentScaleFactor.toFixed(2).replace(/\.?0+$/, '');

  scaleDisplay.textContent = displayStr;

  // Deactivate preset button highlights
  presetBtns.forEach(btn => {
    const presetScale = parseFloat(btn.getAttribute('data-scale'));
    if (Math.abs(presetScale - currentScaleFactor) < 0.05) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  updateAdjustedRecipe();
}

// Parser: Converts raw ingredients text into lines and checks for ingredients
function parseRecipeText(text) {
  const lines = text.split('\n');
  parsedRecipe = lines.map((line, index) => {
    return parseIngredientLine(line);
  });
}

// Parses a single ingredient line
function parseIngredientLine(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return { original: line, isIngredient: false, isEmpty: true };
  }

  // Section header or descriptive sub-heading in ingredients list
  if (/^(instructions|directions|steps|method):?$/i.test(trimmed) ||
    (trimmed.endsWith(':') && trimmed.length < 40) ||
    /^(for the|frosting|filling|crust|topping|glaze|dry ingredients|wet ingredients)/i.test(trimmed)) {
    return { original: line, trimmed: trimmed, isIngredient: false, isEmpty: false, isHeader: true };
  }

  // Find all quantity expressions across the line
  const quantities = findAllQuantities(trimmed);

  if (quantities.length > 0) {
    const primary = quantities[0];
    const textAfterPrimary = trimmed.slice(primary.end).trim();
    const { unit, name } = parseUnitAndName(textAfterPrimary);

    // Extract clean name for substitution matching by stripping parentheticals/brackets
    let cleanName = name
      .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanName) {
      cleanName = name.trim();
    }

    const subKey = findSubstitutionKey(cleanName) || cleanName.toLowerCase().trim();

    return {
      original: line,
      trimmed: trimmed,
      isIngredient: true,
      isRange: primary.isRange,
      qty: primary.isRange ? undefined : primary.qty,
      qtyStr: primary.isRange ? undefined : primary.qtyStr,
      qty1: primary.isRange ? primary.qty1 : undefined,
      qty2: primary.isRange ? primary.qty2 : undefined,
      qty1Str: primary.isRange ? primary.qty1Str : undefined,
      qty2Str: primary.isRange ? primary.qty2Str : undefined,
      unit: unit,
      name: cleanName || name,
      fullName: name,
      subKey: subKey,
      quantities: quantities
    };
  }

  // Implicit quantity, e.g. "pinch of salt", "dash of vanilla"
  const implicitUnits = ["pinch", "pinches", "dash", "dashes", "clove", "cloves", "sprig", "sprigs"];
  const words = trimmed.split(/\s+/);
  const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
  if (implicitUnits.includes(firstWord)) {
    const { unit, name } = parseUnitAndName(trimmed);
    const subKey = findSubstitutionKey(name) || name.toLowerCase().trim();
    return {
      original: line,
      trimmed: trimmed,
      isIngredient: true,
      isRange: false,
      qty: 1,
      qtyStr: "1",
      unit: unit,
      name: name,
      subKey: subKey,
      isImplicit: true,
      quantities: [{
        start: 0,
        end: 0,
        raw: "1",
        isRange: false,
        qtyStr: "1",
        qty: 1,
        isImplicit: true
      }]
    };
  }

  // Fallback: Treat as plain text
  return { original: line, isIngredient: false, isEmpty: false };
}

// Helper to detect if a unit string is metric
function isMetricUnit(unitStr) {
  if (!unitStr) return false;
  const clean = unitStr.toLowerCase().replace(/[^a-z]/g, '');
  return ["g", "gram", "grams", "kg", "kilogram", "kilograms", "ml", "milliliter", "milliliters", "l", "liter", "liters", "mg", "milligram", "milligrams"].includes(clean);
}

// Finds all quantity occurrences (ranges and single quantities) in a line string
function findAllQuantities(lineStr) {
  const SINGLE_QTY_PAT = `(?:\\d+\\s+(?:and\\s+)?\\d+/\\d+|\\d+\\s+(?:and\\s+)?\\d+\\.\\d+|\\d+/\\d+|\\d+\\.\\d+|\\d+)`;
  const RANGE_SEP_PAT = `(?:[\\-\\u2013\\u2014]|to|or)`;
  const rangeRegex = new RegExp(`(${SINGLE_QTY_PAT})\\s*(${RANGE_SEP_PAT})\\s*(${SINGLE_QTY_PAT})`, 'gi');
  const singleRegex = new RegExp(SINGLE_QTY_PAT, 'gi');

  const matches = [];
  const occupied = new Array(lineStr.length).fill(false);

  // 1. Find Ranges first (greedy match)
  let m;
  while ((m = rangeRegex.exec(lineStr)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;

    // Check non-quantity suffixes like %, °, °F, °C
    const suffix = lineStr.slice(end, end + 4);
    if (/^\s*[%°]|^°[FC]/i.test(suffix)) continue;

    const textAfter = lineStr.slice(end).trim();
    const unitMatch = textAfter.match(/^([a-z.]+)\b/i);
    const unitStr = unitMatch ? unitMatch[1] : "";
    const isMetric = isMetricUnit(unitStr);

    const rawMatch = m[0];
    const idx1 = rawMatch.indexOf(m[1]);
    const idx3 = rawMatch.lastIndexOf(m[3]);
    const sepStr = rawMatch.slice(idx1 + m[1].length, idx3);

    matches.push({
      start,
      end,
      raw: m[0],
      isRange: true,
      qty1Str: m[1],
      qty2Str: m[3],
      sep: sepStr,
      qty1: parseQtyValue(m[1]),
      qty2: parseQtyValue(m[3]),
      unit: unitStr,
      isMetric: isMetric
    });

    for (let i = start; i < end; i++) occupied[i] = true;
  }

  // 2. Find Single Quantities in remaining unoccupied spans
  while ((m = singleRegex.exec(lineStr)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;

    if (occupied[start]) continue;

    // Check non-quantity suffixes like %, °, °F, °C
    const suffix = lineStr.slice(end, end + 4);
    if (/^\s*[%°]|^°[FC]/i.test(suffix)) continue;

    const textAfter = lineStr.slice(end).trim();
    const unitMatch = textAfter.match(/^([a-z.]+)\b/i);
    const unitStr = unitMatch ? unitMatch[1] : "";
    const isMetric = isMetricUnit(unitStr);

    matches.push({
      start,
      end,
      raw: m[0],
      isRange: false,
      qtyStr: m[0],
      qty: parseQtyValue(m[0]),
      unit: unitStr,
      isMetric: isMetric
    });

    for (let i = start; i < end; i++) occupied[i] = true;
  }

  matches.sort((a, b) => a.start - b.start);
  return matches;
}

// Converts quantities like "1 1/2" or "2 and 1/4" to floats
function parseQtyValue(str) {
  if (!str) return 0;
  str = str.replace(/\band\b/gi, ' ').replace(/\s+/g, ' ').trim();

  if (str.includes(' ')) {
    const parts = str.split(/\s+/);
    const whole = parseFloat(parts[0]) || 0;
    if (parts[1] && parts[1].includes('/')) {
      const fracParts = parts[1].split('/');
      return whole + (parseFloat(fracParts[0]) / parseFloat(fracParts[1]) || 0);
    }
    return whole + (parseFloat(parts[1]) || 0);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    return (parseFloat(parts[0]) / parseFloat(parts[1])) || 0;
  }
  return parseFloat(str) || 0;
}

// Reconstructs scaled HTML for an ingredient line, highlighting all scaled quantities
function buildScaledLineHTML(line, scaleFactor) {
  if (!line.quantities || line.quantities.length === 0) {
    return escapeHtml(line.trimmed || line.original);
  }

  if (line.isImplicit) {
    const scaledQty = line.qty * scaleFactor;
    const isMetric = isMetricUnit(line.unit);
    const qtyText = formatQuantity(scaledQty, isMetric);
    return `<span class="qty-highlight">${escapeHtml(qtyText)}</span> ${line.unit ? escapeHtml(line.unit) + ' ' : ''}${escapeHtml(line.name)}`;
  }

  let resultHTML = "";
  let lastIndex = 0;

  line.quantities.forEach((q) => {
    resultHTML += escapeHtml(line.trimmed.slice(lastIndex, q.start));

    let scaledStr = "";
    if (q.isRange) {
      const s1 = q.qty1 * scaleFactor;
      const s2 = q.qty2 * scaleFactor;
      const f1 = formatQuantity(s1, q.isMetric);
      const f2 = formatQuantity(s2, q.isMetric);
      scaledStr = `${f1} to ${f2}`;
    } else {
      const s = q.qty * scaleFactor;
      scaledStr = formatQuantity(s, q.isMetric);
    }

    resultHTML += `<span class="qty-highlight">${escapeHtml(scaledStr)}</span>`;
    lastIndex = q.end;
  });

  resultHTML += escapeHtml(line.trimmed.slice(lastIndex));
  return resultHTML;
}

// Reconstructs scaled plain text for copying to clipboard
function buildScaledLineText(line, scaleFactor) {
  if (!line.quantities || line.quantities.length === 0) {
    return line.trimmed || line.original;
  }

  if (line.isImplicit) {
    const scaledQty = line.qty * scaleFactor;
    const isMetric = isMetricUnit(line.unit);
    const qtyText = formatQuantity(scaledQty, isMetric);
    return `${qtyText} ${line.unit ? line.unit + ' ' : ''}${line.name}`;
  }

  let resultText = "";
  let lastIndex = 0;

  line.quantities.forEach((q) => {
    resultText += line.trimmed.slice(lastIndex, q.start);

    let scaledStr = "";
    if (q.isRange) {
      const s1 = q.qty1 * scaleFactor;
      const s2 = q.qty2 * scaleFactor;
      const f1 = formatQuantity(s1, q.isMetric);
      const f2 = formatQuantity(s2, q.isMetric);
      scaledStr = `${f1} to ${f2}`;
    } else {
      const s = q.qty * scaleFactor;
      scaledStr = formatQuantity(s, q.isMetric);
    }

    resultText += scaledStr;
    lastIndex = q.end;
  });

  resultText += line.trimmed.slice(lastIndex);
  return resultText;
}


// Helper to separate unit and ingredient name
function parseUnitAndName(rest) {
  rest = rest.trim();
  const units = [
    "cups", "cup", "c.",
    "teaspoons", "teaspoon", "tsps", "tsp", "tsp.", "t.",
    "tablespoons", "tablespoon", "tbsps", "tbsp", "tbsp.", "tbs.", "T.", "T",
    "grams", "gram", "g",
    "kilograms", "kilogram", "kg",
    "milliliters", "milliliter", "ml", "mL",
    "ounces", "ounce", "oz", "oz.",
    "pounds", "pound", "lbs", "lb", "lb.",
    "pinches", "pinch", "dashes", "dash",
    "cans", "can", "tins", "tin",
    "packages", "package", "pkgs", "pkg", "pkg.",
    "pieces", "piece", "slices", "slice",
    "cloves", "clove", "sprigs", "sprig",
    "large", "medium", "small", "head", "heads"
  ];

  const words = rest.split(/\s+/);
  if (words.length > 0) {
    const cleanFirstWord = words[0].toLowerCase().replace(/[^a-z.]/g, '');
    const cleanNoDot = cleanFirstWord.replace(/\.$/, '');

    if (units.includes(cleanFirstWord) || units.includes(cleanNoDot)) {
      let unit = words[0];
      let nameStartIdx = 1;

      if (words.length > 1 && words[1].toLowerCase() === 'of') {
        nameStartIdx = 2;
      }

      const name = words.slice(nameStartIdx).join(' ');
      return { unit, name };
    }
  }

  return { unit: "", name: rest };
}

// Find substitution key by sorting keys by length descending (greedy matching + descriptor stripping)
function findSubstitutionKey(name) {
  if (!SUBSTITUTIONS) return null;
  const cleanName = name.toLowerCase().trim();
  const keys = Object.keys(SUBSTITUTIONS).sort((a, b) => b.length - a.length);

  // 1. Direct word-boundary match against keys
  for (const key of keys) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(cleanName)) {
      return key;
    }
  }

  // 2. Strip common preparation adjectives (chopped, unsalted, melted, softened, etc.)
  const simplified = cleanName
    .replace(/\b(chopped|sliced|diced|minced|melted|softened|unsalted|salted|packed|raw|fresh|ground|semi-sweet|dark|white|granulated|powdered|active|instant|large|medium|small)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (simplified && simplified !== cleanName) {
    for (const key of keys) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(simplified)) {
        return key;
      }
    }
  }

  return null;
}

// Formats decimal numbers back to neat baking fractions with "and" or clean decimals
function formatQuantity(val, isMetric = false) {
  if (!val && val !== 0) return "";
  if (val === 0) return "0";

  if (isMetric) {
    if (Math.abs(val - Math.round(val)) < 0.001) {
      return Math.round(val).toString();
    }
    // Clean decimal formatting for metric units (e.g. 3.5, 12.25)
    return val.toFixed(2).replace(/\.?0+$/, '');
  }

  const tolerance = 0.025;
  const whole = Math.floor(val);
  const frac = val - whole;

  if (frac < tolerance) {
    return whole > 0 ? whole.toString() : "";
  }
  if (Math.abs(frac - 0.125) < tolerance) {
    return whole > 0 ? `${whole} and 1/8` : "1/8";
  }
  if (Math.abs(frac - 0.25) < tolerance) {
    return whole > 0 ? `${whole} and 1/4` : "1/4";
  }
  if (Math.abs(frac - 0.333) < tolerance) {
    return whole > 0 ? `${whole} and 1/3` : "1/3";
  }
  if (Math.abs(frac - 0.375) < tolerance) {
    return whole > 0 ? `${whole} and 3/8` : "3/8";
  }
  if (Math.abs(frac - 0.5) < tolerance) {
    return whole > 0 ? `${whole} and 1/2` : "1/2";
  }
  if (Math.abs(frac - 0.625) < tolerance) {
    return whole > 0 ? `${whole} and 5/8` : "5/8";
  }
  if (Math.abs(frac - 0.666) < tolerance) {
    return whole > 0 ? `${whole} and 2/3` : "2/3";
  }
  if (Math.abs(frac - 0.75) < tolerance) {
    return whole > 0 ? `${whole} and 3/4` : "3/4";
  }
  if (Math.abs(frac - 0.875) < tolerance) {
    return whole > 0 ? `${whole} and 7/8` : "7/8";
  }

  // For numbers like 1.1 or 0.15, display as clean decimal
  return val.toFixed(2).replace(/\.?0+$/, '');
}

// Helper to format a substitution (single or mix) for display and clipboard
function getSubstitutionDetails(line, sub, scaleFactor) {
  if (sub.components && sub.components.length > 0) {
    const componentsList = sub.components.map(comp => {
      let compQtyText = "";
      let compUnitText = (comp.unit === "ratio" || !comp.unit) ? line.unit : comp.unit;
      const compIsMetric = isMetricUnit(compUnitText);

      if (line.isRange) {
        const scaled1 = line.qty1 * scaleFactor * comp.ratio;
        const scaled2 = line.qty2 * scaleFactor * comp.ratio;
        compQtyText = `${formatQuantity(scaled1, compIsMetric)} to ${formatQuantity(scaled2, compIsMetric)}`;
      } else {
        const scaled = line.qty * scaleFactor * comp.ratio;
        compQtyText = formatQuantity(scaled, compIsMetric);
      }

      return {
        qtyText: compQtyText,
        unitText: compUnitText,
        name: comp.name
      };
    });

    let origQtyText = "";
    const lineIsMetric = isMetricUnit(line.unit);
    if (line.isRange) {
      origQtyText = `${formatQuantity(line.qty1 * scaleFactor, lineIsMetric)} to ${formatQuantity(line.qty2 * scaleFactor, lineIsMetric)}`;
    } else {
      origQtyText = formatQuantity(line.qty * scaleFactor, lineIsMetric);
    }

    return {
      isMix: true,
      mixName: sub.name,
      originalQtyStr: origQtyText,
      originalUnit: line.unit,
      originalName: line.name,
      components: componentsList
    };
  } else {
    let qtyText = "";
    let unitText = sub.unit === "ratio" ? line.unit : sub.unit;
    const subIsMetric = isMetricUnit(unitText);

    if (line.isRange) {
      const scaled1 = line.qty1 * scaleFactor * sub.ratio;
      const scaled2 = line.qty2 * scaleFactor * sub.ratio;
      qtyText = `${formatQuantity(scaled1, subIsMetric)} to ${formatQuantity(scaled2, subIsMetric)}`;
    } else {
      const scaled = line.qty * scaleFactor * sub.ratio;
      qtyText = formatQuantity(scaled, subIsMetric);
    }

    return {
      isMix: false,
      name: sub.name,
      qtyText: qtyText,
      unitText: unitText,
      originalName: line.name
    };
  }
}

// Helper to extract known ingredient keywords from parsed ingredients
function getKnownIngredientWords(ingredients) {
  const words = new Set();
  if (!ingredients) return words;
  ingredients.forEach(ing => {
    if (!ing.isIngredient || !ing.name) return;
    const clean = ing.name.toLowerCase().replace(/[^a-z\s]/g, ' ');
    clean.split(/\s+/).forEach(w => {
      if (w.length >= 3 && !['and', 'the', 'for', 'with', 'into', 'part', 'parts', 'room', 'temperature', 'cut', 'bowl'].includes(w)) {
        words.add(w);
      }
    });
  });
  return words;
}

// Adjusts an instruction line by scaling ingredient amounts while keeping times, temperatures, step numbers, and pan sizes intact
function adjustInstructionLine(line, scaleFactor, knownWords = new Set()) {
  const trimmed = line.trim();
  if (!trimmed) {
    return { html: "", text: "", isEmpty: true };
  }

  const quantities = findAllQuantities(trimmed);
  if (quantities.length === 0) {
    return { html: escapeHtml(trimmed), text: trimmed, isEmpty: false };
  }

  const INGREDIENT_UNITS_REGEX = /^\s*(?:cups?|c\.|teaspoons?|tsps?|tsp\.|tablespoons?|tbsps?|tbsp\.|tbs\.|grams?|g\b|kilograms?|kg\b|milliliters?|ml\b|ounces?|oz\.|oz\b|pounds?|lbs?|lb\.|pinches?|pinch|dashes?|dash|cans?|packages?|pkgs?|pkg\.|slices?|sticks?|cloves?|sprigs?|pieces?|quarts?|qt\.|pints?|pt\.)\b/i;
  const TIME_REGEX = /^\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i;
  const TEMP_REGEX = /^\s*(?:°\s*[FC]?|deg(?:ree)?s?\s*(?:[FC]|fahrenheit|celsius)?|gas\s*mark)/i;
  const DIMENSION_REGEX = /^\s*(?:inches|inch|in\b|cm\b|mm\b|["\u201d]|x\s*\d+|-inch|-cm)\b/i;
  const STEP_PREFIX_REGEX = /(?:^|\s)step\s*#?$/i;
  const SETTING_PREFIX_REGEX = /(?:speed|level|setting|power|number|#)\s*$/i;

  let htmlResult = "";
  let textResult = "";
  let lastIndex = 0;

  quantities.forEach(q => {
    const beforeText = trimmed.slice(lastIndex, q.start);
    htmlResult += escapeHtml(beforeText);
    textResult += beforeText;

    const afterSlice = trimmed.slice(q.end, q.end + 25);
    const beforeSlice = trimmed.slice(0, q.start);

    // Is it a step number at start of line? e.g. "1. ", "2) ", "1 - "
    const isStepNumber = (q.start === 0 || beforeSlice.trim() === "") &&
      /^[.)\s:\-]/.test(trimmed.slice(q.end));

    const isStepNamed = STEP_PREFIX_REGEX.test(beforeSlice);
    const isSetting = SETTING_PREFIX_REGEX.test(beforeSlice);
    const isTime = TIME_REGEX.test(afterSlice);
    const isTemp = TEMP_REGEX.test(afterSlice) || /gas\s*mark\s*$/i.test(beforeSlice);
    const isDimension = DIMENSION_REGEX.test(afterSlice) || /\d+\s*x\s*$/i.test(beforeSlice);

    // Is it followed by an ingredient unit?
    const hasIngredientUnit = INGREDIENT_UNITS_REGEX.test(afterSlice);

    // Is it followed by a known ingredient keyword from the ingredients list?
    let hasKnownIngredient = false;
    if (!hasIngredientUnit && knownWords.size > 0) {
      const wordsAfter = afterSlice.toLowerCase().replace(/[^a-z\s]/g, ' ').trim().split(/\s+/);
      for (let i = 0; i < Math.min(wordsAfter.length, 3); i++) {
        if (knownWords.has(wordsAfter[i])) {
          hasKnownIngredient = true;
          break;
        }
      }
    }

    const shouldScale = !isStepNumber && !isStepNamed && !isSetting && !isTime && !isTemp && !isDimension &&
      (hasIngredientUnit || hasKnownIngredient);

    if (shouldScale) {
      let scaledStr = "";
      if (q.isRange) {
        const s1 = q.qty1 * scaleFactor;
        const s2 = q.qty2 * scaleFactor;
        scaledStr = `${formatQuantity(s1, q.isMetric)} to ${formatQuantity(s2, q.isMetric)}`;
      } else {
        const s = q.qty * scaleFactor;
        scaledStr = formatQuantity(s, q.isMetric);
      }
      htmlResult += `<span class="qty-highlight">${escapeHtml(scaledStr)}</span>`;
      textResult += scaledStr;
    } else {
      const rawText = trimmed.slice(q.start, q.end);
      htmlResult += escapeHtml(rawText);
      textResult += rawText;
    }

    lastIndex = q.end;
  });

  const trailingText = trimmed.slice(lastIndex);
  htmlResult += escapeHtml(trailingText);
  textResult += trailingText;

  return { html: htmlResult, text: textResult, isEmpty: false };
}

// Renders the adjusted recipe in the UI
function updateAdjustedRecipe() {
  ingredientsList.innerHTML = '';
  instructionsText.innerHTML = '';

  const hasIngredients = parsedRecipe && parsedRecipe.some(line => !line.isEmpty);
  const instructionsVal = instructionsInput ? instructionsInput.value.trim() : "";
  const hasInstructions = instructionsVal.length > 0;

  if (!hasIngredients && !hasInstructions) {
    recipeOutputEmpty.classList.remove('hidden');
    recipeOutputContent.classList.add('hidden');
    return;
  }

  recipeOutputEmpty.classList.add('hidden');
  recipeOutputContent.classList.remove('hidden');

  // 1. Render Ingredients
  const ingredientWrapper = document.querySelector('.ingredientWrapper');
  if (hasIngredients) {
    if (ingredientWrapper) ingredientWrapper.classList.remove('hidden');

    parsedRecipe.forEach((line, index) => {
      if (line.isEmpty) return;

      if (line.isHeader) {
        const headerLi = document.createElement('li');
        headerLi.className = 'ingredient-section-header';
        headerLi.textContent = line.original;
        ingredientsList.appendChild(headerLi);
        return;
      }

      if (!line.isIngredient) {
        const plainLi = document.createElement('li');
        plainLi.className = 'ingredient-item';
        plainLi.textContent = line.original;
        ingredientsList.appendChild(plainLi);
        return;
      }

      const li = document.createElement('li');
      li.className = 'ingredient-item';

      const selectedSubIdx = activeSubstitutions[index];
      const hasSubActive = selectedSubIdx !== undefined && selectedSubIdx !== null;
      const availableSubs = SUBSTITUTIONS[line.subKey];
      const sub = (hasSubActive && availableSubs) ? availableSubs[selectedSubIdx] : null;

      if (sub) {
        const details = getSubstitutionDetails(line, sub, currentScaleFactor);

        if (details.isMix) {
          // Render mix substitution
          li.classList.add('is-mix-item');
          const rowDiv = document.createElement('div');
          rowDiv.className = 'ingredient-row mix-ingredient-row';

          const mixContent = document.createElement('div');
          mixContent.className = 'mix-content';

          const headerDiv = document.createElement('div');
          headerDiv.className = 'mix-header';
          headerDiv.innerHTML = `<span class="mix-name">${escapeHtml(details.mixName)}</span> <span class="sub-for-text">(substitute for ${details.originalQtyStr ? escapeHtml(details.originalQtyStr) + ' ' : ''}${details.originalUnit ? escapeHtml(details.originalUnit) + ' ' : ''}${escapeHtml(details.originalName)})</span>:`;

          const compUl = document.createElement('ul');
          compUl.className = 'mix-components-list';

          details.components.forEach(c => {
            const compLi = document.createElement('li');
            compLi.className = 'mix-component-item';
            compLi.innerHTML = `<span class="qty-highlight">${escapeHtml(c.qtyText)}</span> ${c.unitText ? escapeHtml(c.unitText) + ' ' : ''}${escapeHtml(c.name)}`;
            compUl.appendChild(compLi);
          });

          mixContent.appendChild(headerDiv);
          mixContent.appendChild(compUl);
          rowDiv.appendChild(mixContent);

          // Sub Button
          const subBadgeContainer = document.createElement('div');
          subBadgeContainer.className = 'sub-badge-container';
          subBadgeContainer.dataset.ingredientIndex = index;

          const subBtn = document.createElement('button');
          subBtn.type = 'button';
          subBtn.className = 'sub-toggle-btn active';
          subBtn.innerHTML = `🍀 ${escapeHtml(sub.name)}`;
          subBtn.title = `Substituting for ${line.name}`;

          subBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = subBtn.classList.contains('modal-open');
            closeAllModals();
            if (!isOpen) {
              subBtn.classList.add('modal-open');
              showSubstituteModal(index, subBadgeContainer, line, selectedSubIdx);
            }
          });

          subBadgeContainer.appendChild(subBtn);
          rowDiv.appendChild(subBadgeContainer);
          li.appendChild(rowDiv);

        } else {
          // Render single substitution
          const rowDiv = document.createElement('div');
          rowDiv.className = 'ingredient-row';

          const textSpan = document.createElement('span');
          textSpan.className = 'ingredient-text';
          textSpan.innerHTML = `<span class="qty-highlight">${escapeHtml(details.qtyText)}</span> ${details.unitText ? escapeHtml(details.unitText) + ' ' : ''}${escapeHtml(details.name)} <span class="sub-for-text">(substitute for ${escapeHtml(line.name)})</span>`;

          rowDiv.appendChild(textSpan);

          const subBadgeContainer = document.createElement('div');
          subBadgeContainer.className = 'sub-badge-container';
          subBadgeContainer.dataset.ingredientIndex = index;

          const subBtn = document.createElement('button');
          subBtn.type = 'button';
          subBtn.className = 'sub-toggle-btn active';
          subBtn.innerHTML = `🍀 ${escapeHtml(sub.name)}`;
          subBtn.title = `Substituting for ${line.name}`;

          subBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = subBtn.classList.contains('modal-open');
            closeAllModals();
            if (!isOpen) {
              subBtn.classList.add('modal-open');
              showSubstituteModal(index, subBadgeContainer, line, selectedSubIdx);
            }
          });

          subBadgeContainer.appendChild(subBtn);
          rowDiv.appendChild(subBadgeContainer);
          li.appendChild(rowDiv);
        }
      } else {
        // Original ingredient without substitution
        const rowDiv = document.createElement('div');
        rowDiv.className = 'ingredient-row';

        const textSpan = document.createElement('span');
        textSpan.className = 'ingredient-text';
        textSpan.innerHTML = buildScaledLineHTML(line, currentScaleFactor);
        rowDiv.appendChild(textSpan);

        const subBadgeContainer = document.createElement('div');
        subBadgeContainer.className = 'sub-badge-container';
        subBadgeContainer.dataset.ingredientIndex = index;

        const subBtn = document.createElement('button');
        subBtn.type = 'button';
        subBtn.className = 'sub-toggle-btn';

        const hasLocalSubs = availableSubs && availableSubs.length > 0;
        subBtn.innerHTML = hasLocalSubs ? `🍀 Substitute` : `✨ AI Substitute`;
        subBtn.title = hasLocalSubs ? "View substitution options" : "Generate dynamic AI substitutes for this ingredient";

        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = subBtn.classList.contains('modal-open');
          closeAllModals();
          if (!isOpen) {
            subBtn.classList.add('modal-open');
            showSubstituteModal(index, subBadgeContainer, line, selectedSubIdx);
          }
        });

        subBadgeContainer.appendChild(subBtn);
        rowDiv.appendChild(subBadgeContainer);

        li.appendChild(rowDiv);
      }

      ingredientsList.appendChild(li);
    });
  } else {
    if (ingredientWrapper) ingredientWrapper.classList.add('hidden');
  }

  // 2. Render Instructions with properly scaled ingredient measurements
  if (hasInstructions) {
    instructionsWrapper.classList.remove('hidden');
    const knownWords = getKnownIngredientWords(parsedRecipe);
    const instructionLines = instructionsInput.value.split('\n');

    let renderedHTML = '';
    instructionLines.forEach(line => {
      const adjusted = adjustInstructionLine(line, currentScaleFactor, knownWords);
      if (!adjusted.isEmpty) {
        renderedHTML += `<p>${adjusted.html}</p>`;
      }
    });

    instructionsText.innerHTML = renderedHTML || '<p class="empty-instructions">No instructions entered.</p>';
  } else {
    instructionsWrapper.classList.add('hidden');
  }
}
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Utility: Robust JSON Sanitizer and Parser for AI Outputs
function cleanAndParseJSON(rawText) {
  let cleaned = (rawText || "").trim();

  // 1. Strip markdown code fences if present (e.g. ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Extract content between first '[' and last ']'
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }

  // 3. Fix trailing commas before closing braces/brackets (e.g. {"a": 1,} -> {"a": 1})
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned);
  } catch (primaryErr) {
    console.warn("Standard JSON parse failed, trying regex object extraction:", primaryErr.message, "Raw:", rawText);

    // Fallback: extract individual JSON objects using regex
    const objectMatches = rawText.match(/\{[\s\S]*?\}/g);
    if (objectMatches && objectMatches.length > 0) {
      const parsedItems = [];
      for (const objStr of objectMatches) {
        try {
          const fixedObj = objStr.replace(/,\s*}/g, '}');
          parsedItems.push(JSON.parse(fixedObj));
        } catch (e) {
          // ignore malformed object
        }
      }
      if (parsedItems.length > 0) return parsedItems;
    }

    throw primaryErr;
  }
}

// WebGPU AI Generator Function
async function generateAISubstitutions(ingredientName, onStatusUpdate) {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser. Please use a modern WebGPU-enabled browser like Chrome, Edge, or Firefox Nightly.");
  }

  if (!webllmEngine) {
    if (onStatusUpdate) onStatusUpdate("Checking WebGPU capabilities...");
    const webllm = await import("https://esm.run/@mlc-ai/web-llm");

    // Detect if browser/GPU supports float16 shaders (shader-f16)
    let hasF16 = false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      hasF16 = adapter && adapter.features && adapter.features.has("shader-f16");
    } catch (e) {
      console.warn("Could not check WebGPU adapter features:", e);
    }

    // Fall back to lightweight and 32-bit quantized models (q4f32_1) if shader-f16 is missing or fails,
    // prioritizing smaller models (0.5B / 1B) first to prevent browser QuotaExceededError.
    console.log("hasF16 ? ", hasF16);

    const candidateModels = hasF16
      ? ["gemma3-1b-it-q4f16_1-MLC", "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", "SmolLM2-360M-Instruct-q4f32_1-MLC", "gemma-2-2b-it-q4f16_1-MLC", "gemma-2-2b-it-q4f32_1-MLC"]
      : ["Qwen2.5-0.5B-Instruct-q4f32_1-MLC", "SmolLM2-360M-Instruct-q4f32_1-MLC", "gemma-2-2b-it-q4f32_1-MLC"];

    // Override sliding_window_size to -1 to resolve WindowSizeConfigurationError
    // when both context_window_size and sliding_window_size are positive in prebuilt configs.
    const prebuiltList = webllm.prebuiltAppConfig?.model_list || [];
    const appConfig = {
      ...(webllm.prebuiltAppConfig || {}),
      model_list: prebuiltList.map((m) => ({
        ...m,
        overrides: {
          ...(m.overrides || {}),
          sliding_window_size: -1
        }
      }))
    };

    // Filter candidate models against available model records in appConfig to prevent ModelNotFoundError
    const availableModelIds = new Set(appConfig.model_list.map((m) => m.model_id));
    const modelsToTry = candidateModels.filter((id) => availableModelIds.has(id));

    let lastErr = null;
    for (const selectedModel of modelsToTry) {
      try {
        if (onStatusUpdate) onStatusUpdate(`Initializing AI model (${selectedModel})...`);
        webllmEngine = await webllm.CreateMLCEngine(selectedModel, {
          initProgressCallback: (report) => {
            if (onStatusUpdate) onStatusUpdate(report.text);
          },
          appConfig
        });
        lastErr = null;
        console.log(`✅ Successfully initialized WebGPU model ${selectedModel}`);
        break; // Successfully initialized
      } catch (err) {
        console.warn(`Failed to initialize WebGPU model ${selectedModel}:`, err);
        lastErr = err;
        webllmEngine = null;

        // Handle QuotaExceededError by clearing stale WebLLM caches so subsequent model downloads have space
        const isQuota = err && (
          err.name === 'QuotaExceededError' ||
          (err.message && (err.message.includes('QuotaExceededError') || err.message.includes('Quota exceeded') || err.message.includes('quota')))
        );

        if (isQuota && 'caches' in window) {
          try {
            if (onStatusUpdate) onStatusUpdate("Storage quota exceeded. Clearing stale model caches...");
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
              if (name.includes('webllm') || name.includes('mlc') || name.includes('model')) {
                await caches.delete(name);
              }
            }
          } catch (cleanErr) {
            console.warn("Failed to clear webllm caches after quota error:", cleanErr);
          }
        }
      }
    }

    if (!webllmEngine) {
      const isQuota = lastErr && (
        lastErr.name === 'QuotaExceededError' ||
        (lastErr.message && (lastErr.message.includes('QuotaExceededError') || lastErr.message.includes('Quota exceeded') || lastErr.message.includes('quota')))
      );
      if (isQuota) {
        throw new Error("Browser storage quota exceeded. Please clear site cache/storage data or free up disk space to download AI model weights.");
      }
      throw new Error(`WebGPU Shader Error: ${lastErr ? lastErr.message : "Unable to initialize AI model."}`);
    }
  }

  if (onStatusUpdate) onStatusUpdate(`Thinking of baking substitutes for "${ingredientName}"...`);

  const ingredientKey = ingredientName.toLowerCase().trim();
  const existingList = (SUBSTITUTIONS[ingredientKey] || []).map(s => s.name);
  const existingStr = existingList.length > 0 ? existingList.join(", ") : "None";

  const ingredientLines = (parsedRecipe && parsedRecipe.length > 0)
    ? parsedRecipe.filter(l => l.isIngredient).map(l => l.original.trim())
    : (ingredientsInput && ingredientsInput.value.trim()
      ? ingredientsInput.value.split('\n').map(l => parseIngredientLine(l)).filter(l => l.isIngredient).map(l => l.original.trim())
      : []);

  const ingredientsContext = ingredientLines.length > 0
    ? ingredientLines.join(", ").slice(0, 500)
    : "General baking/cooking recipe";

  const systemPrompt = `You are an expert chef and baker assistant.
Your task is to provide accurate cooking and baking substitutions in strict JSON format only. Do not include markdown code blocks, backticks, or any conversational text outside the JSON array.`;

  const prompt = `
### Instructions:
1. Provide up to 3 realistic, high-quality substitutes for "${ingredientName}".
2. Prioritize functional equivalents (e.g., binding, leavening, moisture, acidity, structure).
3. Exclude any substitutes that match this list: ${existingStr}.
4. If no safe or functional substitute exists, return [{ "name": "No substitute found", "ratio": 0, "unit": "ratio", "desc": "No substitute found", "isAI": "true" }].

Use the original recipe's ingredient list as context to determine what the best substitute for "${ingredientName}" is. The original recipe's ingredient list is as follows: ${ingredientsContext}. 

### Output Constraints:
- Return ONLY a raw JSON array of objects. 
- Do NOT use Markdown code fences.
- Do NOT include introductory text, explanations, or conclusions.

### Schema Requirements:
Each object in the array must strictly match ONE of these structure types:

1. Single Ingredient Substitute:
[
  {
    "name": "Substitute Name",
    "ratio": <number: multiplier relative to original amount, e.g. 1 for 1:1, 0.5 for half amount>,
    "unit": "<string: use 'ratio' for proportional scaling, or explicit unit like 'cup', 'tbsp', 'tsp'>",
    "desc": "<string: short 1-sentence tip on texture/flavor impact and any required prep like softened, melted, or gelled>"
  }
]

2. Multi-Component Combination Mix Substitute:
[
  {
    "name": "Mix Name (e.g. AP Flour + Cornstarch Mix)",
    "desc": "<string: short 1-sentence tip on texture/flavor impact and any required prep like softened, melted, or gelled>",
    "components": [
      { "name": "Component 1 Name", "ratio": <number: use 'ratio' for proportional scaling, or explicit unit like 'cup', 'tbsp', 'tsp'>, "unit": "<string: use 'ratio' for proportional scaling, or explicit unit like 'cup', 'tbsp', 'tsp'>" },
      { "name": "Component 2 Name", "ratio": <number: use 'ratio' for proportional scaling, or explicit unit like 'cup', 'tbsp', 'tsp'>, "unit": "<string: use 'ratio' for proportional scaling, or explicit unit like 'cup', 'tbsp', 'tsp'>" }
    ]
  }
]

Respond ONLY with the raw valid JSON array.`;

  console.log("Hello there curious developers, here's the exact prompt:");
  console.log(systemPrompt + "\n" + prompt);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt }
  ];

  const reply = await webllmEngine.chat.completions.create({
    messages: messages,
    temperature: 0.3,
  });

  const content = reply.choices[0].message.content.trim();
  let parsedSubs = [];
  console.log("AI JSON response:", content);

  const key = ingredientName.toLowerCase().trim();
  const existing = SUBSTITUTIONS[key] || [];

  try {
    parsedSubs = cleanAndParseJSON(content);
    if (!Array.isArray(parsedSubs)) {
      parsedSubs = [parsedSubs];
    }
  } catch (parseErr) {
    console.error("Failed to parse AI JSON response:", parseErr, "Raw output:", content);
    throw new Error("AI response format error. Please try generating again.");
  }

  parsedSubs = parsedSubs.map(item => ({
    ...item,
    isAI: true
  }));

  SUBSTITUTIONS[key] = [...parsedSubs, ...existing];
  return parsedSubs;
}


// Renders the substitution popover modal near the clicked button
function showSubstituteModal(index, container, line, selectedSubIdx) {
  const modal = document.createElement('div');
  modal.className = 'substitute-modal';

  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const subKey = line.subKey;
  const availableSubs = SUBSTITUTIONS[subKey] || [];

  const title = document.createElement('div');
  title.className = 'sub-modal-title';
  title.textContent = availableSubs.length > 0 ? 'Select Substitute' : 'AI Substitute Generator';
  modal.appendChild(title);

  const list = document.createElement('div');
  list.className = 'sub-modal-list';

  // 1. "No Substitution" option to revert
  const noSubItem = document.createElement('div');
  noSubItem.className = 'sub-modal-item';
  if (selectedSubIdx === undefined || selectedSubIdx === null) {
    noSubItem.classList.add('selected');
  }
  noSubItem.innerHTML = `
    <div class="sub-modal-item-header">
      <span class="sub-modal-item-name">No Substitution</span>
      <span class="sub-modal-item-ratio">Original</span>
    </div>
    <div class="sub-modal-item-desc">Use original ingredient (${escapeHtml(line.name)})</div>
  `;
  noSubItem.addEventListener('click', () => {
    delete activeSubstitutions[index];
    closeAllModals();
    updateAdjustedRecipe();
  });
  list.appendChild(noSubItem);

  // 2. Map existing substitutions if available
  availableSubs.forEach((sub, subIdx) => {
    const subItem = document.createElement('div');
    subItem.className = 'sub-modal-item';
    if (selectedSubIdx === subIdx) {
      subItem.classList.add('selected');
    }

    let ratioText = "";
    if (sub.components && sub.components.length > 0) {
      ratioText = "Mix";
    } else if (sub.unit === "ratio") {
      if (sub.ratio === 1) {
        ratioText = "1:1 ratio";
      } else {
        ratioText = `${formatQuantity(sub.ratio)}x ratio`;
      }
    } else {
      ratioText = `${formatQuantity(sub.ratio)} ${sub.unit}`;
    }

    subItem.innerHTML = `
      <div class="sub-modal-item-header">
        <span class="sub-modal-item-name">${escapeHtml(sub.name)} ${sub.isAI ? '<span class="ai-badge">✨ AI</span>' : ''}</span>
        <span class="sub-modal-item-ratio">${escapeHtml(ratioText)}</span>
      </div>
      <div class="sub-modal-item-desc">${escapeHtml(sub.desc)}</div>
    `;
    subItem.addEventListener('click', () => {
      activeSubstitutions[index] = subIdx;
      closeAllModals();
      updateAdjustedRecipe();
    });
    list.appendChild(subItem);
  });

  modal.appendChild(list);

  // 3. AI Generation card (if no subs exist or to generate additional AI options)
  const aiCard = document.createElement('div');
  aiCard.className = 'ai-generate-card';

  if (availableSubs.length === 0) {
    aiCard.innerHTML = `
      <div class="ai-card-title">✨ Smart WebGPU AI</div>
      <div class="ai-card-desc">No local substitute found for "${escapeHtml(line.name)}". Generate custom options using in-browser AI!</div>
      <button type="button" class="ai-gen-btn">✨ Generate Substitutions</button>
      <div class="ai-card-desc-sm">Powered by <a href="https://webgpu.org/">WebGPU</a>, <a href="https://mlc.ai/mlc-ai/web-llm/">MLC</a> to run small language models 100% locally in your browser.</div>
      <div class="ai-card-desc-sm">Experimental and prone to mistakes. Use common sense and substitute at your own risk!</div>
    `;
  } else {
    aiCard.innerHTML = `
      <div class="ai-card-title">✨ Want more options?</div>
      <button type="button" class="ai-gen-btn">Ask AI for Help</button>
      <div class="ai-card-desc-sm">Powered by <a href="https://webgpu.org/">WebGPU</a>, <a href="https://mlc.ai/mlc-ai/web-llm/">MLC</a> to run small language models 100% locally in your browser.</div>
      <div class="ai-card-desc-sm">Experimental and prone to mistakes. Use common sense and substitute at your own risk!</div>
    `;
  }

  const genBtn = aiCard.querySelector('.ai-gen-btn');
  genBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    aiCard.innerHTML = `
      <div class="ai-loading-state">
        <div class="ai-spinner"></div>
        <div class="ai-status-text">Checking WebGPU support...</div>
      </div>
    `;
    const statusText = aiCard.querySelector('.ai-status-text');

    try {
      await generateAISubstitutions(line.name, (status) => {
        statusText.textContent = status;
      });
      // 1. Re-render the recipe UI list so button badges update with new substitutes available
      updateAdjustedRecipe();

      // 2. Find the newly rendered badge container for this ingredient and keep the modal open
      closeAllModals();
      const freshContainer = document.querySelector(`.sub-badge-container[data-ingredient-index="${index}"]`) || container;
      const subBtn = freshContainer.querySelector('.sub-toggle-btn');
      if (subBtn) subBtn.classList.add('modal-open');
      showSubstituteModal(index, freshContainer, line, selectedSubIdx);
    } catch (err) {
      console.error('AI Substitution error:', err);
      aiCard.innerHTML = `
        <div class="ai-card-title" style="color: #DC2626;">⚠️ Could not generate</div>
        <div class="ai-card-desc" style="color: #DC2626; font-size: 0.8rem; margin-top: 4px; line-height: 1.3;">${escapeHtml(err.message)}</div>
      `;
    }
  });

  modal.appendChild(aiCard);
  container.appendChild(modal);
}

// Global click event to close modals when clicking outside
document.addEventListener('click', () => {
  closeAllModals();
});

// Closes any open substitute modals
function closeAllModals() {
  const openModals = document.querySelectorAll('.substitute-modal');
  openModals.forEach(modal => modal.remove());

  const activeButtons = document.querySelectorAll('.sub-toggle-btn');
  activeButtons.forEach(btn => btn.classList.remove('modal-open'));
}

// Copies the final recipe output text into clipboard
function copyRecipeToClipboard() {
  let copyText = `Scaled Recipe (Adjusted by ${currentScaleFactor}x):\n\n`;

  const hasIngredients = parsedRecipe && parsedRecipe.some(line => !line.isEmpty);
  if (hasIngredients) {
    copyText += "Ingredients:\n";
    parsedRecipe.forEach((line, index) => {
      if (line.isEmpty) return;

      if (line.isHeader || !line.isIngredient) {
        copyText += `${line.original}\n`;
        return;
      }

      const selectedSubIdx = activeSubstitutions[index];
      const availableSubs = SUBSTITUTIONS[line.subKey];
      const hasSubActive = selectedSubIdx !== undefined && selectedSubIdx !== null && availableSubs;

      if (hasSubActive) {
        const sub = availableSubs[selectedSubIdx];
        const details = getSubstitutionDetails(line, sub, currentScaleFactor);

        if (details.isMix) {
          copyText += `${details.mixName} (substitute for ${details.originalQtyStr ? details.originalQtyStr + ' ' : ''}${details.originalUnit ? details.originalUnit + ' ' : ''}${details.originalName}):\n`;
          details.components.forEach(c => {
            copyText += `  • ${c.qtyText}${c.unitText ? ' ' + c.unitText : ''} ${c.name}\n`;
          });
        } else {
          copyText += `${details.qtyText ? details.qtyText + ' ' : ''}${details.unitText ? details.unitText + ' ' : ''}${details.name} (substitute for ${line.name})\n`;
        }
      } else {
        copyText += `${buildScaledLineText(line, currentScaleFactor)}\n`;
      }
    });
  }

  const instructionsVal = instructionsInput ? instructionsInput.value.trim() : "";
  if (instructionsVal) {
    if (hasIngredients) copyText += "\n";
    copyText += "Instructions:\n";
    const knownWords = getKnownIngredientWords(parsedRecipe);
    const lines = instructionsInput.value.split('\n');
    lines.forEach(line => {
      const adjusted = adjustInstructionLine(line, currentScaleFactor, knownWords);
      if (!adjusted.isEmpty) {
        copyText += `${adjusted.text}\n`;
      }
    });
  }

  navigator.clipboard.writeText(copyText.trim()).then(() => {
    showToast("Recipe copied! 🎂");
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

// Dynamic Toast Notification Alert
function showToast(msg) {
  let toast = document.querySelector('.toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
