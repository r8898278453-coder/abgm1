import {z} from 'zod';
import {validWorkspaceRevision} from './workspaceRevision';
export const SOURCE_MAX_BYTES=2*1024*1024;
export const KNOWLEDGE_TEXT_MAX_BYTES=512*1024;
export const knowledgeQueryInput=z.object({companyId:z.string().min(1).max(64),query:z.string().trim().min(2).max(1000)}).strict();
export const sourceRevisionInput=z.object({expectedVersion:z.string().refine(validWorkspaceRevision)}).strict();
export type KnowledgeChunk={index:number;page:number|null;start:number;end:number;text:string};
export type SourceState='STORED'|'PROCESSING'|'EXTRACTED'|'NEEDS_OCR'|'UNSUPPORTED'|'FAILED';
export interface KnowledgeSource{id:string;companyId:string;filename:string;mediaType:string;byteSize:number;contentSha:string;state:SourceState;code:string|null;version:string;approved:boolean;createdAtMs:number;sourceUrl?:string|null;fetchedAtMs?:number|null;}
export function sourceExplanation(code:string|null){return ({FILE_SIGNATURE_MISMATCH:'The file content does not match its extension. Use the supported original format.',EMPTY_TEXT:'The supported text area contains no usable text.',WEBSITE_STATIC_TEXT:'Static website text extracted; review before approval. Website completeness is unverified.',TEXT_EXTRACTED:'Text extracted; review before approval.',DOCX_BODY_TEXT_ONLY:'Document body extracted. Headers, footnotes and images are excluded.',PDF_PARSER_UNAVAILABLE:'PDF extraction is unavailable on this server.',NO_TEXT_EXTRACTED:'No text extracted. OCR or a text version is needed.',PDF_UNREADABLE:'PDF could not be read; it may be corrupt or protected.',PDF_PAGE_LIMIT:'PDF exceeds the supported page limit.',SOURCE_UNREADABLE:'Source could not be read.',UTF8_REQUIRED:'A UTF-8 text file is required.',FILE_TYPE_UNSUPPORTED:'This file type is not supported.',EXTRACTION_CAPACITY:'Extraction capacity was reached. Retry later.'} as Record<string,string>)[code||'']||'Check the source state and review any available extracted text.';}
