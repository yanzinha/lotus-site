/**
 * LOTUS DB — IndexedDB wrapper
 * Banco de dados local com alta capacidade (centenas de MB)
 * Substitui o localStorage que tinha limite de 5MB
 */
const LotusDB = (function(){
  const DB_NAME = 'lotus_personalizados_db';
  const DB_VERSION = 1;
  const STORES = {
    info:     'info',
    products: 'products',
    feedbacks:'feedbacks',
    settings: 'settings'
  };
  let db = null;

  // ── OPEN / INIT ──────────────────────────────
  function open(){
    return new Promise((resolve, reject)=>{
      if(db){ resolve(db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        if(!d.objectStoreNames.contains(STORES.info))
          d.createObjectStore(STORES.info, { keyPath:'key' });
        if(!d.objectStoreNames.contains(STORES.products))
          d.createObjectStore(STORES.products, { keyPath:'id' });
        if(!d.objectStoreNames.contains(STORES.feedbacks))
          d.createObjectStore(STORES.feedbacks, { keyPath:'id' });
        if(!d.objectStoreNames.contains(STORES.settings))
          d.createObjectStore(STORES.settings, { keyPath:'key' });
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  // ── GENERIC HELPERS ──────────────────────────
  function tx(storeName, mode='readonly'){
    return db.transaction([storeName], mode).objectStore(storeName);
  }
  function promisify(req){
    return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
  }

  // ── INFO (site info stored as key/value) ─────
  async function getInfo(){
    await open();
    const rec = await promisify(tx(STORES.info).get('site_info'));
    return rec ? rec.value : null;
  }
  async function saveInfo(info){
    await open();
    await promisify(tx(STORES.info,'readwrite').put({ key:'site_info', value:info }));
  }

  // ── CREDENTIALS ─────────────────────────────
  async function getCreds(){
    await open();
    const rec = await promisify(tx(STORES.settings).get('creds'));
    return rec ? rec.value : null;
  }
  async function saveCreds(creds){
    await open();
    await promisify(tx(STORES.settings,'readwrite').put({ key:'creds', value:creds }));
  }

  // ── PRODUCTS ────────────────────────────────
  async function getProducts(){
    await open();
    return promisify(tx(STORES.products).getAll());
  }
  async function saveProduct(product){
    await open();
    if(!product.id) product.id = Date.now();
    await promisify(tx(STORES.products,'readwrite').put(product));
    return product;
  }
  async function deleteProduct(id){
    await open();
    await promisify(tx(STORES.products,'readwrite').delete(id));
  }
  async function clearProducts(){
    await open();
    await promisify(tx(STORES.products,'readwrite').clear());
  }

  // ── FEEDBACKS ───────────────────────────────
  async function getFeedbacks(){
    await open();
    return promisify(tx(STORES.feedbacks).getAll());
  }
  async function saveFeedback(fb){
    await open();
    if(!fb.id) fb.id = Date.now();
    await promisify(tx(STORES.feedbacks,'readwrite').put(fb));
    return fb;
  }
  async function deleteFeedback(id){
    await open();
    await promisify(tx(STORES.feedbacks,'readwrite').delete(id));
  }

  // ── SEED DEFAULTS (first run) ────────────────
  async function seedIfEmpty(){
    await open();
    const prods = await getProducts();
    if(prods.length > 0) return; // already seeded

    const defaultInfo = {
      siteName:'Lotus Personalizados',
      tagline:'Papelaria Personalizada · Feito à Mão com Amor',
      desc:'Criamos peças únicas com carinho e dedicação. Cada detalhe é pensado especialmente para você.',
      whatsapp:'', email:'', instagram:'lotus_personalizados_',
      address:'Campos Belos, Goiás', logoData:''
    };
    const defaultCreds = { user:'admin', pass:'lotus2024' };
    const defaultProducts = [
      { id:1, name:'Buquê de Rosas Vermelhas', price:'A consultar', desc:'Rosas artesanais com chocolates e laço decorativo.', fullDesc:'Buquê feito à mão com rosas de papel crepom, acompanhado de bombons sortidos e laço de fita personalizado. Disponível em diversas cores e tamanhos sob encomenda.', prazo:'3 semanas', custom:'Cores, tamanho e chocolates', emoji:'🌹', tag:'Sob Encomenda', photos:[], gradient:'rgba(180,30,60,.25),rgba(107,79,160,.3)', order:0 },
      { id:2, name:'Buquê Azul com Borboletas', price:'A consultar', desc:'Rosas de cetim azul royal com borboletas douradas.', fullDesc:'Buquê de rosas de cetim azul royal adornadas com borboletas douradas, embalado em papel especial e fita acetinada.', prazo:'3 semanas', custom:'Cor das borboletas e fita', emoji:'💙', tag:'Personalizado', photos:[], gradient:'rgba(30,80,180,.3),rgba(107,79,160,.35)', order:1 },
      { id:3, name:'Papelaria Personalizada', price:'A consultar', desc:'Cadernos, cartões e convites com seu estilo único.', fullDesc:'Cadernos, cartões de mensagem, convites personalizados e outros itens de papelaria feitos à mão. Cada peça é única.', prazo:'2-3 semanas', custom:'Tema, cores e texto', emoji:'📝', tag:'Exclusivo', photos:[], gradient:'rgba(160,100,79,.2),rgba(45,27,105,.4)', order:2 }
    ];
    const defaultFeedbacks = [
      { id:1, stars:5, text:'Amei demais! Chegou no prazo combinado e ficou ainda mais lindo do que eu esperava. Com certeza vou encomendar de novo!', author:'Ana P.', date:'Maio 2026' },
      { id:2, stars:5, text:'Atendimento super atencioso e o produto é uma obra de arte. Presenteei minha mãe e ela chorou de emoção 💜', author:'Júlia M.', date:'Abril 2026' },
      { id:3, stars:5, text:'Qualidade incrível! Cada detalhe foi pensado com muito carinho. Recomendo de olhos fechados!', author:'Fernanda K.', date:'Março 2026' }
    ];

    await saveInfo(defaultInfo);
    await saveCreds(defaultCreds);
    for(const p of defaultProducts) await saveProduct(p);
    for(const f of defaultFeedbacks) await saveFeedback(f);
    console.log('[LotusDB] Banco de dados iniciado com dados padrão.');
  }

  // ── EXPORT ──────────────────────────────────
  async function exportAll(){
    await open();
    const [info, creds, products, feedbacks] = await Promise.all([getInfo(), getCreds(), getProducts(), getFeedbacks()]);
    return { info, creds, products, feedbacks, exportedAt: new Date().toISOString() };
  }

  // ── IMPORT (backup restore) ──────────────────
  async function importAll(data){
    await open();
    if(data.info)     await saveInfo(data.info);
    if(data.creds)    await saveCreds(data.creds);
    if(data.products){ await clearProducts(); for(const p of data.products) await saveProduct(p); }
    if(data.feedbacks){ 
      const store = tx(STORES.feedbacks,'readwrite');
      await promisify(store.clear());
      for(const f of data.feedbacks){ const s2=tx(STORES.feedbacks,'readwrite'); await promisify(s2.put(f)); }
    }
  }

  return { open, seedIfEmpty, getInfo, saveInfo, getCreds, saveCreds, getProducts, saveProduct, deleteProduct, getFeedbacks, saveFeedback, deleteFeedback, exportAll, importAll };
})();
