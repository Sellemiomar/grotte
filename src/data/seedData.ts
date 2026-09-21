import { 
  Ingredient, 
  Supplier, 
  MenuItem, 
  RecipeIngredient, 
  Delivery, 
  StockCount, 
  Sale, 
  Staff, 
  AccessLog, 
  PosVoid,
  WasteLog
} from '../types';

export const INITIAL_STAFF: Staff[] = [
  { id: 'stf-1', name: 'Omar Sellemi', role: 'owner', roleTitle: 'Propriétaire & Gérant', email: 'owner@lagrotte.tn', active: true },
  { id: 'stf-2', name: 'Karim Ben Salem', role: 'stock_manager', roleTitle: 'Responsable Économat & Stocks', email: 'stock@lagrotte.tn', active: true },
  { id: 'stf-3', name: 'Chef Marc', role: 'cook', roleTitle: 'Chef de Cuisine', email: 'cook@lagrotte.tn', active: true },
  { id: 'stf-4', name: 'Youssef', role: 'server', roleTitle: 'Serveur Chef de Rang & Caisse', email: 'server@lagrotte.tn', active: true },
  { id: 'stf-5', name: 'Sarah', role: 'server', roleTitle: 'Responsable Bar & Salle', email: 'sarah@lagrotte.tn', active: true },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', name: 'Boucherie Centrale Provençale', contact: '04 91 22 33 44 (Laurent)', notes: 'Livraison Viandes mardi & vendredi matin' },
  { id: 'sup-2', name: 'Fromagerie des Alpilles', contact: '04 90 55 66 77 (Claire)', notes: 'Mozzarella & Parmesan AOP frais' },
  { id: 'sup-3', name: 'Boissons & Vins du Midi', contact: '04 91 88 99 00 (Marc)', notes: 'Fûts, Vins en cubi/bouteilles, Sodas' },
  { id: 'sup-4', name: 'Primeurs de la Vallée', contact: '06 12 34 56 78 (Karim)', notes: 'Pommes de terre, roquette, légumes frais' },
  { id: 'sup-5', name: 'Meunerie & Épicerie Fine', contact: '04 42 11 22 33 (Sophie)', notes: 'Farine T55, coulis tomate San Marzano, huile olive' },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-1',
    name: 'Merguez de Taureau',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 12.00,
    current_stock: 8.5,
    min_alert_threshold: 5.0,
    location: 'Chambre Froide Viandes',
    barcode: '619001001001',
  },
  {
    id: 'ing-2',
    name: 'Mozzarella Fior di Latte',
    unit: 'kg',
    category: 'dairy',
    cost_per_unit: 9.20,
    current_stock: 11.2,
    min_alert_threshold: 6.0,
    location: 'Chambre Froide Pizzeria',
    barcode: '619001001002',
  },
  {
    id: 'ing-3',
    name: 'Entrecôte Charolaise',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 24.50,
    current_stock: 6.2,
    min_alert_threshold: 4.0,
    location: 'Chambre Froide Viandes',
    barcode: '619001001003',
  },
  {
    id: 'ing-4',
    name: 'Farine Pizza T55',
    unit: 'kg',
    category: 'other',
    cost_per_unit: 1.40,
    current_stock: 35.0,
    min_alert_threshold: 15.0,
    location: 'Réserve Sèche Pizzeria',
    barcode: '619001001004',
  },
  {
    id: 'ing-5',
    name: 'Sauce Tomate San Marzano',
    unit: 'kg',
    category: 'other',
    cost_per_unit: 3.20,
    current_stock: 18.0,
    min_alert_threshold: 8.0,
    location: 'Réserve Sèche Pizzeria',
    barcode: '619001001005',
  },
  {
    id: 'ing-6',
    name: 'Huile d\'Olive Vierge Extra',
    unit: 'L',
    category: 'other',
    cost_per_unit: 11.50,
    current_stock: 9.0,
    min_alert_threshold: 3.0,
    location: 'Cuisine Principale',
    barcode: '619001001006',
  },
  {
    id: 'ing-7',
    name: 'Vin Rouge Côtes du Rhône AOP',
    unit: 'L',
    category: 'alcohol',
    cost_per_unit: 7.00,
    current_stock: 14.5,
    min_alert_threshold: 8.0,
    location: 'Cave du Bar',
    barcode: '619001001007',
  },
  {
    id: 'ing-8',
    name: 'Bière Pression Blonde Artisanale',
    unit: 'L',
    category: 'alcohol',
    cost_per_unit: 4.20,
    current_stock: 32.0,
    min_alert_threshold: 20.0,
    location: 'Chambre Fûts Bar',
    barcode: '619001001008',
  },
  {
    id: 'ing-9',
    name: 'Coca-Cola 33cl',
    unit: 'piece',
    category: 'beverage',
    cost_per_unit: 0.85,
    current_stock: 48,
    min_alert_threshold: 24,
    location: 'Frigo Bar Boissons',
    barcode: '619001001009',
  },
  {
    id: 'ing-10',
    name: 'Pommes de Terre Spécial Frites',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 1.25,
    current_stock: 28.0,
    min_alert_threshold: 15.0,
    location: 'Réserve Légumes',
    barcode: '619001001010',
  },
  {
    id: 'ing-11',
    name: 'Salade Roquette',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 8.50,
    current_stock: 2.8,
    min_alert_threshold: 1.5,
    location: 'Chambre Froide Légumes',
    barcode: '619001001011',
  },
  {
    id: 'ing-12',
    name: 'Parmesan Reggiano Râpé',
    unit: 'kg',
    category: 'dairy',
    cost_per_unit: 21.00,
    current_stock: 3.4,
    min_alert_threshold: 1.5,
    location: 'Chambre Froide Pizzeria',
    barcode: '619001001012',
  },
  {
    id: 'ing-13',
    name: 'Pain Burger Brioché',
    unit: 'piece',
    category: 'other',
    cost_per_unit: 0.70,
    current_stock: 32,
    min_alert_threshold: 12,
    location: 'Cuisine Principale',
    barcode: '619001001013',
  },
  {
    id: 'ing-14',
    name: 'Steak Haché Bœuf Frais 15%',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 14.20,
    current_stock: 7.5,
    min_alert_threshold: 4.0,
    location: 'Chambre Froide Viandes',
    barcode: '619001001014',
  },
  {
    id: 'ing-15',
    name: 'Café Grains Pur Arabica',
    unit: 'kg',
    category: 'beverage',
    cost_per_unit: 18.00,
    current_stock: 4.2,
    min_alert_threshold: 2.0,
    location: 'Bar Comptoir',
    barcode: '619001001015',
  },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  { id: 'menu-1', name: 'Assiette Merguez Grillées & Frites', pos_reference: 'POS-MRGZ-FRT', category: 'Plats', selling_price: 16.50 },
  { id: 'menu-2', name: 'Pizza Margherita La Grotte', pos_reference: 'POS-PZ-MARG', category: 'Pizzas', selling_price: 13.00 },
  { id: 'menu-3', name: 'Burger Maison La Grotte & Frites', pos_reference: 'POS-BRG-GROT', category: 'Burgers', selling_price: 17.50 },
  { id: 'menu-4', name: 'Entrecôte Charolaise 300g', pos_reference: 'POS-ENTR-300', category: 'Grillades', selling_price: 24.00 },
  { id: 'menu-5', name: 'Salade Roquette & Copeaux Parmesan', pos_reference: 'POS-SAL-ROQ', category: 'Entrées', selling_price: 9.50 },
  { id: 'menu-6', name: 'Pichet 50cl Côtes du Rhône AOP', pos_reference: 'POS-VIN-PICH50', category: 'Vins', selling_price: 11.00 },
  { id: 'menu-7', name: 'Pinte Bière Blonde Pression 50cl', pos_reference: 'POS-BIER-PNT50', category: 'Bar', selling_price: 7.50 },
  { id: 'menu-8', name: 'Coca-Cola 33cl', pos_reference: 'POS-SODA-COCA', category: 'Boissons', selling_price: 3.80 },
  { id: 'menu-9', name: 'Café Espresso', pos_reference: 'POS-CAFE-ESP', category: 'Cafés', selling_price: 2.20 },
  { id: 'menu-10', name: 'Ojja Merguez Tunisienne', pos_reference: 'POS-OJJA-MRGZ', category: 'Plats', selling_price: 14.50 },
  { id: 'menu-11', name: 'Pizza 4 Fromages La Grotte', pos_reference: 'POS-PZ-4FROM', category: 'Pizzas', selling_price: 15.50 },
  { id: 'menu-12', name: 'Double Cheese Burger & Frites', pos_reference: 'POS-BRG-DBL', category: 'Burgers', selling_price: 19.50 },
  { id: 'menu-13', name: 'Demi-Pression Blonde 25cl', pos_reference: 'POS-BIER-DEMI', category: 'Bar', selling_price: 4.50 },
  { id: 'menu-14', name: 'Verre de Vin Rouge 12cl', pos_reference: 'POS-VIN-VR12', category: 'Vins', selling_price: 4.20 },
  { id: 'menu-15', name: 'Salade Mixte Fraîcheur', pos_reference: 'POS-SAL-MIXT', category: 'Entrées', selling_price: 8.50 },
  { id: 'menu-16', name: 'Café Allongé / Américain', pos_reference: 'POS-CAFE-ALL', category: 'Cafés', selling_price: 2.50 },
];

export const INITIAL_RECIPE_INGREDIENTS: RecipeIngredient[] = [
  // Assiette Merguez: 0.25 kg Merguez, 0.30 kg Frites
  { id: 'ri-1', menu_item_id: 'menu-1', ingredient_id: 'ing-1', quantity_per_unit: 0.25 },
  { id: 'ri-2', menu_item_id: 'menu-1', ingredient_id: 'ing-10', quantity_per_unit: 0.30 },

  // Pizza Margherita: 0.20 kg Farine, 0.12 kg Tomate, 0.15 kg Mozzarella, 0.02 L Huile d'olive
  { id: 'ri-3', menu_item_id: 'menu-2', ingredient_id: 'ing-4', quantity_per_unit: 0.20 },
  { id: 'ri-4', menu_item_id: 'menu-2', ingredient_id: 'ing-5', quantity_per_unit: 0.12 },
  { id: 'ri-5', menu_item_id: 'menu-2', ingredient_id: 'ing-2', quantity_per_unit: 0.15 },
  { id: 'ri-6', menu_item_id: 'menu-2', ingredient_id: 'ing-6', quantity_per_unit: 0.02 },

  // Burger Maison: 1 Pain, 0.18 kg Steak Bœuf, 0.04 kg Mozzarella, 0.25 kg Frites
  { id: 'ri-7', menu_item_id: 'menu-3', ingredient_id: 'ing-13', quantity_per_unit: 1.0 },
  { id: 'ri-8', menu_item_id: 'menu-3', ingredient_id: 'ing-14', quantity_per_unit: 0.18 },
  { id: 'ri-9', menu_item_id: 'menu-3', ingredient_id: 'ing-2', quantity_per_unit: 0.04 },
  { id: 'ri-10', menu_item_id: 'menu-3', ingredient_id: 'ing-10', quantity_per_unit: 0.25 },

  // Entrecôte 300g: 0.32 kg Entrecôte (avec parage), 0.30 kg Frites
  { id: 'ri-11', menu_item_id: 'menu-4', ingredient_id: 'ing-3', quantity_per_unit: 0.32 },
  { id: 'ri-12', menu_item_id: 'menu-4', ingredient_id: 'ing-10', quantity_per_unit: 0.30 },

  // Salade Roquette: 0.08 kg Roquette, 0.03 kg Parmesan, 0.02 L Huile d'olive
  { id: 'ri-13', menu_item_id: 'menu-5', ingredient_id: 'ing-11', quantity_per_unit: 0.08 },
  { id: 'ri-14', menu_item_id: 'menu-5', ingredient_id: 'ing-12', quantity_per_unit: 0.03 },
  { id: 'ri-15', menu_item_id: 'menu-5', ingredient_id: 'ing-6', quantity_per_unit: 0.02 },

  // Pichet Vin: 0.50 L Côtes du Rhône
  { id: 'ri-16', menu_item_id: 'menu-6', ingredient_id: 'ing-7', quantity_per_unit: 0.50 },

  // Pinte Bière: 0.50 L Bière Pression
  { id: 'ri-17', menu_item_id: 'menu-7', ingredient_id: 'ing-8', quantity_per_unit: 0.50 },

  // Coca-Cola: 1 Canette
  { id: 'ri-18', menu_item_id: 'menu-8', ingredient_id: 'ing-9', quantity_per_unit: 1.0 },

  // Espresso: 0.01 kg (10g) Café Grains
  { id: 'ri-19', menu_item_id: 'menu-9', ingredient_id: 'ing-15', quantity_per_unit: 0.01 },

  // Ojja Merguez: 0.15 kg Merguez, 0.15 kg Tomate, 0.02 L Huile d'olive
  { id: 'ri-20', menu_item_id: 'menu-10', ingredient_id: 'ing-1', quantity_per_unit: 0.15 },
  { id: 'ri-21', menu_item_id: 'menu-10', ingredient_id: 'ing-5', quantity_per_unit: 0.15 },
  { id: 'ri-22', menu_item_id: 'menu-10', ingredient_id: 'ing-6', quantity_per_unit: 0.02 },

  // Pizza 4 Fromages: 0.20 kg Farine, 0.12 kg Tomate, 0.18 kg Mozzarella, 0.04 kg Parmesan
  { id: 'ri-23', menu_item_id: 'menu-11', ingredient_id: 'ing-4', quantity_per_unit: 0.20 },
  { id: 'ri-24', menu_item_id: 'menu-11', ingredient_id: 'ing-5', quantity_per_unit: 0.12 },
  { id: 'ri-25', menu_item_id: 'menu-11', ingredient_id: 'ing-2', quantity_per_unit: 0.18 },
  { id: 'ri-26', menu_item_id: 'menu-11', ingredient_id: 'ing-12', quantity_per_unit: 0.04 },

  // Double Cheese Burger: 1 Pain, 0.30 kg Steak, 0.08 kg Mozzarella, 0.25 kg Frites
  { id: 'ri-27', menu_item_id: 'menu-12', ingredient_id: 'ing-13', quantity_per_unit: 1.0 },
  { id: 'ri-28', menu_item_id: 'menu-12', ingredient_id: 'ing-14', quantity_per_unit: 0.30 },
  { id: 'ri-29', menu_item_id: 'menu-12', ingredient_id: 'ing-2', quantity_per_unit: 0.08 },
  { id: 'ri-30', menu_item_id: 'menu-12', ingredient_id: 'ing-10', quantity_per_unit: 0.25 },

  // Demi Bière 25cl: 0.25 L
  { id: 'ri-31', menu_item_id: 'menu-13', ingredient_id: 'ing-8', quantity_per_unit: 0.25 },

  // Verre Vin 12cl: 0.12 L
  { id: 'ri-32', menu_item_id: 'menu-14', ingredient_id: 'ing-7', quantity_per_unit: 0.12 },

  // Salade Mixte: 0.10 kg Roquette, 0.02 L Huile d'olive
  { id: 'ri-33', menu_item_id: 'menu-15', ingredient_id: 'ing-11', quantity_per_unit: 0.10 },
  { id: 'ri-34', menu_item_id: 'menu-15', ingredient_id: 'ing-6', quantity_per_unit: 0.02 },

  // Café Allongé: 0.01 kg Café Grains
  { id: 'ri-35', menu_item_id: 'menu-16', ingredient_id: 'ing-15', quantity_per_unit: 0.01 },
];

export const INITIAL_DELIVERIES: Delivery[] = [
  { id: 'del-1', ingredient_id: 'ing-1', supplier_id: 'sup-1', quantity: 15.0, unit_cost: 12.00, date: '2026-09-04', received_by: 'Marc', notes: 'Colis 15kg Merguez fraîches - signé chef' },
  { id: 'del-2', ingredient_id: 'ing-2', supplier_id: 'sup-2', quantity: 20.0, unit_cost: 9.20, date: '2026-09-04', received_by: 'Karim', notes: '2 cartons Mozzarella 10kg' },
  { id: 'del-3', ingredient_id: 'ing-3', supplier_id: 'sup-1', quantity: 12.0, unit_cost: 24.50, date: '2026-09-04', received_by: 'Marc', notes: 'Pièces entrecôte sous vide - pesé en réception' },
  { id: 'del-4', ingredient_id: 'ing-7', supplier_id: 'sup-3', quantity: 25.0, unit_cost: 7.00, date: '2026-09-03', received_by: 'Sarah', notes: 'Bib vin rouge 25L' },
  { id: 'del-5', ingredient_id: 'ing-8', supplier_id: 'sup-3', quantity: 60.0, unit_cost: 4.20, date: '2026-09-03', received_by: 'Sarah', notes: '2 fûts de 30L' },
  { id: 'del-6', ingredient_id: 'ing-9', supplier_id: 'sup-3', quantity: 72, unit_cost: 0.85, date: '2026-09-03', received_by: 'Julien', notes: '3 packs de 24 canettes' },
  { id: 'del-7', ingredient_id: 'ing-10', supplier_id: 'sup-4', quantity: 50.0, unit_cost: 1.25, date: '2026-09-04', received_by: 'Karim', notes: '2 sacs de 25kg' },
  { id: 'del-8', ingredient_id: 'ing-14', supplier_id: 'sup-1', quantity: 10.0, unit_cost: 14.20, date: '2026-09-05', received_by: 'Marc', notes: 'Bœuf haché frais' },
];

export const INITIAL_STOCK_COUNTS: StockCount[] = [
  // Opening stock snapshot (Sept 01, 2026) - Matin (ouverture)
  { id: 'cnt-op-1', ingredient_id: 'ing-1', counted_quantity: 4.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine', photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=60' },
  { id: 'cnt-op-2', ingredient_id: 'ing-2', counted_quantity: 5.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-3', ingredient_id: 'ing-3', counted_quantity: 3.5, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine', photo_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=60' },
  { id: 'cnt-op-4', ingredient_id: 'ing-4', counted_quantity: 45.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-5', ingredient_id: 'ing-5', counted_quantity: 24.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-6', ingredient_id: 'ing-6', counted_quantity: 11.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-7', ingredient_id: 'ing-7', counted_quantity: 6.0, date: '2026-09-01', shift: 'morning', counted_by: 'Sarah', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-8', ingredient_id: 'ing-8', counted_quantity: 15.0, date: '2026-09-01', shift: 'morning', counted_by: 'Sarah', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-9', ingredient_id: 'ing-9', counted_quantity: 24, date: '2026-09-01', shift: 'morning', counted_by: 'Sarah', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-10', ingredient_id: 'ing-10', counted_quantity: 18.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-11', ingredient_id: 'ing-11', counted_quantity: 4.5, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-12', ingredient_id: 'ing-12', counted_quantity: 4.2, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-13', ingredient_id: 'ing-13', counted_quantity: 14, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-14', ingredient_id: 'ing-14', counted_quantity: 3.0, date: '2026-09-01', shift: 'morning', counted_by: 'Marc', notes: 'Inventaire début de semaine' },
  { id: 'cnt-op-15', ingredient_id: 'ing-15', counted_quantity: 5.5, date: '2026-09-01', shift: 'morning', counted_by: 'Sarah', notes: 'Inventaire début de semaine' },

  // Mid-week check snapshot (Sept 05, 2026) - Soir
  { id: 'cnt-mid-1', ingredient_id: 'ing-1', counted_quantity: 11.2, date: '2026-09-05', shift: 'evening', counted_by: 'Karim', notes: 'Comptage intermédiaire samedi soir' },
  { id: 'cnt-mid-3', ingredient_id: 'ing-3', counted_quantity: 8.0, date: '2026-09-05', shift: 'evening', counted_by: 'Karim', notes: 'Comptage viandes nobles', photo_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=60' },
  { id: 'cnt-mid-7', ingredient_id: 'ing-7', counted_quantity: 18.0, date: '2026-09-05', shift: 'evening', counted_by: 'Julien', notes: 'Comptage bar' },

  // Closing stock snapshot (Sept 07, 2026) - Soir (clôture)
  { id: 'cnt-cl-1', ingredient_id: 'ing-1', counted_quantity: 8.5, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir', photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=60' },
  { id: 'cnt-cl-2', ingredient_id: 'ing-2', counted_quantity: 11.2, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-3', ingredient_id: 'ing-3', counted_quantity: 6.2, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir - boîte sous vide vérifiée', photo_url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&auto=format&fit=crop&q=60' },
  { id: 'cnt-cl-4', ingredient_id: 'ing-4', counted_quantity: 35.0, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-5', ingredient_id: 'ing-5', counted_quantity: 18.0, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-6', ingredient_id: 'ing-6', counted_quantity: 9.0, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-7', ingredient_id: 'ing-7', counted_quantity: 14.5, date: '2026-09-07', shift: 'evening', counted_by: 'Sarah', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-8', ingredient_id: 'ing-8', counted_quantity: 32.0, date: '2026-09-07', shift: 'evening', counted_by: 'Sarah', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-9', ingredient_id: 'ing-9', counted_quantity: 48, date: '2026-09-07', shift: 'evening', counted_by: 'Sarah', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-10', ingredient_id: 'ing-10', counted_quantity: 28.0, date: '2026-09-07', shift: 'evening', counted_by: 'Omar', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-11', ingredient_id: 'ing-11', counted_quantity: 2.8, date: '2026-09-07', shift: 'evening', counted_by: 'Marc', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-12', ingredient_id: 'ing-12', counted_quantity: 3.4, date: '2026-09-07', shift: 'evening', counted_by: 'Marc', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-13', ingredient_id: 'ing-13', counted_quantity: 32, date: '2026-09-07', shift: 'evening', counted_by: 'Marc', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-14', ingredient_id: 'ing-14', counted_quantity: 7.5, date: '2026-09-07', shift: 'evening', counted_by: 'Marc', notes: 'Comptage physique dimanche soir' },
  { id: 'cnt-cl-15', ingredient_id: 'ing-15', counted_quantity: 4.2, date: '2026-09-07', shift: 'evening', counted_by: 'Sarah', notes: 'Comptage physique dimanche soir' },
];

export const INITIAL_SALES: Sale[] = [
  // POS Export for the week
  { id: 'sal-1', menu_item_id: 'menu-1', quantity_sold: 32, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Assiette Merguez
  { id: 'sal-2', menu_item_id: 'menu-2', quantity_sold: 48, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Pizza Margherita
  { id: 'sal-3', menu_item_id: 'menu-3', quantity_sold: 26, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Burger Maison
  { id: 'sal-4', menu_item_id: 'menu-4', quantity_sold: 24, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Entrecôte 300g
  { id: 'sal-5', menu_item_id: 'menu-5', quantity_sold: 18, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Salade Roquette
  { id: 'sal-6', menu_item_id: 'menu-6', quantity_sold: 28, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Pichet Vin 50cl
  { id: 'sal-7', menu_item_id: 'menu-7', quantity_sold: 80, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Pinte Bière 50cl
  { id: 'sal-8', menu_item_id: 'menu-8', quantity_sold: 48, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Coca-Cola
  { id: 'sal-9', menu_item_id: 'menu-9', quantity_sold: 120, date: '2026-09-07', source: 'POS export 2026-09-07' }, // Café Espresso
];

export const INITIAL_ACCESS_LOGS: AccessLog[] = [
  // Correlated to the suspicious gaps (Chambre Froide Viandes & Cave du Bar during week 36)
  { id: 'acc-1', staff_id: 'stf-2', staff_name: 'Marc', action: 'entry', location: 'Chambre Froide Viandes', timestamp_in: '2026-09-04T09:15:00', timestamp: '2026-09-04 09:15', timestamp_out: '2026-09-04T09:35:00', notes: 'Réception viandes fournisseur' },
  { id: 'acc-2', staff_id: 'stf-4', staff_name: 'Sarah', action: 'entry', location: 'Chambre Froide Viandes', timestamp_in: '2026-09-05T15:40:00', timestamp: '2026-09-05 15:40', timestamp_out: '2026-09-05T15:55:00', notes: 'Mise en place service soir' },
  { id: 'acc-3', staff_id: 'stf-5', staff_name: 'Karim', action: 'entry', location: 'Chambre Froide Viandes', timestamp_in: '2026-09-06T23:45:00', timestamp: '2026-09-06 23:45', timestamp_out: '2026-09-07T00:10:00', notes: 'Nettoyage fin de service samedi soir' },
  { id: 'acc-4', staff_id: 'stf-3', staff_name: 'Julien', action: 'entry', location: 'Cave du Bar', timestamp_in: '2026-09-03T16:00:00', timestamp: '2026-09-03 16:00', timestamp_out: '2026-09-03T16:30:00', notes: 'Mise en cave fûts et cartons vins' },
  { id: 'acc-5', staff_id: 'stf-5', staff_name: 'Karim', action: 'entry', location: 'Cave du Bar', timestamp_in: '2026-09-06T00:20:00', timestamp: '2026-09-06 00:20', timestamp_out: '2026-09-06T00:40:00', notes: 'Réassort bouteilles fin de shift' },
  { id: 'acc-6', staff_id: 'stf-1', staff_name: 'Omar', action: 'entry', location: 'Chambre Froide Viandes', timestamp_in: '2026-09-07T21:30:00', timestamp: '2026-09-07 21:30', timestamp_out: '2026-09-07T22:15:00', notes: 'Contrôle inventaire hebdomadaire' },
  { id: 'acc-7', staff_id: 'stf-2', staff_name: 'Marc', action: 'entry', location: 'Chambre Froide Pizzeria', timestamp_in: '2026-09-06T11:00:00', timestamp: '2026-09-06 11:00', timestamp_out: '2026-09-06T11:25:00', notes: 'Pâtons et bacs mozzarella' },
];

export const INITIAL_POS_VOIDS: PosVoid[] = [
  // Voids & discounts that help correlate food waste / suspicious voids
  { id: 'pvd-1', menu_item_id: 'menu-4', item_name: 'Entrecôte Grillée 300g', staff_id: 'stf-5', staff_name: 'Karim', type: 'void', amount: 24.00, date: '2026-09-05T21:40:00', timestamp: '2026-09-05 21:40', reason: 'Erreur cuisson demandée saignante servie à point' },
  { id: 'pvd-2', menu_item_id: 'menu-4', item_name: 'Entrecôte Grillée 300g', staff_id: 'stf-5', staff_name: 'Karim', type: 'void', amount: 24.00, date: '2026-09-06T22:15:00', timestamp: '2026-09-06 22:15', reason: 'Annulation après commande en cuisine' },
  { id: 'pvd-3', menu_item_id: 'menu-1', item_name: 'Assiette Merguez Grillées (x3)', staff_id: 'stf-5', staff_name: 'Karim', type: 'void', amount: 16.50, date: '2026-09-06T21:10:00', timestamp: '2026-09-06 21:10', reason: 'Erreur table client parti' },
  { id: 'pvd-4', menu_item_id: 'menu-6', item_name: 'Pichet Vin Rouge Côtes-du-Rhône 50cl', staff_id: 'stf-5', staff_name: 'Karim', type: 'comp', amount: 11.00, date: '2026-09-06T23:10:00', timestamp: '2026-09-06 23:10', reason: 'Offert table habitués fin de service' },
  { id: 'pvd-5', menu_item_id: 'menu-7', item_name: 'Pinte Bière Blonde Pression 50cl', staff_id: 'stf-3', staff_name: 'Julien', type: 'discount', amount: 15.00, date: '2026-09-04T20:00:00', timestamp: '2026-09-04 20:00', reason: 'Remise Happy Hour groupe CE' },
  { id: 'pvd-6', menu_item_id: 'menu-2', item_name: 'Pizza Margherita Tradition', staff_id: 'stf-6', staff_name: 'Antoine', type: 'void', amount: 13.00, date: '2026-09-05T20:30:00', timestamp: '2026-09-05 20:30', reason: 'Pizza brûlée au four' },
];

export const INITIAL_WASTE_LOGS: WasteLog[] = [
  {
    id: 'wst-1',
    ingredient_id: 'ing-3', // Entrecôte Charolaise (24.50 DT/kg)
    quantity: 0.600, // 2 portions = 0.600 kg (14.70 DT)
    unit_cost_at_time: 24.50,
    reason: 'spoilage',
    logged_by: 'Chef Marc',
    date: '2026-09-05',
    shift: 'evening',
    notes: '2 pièces oxydées au fond du bac gastro',
  },
  {
    id: 'wst-2',
    ingredient_id: 'ing-1', // Merguez de Taureau
    quantity: 0.500,
    unit_cost_at_time: 12.00,
    reason: 'staff_meal',
    logged_by: 'Chef Marc',
    date: '2026-09-06',
    shift: 'morning',
    notes: 'Repas équipe cuisine midi',
  },
  {
    id: 'wst-3',
    ingredient_id: 'ing-8', // Vin rouge
    quantity: 0.750,
    unit_cost_at_time: 9.00,
    reason: 'breakage',
    logged_by: 'Sarah',
    date: '2026-09-04',
    shift: 'evening',
    notes: 'Bouteille glissée lors du réassort bar',
  },
];

