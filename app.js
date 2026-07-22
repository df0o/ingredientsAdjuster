// Active State & Storage
let currentScaleFactor = 1.0;
let parsedRecipe = []; // holds list of line objects
let activeSubstitutions = {}; // maps ingredient index to selected substitute index

// WebGPU In-Browser Engine State
let webllmEngine = null;

// UI Element References
const recipeInput = document.getElementById('recipeInput');
const presetBtns = document.querySelectorAll('.preset-btn');
const customScale = document.getElementById('customScale');
const scaleDisplay = document.getElementById('scaleDisplay');
const recipeOutputEmpty = document.getElementById('recipeOutputEmpty');
const recipeOutputContent = document.getElementById('recipeOutputContent');
const ingredientsList = document.getElementById('ingredientsList');
const instructionsWrapper = document.getElementById('instructionsWrapper');
const instructionsText = document.getElementById('instructionsText');
const copyBtn = document.getElementById('copyBtn');

// Initialize Event Listeners
recipeInput.addEventListener('input', handleRecipeChange);
customScale.addEventListener('input', handleCustomScaleChange);

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const scale = parseFloat(btn.getAttribute('data-scale'));
    currentScaleFactor = scale;
    customScale.value = scale;
    scaleDisplay.textContent = scale.toFixed(1);

    updateAdjustedRecipe();
  });
});

copyBtn.addEventListener('click', copyRecipeToClipboard);

// Seed initial recipe on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  recipeInput.value = `Susie's chocolate chip cookies

2 1/2 cups all-purpose flour
2 large eggs
3/4 tsp baking soda
1/8 tsp salt
1 cup unsalted butter, softened
3/4 cup packed brown sugar
1 tsp vanilla extract
1/3 cup semi-sweet chocolate chips
1/4 cup chopped nuts

1. Preheat oven at 350°F (175°C).
2. Mix flour, baking soda, salt in medium bowl.
3. Cream the butter and sugar.
4. Add eggs one at a time, mixing well after each addition.
5. Add dry ingredients into wet mixture in three parts.
6. Stir in chocolate chips and walnuts.
7. Spoon onto baking sheet.
8. Bake for 10-12 minutes.`;

  handleRecipeChange();
});


// Event Handler: Input text changed
function handleRecipeChange() {
  const text = recipeInput.value;
  if (!text.trim()) {
    recipeOutputEmpty.classList.remove('hidden');
    recipeOutputContent.classList.add('hidden');
    parsedRecipe = [];
    activeSubstitutions = {};
    return;
  }

  recipeOutputEmpty.classList.add('hidden');
  recipeOutputContent.classList.remove('hidden');

  parseRecipeText(text);
  updateAdjustedRecipe();
}

// Event Handler: Custom slider changed
function handleCustomScaleChange(e) {
  currentScaleFactor = parseFloat(e.target.value);
  scaleDisplay.textContent = currentScaleFactor.toFixed(1);

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

// Parser: Converts raw text into lines and checks for ingredients
function parseRecipeText(text) {
  const lines = text.split('\n');
  parsedRecipe = lines.map((line, index) => {
    return parseLine(line);
  });
}

// Parses a single line
function parseLine(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return { original: line, isIngredient: false, isEmpty: true };
  }

  // Filter out headers or obvious steps
  if (/^\d+\.\s/.test(trimmed) ||
    /^(instructions|directions|steps|method):?$/i.test(trimmed) ||
    (trimmed.toLowerCase().endsWith(':') && trimmed.length < 30)) {
    return { original: line, isIngredient: false, isEmpty: false };
  }

  // 1. Check for Range quantities, e.g. "1-2" or "1 to 2" or "1 1/2 to 2"
  const rangeRegex = /^(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*(?:\-|to|or)\s*(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s+(.*)$/i;
  let match = trimmed.match(rangeRegex);
  if (match) {
    const qty1 = parseQtyValue(match[1]);
    const qty2 = parseQtyValue(match[2]);
    const rest = match[3];
    const { unit, name } = parseUnitAndName(rest);
    const subKey = findSubstitutionKey(name) || name.toLowerCase().trim();
    return {
      original: line,
      isIngredient: true,
      isRange: true,
      qty1: qty1,
      qty2: qty2,
      qty1Str: match[1],
      qty2Str: match[2],
      unit: unit,
      name: name,
      subKey: subKey
    };
  }

  // 2. Check for Single quantity, e.g. "1 1/2" or "0.5" or "3"
  const singleQtyRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)\s*(.*)$/;
  match = trimmed.match(singleQtyRegex);
  if (match) {
    const qtyStr = match[1];
    const rest = match[2];
    const qty = parseQtyValue(qtyStr);
    const { unit, name } = parseUnitAndName(rest);
    const subKey = findSubstitutionKey(name) || name.toLowerCase().trim();
    return {
      original: line,
      isIngredient: true,
      isRange: false,
      qty: qty,
      qtyStr: qtyStr,
      unit: unit,
      name: name,
      subKey: subKey
    };
  }

  // 3. Implicit quantity, e.g. "pinch of salt", "dash of vanilla"
  const implicitUnits = ["pinch", "pinches", "dash", "dashes", "clove", "cloves", "sprig", "sprigs"];
  const words = trimmed.split(/\s+/);
  const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');
  if (implicitUnits.includes(firstWord)) {
    const { unit, name } = parseUnitAndName(trimmed);
    const subKey = findSubstitutionKey(name) || name.toLowerCase().trim();
    return {
      original: line,
      isIngredient: true,
      isRange: false,
      qty: 1,
      qtyStr: "1",
      unit: unit,
      name: name,
      subKey: subKey,
      isImplicit: true
    };
  }

  // Fallback: Treat as plain text
  return { original: line, isIngredient: false, isEmpty: false };
}

// Converts quantities like "1 1/2" to floats
function parseQtyValue(str) {
  str = str.trim();
  if (str.includes(' ')) {
    const parts = str.split(/\s+/);
    const whole = parseFloat(parts[0]);
    const fracParts = parts[1].split('/');
    return whole + parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(str);
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

// Formats decimal numbers back to neat baking fractions or clean decimals
function formatQuantity(val) {
  if (!val) return "";

  const tolerance = 0.025;
  const whole = Math.floor(val);
  const frac = val - whole;

  if (frac < tolerance) {
    return whole > 0 ? whole.toString() : "";
  }
  if (Math.abs(frac - 0.125) < tolerance) {
    return whole > 0 ? `${whole} 1/8` : "1/8";
  }
  if (Math.abs(frac - 0.25) < tolerance) {
    return whole > 0 ? `${whole} 1/4` : "1/4";
  }
  if (Math.abs(frac - 0.333) < tolerance) {
    return whole > 0 ? `${whole} 1/3` : "1/3";
  }
  if (Math.abs(frac - 0.375) < tolerance) {
    return whole > 0 ? `${whole} 3/8` : "3/8";
  }
  if (Math.abs(frac - 0.5) < tolerance) {
    return whole > 0 ? `${whole} 1/2` : "1/2";
  }
  if (Math.abs(frac - 0.625) < tolerance) {
    return whole > 0 ? `${whole} 5/8` : "5/8";
  }
  if (Math.abs(frac - 0.666) < tolerance) {
    return whole > 0 ? `${whole} 2/3` : "2/3";
  }
  if (Math.abs(frac - 0.75) < tolerance) {
    return whole > 0 ? `${whole} 3/4` : "3/4";
  }
  if (Math.abs(frac - 0.875) < tolerance) {
    return whole > 0 ? `${whole} 7/8` : "7/8";
  }

  // For numbers like 1.1 or 0.15, display as 1 decimal place or 2
  console.log(`val: ${val}, whole: ${whole}, frac: ${frac}`);
  return val.toFixed(2).replace(/\.?0+$/, '');
}

// Helper to format a substitution (single or mix) for display and clipboard
function getSubstitutionDetails(line, sub, scaleFactor) {
  if (sub.components && sub.components.length > 0) {
    const componentsList = sub.components.map(comp => {
      let compQtyText = "";
      let compUnitText = (comp.unit === "ratio" || !comp.unit) ? line.unit : comp.unit;

      if (line.isRange) {
        const scaled1 = line.qty1 * scaleFactor * comp.ratio;
        const scaled2 = line.qty2 * scaleFactor * comp.ratio;
        compQtyText = `${formatQuantity(scaled1)}-${formatQuantity(scaled2)}`;
      } else {
        const scaled = line.qty * scaleFactor * comp.ratio;
        compQtyText = formatQuantity(scaled);
      }

      return {
        qtyText: compQtyText,
        unitText: compUnitText,
        name: comp.name
      };
    });

    let origQtyText = "";
    if (line.isRange) {
      origQtyText = `${formatQuantity(line.qty1 * scaleFactor)}-${formatQuantity(line.qty2 * scaleFactor)}`;
    } else {
      origQtyText = formatQuantity(line.qty * scaleFactor);
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

    if (line.isRange) {
      const scaled1 = line.qty1 * scaleFactor * sub.ratio;
      const scaled2 = line.qty2 * scaleFactor * sub.ratio;
      qtyText = `${formatQuantity(scaled1)}-${formatQuantity(scaled2)}`;
    } else {
      const scaled = line.qty * scaleFactor * sub.ratio;
      qtyText = formatQuantity(scaled);
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

// Renders the adjusted recipe in the UI
function updateAdjustedRecipe() {
  ingredientsList.innerHTML = '';
  let instructionLines = [];

  parsedRecipe.forEach((line, index) => {
    if (!line.isIngredient) {
      if (!line.isEmpty) {
        instructionLines.push(line.original);
      }
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
      let qtyText = "";
      if (line.isRange) {
        const scaled1 = line.qty1 * currentScaleFactor;
        const scaled2 = line.qty2 * currentScaleFactor;
        qtyText = `${formatQuantity(scaled1)}-${formatQuantity(scaled2)}`;
      } else {
        const scaledQty = line.qty * currentScaleFactor;
        qtyText = formatQuantity(scaledQty);
      }

      const rowDiv = document.createElement('div');
      rowDiv.className = 'ingredient-row';

      const textSpan = document.createElement('span');
      textSpan.className = 'ingredient-text';
      if (qtyText) {
        textSpan.innerHTML = `<span class="qty-highlight">${escapeHtml(qtyText)}</span> ${line.unit ? escapeHtml(line.unit) + ' ' : ''}${escapeHtml(line.name)}`;
      } else {
        textSpan.textContent = line.name;
      }
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

  // Render instructions block if we found text instructions
  if (instructionLines.length > 0) {
    instructionsWrapper.classList.remove('hidden');
    instructionsText.innerHTML = instructionLines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
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
    : (recipeInput && recipeInput.value.trim()
      ? recipeInput.value.split('\n').map(l => parseLine(l)).filter(l => l.isIngredient).map(l => l.original.trim())
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
  let copyText = "Scaled Recipe (Adjusted by " + currentScaleFactor + "x):\n\n";

  parsedRecipe.forEach((line, index) => {
    if (!line.isIngredient) return;

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
      let qtyText = "";
      if (line.isRange) {
        const scaled1 = line.qty1 * currentScaleFactor;
        const scaled2 = line.qty2 * currentScaleFactor;
        qtyText = `${formatQuantity(scaled1)}-${formatQuantity(scaled2)}`;
      } else {
        const scaledQty = line.qty * currentScaleFactor;
        qtyText = formatQuantity(scaledQty);
      }
      copyText += `${qtyText ? qtyText + ' ' : ''}${line.unit ? line.unit + ' ' : ''}${line.name}\n`;
    }
  });

  const instructionLines = parsedRecipe.filter(line => !line.isIngredient && !line.isEmpty).map(line => line.original);
  if (instructionLines.length > 0) {
    copyText += "\nInstructions:\n" + instructionLines.join('\n');
  }

  navigator.clipboard.writeText(copyText).then(() => {
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
