/**
 * ColorDesigner Local - Main Application Logic
 * Enhanced version with multi-color variations and format support
 */

// ============================================
// State Management
// ============================================
const state = {
    baseColor: '#468227',
    harmonyMode: 'complementary',
    harmonyColors: [],
    customHarmonyColors: {}, // Store user-customized harmony colors: { index: hex }
    displayFormat: 'hex', // 'hex' | 'rgb' | 'hsl' | 'oklch' | 'lch'
    // Configuration for each color (Base + Harmony colors)
    colorConfigs: [
        { tintsCount: 5, shadesCount: 5, tonesCount: 5 } // Base color (index 0)
    ],
    // Variations for all colors
    allVariations: {}
};

// DOM Elements cache
const elements = {};

// ============================================
// Color Library Wrapper (Colord + Culori)
// ============================================
function getColord(color) {
    if (typeof window.colord === 'function') {
        return window.colord(color);
    }
    return new ColordFallback(color);
}

// Check if culori is available globally
const culoriLib = typeof window.culori !== 'undefined' ? window.culori : null;

// Minimal fallback implementation if colord isn't loaded
class ColordFallback {
    constructor(color) {
        this.color = this.parseColor(color);
    }

    parseColor(color) {
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return { r, g, b, h: this.rgbToHsl(r, g, b).h, s: this.rgbToHsl(r, g, b).s, l: this.rgbToHsl(r, g, b).l };
        }
        return { r: 0, g: 0, b: 0, h: 0, s: 0, l: 0 };
    }

    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    toHex() {
        const toHexChannel = (c) => Math.round(c).toString(16).padStart(2, '0');
        return `#${toHexChannel(this.color.r)}${toHexChannel(this.color.g)}${toHexChannel(this.color.b)}`;
    }

    toRgbString() {
        return `rgb(${Math.round(this.color.r)}, ${Math.round(this.color.g)}, ${Math.round(this.color.b)})`;
    }

    toHslString() {
        return `hsl(${Math.round(this.color.h)}, ${Math.round(this.color.s)}%, ${Math.round(this.color.l)}%)`;
    }

    rotate(degrees) {
        const newH = (this.color.h + degrees) % 360;
        return new ColordFallback(this.hslToRgb(newH < 0 ? newH + 360 : newH, this.color.s, this.color.l).toHex());
    }

    hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return new ColordFallback(`#${Math.round(r*255).toString(16).padStart(2,'0')}${Math.round(g*255).toString(16).padStart(2,'0')}${Math.round(b*255).toString(16).padStart(2,'0')}`);
    }
}

// ============================================
// Color Format Conversion using Culori
// ============================================
function formatColor(hex, format) {
    // If culori is not available or format is hex, just return hex
    if (!culoriLib || format === 'hex') return hex;
    
    try {
        const color = culoriLib.parse(hex);
        if (!color) return hex;
        
        switch(format) {
            case 'hex':
                return culoriLib.formatHex(color);
            case 'rgb':
                return culoriLib.formatRgb(color);
            case 'hsl':
                return culoriLib.formatHsl(color);
            case 'oklch': {
                const oklch = culoriLib.oklch(color);
                return culoriLib.formatCss(oklch);
            }
            case 'lch': {
                const lch = culoriLib.lch(color);
                return culoriLib.formatCss(lch);
            }
            default:
                return hex;
        }
    } catch (e) {
        console.warn('Error formatting color:', e);
        return hex;
    }
}

// ============================================
// Harmony Calculations
// ============================================
function generateHarmony(baseColor, mode) {
    const base = getColord(baseColor);
    const colors = [base.toHex()];

    switch (mode) {
        case 'complementary':
            colors.push(base.rotate(180).toHex());
            break;
        case 'analogous':
            colors.push(base.rotate(-30).toHex());
            colors.push(base.rotate(30).toHex());
            break;
        case 'triadic':
            colors.push(base.rotate(120).toHex());
            colors.push(base.rotate(240).toHex());
            break;
        case 'tetradic':
            colors.push(base.rotate(90).toHex());
            colors.push(base.rotate(180).toHex());
            colors.push(base.rotate(270).toHex());
            break;
        case 'split-complementary':
            colors.push(base.rotate(150).toHex());
            colors.push(base.rotate(210).toHex());
            break;
        case 'monochromatic':
            for (let i = 1; i <= 4; i++) {
                colors.push(base.rotate(i * 0).toHex());
            }
            break;
        case 'custom':
            // In custom mode, preserve existing harmony colors or use base color
            // Get the current harmony colors length, or default to 2 (base + 1 harmony)
            const customCount = Math.max(2, state.harmonyColors.length);
            for (let i = 1; i < customCount; i++) {
                // Use existing color if available, otherwise use base color
                colors.push(state.harmonyColors[i] || base.toHex());
            }
            break;
    }

    return colors;
}

// ============================================
// Variations Generation using Culori
// ============================================
function generateVariationsForColor(color, config) {
    const variations = { tints: [], shades: [], tones: [] };
    
    // Validate input color first
    if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        console.warn('Invalid color format:', color);
        return generateVariationsFallback(color, config);
    }
    
    // Try to use culori if available
    if (culoriLib) {
        try {
            const base = culoriLib.parse(color);
            if (base && base.r !== undefined && base.g !== undefined && base.b !== undefined) {
                // Generate tints (mix with white)
                for (let i = 1; i <= config.tintsCount; i++) {
                    const factor = i / (config.tintsCount + 1);
                    const tint = culoriLib.interpolate([base, '#ffffff'], factor);
                    const tintHex = culoriLib.formatHex(tint);
                    // Validate result
                    if (tintHex && !tintHex.includes('NaN')) {
                        variations.tints.push(tintHex);
                    } else {
                        throw new Error('Invalid tint color generated');
                    }
                }
                
                // Generate shades (mix with black)
                for (let i = 1; i <= config.shadesCount; i++) {
                    const factor = i / (config.shadesCount + 1);
                    const shade = culoriLib.interpolate([base, '#000000'], factor);
                    const shadeHex = culoriLib.formatHex(shade);
                    // Validate result
                    if (shadeHex && !shadeHex.includes('NaN')) {
                        variations.shades.push(shadeHex);
                    } else {
                        throw new Error('Invalid shade color generated');
                    }
                }
                
                // Generate tones (desaturate towards gray)
                const gray = { mode: 'rgb', r: 0.5, g: 0.5, b: 0.5 };
                for (let i = 1; i <= config.tonesCount; i++) {
                    const factor = i / (config.tonesCount + 1);
                    const tone = culoriLib.interpolate([base, gray], factor);
                    const toneHex = culoriLib.formatHex(tone);
                    // Validate result
                    if (toneHex && !toneHex.includes('NaN')) {
                        variations.tones.push(toneHex);
                    } else {
                        throw new Error('Invalid tone color generated');
                    }
                }
                
                return variations;
            } else {
                throw new Error('Failed to parse color with culori');
            }
        } catch (e) {
            console.warn('Culori error, falling back to manual calculation:', e);
        }
    }
    
    // Fallback: Manual calculation using HSL
    return generateVariationsFallback(color, config);
}

// Fallback variation generation using manual HSL calculations
function generateVariationsFallback(color, config) {
    const variations = { tints: [], shades: [], tones: [] };
    
    // Validate and parse hex color
    if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        console.warn('Invalid color format:', color);
        // Return empty variations or default color
        const defaultColor = '#468227';
        for (let i = 1; i <= config.tintsCount; i++) variations.tints.push(defaultColor);
        for (let i = 1; i <= config.shadesCount; i++) variations.shades.push(defaultColor);
        for (let i = 1; i <= config.tonesCount; i++) variations.tones.push(defaultColor);
        return variations;
    }
    
    // Parse hex to RGB
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    
    // Validate RGB values
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.warn('Failed to parse RGB values from:', color);
        const defaultColor = '#468227';
        for (let i = 1; i <= config.tintsCount; i++) variations.tints.push(defaultColor);
        for (let i = 1; i <= config.shadesCount; i++) variations.shades.push(defaultColor);
        for (let i = 1; i <= config.tonesCount; i++) variations.tones.push(defaultColor);
        return variations;
    }
    
    // Convert to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    h = (h || 0) * 360;
    s = (s || 0) * 100;
    l = (l || 50) * 100;
    
    // Generate tints (increase lightness towards white)
    for (let i = 1; i <= config.tintsCount; i++) {
        const factor = i / (config.tintsCount + 1);
        const newL = Math.min(100, l + (100 - l) * factor);
        variations.tints.push(hslToHex(h, s, newL));
    }
    
    // Generate shades (decrease lightness towards black)
    for (let i = 1; i <= config.shadesCount; i++) {
        const factor = i / (config.shadesCount + 1);
        const newL = Math.max(0, l * (1 - factor));
        variations.shades.push(hslToHex(h, s, newL));
    }
    
    // Generate tones (decrease saturation towards gray)
    for (let i = 1; i <= config.tonesCount; i++) {
        const factor = i / (config.tonesCount + 1);
        const newS = s * (1 - factor);
        variations.tones.push(hslToHex(h, newS, l));
    }
    
    return variations;
}

// Helper: Convert HSL to Hex
function hslToHex(h, s, l) {
    // Validate inputs
    h = isNaN(h) ? 0 : h;
    s = isNaN(s) ? 0 : s;
    l = isNaN(l) ? 50 : l;
    
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    // Validate RGB values
    r = isNaN(r) ? 0 : Math.max(0, Math.min(1, r));
    g = isNaN(g) ? 0 : Math.max(0, Math.min(1, g));
    b = isNaN(b) ? 0 : Math.max(0, Math.min(1, b));
    
    const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================
// UI Rendering
// ============================================
function createColorCard(hex, index) {
    const base = getColord(hex);
    const isLight = base.color ? base.color.l > 60 : true;
    const labelColor = isLight ? '#1a1a1a' : '#ffffff';
    const formattedLabel = formatColor(hex, state.displayFormat);
    
    // For harmony colors (index > 0), add an edit button
    const editButton = index > 0 ? `
        <button class="edit-color-btn" data-index="${index}" title="Farbe bearbeiten">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${labelColor}" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
        </button>
    ` : '';
    
    return `
        <div class="color-card ${index > 0 ? 'editable' : ''}" style="background-color: ${hex};" data-hex="${hex}" data-index="${index}">
            <span class="copy-hint">Click to copy</span>
            ${editButton}
            <span class="color-label" style="color: ${labelColor};">${formattedLabel}</span>
            <input type="color" class="harmony-color-input" data-index="${index}" value="${hex}" style="position: absolute; opacity: 0; pointer-events: none;">
        </div>
    `;
}

function createColorSwatch(hex) {
    const formattedLabel = formatColor(hex, state.displayFormat);
    
    return `
        <div class="color-swatch" style="background-color: ${hex};" data-hex="${hex}">
            <span class="swatch-label">${formattedLabel}</span>
            <span class="tooltip">${formattedLabel}</span>
        </div>
    `;
}

function renderVariationRows(colorIndex, containerId) {
    // Get the correct color - for harmony colors, we need to use the correct index
    let color;
    if (colorIndex === 0) {
        color = state.baseColor;
    } else {
        // colorIndex is 1-based for harmony colors (1 = first harmony color)
        // state.harmonyColors[0] is base color, so harmony color 1 is at index 1
        color = state.harmonyColors[colorIndex];
    }
    
    if (!color) {
        console.warn(`No color found for index ${colorIndex}`);
        return;
    }
    
    const config = state.colorConfigs[colorIndex] || { tintsCount: 5, shadesCount: 5, tonesCount: 5 };
    const variations = generateVariationsForColor(color, config);
    
    // Store variations in state
    state.allVariations[colorIndex] = variations;
    
    // Render tints
    const tintsContainer = document.getElementById(`tintsRow-${colorIndex}`);
    if (tintsContainer) {
        tintsContainer.innerHTML = variations.tints.map(hex => createColorSwatch(hex)).join('');
    }
    
    // Render shades
    const shadesContainer = document.getElementById(`shadesRow-${colorIndex}`);
    if (shadesContainer) {
        shadesContainer.innerHTML = variations.shades.map(hex => createColorSwatch(hex)).join('');
    }
    
    // Render tones
    const tonesContainer = document.getElementById(`tonesRow-${colorIndex}`);
    if (tonesContainer) {
        tonesContainer.innerHTML = variations.tones.map(hex => createColorSwatch(hex)).join('');
    }
}

function createVariationSection(colorIndex, color, colorName) {
    const config = state.colorConfigs[colorIndex];
    
    return `
        <div class="harmony-color-section" data-color-index="${colorIndex}">
            <div class="variation-header">
                <div class="color-indicator" style="background-color: ${color};"></div>
                <span class="color-name">${colorName}</span>
                <span class="color-hex">${formatColor(color, state.displayFormat)}</span>
            </div>
            
            <div class="variation-controls">
                <div class="control-row">
                    <label>Tints:</label>
                    <select class="tints-count" data-color-index="${colorIndex}">
                        <option value="3" ${config.tintsCount === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${config.tintsCount === 4 ? 'selected' : ''}>4</option>
                        <option value="5" ${config.tintsCount === 5 ? 'selected' : ''}>5</option>
                        <option value="6" ${config.tintsCount === 6 ? 'selected' : ''}>6</option>
                        <option value="7" ${config.tintsCount === 7 ? 'selected' : ''}>7</option>
                        <option value="8" ${config.tintsCount === 8 ? 'selected' : ''}>8</option>
                        <option value="9" ${config.tintsCount === 9 ? 'selected' : ''}>9</option>
                        <option value="10" ${config.tintsCount === 10 ? 'selected' : ''}>10</option>
                    </select>
                </div>
                <div class="control-row">
                    <label>Shades:</label>
                    <select class="shades-count" data-color-index="${colorIndex}">
                        <option value="3" ${config.shadesCount === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${config.shadesCount === 4 ? 'selected' : ''}>4</option>
                        <option value="5" ${config.shadesCount === 5 ? 'selected' : ''}>5</option>
                        <option value="6" ${config.shadesCount === 6 ? 'selected' : ''}>6</option>
                        <option value="7" ${config.shadesCount === 7 ? 'selected' : ''}>7</option>
                        <option value="8" ${config.shadesCount === 8 ? 'selected' : ''}>8</option>
                        <option value="9" ${config.shadesCount === 9 ? 'selected' : ''}>9</option>
                        <option value="10" ${config.shadesCount === 10 ? 'selected' : ''}>10</option>
                    </select>
                </div>
                <div class="control-row">
                    <label>Tones:</label>
                    <select class="tones-count" data-color-index="${colorIndex}">
                        <option value="3" ${config.tonesCount === 3 ? 'selected' : ''}>3</option>
                        <option value="4" ${config.tonesCount === 4 ? 'selected' : ''}>4</option>
                        <option value="5" ${config.tonesCount === 5 ? 'selected' : ''}>5</option>
                        <option value="6" ${config.tonesCount === 6 ? 'selected' : ''}>6</option>
                        <option value="7" ${config.tonesCount === 7 ? 'selected' : ''}>7</option>
                        <option value="8" ${config.tonesCount === 8 ? 'selected' : ''}>8</option>
                        <option value="9" ${config.tonesCount === 9 ? 'selected' : ''}>9</option>
                        <option value="10" ${config.tonesCount === 10 ? 'selected' : ''}>10</option>
                    </select>
                </div>
            </div>

            <div class="variation-rows">
                <div class="variation-row">
                    <h3>Tints (Lighter)</h3>
                    <div class="color-row" id="tintsRow-${colorIndex}"></div>
                </div>

                <div class="variation-row">
                    <h3>Shades (Darker)</h3>
                    <div class="color-row" id="shadesRow-${colorIndex}"></div>
                </div>

                <div class="variation-row">
                    <h3>Tones (Desaturated)</h3>
                    <div class="color-row" id="tonesRow-${colorIndex}"></div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to get color name based on index
function getColorName(index) {
    const names = ['Primary', 'Secondary', 'Tertiary', 'Quaternary', 'Quinary'];
    return names[index] || `Color ${index}`;
}

function renderHarmonyVariations() {
    const container = document.getElementById('harmonyColorsVariations');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Generate sections for each harmony color (excluding base color at index 0)
    // state.harmonyColors[0] is base color, [1] is first harmony color, etc.
    state.harmonyColors.slice(1).forEach((calculatedColor, idx) => {
        const colorIndex = idx + 1; // 1, 2, 3, etc.
        const colorName = getColorName(colorIndex);
        
        // Check if there's a custom color for this index
        const color = state.customHarmonyColors[colorIndex] || calculatedColor;
        
        console.log(`Rendering harmony color ${colorIndex}: ${color} (${colorName})`);
        
        // Ensure config exists
        if (!state.colorConfigs[colorIndex]) {
            state.colorConfigs[colorIndex] = { tintsCount: 5, shadesCount: 5, tonesCount: 5 };
        }
        
        const sectionHtml = createVariationSection(colorIndex, color, colorName);
        container.insertAdjacentHTML('beforeend', sectionHtml);
        
        // Render the variation rows - pass the color directly to ensure correctness
        renderVariationRowsForColor(colorIndex, color);
    });
    
    // Attach event listeners to new controls
    attachVariationControlListeners(container);
}

// Separate function that takes the color directly to avoid confusion
function renderVariationRowsForColor(colorIndex, color) {
    const config = state.colorConfigs[colorIndex] || { tintsCount: 5, shadesCount: 5, tonesCount: 5 };
    const variations = generateVariationsForColor(color, config);
    
    console.log(`Generating variations for color ${colorIndex} (${color}):`, variations);
    
    // Store variations in state
    state.allVariations[colorIndex] = variations;
    
    // Render tints
    const tintsContainer = document.getElementById(`tintsRow-${colorIndex}`);
    if (tintsContainer) {
        tintsContainer.innerHTML = variations.tints.map(hex => createColorSwatch(hex)).join('');
    }
    
    // Render shades
    const shadesContainer = document.getElementById(`shadesRow-${colorIndex}`);
    if (shadesContainer) {
        shadesContainer.innerHTML = variations.shades.map(hex => createColorSwatch(hex)).join('');
    }
    
    // Render tones
    const tonesContainer = document.getElementById(`tonesRow-${colorIndex}`);
    if (tonesContainer) {
        tonesContainer.innerHTML = variations.tones.map(hex => createColorSwatch(hex)).join('');
    }
}

function renderPalette() {
    const base = getColord(state.baseColor);
    
    // Update inputs
    elements.hexInput.value = state.baseColor;
    elements.colorPicker.value = state.baseColor;
    elements.rgbInput.value = base.toRgbString();
    elements.hslInput.value = base.toHslString();
    
    // Update base color indicator and hex
    const baseIndicator = document.getElementById('baseColorIndicator');
    const baseHex = document.getElementById('baseColorHex');
    if (baseIndicator) {
        baseIndicator.style.backgroundColor = state.baseColor;
    }
    if (baseHex) {
        baseHex.textContent = formatColor(state.baseColor, state.displayFormat);
    }

    // Generate harmony colors (calculated)
    const calculatedHarmonyColors = generateHarmony(state.baseColor, state.harmonyMode);
    
    // Apply custom colors where they exist
    state.harmonyColors = calculatedHarmonyColors.map((color, index) => {
        return state.customHarmonyColors[index] || color;
    });
    
    // Ensure colorConfigs has enough entries for all harmony colors
    state.harmonyColors.forEach((_, index) => {
        if (!state.colorConfigs[index]) {
            state.colorConfigs[index] = { tintsCount: 5, shadesCount: 5, tonesCount: 5 };
        }
    });
    
    elements.harmonyPreview.innerHTML = state.harmonyColors.map((hex, i) => createColorCard(hex, i)).join('');

    // Render base color variations
    renderVariationRowsForColor(0, state.baseColor);
    
    // Render harmony color variations
    renderHarmonyVariations();

    // Save to localStorage
    saveToStorage();
}

function updateAllLabels() {
    // Update harmony preview labels
    const cards = elements.harmonyPreview.querySelectorAll('.color-card');
    cards.forEach((card, i) => {
        const hex = state.harmonyColors[i];
        const label = card.querySelector('.color-label');
        if (label && hex) {
            label.textContent = formatColor(hex, state.displayFormat);
        }
    });
    
    // Update all variation swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        const hex = swatch.getAttribute('data-hex');
        const label = swatch.querySelector('.swatch-label');
        const tooltip = swatch.querySelector('.tooltip');
        if (label && hex) {
            label.textContent = formatColor(hex, state.displayFormat);
        }
        if (tooltip && hex) {
            tooltip.textContent = formatColor(hex, state.displayFormat);
        }
    });
    
    // Update harmony color section headers
    document.querySelectorAll('.harmony-color-section').forEach((section, idx) => {
        const hexSpan = section.querySelector('.color-hex');
        if (hexSpan && state.harmonyColors[idx + 1]) {
            hexSpan.textContent = formatColor(state.harmonyColors[idx + 1], state.displayFormat);
        }
    });
    
    // Update base color section header
    const baseColorHex = document.querySelector('.variations-section .color-hex');
    if (baseColorHex) {
        baseColorHex.textContent = formatColor(state.baseColor, state.displayFormat);
    }
}

// ============================================
// Export Functions
// ============================================
function exportCSS() {
    let css = `:root {\n`;
    
    // Base color
    css += `  /* Base Color */\n`;
    css += `  --color-primary: ${state.baseColor};\n`;
    
    const baseVariations = state.allVariations[0];
    if (baseVariations) {
        baseVariations.tints.forEach((hex, i) => {
            css += `  --color-primary-tint-${i + 1}: ${hex};\n`;
        });
        baseVariations.shades.forEach((hex, i) => {
            css += `  --color-primary-shade-${i + 1}: ${hex};\n`;
        });
        baseVariations.tones.forEach((hex, i) => {
            css += `  --color-primary-tone-${i + 1}: ${hex};\n`;
        });
    }
    
    // Harmony colors
    state.harmonyColors.slice(1).forEach((color, idx) => {
        const colorNum = idx + 1;
        css += `\n  /* Harmony Color ${colorNum} */\n`;
        css += `  --color-secondary-${colorNum}: ${color};\n`;
        
        const variations = state.allVariations[idx + 1];
        if (variations) {
            variations.tints.forEach((hex, i) => {
                css += `  --color-secondary-${colorNum}-tint-${i + 1}: ${hex};\n`;
            });
            variations.shades.forEach((hex, i) => {
                css += `  --color-secondary-${colorNum}-shade-${i + 1}: ${hex};\n`;
            });
            variations.tones.forEach((hex, i) => {
                css += `  --color-secondary-${colorNum}-tone-${i + 1}: ${hex};\n`;
            });
        }
    });
    
    css += `}`;

    downloadFile('colors.css', css, 'text/css');
}

function exportSVG() {
    const colors = [state.baseColor, ...state.harmonyColors.slice(1)];
    const variationsPerColor = [];
    
    colors.forEach((color, idx) => {
        const vars = state.allVariations[idx];
        if (vars) {
            variationsPerColor.push({
                color,
                tints: vars.tints,
                shades: vars.shades,
                tones: vars.tones
            });
        }
    });
    
    const colorWidth = 100;
    const colorHeight = 80;
    const gap = 20;
    const sectionGap = 40;
    
    let totalHeight = 0;
    let svgContent = '';
    let currentY = 0;
    
    variationsPerColor.forEach((colorData, colorIdx) => {
        const colorName = colorIdx === 0 ? 'Primary' : `Color ${colorIdx}`;
        
        // Color name label
        svgContent += `  <text x="10" y="${currentY + 20}" font-family="monospace" font-size="16" font-weight="bold" fill="#333">${colorName}</text>\n`;
        currentY += 30;
        
        // Base color
        svgContent += `  <rect x="10" y="${currentY}" width="${colorWidth}" height="${colorHeight}" fill="${colorData.color}" rx="4"/>\n`;
        svgContent += `  <text x="${10 + colorWidth/2}" y="${currentY + colorHeight + 15}" font-family="monospace" font-size="10" text-anchor="middle" fill="#333">${colorData.color}</text>\n`;
        
        // Tints
        currentY += colorHeight + 25;
        svgContent += `  <text x="10" y="${currentY + 15}" font-family="monospace" font-size="12" fill="#666">Tints</text>\n`;
        currentY += 20;
        colorData.tints.forEach((hex, i) => {
            const x = 10 + i * (colorWidth + gap);
            svgContent += `  <rect x="${x}" y="${currentY}" width="${colorWidth}" height="${colorHeight}" fill="${hex}" rx="4"/>\n`;
        });
        currentY += colorHeight + 10;
        
        // Shades
        currentY += sectionGap;
        svgContent += `  <text x="10" y="${currentY + 15}" font-family="monospace" font-size="12" fill="#666">Shades</text>\n`;
        currentY += 20;
        colorData.shades.forEach((hex, i) => {
            const x = 10 + i * (colorWidth + gap);
            svgContent += `  <rect x="${x}" y="${currentY}" width="${colorWidth}" height="${colorHeight}" fill="${hex}" rx="4"/>\n`;
        });
        currentY += colorHeight + 10;
        
        // Tones
        currentY += sectionGap;
        svgContent += `  <text x="10" y="${currentY + 15}" font-family="monospace" font-size="12" fill="#666">Tones</text>\n`;
        currentY += 20;
        colorData.tones.forEach((hex, i) => {
            const x = 10 + i * (colorWidth + gap);
            svgContent += `  <rect x="${x}" y="${currentY}" width="${colorWidth}" height="${colorHeight}" fill="${hex}" rx="4"/>\n`;
        });
        
        currentY += colorHeight + sectionGap;
    });

    const svgWidth = Math.max(...variationsPerColor.map(v => v.tints.length)) * (colorWidth + gap) + 20;
    const svg = `<svg width="${svgWidth}" height="${currentY}" xmlns="http://www.w3.org/2000/svg">\n${svgContent}</svg>`;

    downloadFile('palette.svg', svg, 'image/svg+xml');
}

function saveProject() {
    const projectData = {
        version: '2.1',
        baseColor: state.baseColor,
        harmonyMode: state.harmonyMode,
        displayFormat: state.displayFormat,
        colorConfigs: state.colorConfigs,
        harmonyColors: state.harmonyColors,
        customHarmonyColors: state.customHarmonyColors,
        allVariations: state.allVariations,
        timestamp: new Date().toISOString()
    };

    downloadFile('project.json', JSON.stringify(projectData, null, 2), 'application/json');
}

function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate data
            if (!data.baseColor || !data.harmonyMode) {
                alert('Invalid project file');
                return;
            }

            // Restore state
            state.baseColor = data.baseColor;
            state.harmonyMode = data.harmonyMode;
            state.displayFormat = data.displayFormat || 'hex';
            state.colorConfigs = data.colorConfigs || [{ tintsCount: 5, shadesCount: 5, tonesCount: 5 }];
            
            // Restore custom harmony colors if present
            if (data.customHarmonyColors) {
                state.customHarmonyColors = data.customHarmonyColors;
                // Apply custom colors to harmonyColors array
                Object.keys(state.customHarmonyColors).forEach(index => {
                    const idx = parseInt(index);
                    if (state.harmonyColors[idx]) {
                        state.harmonyColors[idx] = state.customHarmonyColors[idx];
                    }
                });
            } else {
                state.customHarmonyColors = {};
            }
            
            // Update UI
            elements.harmonySelect.value = state.harmonyMode;
            elements.displayFormat.value = state.displayFormat;
            renderPalette();
            
            alert('Project loaded successfully!');
        } catch (err) {
            alert('Error loading project: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============================================
// Utility Functions
// ============================================
function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function copyToClipboard(hex, element) {
    // Convert HEX to the selected display format before copying
    const textToCopy = formatColor(hex, state.displayFormat);
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        element.classList.add('copied');
        const hint = element.querySelector('.copy-hint') || element.querySelector('.tooltip');
        if (hint) {
            const originalText = hint.textContent;
            hint.textContent = 'Copied!';
            setTimeout(() => {
                element.classList.remove('copied');
                hint.textContent = originalText;
            }, 1500);
        }
    });
}

function saveToStorage() {
    try {
        localStorage.setItem('colorDesignerState', JSON.stringify({
            baseColor: state.baseColor,
            harmonyMode: state.harmonyMode,
            displayFormat: state.displayFormat,
            colorConfigs: state.colorConfigs,
            customHarmonyColors: state.customHarmonyColors
        }));
    } catch (e) {
        console.warn('Failed to save to localStorage');
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('colorDesignerState');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.baseColor) state.baseColor = data.baseColor;
            if (data.harmonyMode) state.harmonyMode = data.harmonyMode;
            if (data.displayFormat) state.displayFormat = data.displayFormat;
            if (data.colorConfigs) state.colorConfigs = data.colorConfigs;
            if (data.customHarmonyColors) {
                state.customHarmonyColors = data.customHarmonyColors;
            }
        }
    } catch (e) {
        console.warn('Failed to load from localStorage');
    }
}

function isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ============================================
// Event Handlers
// ============================================
function handleColorPickerChange(e) {
    state.baseColor = e.target.value;
    // Clear custom harmony colors when base color changes, unless in custom mode
    if (state.harmonyMode !== 'custom') {
        state.customHarmonyColors = {};
    }
    renderPalette();
}

function updateHarmonyPreview() {
    // Update the harmony preview cards
    const cards = elements.harmonyPreview.querySelectorAll('.color-card');
    cards.forEach((card, i) => {
        const hex = state.harmonyColors[i];
        if (hex) {
            card.style.backgroundColor = hex;
            card.setAttribute('data-hex', hex);
            const label = card.querySelector('.color-label');
            if (label) {
                label.textContent = formatColor(hex, state.displayFormat);
            }
        }
    });
}

function handleHexInput(e) {
    let hex = e.target.value.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;
    
    if (isValidHex(hex)) {
        state.baseColor = hex.toLowerCase();
        e.target.classList.remove('error');
        renderPalette();
    } else {
        e.target.classList.add('error');
    }
}

function handleHarmonyChange(e) {
    const newMode = e.target.value;
    state.harmonyMode = newMode;
    
    // Only regenerate colors and reset configs if NOT switching to custom mode
    // and we're not already in custom mode with custom colors
    if (newMode !== 'custom') {
        // Reset color configs to match new harmony count
        const harmonyCount = generateHarmony(state.baseColor, newMode).length;
        const newConfigs = [{ ...state.colorConfigs[0] }]; // Keep base config
        for (let i = 1; i < harmonyCount; i++) {
            newConfigs.push({ tintsCount: 5, shadesCount: 5, tonesCount: 5 });
        }
        state.colorConfigs = newConfigs;
        // Clear custom harmony colors when harmony mode changes
        state.customHarmonyColors = {};
    }
    
    renderPalette();
}

function handleDisplayFormatChange(e) {
    state.displayFormat = e.target.value;
    // Re-render the entire palette to update all swatches with new format
    renderPalette();
    saveToStorage();
}

function handleCountChange(e, type) {
    const colorIndex = parseInt(e.target.dataset.colorIndex);
    const count = parseInt(e.target.value);
    
    state.colorConfigs[colorIndex][type] = count;
    
    // Get the correct color and re-render
    let color;
    if (colorIndex === 0) {
        color = state.baseColor;
    } else {
        // Check for custom color first, then use harmony color
        color = state.customHarmonyColors[colorIndex] || state.harmonyColors[colorIndex];
    }
    
    renderVariationRowsForColor(colorIndex, color);
    saveToStorage();
}

function attachVariationControlListeners(container) {
    container.querySelectorAll('.tints-count').forEach(select => {
        select.addEventListener('change', (e) => handleCountChange(e, 'tintsCount'));
    });
    
    container.querySelectorAll('.shades-count').forEach(select => {
        select.addEventListener('change', (e) => handleCountChange(e, 'shadesCount'));
    });
    
    container.querySelectorAll('.tones-count').forEach(select => {
        select.addEventListener('change', (e) => handleCountChange(e, 'tonesCount'));
    });
}

// ============================================
// Cache DOM Elements
// ============================================
function cacheElements() {
    elements.colorPicker = document.getElementById('colorPicker');
    elements.hexInput = document.getElementById('hexInput');
    elements.rgbInput = document.getElementById('rgbInput');
    elements.hslInput = document.getElementById('hslInput');
    elements.harmonySelect = document.getElementById('harmonySelect');
    elements.harmonyPreview = document.getElementById('harmonyPreview');
    elements.displayFormat = document.getElementById('displayFormat');
    elements.exportCSS = document.getElementById('exportCSS');
    elements.exportSVG = document.getElementById('exportSVG');
    elements.saveProject = document.getElementById('saveProject');
    elements.loadProject = document.getElementById('loadProject');
    elements.fileInput = document.getElementById('fileInput');
}

// ============================================
// Initialization
// ============================================
function init() {
    // Cache DOM elements
    cacheElements();
    
    // Load saved state
    loadFromStorage();
    
    // Set initial values
    elements.harmonySelect.value = state.harmonyMode;
    elements.displayFormat.value = state.displayFormat;
    
    // Attach event listeners
    elements.colorPicker.addEventListener('input', handleColorPickerChange);
    elements.hexInput.addEventListener('input', handleHexInput);
    elements.hexInput.addEventListener('blur', () => elements.hexInput.classList.remove('error'));
    elements.harmonySelect.addEventListener('change', handleHarmonyChange);
    elements.displayFormat.addEventListener('change', handleDisplayFormatChange);
    elements.exportCSS.addEventListener('click', exportCSS);
    elements.exportSVG.addEventListener('click', exportSVG);
    elements.saveProject.addEventListener('click', saveProject);
    elements.loadProject.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', loadProject);
    
    // Attach listeners to base color controls
    attachVariationControlListeners(document.querySelector('.variations-section'));
    
    // Event delegation for color cards and swatches (CSP compliant)
    document.addEventListener('click', function(e) {
        const card = e.target.closest('.color-card');
        if (card) {
            // Check if edit button was clicked
            if (e.target.closest('.edit-color-btn')) {
                const index = parseInt(card.getAttribute('data-index'));
                const input = card.querySelector('.harmony-color-input');
                if (input && index > 0) {
                    input.click(); // Trigger color picker
                }
                return;
            }
            
            const hex = card.getAttribute('data-hex');
            if (hex) {
                copyToClipboard(hex, card);
            }
            return;
        }
        
        const swatch = e.target.closest('.color-swatch');
        if (swatch) {
            const hex = swatch.getAttribute('data-hex');
            if (hex) {
                copyToClipboard(hex, swatch);
            }
            return;
        }
    });
    
    // Handle harmony color input changes (color picker)
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('harmony-color-input')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const newColor = e.target.value;
            
            if (index > 0) {
                // Store the custom color
                state.customHarmonyColors[index] = newColor;
                
                // Update the harmonyColors array
                state.harmonyColors[index] = newColor;
                
                // Switch to Custom mode
                if (state.harmonyMode !== 'custom') {
                    state.harmonyMode = 'custom';
                    elements.harmonySelect.value = 'custom';
                }
                
                // Update UI
                updateHarmonyPreview();
                renderHarmonyVariations();
                saveToStorage();
            }
        }
    });
    
    // Initial render
    renderPalette();
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', init);