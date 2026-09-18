export type ContentType = 'offer' | 'festival' | 'service' | 'educational';
export type StyleMood = 'bold' | 'minimal' | 'festive' | 'professional' | 'playful' | 'premium';
export type ZoneType = 'text' | 'image' | 'logo' | 'shape';

export interface ZonePosition {
  x: number; // 0 to 1080
  y: number; // 0 to 1080
  width: number;
  height: number;
}

export interface ZoneStyle {
  fontSize?: number;
  fontWeight?: number | string;
  color?: string; // Hex color or special tokens: 'primary', 'secondary', '#ffffff', etc.
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  borderRadius?: number;
  objectFit?: 'cover' | 'contain';
  opacity?: number;
  padding?: number;
  borderWidth?: number;
  borderColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  boxShadow?: string;
}

export interface TemplateZone {
  id: string;
  type: ZoneType;
  position: ZonePosition;
  style: ZoneStyle;
  contentKey?: 'headline' | 'caption' | 'ctaText' | 'businessName' | 'logoUrl' | 'photoUrl' | 'tag';
  staticText?: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  contentType: ContentType;
  styleMood: StyleMood;
  canvas: { width: number; height: number };
  defaultBackground: string;
  zones: TemplateZone[];
}

export interface RenderTemplateInput {
  headline?: string;
  caption?: string;
  ctaText?: string;
  logoUrl?: string;
  photoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  businessName?: string;
  tag?: string;
}
