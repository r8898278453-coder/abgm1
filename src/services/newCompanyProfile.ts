import type {BusinessProfile,CompanyRecord} from '../types';
/** User-supplied identity is setup data, never proof of provider connection or unentered business facts. */
export function newCompanyProfile(company:CompanyRecord,input:{category:string;city:string;phone:string;website:string}):BusinessProfile{
const {category,city,phone,website}=input;return {
        id: company.id,
        name: company.name,
        category,
        subCategory: category,
        address: '',
        city: city.trim(),
        state: '',
        country: '',
        phone: phone.trim() || '',
        email: '',
        website: website.trim() || '',
        whatsapp: phone.trim() || '',
        description: '',
        services: [],
        products: [],
        priceRange: '',
        openingHours: '',
        serviceAreas: [],
        brandKit: {
          logoUrl: '',
          primaryColor: '#4f46e5',
          secondaryColor: '#0f172a',
          fontFamily: 'Plus Jakarta Sans',
          tagline: '',
          brandTone: '',
          preferredLanguage: 'English',
        },
        connectedAccounts: {
          googleBusiness: false,
          metaFacebook: false,
          metaInstagram: false,
          whatsappBusiness: false,
          telegramBot: false,
          website: false,
        },
      };
}
