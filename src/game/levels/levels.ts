import { createLevelCatalog } from './level-generator';
import { validateLevelCollection } from './schema';

export const LEVELS = createLevelCatalog();

validateLevelCollection(LEVELS);
