# 🧁 Recipe Adjuster

A web application designed to help bakers scale recipe portion sizes and discover dietary/allergen-friendly ingredient substitutions. Built with vanilla HTML/CSS/JS and featuring an optional in-browser **WebGPU AI Engine** powered by Web-LLM.

---

## 🌟 Features

- **Portion Scaling**: Easily scale recipes up or down using quick preset buttons (`½x`, `1x`, `1½x`, `2x`) or a custom slider (`0.1x` to `5.0x`).
- **Smart Ingredient Parsing**: Automatically identifies fractions (e.g. `2 1/2`), ranges (`1 to 2 cups`), decimal amounts, and units from raw recipe text while keeping instructions intact.
- **Built-in Substitutions Database**: Includes alternative options for common baking staples (eggs, butter, milk, buttermilk, all-purpose flour, sugars, etc.) with custom ratios and culinary notes.
- **In-Browser WebGPU AI**: 
  - Runs local Large Language Models (e.g., Gemma, Qwen, SmolLM2) directly in the browser via WebGPU using `@mlc-ai/web-llm`.
  - **100% Private & Serverless**: All processing happens locally on your device's GPU.
  - **Hardware Feature Detection**: Automatically detects Float16 (`shader-f16`) GPU support and falls back gracefully to Float32 models for universal compatibility.
- **One-Click Copy**: Copy formatted, adjusted recipes straight to your clipboard.
- **Zero Build Dependencies**: Runs as pure static HTML/JS—ready to deploy directly on GitHub Pages or any static host.

---

## 💡 How It Works

1. **Paste Recipe**: Paste your ingredients and instructions into the input box.
2. **Select Scale**: Click preset multiplier buttons or drag the scaling slider.
3. **Explore Substitutes**: Expand ingredients with available substitutions (e.g., replacing 1 egg with a Flax Egg or Applesauce).
4. **Copy & Bake**: Copy the adjusted ingredient list and instructions to get baking!

---

## 🛠️ Technology Stack

- **HTML5 & CSS3**: Custom responsive card layout, Google Fonts (`Fredoka` & `Quicksand`), micro-animations, and cozy styling.
- **JavaScript (ES6+)**: Pure client-side parsing and DOM manipulation.
- **WebGPU & Web-LLM**: Client-side LLM execution via `@mlc-ai/web-llm` for local AI-generated ingredient substitutions.
