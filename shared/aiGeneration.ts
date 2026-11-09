import {z} from 'zod';
export const generatedText=z.string().trim().min(1).max(30000);
export const contentSchema=z.object({headline:generatedText.optional(),caption:generatedText,callToAction:generatedText.optional(),hashtags:z.array(z.string().max(200)).max(50).optional(),googlePostSnippet:generatedText.optional(),reelScript:z.array(z.object({scene:generatedText,visual:generatedText,audio:generatedText})).max(30).optional()});
