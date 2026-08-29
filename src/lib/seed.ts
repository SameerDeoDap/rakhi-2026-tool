import type { AppData, GoodsCategory, ServiceCategory } from './types';

/**
 * Default structure only — the app starts completely EMPTY.
 * Keeps the standard category framework (goods categories with product types,
 * 14 service categories with definitions, standard marketplace list lives in types.ts)
 * but zero seller accounts, zero transactions, zero stock.
 */
export function buildSeed(): AppData {
  const goodsCategories: GoodsCategory[] = [
    { id: 'gc-rakhi', name: 'Rakhi', productTypes: ['Single Rakhi', 'Couple Rakhi', 'Kids Rakhi', 'Rakhi Set'] },
    { id: 'gc-choc', name: 'Chocolate', productTypes: ['32g', '40g', '60g', '96g'] },
    { id: 'gc-box', name: 'Box', productTypes: ['Small Box', 'Medium Box', 'Premium Gift Box'] },
    { id: 'gc-gift', name: 'Gift Product', productTypes: ['Mug', 'Photo Frame', 'Combo Hamper'] },
    { id: 'gc-pack', name: 'Packaging', productTypes: ['Poly Mailer', 'Bubble Wrap', 'Tape & Labels'] },
    { id: 'gc-other', name: 'Other', productTypes: ['Misc'] },
  ];

  const serviceCategories: ServiceCategory[] = [
    { id: 'sc-ads', name: 'Paid Advertising', group: 'advertising', definition: 'Amazon/Flipkart/Meesho/Meta/Google paid ad campaigns for Rakhi 2026.' },
    { id: 'sc-oms', name: 'OMS Guru', group: 'service', definition: 'Order management system subscription and usage fees.' },
    { id: 'sc-soft', name: 'Software', group: 'service', definition: 'SaaS tools used for the Rakhi project (design, listing, analytics).' },
    { id: 'sc-salary', name: 'Salary', group: 'hr', definition: 'Salaries of permanent staff allocated to the Rakhi project.' },
    { id: 'sc-temp', name: 'Temporary Manpower', group: 'hr', definition: 'Contract/temporary packing, sorting and warehouse staff for the season.' },
    { id: 'sc-infl', name: 'Influencer', group: 'service', definition: 'Paid influencer collaborations for Rakhi promotions.' },
    { id: 'sc-barter', name: 'Barter Video', group: 'service', definition: 'Product-cost of barter collaborations (goods given in exchange for videos).' },
    { id: 'sc-reviews', name: 'Reviews & Ratings', group: 'service', definition: 'Costs of review/rating generation and sampling programs.' },
    { id: 'sc-content', name: 'Content Creation', group: 'service', definition: 'Photoshoots, reels, listing A+ content creation costs.' },
    { id: 'sc-logistics', name: 'Logistics', group: 'service', definition: 'Inbound freight, inter-warehouse transfers, packaging-in-transit costs.' },
    { id: 'sc-photo', name: 'Photography', group: 'service', definition: 'Product photography and model shoots.' },
    { id: 'sc-tech', name: 'Technology', group: 'service', definition: 'Website, servers, integrations and one-off tech work for the season.' },
    { id: 'sc-prof', name: 'Professional Services', group: 'service', definition: 'CA, legal, compliance and consulting fees.' },
    { id: 'sc-other', name: 'Other Services', group: 'service', definition: 'Any other service expense not covered above.' },
  ];

  return {
    version: 1,
    sellerAccounts: [],
    goodsCategories,
    serviceCategories,
    income: [],
    goods: [],
    services: [],
    stock: [],
    duplicates: [],
    settings: {
      allocationMethod: 'revenue',
      manualPercents: {},
    },
    seeded: false,
  };
}
