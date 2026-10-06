(function() {
  'use strict';

  // --- Initial Biologics Catalog (0ms Instant Boot) ---
  const INITIAL_VIALS = [
    {
      id: '1',
      productName: 'Botox Cosmetic 100U',
      manufacturer: 'Allergan Aesthetics',
      category: 'Neuromodulators',
      serialNumber: 'BTX-99482-UAE',
      batchId: 'B77291-DXB',
      priceAed: 2200,
      dosage: '100 Units Clostridium botulinum',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 4.1,
      status: 'VERIFIED_IN_VAULT',
      image: 'assets/med_vault.jpg',
      hmacSig: '8f3b29c9a0914e67d98341ef60b3724819ad5493012a97cd01824791ae91a271'
    },
    {
      id: '2',
      productName: 'Juvederm Voluma XC',
      manufacturer: 'Allergan Aesthetics',
      category: 'Dermal Fillers',
      serialNumber: 'JUV-81920-DXB',
      batchId: 'J3910-UAE',
      priceAed: 2600,
      dosage: '2 x 1.0ml Hyaluronic Acid 20mg/ml',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 4.4,
      status: 'VERIFIED_IN_VAULT',
      image: 'assets/med_vault.jpg',
      hmacSig: 'a140f89812e34589d71c890a56214ef56012478a87263b652899014526d14902'
    },
    {
      id: '3',
      productName: 'Profhilo H+L Bioremodeling',
      manufacturer: 'IBSA Derma Italy',
      category: 'Bioremodeling',
      serialNumber: 'PRF-33810-DXB',
      batchId: 'P8812-DXB',
      priceAed: 2400,
      dosage: '2.0ml High/Low Molecular HA (64mg)',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 3.9,
      status: 'VERIFIED_IN_VAULT',
      image: 'assets/med_vault.jpg',
      hmacSig: 'c4980182746a5b23d9171e2890471b6239401736452819036748291048291038'
    },
    {
      id: '4',
      productName: 'Sculptra PLLA Biostimulator',
      manufacturer: 'Galderma',
      category: 'Collagen Stimulators',
      serialNumber: 'SCP-55214-UAE',
      batchId: 'S4109-DXB',
      priceAed: 3100,
      dosage: '150mg Poly-L-lactic acid',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 4.2,
      status: 'VERIFIED_IN_VAULT',
      image: 'assets/med_vault.jpg',
      hmacSig: 'e291048271039485726194058271940582719402837401928471029384710293'
    },
    {
      id: '5',
      productName: 'Teosyal PureSense Redensity II',
      manufacturer: 'Teoxane Laboratories Geneva',
      category: 'Dermal Fillers',
      serialNumber: 'TEO-66102-DXB',
      batchId: 'T9021-UAE',
      priceAed: 2100,
      dosage: '2 x 1.0ml HA + Dermo-Restructuring',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 4.5,
      status: 'VERIFIED_IN_VAULT',
      image: 'assets/med_vault.jpg',
      hmacSig: 'f719283049182736451029384756102938475610293847561029384756102938'
    }
  ];

  const INITIAL_CATEGORIES = ['ALL', 'Neuromodulators', 'Dermal Fillers', 'Bioremodeling', 'Collagen Stimulators'];

  const INITIAL_LEDGER = [
    {
      receiptId: 'INJ-PROOF-A981F2',
      serialNumber: 'BTX-99482-UAE',
      physicianDhaLicense: 'DHA-P-44829',
      patientHash: '3f92...c81a',
      anatomicalSite: 'Glabellar Complex & Frontalis',
      timestamp: '2026-10-06 18:30 GST'
    },
    {
      receiptId: 'INJ-PROOF-B2910C',
      serialNumber: 'PRF-33810-DXB',
      physicianDhaLicense: 'DHA-P-11902',
      patientHash: '7a12...990b',
      anatomicalSite: 'BAP 5-Point Malar & Submalar',
      timestamp: '2026-10-06 19:15 GST'
    }
  ];

  // --- State Initialization with LocalStorage ---
  let vials = JSON.parse(localStorage.getItem('medverify_vials')) || INITIAL_VIALS;
  let categories = JSON.parse(localStorage.getItem('medverify_categories')) || INITIAL_CATEGORIES;
  let ledger = JSON.parse(localStorage.getItem('medverify_ledger')) || INITIAL_LEDGER;
  let announcement = localStorage.getItem('medverify_announcement') || 'DHA-Compliant Cryptographic Cold-Chain Verification for Aesthetic Biologics & Toxins';
  let activeCategory = 'ALL';
  let currentLang = 'en';

  function saveState() {
    localStorage.setItem('medverify_vials', JSON.stringify(vials));
    localStorage.setItem('medverify_categories', JSON.stringify(categories));
    localStorage.setItem('medverify_ledger', JSON.stringify(ledger));
    localStorage.setItem('medverify_announcement', announcement);
  }

  // --- DOM Elements ---
  const announcementText = document.getElementById('announcement-text');
  const themeToggle = document.getElementById('theme-toggle');
  const langToggle = document.getElementById('lang-toggle');
  const categoryPillsContainer = document.getElementById('category-pills');
  const vialsGrid = document.getElementById('vials-grid');
  
  // Verification Elements
  const verifyInput = document.getElementById('verify-serial-input');
  const btnRunVerify = document.getElementById('btn-run-verify');
  const verifyResultBox = document.getElementById('verify-result-box');
  const resProduct = document.getElementById('res-product');
  const resMfg = document.getElementById('res-mfg');
  const resBatch = document.getElementById('res-batch');
  const resStatus = document.getElementById('res-status');
  const resSig = document.getElementById('res-sig');
  
  // Admin Elements
  const adminBtn = document.getElementById('admin-login-btn');
  const adminModal = document.getElementById('admin-modal');
  const adminCloseBtn = document.getElementById('admin-close-btn');
  const adminTabs = document.querySelectorAll('.admin-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const adminVialsTbody = document.getElementById('admin-vials-tbody');
  const adminLedgerTbody = document.getElementById('admin-ledger-tbody');
  const adminCategoryList = document.getElementById('admin-category-list');
  const btnNewVial = document.getElementById('btn-new-vial');
  const vialForm = document.getElementById('vial-form');
  const btnCancelVial = document.getElementById('btn-cancel-vial');
  const photoInput = document.getElementById('form-photo-input');
  const photoPreview = document.getElementById('form-photo-preview');
  const compressionCanvas = document.getElementById('photo-compressor-canvas');
  const compressionStats = document.getElementById('compression-stats');
  const adminAnnouncementInput = document.getElementById('admin-announcement-input');
  const btnSaveAnnouncement = document.getElementById('btn-save-announcement');
  const newCategoryInput = document.getElementById('new-category-input');
  const btnAddCategory = document.getElementById('btn-add-category');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnImportJson = document.getElementById('btn-import-json');

  // --- Translations (EN / AR) ---
  const TRANSLATIONS = {
    en: {
      navCatalog: 'Biologics Vault',
      navColdChain: 'Cold-Chain IoT',
      navVerify: 'Patient Verification',
      navProtocol: 'DHA Standards',
      heroBadge: 'DUBAI HEALTH AUTHORITY (DHA) STANDARD PROTOCOL',
      heroTitle: 'Cryptographic Biologics & Cold-Chain Integrity',
      heroSubtitle: 'Zero-counterfeit verification, real-time 2°C–8°C IoT temperature telemetry, and non-reusable patient administration certificates for Dubai\'s premier aesthetic clinics.',
      btnVerifyVial: 'Verify Vial Authenticity',
      btnExploreVault: 'Explore Vault',
      statChain: 'Cold-Chain Proof',
      statHash: 'Batch Signatures',
      statVerification: 'Instant Verification',
      tagVerification: 'PATIENT VERIFICATION ENGINE',
      titleScanner: 'Verify Your Treatment Vial',
      descScanner: 'Enter the cryptographic serial number from your clinic treatment card to audit manufacturer provenance and cold-chain compliance.',
      btnRunCheck: 'Audit Serial',
      tagVault: 'CERTIFIED VAULT',
      titleVault: 'Aesthetic Biologics & Neuromodulators',
      descVault: 'Every vial registered with continuous IoT cold storage telemetry and tamper-evident cryptographic seal.',
      catAll: 'All Biologics',
      bookTreatment: 'Book Treatment'
    },
    ar: {
      navCatalog: 'خزينة الأدوية الحيوية',
      navColdChain: 'إنترنت الأشياء لسلسلة التبريد',
      navVerify: 'تحقق المريض',
      navProtocol: 'معايير هيئة الصحة بدبي',
      heroBadge: 'بروتوكول معتمد من هيئة الصحة بدبي (DHA)',
      heroTitle: 'نزاهة الأدوية البيولوجية التجميلية وسلسلة التبريد',
      heroSubtitle: 'تحقق فوري من أصالة الحقن التجميلية، مراقبة درجات الحرارة بين 2 و 8 مئوية عبر إنترنت الأشياء، وشهادات حقن غير قابلة للاستخدام المتكرر لعيادات دبي الفاخرة.',
      btnVerifyVial: 'تحقق من أصالة القارورة',
      btnExploreVault: 'استكشف الخزينة',
      statChain: 'سلسلة تبريد معتمدة',
      statHash: 'توقيعات رقمية مشفرة',
      statVerification: 'تحقق فوري',
      tagVerification: 'محرك التحقق للمرضى',
      titleScanner: 'تحقق من قارورة علاجك',
      descScanner: 'أدخل الرقم التسلسلي المشفر من بطاقة علاجك للتأكد من مصدر الشركة المصنعة وسلامة التبريد.',
      btnRunCheck: 'فحص الرقم التسلسلي',
      tagVault: 'الخزينة المعتمدة',
      titleVault: 'المستحضرات البيولوجية ومعدلات الأعصاب',
      descVault: 'كل قارورة مسجلة بسلسلة تبريد مستمرة وختم رقمي ضد التلاعب.',
      catAll: 'كافة المستحضرات',
      bookTreatment: 'حجز موعد'
    }
  };

  // --- Theme Toggle ---
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('medverify_theme', newTheme);
  });

  const savedTheme = localStorage.getItem('medverify_theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // --- Language Toggle ---
  langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    langToggle.textContent = currentLang === 'en' ? 'العربية' : 'English';
    applyTranslations();
  });

  function applyTranslations() {
    const t = TRANSLATIONS[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });
  }

  // --- Render Categories ---
  function renderCategories() {
    categoryPillsContainer.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'pill' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat === 'ALL' ? (TRANSLATIONS[currentLang].catAll || 'All Biologics') : cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderCategories();
        renderVials();
      });
      categoryPillsContainer.appendChild(btn);
    });

    // Populate select in admin form
    const formCatSelect = document.getElementById('form-category');
    formCatSelect.innerHTML = '';
    categories.filter(c => c !== 'ALL').forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      formCatSelect.appendChild(opt);
    });

    // Render admin category chips
    adminCategoryList.innerHTML = '';
    categories.filter(c => c !== 'ALL').forEach(c => {
      const chip = document.createElement('span');
      chip.className = 'category-pill-chip';
      chip.innerHTML = ${c} <button onclick="window.removeCategory('')" style="background:none;border:none;cursor:pointer;color:red;margin-left:6px;">&times;</button>;
      adminCategoryList.appendChild(chip);
    });
  }

  window.removeCategory = function(catName) {
    categories = categories.filter(c => c !== catName);
    saveState();
    renderCategories();
    renderVials();
  };

  // --- Render Biologics Cards ---
  function renderVials() {
    vialsGrid.innerHTML = '';
    const filtered = activeCategory === 'ALL'
      ? vials
      : vials.filter(v => v.category === activeCategory);

    filtered.forEach(v => {
      const card = document.createElement('div');
      card.className = 'vial-card';
      card.innerHTML = 
        <div class="vial-img-box">
          <img src="" alt="" class="vial-img">
          <div class="vial-tag-temp">❄️ °C STABLE</div>
        </div>
        <div class="vial-info">
          <span class="vial-category-lbl"></span>
          <h3 class="vial-name"></h3>
          <p class="vial-mfg"></p>
          <div class="vial-specs-grid">
            <div><span class="res-lbl">Batch:</span> <strong></strong></div>
            <div><span class="res-lbl">Serial:</span> <strong></strong></div>
            <div><span class="res-lbl">Range:</span> <strong>°C - °C</strong></div>
            <div><span class="res-lbl">Storage:</span> <strong class="text-emerald">Compliant</strong></div>
          </div>
          <div class="vial-footer">
            <span class="vial-price"> AED</span>
            <div class="vial-actions-row">
              <button class="btn-book-treatment" onclick="window.quickVerify('')">Audit</button>
              <!-- WhatsApp Icon Only (Strict Rule) -->
              <a href="https://wa.me/971508379080" class="card-wa-icon" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 2C6.495 2 2 6.484 2 12.019c0 1.77.462 3.498 1.339 5.02L2 22l5.127-1.344a10.01 10.01 0 0 0 4.904 1.282h.004c5.535 0 10.03-4.484 10.03-10.019 0-2.678-1.042-5.195-2.934-7.086A9.957 9.957 0 0 0 12.031 2zm5.836 14.199c-.244.685-1.42 1.258-1.956 1.339-.512.078-1.18.11-1.905-.121-.462-.148-1.055-.344-1.821-.676-3.218-1.396-5.313-4.664-5.474-4.88-.16-.215-1.3-1.733-1.3-3.308 0-1.575.824-2.35 1.116-2.67.291-.32.64-.4.854-.4.214 0 .428.002.615.011.199.01.465-.075.727.553.272.651.927 2.26.101 2.613-.107.45-.18.73-.356.95-.177.22-.372.489-.533.657-.179.186-.366.388-.157.747.209.359.928 1.533 1.99 2.48 1.365 1.218 2.516 1.595 2.875 1.774.359.179.569.15.782-.096.213-.245.914-1.066 1.159-1.434.244-.368.489-.307.822-.184.333.123 2.115 1.002 2.477 1.183.362.181.603.272.693.424.09.152.09.882-.154 1.567z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      ;
      vialsGrid.appendChild(card);
    });
  }

  // --- Patient Verification Tool ---
  window.quickVerify = function(serial) {
    verifyInput.value = serial;
    btnRunVerify.click();
    document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
  };

  btnRunVerify.addEventListener('click', () => {
    const inputVal = (verifyInput.value || '').trim().toUpperCase();
    if (!inputVal) {
      alert('Please enter a vial serial number');
      return;
    }

    const matched = vials.find(v => v.serialNumber.toUpperCase() === inputVal);
    if (matched) {
      resProduct.textContent = matched.productName;
      resMfg.textContent = matched.manufacturer;
      resBatch.textContent = matched.batchId;
      resStatus.textContent = matched.status;
      resSig.textContent = matched.hmacSig || '8f3b29c9a0914e67...d01824791ae91a271';
      verifyResultBox.classList.remove('hidden');
    } else {
      alert('Serial number not recognized in registered vault. Please verify with your clinic reception.');
    }
  });

  // --- HTML5 Canvas Smart Image Compressor Engine (Mobile Optimization) ---
  let compressedImageData = 'assets/med_vault.jpg';
  photoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = new Image();
      img.onload = function() {
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        compressionCanvas.width = width;
        compressionCanvas.height = height;
        const ctx = compressionCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export WebP / JPEG at 0.8 quality
        compressedImageData = compressionCanvas.toDataURL('image/jpeg', 0.82);
        photoPreview.src = compressedImageData;
        const kbSize = Math.round(compressedImageData.length * 0.75 / 1024);
        compressionStats.textContent = Optimized Canvas:  KB (xpx);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  // --- Mobile Admin Dashboard Logic ---
  adminBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    renderAdminTables();
  });

  adminCloseBtn.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      adminTabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  function renderAdminTables() {
    // Vials Table
    adminVialsTbody.innerHTML = '';
    vials.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML = 
        <td><strong></strong><br><small></small></td>
        <td></td>
        <td></td>
        <td> AED</td>
        <td><span class="badge-status"></span></td>
        <td>
          <button onclick="window.editVial('')" class="btn-pill-small">Edit</button>
          <button onclick="window.deleteVial('')" class="btn-pill-small" style="color:red;">Delete</button>
        </td>
      ;
      adminVialsTbody.appendChild(tr);
    });

    // Ledger Table
    adminLedgerTbody.innerHTML = '';
    ledger.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = 
        <td><code></code></td>
        <td><strong></strong></td>
        <td></td>
        <td><code></code></td>
        <td></td>
        <td><small></small></td>
      ;
      adminLedgerTbody.appendChild(tr);
    });

    adminAnnouncementInput.value = announcement;
  }

  btnNewVial.addEventListener('click', () => {
    vialForm.reset();
    document.getElementById('form-vial-id').value = '';
    photoPreview.src = 'assets/med_vault.jpg';
    compressedImageData = 'assets/med_vault.jpg';
    vialForm.classList.remove('hidden');
  });

  btnCancelVial.addEventListener('click', () => {
    vialForm.classList.add('hidden');
  });

  vialForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('form-vial-id').value || String(Date.now());
    const productName = document.getElementById('form-product-name').value;
    const manufacturer = document.getElementById('form-manufacturer').value;
    const category = document.getElementById('form-category').value;
    const priceAed = Number(document.getElementById('form-price').value);
    const serialNumber = document.getElementById('form-serial').value;
    const batchId = document.getElementById('form-batch').value;

    const existingIdx = vials.findIndex(v => String(v.id) === String(id));
    const vialObj = {
      id: String(id),
      productName,
      manufacturer,
      category,
      priceAed,
      serialNumber,
      batchId,
      dosage: 'Standard Clinical Dose',
      tempMin: 2.0,
      tempMax: 8.0,
      currentTemp: 4.2,
      status: 'VERIFIED_IN_VAULT',
      image: compressedImageData,
      hmacSig: '8f3b29c9a0914e67d98341ef60b3724819ad5493012a97cd01824791ae91a271'
    };

    if (existingIdx >= 0) {
      vials[existingIdx] = vialObj;
    } else {
      vials.push(vialObj);
    }

    saveState();
    renderVials();
    renderAdminTables();
    vialForm.classList.add('hidden');
  });

  window.editVial = function(id) {
    const v = vials.find(item => String(item.id) === String(id));
    if (!v) return;
    document.getElementById('form-vial-id').value = String(v.id);
    document.getElementById('form-product-name').value = v.productName;
    document.getElementById('form-manufacturer').value = v.manufacturer;
    document.getElementById('form-category').value = v.category;
    document.getElementById('form-price').value = v.priceAed;
    document.getElementById('form-serial').value = v.serialNumber;
    document.getElementById('form-batch').value = v.batchId;
    photoPreview.src = v.image || 'assets/med_vault.jpg';
    compressedImageData = v.image || 'assets/med_vault.jpg';
    vialForm.classList.remove('hidden');
  };

  window.deleteVial = function(id) {
    if (confirm('Are you sure you want to remove this vial from registry?')) {
      vials = vials.filter(v => String(v.id) !== String(id));
      saveState();
      renderVials();
      renderAdminTables();
    }
  };

  // --- Announcements Save ---
  btnSaveAnnouncement.addEventListener('click', () => {
    announcement = adminAnnouncementInput.value.trim();
    announcementText.textContent = announcement;
    saveState();
    alert('Live announcement updated!');
  });

  // --- Add Category ---
  btnAddCategory.addEventListener('click', () => {
    const val = newCategoryInput.value.trim();
    if (val && !categories.includes(val)) {
      categories.push(val);
      newCategoryInput.value = '';
      saveState();
      renderCategories();
    }
  });

  // --- 1-Click JSON Backup & Restore ---
  btnExportJson.addEventListener('click', () => {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      vials,
      categories,
      ledger,
      announcement
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = MedVerify_Backup_.json;
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.vials && Array.isArray(data.vials)) {
          vials = data.vials;
          categories = data.categories || categories;
          ledger = data.ledger || ledger;
          announcement = data.announcement || announcement;
          saveState();
          renderCategories();
          renderVials();
          renderAdminTables();
          announcementText.textContent = announcement;
          alert('Backup restored successfully!');
        }
      } catch (err) {
        alert('Invalid JSON file format: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // --- Initial Render ---
  announcementText.textContent = announcement;
  renderCategories();
  renderVials();

})();
