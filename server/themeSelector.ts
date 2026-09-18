import { ContentType, TemplateDefinition } from './templates/types';
import { TEMPLATE_DEFINITIONS, getTemplateById } from './templates/definitions';
import {
  ColorPalette,
  getPalettesForContentType,
  getPaletteById,
  getAllPalettes,
} from './templates/palettes';
import { recordThemeUsage, getRecentThemeHistory } from './db';

export interface PickThemeOptions {
  companyId: string;
  contentType?: ContentType | string;
  brandPrimaryColor?: string;
  requestedTemplateId?: string;
  requestedPaletteId?: string;
}

export interface SelectedThemeResult {
  templateId: string;
  template: TemplateDefinition;
  paletteId: string;
  palette: ColorPalette;
}

/**
 * Normalizes input string to supported ContentType
 */
function normalizeContentType(type?: string): ContentType {
  const clean = (type || '').toLowerCase().trim();
  if (clean === 'festival') return 'festival';
  if (clean === 'service') return 'service';
  if (clean === 'educational') return 'educational';
  return 'offer';
}

/**
 * Intelligent Combinatorial Theme & Palette Rotation Engine
 *
 * Guarantees that:
 * 1. The exact same (templateId + paletteId) combo NEVER repeats within any 5-generation window for the same company.
 * 2. Festival content pulls from seasonal/festive color schemes (Diwali, Monsoon, Holi, Eid, Navratri).
 * 3. Offer, service, and educational content dynamically rotates brand-derived harmonies and modern editorial palettes.
 * 4. Fallback is gracefully resilient using least-recently-used heuristics if all combinations were somehow exhausted.
 */
export async function pickThemeForCompany(options: PickThemeOptions): Promise<SelectedThemeResult> {
  const {
    companyId,
    contentType: rawContentType,
    brandPrimaryColor,
    requestedTemplateId,
    requestedPaletteId,
  } = options;

  const contentType = normalizeContentType(rawContentType);

  // 1. Candidate Templates
  let candidateTemplates: TemplateDefinition[];
  if (requestedTemplateId && requestedTemplateId !== 'auto') {
    const directTemplate = getTemplateById(requestedTemplateId);
    candidateTemplates = directTemplate ? [directTemplate] : TEMPLATE_DEFINITIONS;
  } else {
    candidateTemplates = TEMPLATE_DEFINITIONS.filter((t) => t.contentType === contentType);
    if (candidateTemplates.length === 0) {
      candidateTemplates = TEMPLATE_DEFINITIONS;
    }
  }

  // 2. Candidate Palettes
  let candidatePalettes: ColorPalette[];
  if (requestedPaletteId && requestedPaletteId !== 'auto') {
    const directPalette = getPaletteById(requestedPaletteId, brandPrimaryColor);
    candidatePalettes = directPalette ? [directPalette] : getPalettesForContentType(contentType, brandPrimaryColor);
  } else {
    candidatePalettes = getPalettesForContentType(contentType, brandPrimaryColor);
    if (candidatePalettes.length === 0) {
      candidatePalettes = getAllPalettes(brandPrimaryColor);
    }
  }

  // 3. Build all combinatorial pairs (e.g. 4 templates x 7-10 palettes = 28-40 variations)
  const allCombinations: Array<{ template: TemplateDefinition; palette: ColorPalette }> = [];
  for (const template of candidateTemplates) {
    for (const palette of candidatePalettes) {
      allCombinations.push({ template, palette });
    }
  }

  // 4. Retrieve recent history for this company (last 5 used combinations)
  const recentHistory = await getRecentThemeHistory(companyId, 5);

  // 5. Filter out combinations used in the last 5 generations
  const unusedCombinations = allCombinations.filter((combo) => {
    return !recentHistory.some(
      (h) => h.templateId === combo.template.id && h.paletteId === combo.palette.id
    );
  });

  let chosenCombo: { template: TemplateDefinition; palette: ColorPalette };

  if (unusedCombinations.length > 0) {
    // Further refinement: prioritize combinations where the template is also different from the very last generation
    const lastUsedTemplateId = recentHistory[0]?.templateId;
    const differentTemplatePool = unusedCombinations.filter(
      (c) => c.template.id !== lastUsedTemplateId
    );

    const selectionPool = differentTemplatePool.length > 0 ? differentTemplatePool : unusedCombinations;
    // Pick randomly from the fresh candidates to maximize variety
    const randomIndex = Math.floor(Math.random() * selectionPool.length);
    chosenCombo = selectionPool[randomIndex];
  } else {
    // Fallback: If all combinations were somehow used in the last 5 (e.g. only 1 template and 1 palette available),
    // pick the combination that appeared earliest (least recently used)
    let bestCombo = allCombinations[0];
    let maxDistance = -1;

    for (const combo of allCombinations) {
      const idxInHistory = recentHistory.findIndex(
        (h) => h.templateId === combo.template.id && h.paletteId === combo.palette.id
      );
      // Not in history = infinite distance
      const distance = idxInHistory === -1 ? 999 : idxInHistory;
      if (distance > maxDistance) {
        maxDistance = distance;
        bestCombo = combo;
      }
    }

    chosenCombo = bestCombo;
  }

  // 6. Record the choice asynchronously in the theme history database
  await recordThemeUsage(companyId, chosenCombo.template.id, chosenCombo.palette.id);

  return {
    templateId: chosenCombo.template.id,
    template: chosenCombo.template,
    paletteId: chosenCombo.palette.id,
    palette: chosenCombo.palette,
  };
}
