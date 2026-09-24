// Cotizador de Reparaciones NISSA
let widgetCategory = null;
let selectedBrand = '';
let selectedModelObj = null;
let selectedRepairId = '';
let selectedConsoleId = '';
let selectedConsoleServiceId = '';
let selectedMandoId = '';
let selectedMandoServiceId = '';
let selectedCompServiceId = '';

function safeSetStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}
function safeSetValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function reFormatPrice(val) {
  if (val === undefined || val === null) return '';
  const num = Number(val);
  if (isNaN(num)) {
    let s = String(val).trim();
    if (s.startsWith('$')) s = s.substring(1).trim();
    return s;
  }
  return '$' + Math.round(num).toLocaleString('es-AR');
}

function selectWidgetCategory(cat) {
  widgetCategory = cat;
  
  // Ocultar selector de categoría para que ocupe menos espacio
  safeSetStyle('wrapper-category-selection', 'display', 'none');

  safeSetStyle('section-celular', 'display', cat === 'Celular' ? 'flex' : 'none');
  safeSetStyle('section-consola', 'display', cat === 'Consola' ? 'flex' : 'none');
  safeSetStyle('section-mando', 'display', cat === 'Mando' ? 'flex' : 'none');
  safeSetStyle('section-computadora', 'display', cat === 'Computadora' ? 'flex' : 'none');

  clearSelections();
  hideBudgetBox();

  if (cat === 'Celular') {
    safeSetStyle('wrapper-brand-selection', 'display', 'block');
    populateBrands();
  } else if (cat === 'Consola') {
    safeSetStyle('wrapper-console-selection', 'display', 'block');
    populateConsoles();
  } else if (cat === 'Mando') {
    safeSetStyle('wrapper-mando-selection', 'display', 'block');
    populateMandos();
  } else if (cat === 'Computadora') {
    safeSetStyle('wrapper-comp-services', 'display', 'block');
    populateComputadoras();
  }

  updateSelectionTracker();
}

function changeCategory() {
  widgetCategory = null;
  clearSelections();
  hideBudgetBox();

  safeSetStyle('wrapper-category-selection', 'display', 'block');
  safeSetStyle('section-celular', 'display', 'none');
  safeSetStyle('section-consola', 'display', 'none');
  safeSetStyle('section-mando', 'display', 'none');
  safeSetStyle('section-computadora', 'display', 'none');

  ['celular', 'consola', 'mando', 'computadora'].forEach(c => {
    const btn = document.getElementById('cat-btn-' + c);
    if (btn) btn.classList.remove('active');
  });

  updateSelectionTracker();
}

function updateSelectionTracker() {
  const bar = document.getElementById('selection-history-bar');
  const container = document.getElementById('re-selection-pills-container');
  if (!bar || !container) return;

  if (!widgetCategory) {
    bar.style.display = 'none';
    return;
  }

  const catIcons = {
    'Celular': '📱',
    'Consola': '📺',
    'Mando': '🕹️',
    'Computadora': '💻'
  };

  const arrow = `<span style="color:#94a3b8;font-size:12px;font-weight:900;margin:0 2px;">›</span>`;
  let pillsHtml = '<span style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:0.04em;">Tu Selección:</span>';

  // Pill Categoría
  pillsHtml += `<button type="button" onclick="changeCategory()" title="Cambiar categoría" style="display:inline-flex;align-items:center;gap:6px;background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
    <span>${catIcons[widgetCategory] || '⚙️'} ${widgetCategory}</span>
    <span style="font-size:10px;color:#94a3b8;font-weight:900;">✕</span>
  </button>`;

  if (widgetCategory === 'Celular') {
    if (selectedBrand) {
      pillsHtml += arrow;
      pillsHtml += `<button type="button" onclick="changeBrand()" title="Cambiar marca" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
        <span>🏷️ ${selectedBrand}</span>
        <span style="font-size:10px;color:#3b82f6;font-weight:900;">✕</span>
      </button>`;
    }
    if (selectedModelObj) {
      pillsHtml += arrow;
      const modelDisplayName = selectedModelObj.isCustom
        ? `${selectedModelObj.customBrand || ''} ${selectedModelObj.name || ''}`.trim()
        : selectedModelObj.name;
      const changeAction = selectedModelObj.isCustom ? 'editCustomPhone()' : 'changeModel()';
      pillsHtml += `<button type="button" onclick="${changeAction}" title="Cambiar modelo" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
        <span>📱 ${modelDisplayName}</span>
        <span style="font-size:10px;color:#3b82f6;font-weight:900;">✕</span>
      </button>`;
    }
    if (selectedRepairId) {
      const allReps = getFullRepairsForModel(selectedModelObj);
      const rep = allReps.find(r => r.id === selectedRepairId);
      if (rep) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changePhoneRepair()" title="Cambiar reparación" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>🔧 ${rep.name}</span>
          <span style="font-size:10px;color:#22c55e;font-weight:900;">✕</span>
        </button>`;
      }
    }
  } else if (widgetCategory === 'Consola') {
    if (selectedConsoleId) {
      const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
      if (cObj) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changeConsole()" title="Cambiar consola" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>📺 ${cObj.name}</span>
          <span style="font-size:10px;color:#3b82f6;font-weight:900;">✕</span>
        </button>`;
      }
    }
    if (selectedConsoleServiceId) {
      const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
      const serv = cObj ? cObj.repairs.find(r => r.id === selectedConsoleServiceId) : null;
      if (serv) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changeConsoleService()" title="Cambiar servicio" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>🧼 ${serv.name}</span>
          <span style="font-size:10px;color:#22c55e;font-weight:900;">✕</span>
        </button>`;
      }
    }
  } else if (widgetCategory === 'Mando') {
    if (selectedMandoId) {
      const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
      if (mObj) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changeMando()" title="Cambiar mando" style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>🕹️ ${mObj.name}</span>
          <span style="font-size:10px;color:#3b82f6;font-weight:900;">✕</span>
        </button>`;
      }
    }
    if (selectedMandoServiceId) {
      const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
      const serv = mObj ? mObj.repairs.find(r => r.id === selectedMandoServiceId) : null;
      if (serv) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changeMandoService()" title="Cambiar servicio" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>⚙️ ${serv.name}</span>
          <span style="font-size:10px;color:#22c55e;font-weight:900;">✕</span>
        </button>`;
      }
    }
  } else if (widgetCategory === 'Computadora') {
    if (selectedCompServiceId) {
      const serv = (PRECIOS_WIDGET.computadoras || []).find(c => c.id === selectedCompServiceId);
      if (serv) {
        pillsHtml += arrow;
        pillsHtml += `<button type="button" onclick="changeCompService()" title="Cambiar servicio" style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
          <span>💻 ${serv.name}</span>
          <span style="font-size:10px;color:#22c55e;font-weight:900;">✕</span>
        </button>`;
      }
    }
  }

  container.innerHTML = pillsHtml;
  bar.style.display = 'flex';
}

function clearSelections() {
  selectedBrand = '';
  selectedModelObj = null;
  selectedRepairId = '';
  selectedConsoleId = '';
  selectedConsoleServiceId = '';
  selectedMandoId = '';
  selectedMandoServiceId = '';
  selectedCompServiceId = '';

  safeSetValue('widget-model-search', '');
  safeSetValue('custom-brand', '');
  safeSetValue('custom-model', '');

  safeSetStyle('wrapper-brand-selection', 'display', 'block');
  safeSetStyle('re-brand-selected-badge', 'display', 'none');
  safeSetStyle('widget-brands-grid', 'display', 'grid');
  safeSetStyle('wrapper-dropdown-modelo', 'display', 'none');
  safeSetStyle('wrapper-custom-celular', 'display', 'none');
  safeSetStyle('re-custom-phone-selected-badge', 'display', 'none');
  safeSetStyle('re-custom-inputs-box', 'display', 'block');
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'none');
  safeSetStyle('widget-phone-repairs-grid', 'display', 'grid');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');

  safeSetStyle('wrapper-console-selection', 'display', 'block');
  safeSetStyle('re-console-service-selected-badge', 'display', 'none');
  safeSetStyle('console-services-list', 'display', 'grid');
  safeSetStyle('wrapper-console-services', 'display', 'none');

  safeSetStyle('wrapper-mando-selection', 'display', 'block');
  safeSetStyle('re-mando-service-selected-badge', 'display', 'none');
  safeSetStyle('controller-services-list', 'display', 'grid');
  safeSetStyle('wrapper-controller-services', 'display', 'none');

  safeSetStyle('re-comp-service-selected-badge', 'display', 'none');
  safeSetStyle('pc-services-grid', 'display', 'grid');
  safeSetStyle('wrapper-comp-services', 'display', 'block');

  hideBudgetBox();
  updateSelectionTracker();
}

function hideBudgetBox() {
  safeSetStyle('budget-summary-box', 'display', 'none');
}

function populateBrands() {
  const grid = document.getElementById('widget-brands-grid');
  if (!grid) return;
  grid.innerHTML = '';

  PRECIOS_WIDGET.celulares.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = b.brand === selectedBrand ? 're-option-btn active' : 're-option-btn';
    btn.innerText = b.brand;
    btn.onclick = () => selectBrand(b.brand);
    grid.appendChild(btn);
  });
}

function selectBrand(brand) {
  selectedBrand = brand;
  selectedModelObj = null;
  selectedRepairId = '';
  safeSetValue('widget-model-search', '');
  hideBudgetBox();

  safeSetText('re-selected-brand-name', brand);
  // Ocultar sección de marcas para ahorrar espacio en pantalla
  safeSetStyle('wrapper-brand-selection', 'display', 'none');

  if (brand === 'Otros') {
    safeSetStyle('wrapper-dropdown-modelo', 'display', 'none');
    safeSetStyle('wrapper-custom-celular', 'display', 'block');
    safeSetStyle('re-custom-phone-selected-badge', 'display', 'none');
    safeSetStyle('re-custom-inputs-box', 'display', 'block');
    safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');
    setTimeout(() => {
      const inp = document.getElementById('custom-brand');
      if (inp) inp.focus();
    }, 50);
  } else {
    safeSetStyle('wrapper-dropdown-modelo', 'display', 'block');
    safeSetStyle('wrapper-custom-celular', 'display', 'none');
    safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');
    filterModels();
  }
  updateSelectionTracker();
}

function changeBrand() {
  selectedBrand = '';
  selectedModelObj = null;
  selectedRepairId = '';
  safeSetValue('widget-model-search', '');
  safeSetValue('custom-brand', '');
  safeSetValue('custom-model', '');
  hideBudgetBox();

  safeSetStyle('wrapper-brand-selection', 'display', 'block');
  safeSetStyle('re-brand-selected-badge', 'display', 'none');
  safeSetStyle('widget-brands-grid', 'display', 'grid');
  safeSetStyle('wrapper-dropdown-modelo', 'display', 'none');
  safeSetStyle('wrapper-custom-celular', 'display', 'none');
  safeSetStyle('re-custom-phone-selected-badge', 'display', 'none');
  safeSetStyle('re-custom-inputs-box', 'display', 'block');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');

  populateBrands();
  updateSelectionTracker();
}

function filterModels() {
  const input = document.getElementById('widget-model-search');
  const q = input ? input.value.toLowerCase().trim() : '';
  const dropdown = document.getElementById('widget-model-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';

  const brandObj = PRECIOS_WIDGET.celulares.find(c => c.brand === selectedBrand);
  if (!brandObj) return;

  const filtered = brandObj.models.filter(m => m.name.toLowerCase().includes(q));
  if (filtered.length > 0) {
    filtered.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 're-dropdown-item';
      btn.innerHTML = `<span>${m.name}</span><span class="re-badge-editable">DISPONIBLE</span>`;
      btn.onclick = () => selectModel(m);
      dropdown.appendChild(btn);
    });
    dropdown.style.display = 'block';
  } else {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
  }
}

function showModelDropdown(show) {
  if (show) filterModels();
  else safeSetStyle('widget-model-dropdown', 'display', 'none');
}

function toggleModelDropdown() {
  const dd = document.getElementById('widget-model-dropdown');
  if (dd && dd.style.display === 'none') filterModels();
  else safeSetStyle('widget-model-dropdown', 'display', 'none');
}

function selectModel(modelObj) {
  selectedModelObj = modelObj;
  safeSetValue('widget-model-search', modelObj.name);
  showModelDropdown(false);
  safeSetStyle('wrapper-dropdown-modelo', 'display', 'none');

  selectedRepairId = '';
  hideBudgetBox();
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'none');
  safeSetStyle('widget-phone-repairs-grid', 'display', 'grid');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'block');
  populatePhoneRepairs();
  updateSelectionTracker();
}

function changeModel() {
  selectedModelObj = null;
  selectedRepairId = '';
  safeSetValue('widget-model-search', '');
  hideBudgetBox();
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'none');
  safeSetStyle('widget-phone-repairs-grid', 'display', 'grid');
  safeSetStyle('wrapper-dropdown-modelo', 'display', 'block');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');
  showModelDropdown(true);
  updateSelectionTracker();
}

function customInputChanged() {
  if (selectedModelObj && selectedModelObj.isCustom) {
    const brandVal = (document.getElementById('custom-brand')?.value || '').trim();
    const modelVal = (document.getElementById('custom-model')?.value || '').trim();
    selectedModelObj.customBrand = brandVal || 'Otra marca';
    selectedModelObj.name = modelVal || 'Modelo a consultar';
  }
}

function advanceCustomPhone() {
  const brandVal = (document.getElementById('custom-brand')?.value || '').trim();
  const modelVal = (document.getElementById('custom-model')?.value || '').trim();

  if (!brandVal && !modelVal) {
    const brandInput = document.getElementById('custom-brand');
    if (brandInput) {
      brandInput.focus();
      brandInput.placeholder = 'Ingresá la marca de tu celular';
      brandInput.style.borderColor = '#ef4444';
      setTimeout(() => {
        brandInput.style.borderColor = '';
        brandInput.placeholder = 'Ej: Xiaomi, LG, Realme, etc.';
      }, 2000);
    }
    return;
  }

  selectedModelObj = {
    name: modelVal || 'Modelo a consultar',
    customBrand: brandVal || 'Otra marca',
    isCustom: true
  };

  const displayName = `${brandVal || 'Otra marca'} ${modelVal ? '- ' + modelVal : ''}`;
  safeSetText('re-custom-selected-title', displayName);
  safeSetStyle('re-custom-phone-selected-badge', 'display', 'flex');
  safeSetStyle('re-custom-inputs-box', 'display', 'none');

  safeSetStyle('wrapper-phone-repairs-section', 'display', 'block');
  safeSetStyle('widget-phone-repairs-grid', 'display', 'grid');
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'none');
  populatePhoneRepairs();
  updateSelectionTracker();

  // Scroll suave hacia la sección de reparaciones
  const repSec = document.getElementById('wrapper-phone-repairs-section');
  if (repSec) {
    repSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function editCustomPhone() {
  selectedModelObj = null;
  selectedRepairId = '';
  hideBudgetBox();
  safeSetStyle('re-custom-phone-selected-badge', 'display', 'none');
  safeSetStyle('re-custom-inputs-box', 'display', 'block');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'none');
  updateSelectionTracker();
  const brandInput = document.getElementById('custom-brand');
  if (brandInput) brandInput.focus();
}

function getFullRepairsForModel(modelObj) {
  if (!modelObj || modelObj.isCustom) {
    return [
      { id: 'screen', name: '📱 Pantalla / Módulo', price: 'Consultar', note: 'Cotización personalizada en laboratorio' },
      { id: 'battery', name: '🔋 Batería / Autonomía', price: 'Consultar', note: 'Reemplazo de batería testeada' },
      { id: 'port', name: '🔌 Pin / Puerto de Carga', price: 'Consultar', note: 'Reparación o cambio de conector' },
      { id: 'camera', name: '📸 Cámaras Frontal / Trasera', price: 'Consultar', note: 'Módulos y lentes testeados' },
      { id: 'back', name: '🛡️ Tapa Trasera / Carcasa', price: 'Consultar', note: 'Reemplazo estético' },
      { id: 'glass', name: '💎 Cambio de Vidrio / Glass', price: 'Consultar', note: 'Conserva el display original' },
      { id: 'no_desb', name: '🔓 Desbloqueo (Google / iCloud / PIN)', price: 'NO REALIZAMOS', note: 'NO REALIZAMOS ESTE SERVICIO', isUnavailable: true },
      { id: 'no_lib', name: '📶 Liberación de Banda', price: 'NO REALIZAMOS', note: 'NO REALIZAMOS ESTE SERVICIO', isUnavailable: true }
    ];
  }
  return modelObj.repairs || [];
}

function populatePhoneRepairs() {
  const grid = document.getElementById('widget-phone-repairs-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const reps = getFullRepairsForModel(selectedModelObj);
  reps.forEach(rep => {
    const btn = document.createElement('button');
    btn.type = 'button';

    if (rep.isUnavailable || rep.price === 'NO REALIZAMOS') {
      btn.className = 're-repair-btn';
      btn.style.borderColor = '#fca5a5';
      btn.style.backgroundColor = '#fef2f2';
      btn.style.cursor = 'not-allowed';
      btn.disabled = true;
      btn.innerHTML = `<div class="re-repair-icon-bg" style="background:#fee2e2;color:#991b1b;">🚫</div>
        <div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
          <span class="re-repair-btn-text" style="color:#991b1b;">${rep.name}</span>
          <span style="font-size:9px;color:#b91c1c;font-weight:800;background:#fecdd3;padding:2px 6px;border-radius:4px;width:fit-content;">${rep.note || 'NO REALIZAMOS'}</span>
        </div>`;
    } else {
      let emoji = '🔧';
      const nameLower = rep.name.toLowerCase();
      if (nameLower.includes('pantalla') || nameLower.includes('módulo') || nameLower.includes('modulo')) emoji = '📱';
      else if (nameLower.includes('batería') || nameLower.includes('bateria')) emoji = '🔋';
      else if (nameLower.includes('carga') || nameLower.includes('pin') || nameLower.includes('puerto')) emoji = '🔌';
      else if (nameLower.includes('tapa') || nameLower.includes('trasera')) emoji = '🛡️';
      else if (nameLower.includes('cámara') || nameLower.includes('camara')) emoji = '📷';
      else if (nameLower.includes('vidrio') || nameLower.includes('glass')) emoji = '💎';

      const isSel = selectedRepairId === rep.id;
      btn.className = isSel ? 're-repair-btn active' : 're-repair-btn';
      btn.innerHTML = `<div class="re-repair-icon-bg">${emoji}</div>
        <div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
          <span class="re-repair-btn-text">${rep.name}</span>
          ${rep.note ? `<span style="font-size:9px;color:#64748b;font-weight:500;">${rep.note}</span>` : ''}
        </div>`;
      btn.onclick = () => selectPhoneRepair(rep.id);
    }
    grid.appendChild(btn);
  });
}

function selectPhoneRepair(repairId) {
  selectedRepairId = repairId;
  const allReps = getFullRepairsForModel(selectedModelObj);
  const rep = allReps.find(r => r.id === repairId);
  if (rep) {
    safeSetText('re-selected-phone-repair-name', rep.name);
    const pText = (rep.price && rep.price !== 'Consultar') ? reFormatPrice(rep.price) : 'Precio a confirmar';
    safeSetText('re-selected-phone-repair-note', `${pText} • ${rep.note || 'Reparación testeada con repuestos de calidad'}`);
  }

  // Ocultar cuadrícula completa para ahorrar espacio y mostrar tarjeta compacta de lo seleccionado
  safeSetStyle('widget-phone-repairs-grid', 'display', 'none');
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'block');

  calculateAndShowWidgetBudget();
  updateSelectionTracker();
}

function changePhoneRepair() {
  selectedRepairId = '';
  hideBudgetBox();
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'none');
  safeSetStyle('widget-phone-repairs-grid', 'display', 'grid');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'block');
  populatePhoneRepairs();
  updateSelectionTracker();
}

// Consolas
function populateConsoles() {
  const grid = document.getElementById('widget-consoles-grid');
  if (!grid) return;
  grid.innerHTML = '';

  PRECIOS_WIDGET.consolas.forEach(con => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = con.id === selectedConsoleId ? 're-option-btn active' : 're-option-btn';
    btn.innerText = con.name;
    btn.onclick = () => selectConsole(con.id);
    grid.appendChild(btn);
  });
}

function selectConsole(cId) {
  selectedConsoleId = cId;
  selectedConsoleServiceId = '';
  hideBudgetBox();
  safeSetStyle('wrapper-console-selection', 'display', 'none');
  safeSetStyle('re-console-service-selected-badge', 'display', 'none');
  safeSetStyle('console-services-list', 'display', 'grid');
  safeSetStyle('wrapper-console-services', 'display', 'block');
  populateConsoleServices();
  updateSelectionTracker();
}

function changeConsole() {
  selectedConsoleId = '';
  selectedConsoleServiceId = '';
  hideBudgetBox();
  safeSetStyle('wrapper-console-selection', 'display', 'block');
  safeSetStyle('re-console-service-selected-badge', 'display', 'none');
  safeSetStyle('console-services-list', 'display', 'none');
  safeSetStyle('wrapper-console-services', 'display', 'none');
  populateConsoles();
  updateSelectionTracker();
}

function populateConsoleServices() {
  const grid = document.getElementById('console-services-list');
  if (!grid) return;
  grid.innerHTML = '';
  const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
  if (!cObj) return;

  cObj.repairs.forEach(serv => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = serv.id === selectedConsoleServiceId ? 're-service-btn active' : 're-service-btn';
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
      ${serv.note ? `<span style="font-size:9px;color:#64748b;">${serv.note}</span>` : ''}
    </div>
    <span class="re-service-price">${reFormatPrice(serv.price)}</span>`;
    btn.onclick = () => selectConsoleService(serv.id);
    grid.appendChild(btn);
  });
}

function selectConsoleService(sId) {
  selectedConsoleServiceId = sId;
  const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
  const serv = cObj ? cObj.repairs.find(r => r.id === sId) : null;
  if (serv) {
    safeSetText('re-selected-console-service-name', serv.name);
    safeSetText('re-selected-console-service-note', `${reFormatPrice(serv.price)} • ${serv.note || 'Mantenimiento con pasta térmica de alto rendimiento'}`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('console-services-list', 'display', 'none');
  safeSetStyle('re-console-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-console-services', 'display', 'block');

  calculateAndShowWidgetBudget();
  updateSelectionTracker();
}

function changeConsoleService() {
  selectedConsoleServiceId = '';
  hideBudgetBox();
  safeSetStyle('re-console-service-selected-badge', 'display', 'none');
  safeSetStyle('console-services-list', 'display', 'grid');
  safeSetStyle('wrapper-console-services', 'display', 'block');
  populateConsoleServices();
  updateSelectionTracker();
}

// Mandos
function populateMandos() {
  const grid = document.getElementById('widget-controllers-grid');
  if (!grid) return;
  grid.innerHTML = '';

  PRECIOS_WIDGET.joysticks.forEach(j => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = j.id === selectedMandoId ? 're-option-btn active' : 're-option-btn';
    btn.innerText = j.name;
    btn.onclick = () => selectMando(j.id);
    grid.appendChild(btn);
  });
}

function selectMando(mId) {
  selectedMandoId = mId;
  selectedMandoServiceId = '';
  hideBudgetBox();
  safeSetStyle('wrapper-mando-selection', 'display', 'none');
  safeSetStyle('re-mando-service-selected-badge', 'display', 'none');
  safeSetStyle('controller-services-list', 'display', 'grid');
  safeSetStyle('wrapper-controller-services', 'display', 'block');
  populateMandoServices();
  updateSelectionTracker();
}

function changeMando() {
  selectedMandoId = '';
  selectedMandoServiceId = '';
  hideBudgetBox();
  safeSetStyle('wrapper-mando-selection', 'display', 'block');
  safeSetStyle('re-mando-service-selected-badge', 'display', 'none');
  safeSetStyle('controller-services-list', 'display', 'none');
  safeSetStyle('wrapper-controller-services', 'display', 'none');
  populateMandos();
  updateSelectionTracker();
}

function populateMandoServices() {
  const grid = document.getElementById('controller-services-list');
  if (!grid) return;
  grid.innerHTML = '';
  const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
  if (!mObj) return;

  mObj.repairs.forEach(serv => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = serv.id === selectedMandoServiceId ? 're-service-btn active' : 're-service-btn';
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
    </div>
    <span class="re-service-price">${reFormatPrice(serv.price)}</span>`;
    btn.onclick = () => selectMandoService(serv.id);
    grid.appendChild(btn);
  });
}

function selectMandoService(sId) {
  selectedMandoServiceId = sId;
  const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
  const serv = mObj ? mObj.repairs.find(r => r.id === sId) : null;
  if (serv) {
    safeSetText('re-selected-mando-service-name', serv.name);
    safeSetText('re-selected-mando-service-note', `${reFormatPrice(serv.price)} • Calibración y repuestos testeados`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('controller-services-list', 'display', 'none');
  safeSetStyle('re-mando-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-controller-services', 'display', 'block');

  calculateAndShowWidgetBudget();
  updateSelectionTracker();
}

function changeMandoService() {
  selectedMandoServiceId = '';
  hideBudgetBox();
  safeSetStyle('re-mando-service-selected-badge', 'display', 'none');
  safeSetStyle('controller-services-list', 'display', 'grid');
  safeSetStyle('wrapper-controller-services', 'display', 'block');
  populateMandoServices();
  updateSelectionTracker();
}

// PC / Notebook
function populateComputadoras() {
  const grid = document.getElementById('pc-services-grid');
  if (!grid) return;
  grid.innerHTML = '';

  (PRECIOS_WIDGET.computadoras || []).forEach(serv => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = serv.id === selectedCompServiceId ? 're-service-btn active' : 're-service-btn';
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
      ${serv.note ? `<span style="font-size:9px;color:#64748b;">${serv.note}</span>` : ''}
    </div>
    <span class="re-service-price">${reFormatPrice(serv.price)}</span>`;
    btn.onclick = () => selectCompService(serv.id);
    grid.appendChild(btn);
  });
}

function selectCompService(sId) {
  selectedCompServiceId = sId;
  const serv = (PRECIOS_WIDGET.computadoras || []).find(c => c.id === sId);
  if (serv) {
    safeSetText('re-selected-comp-service-name', serv.name);
    safeSetText('re-selected-comp-service-note', `${reFormatPrice(serv.price)} • ${serv.note || 'Optimización y laboratorio'}`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('pc-services-grid', 'display', 'none');
  safeSetStyle('re-comp-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-comp-services', 'display', 'block');

  calculateAndShowWidgetBudget();
  updateSelectionTracker();
}

function changeCompService() {
  selectedCompServiceId = '';
  hideBudgetBox();
  safeSetStyle('re-comp-service-selected-badge', 'display', 'none');
  safeSetStyle('pc-services-grid', 'display', 'grid');
  safeSetStyle('wrapper-comp-services', 'display', 'block');
  populateComputadoras();
  updateSelectionTracker();
}

// Calculate Budget
function calculateAndShowWidgetBudget() {
  let isValid = false;
  let sTitle = '';
  let sDesc = '';
  let sBadge = '';
  let sPrice = '';
  let isQuote = false;

  if (widgetCategory === 'Celular') {
    const customBrandVal = (document.getElementById('custom-brand')?.value || '').trim();
    const customModelVal = (document.getElementById('custom-model')?.value || '').trim();

    let cBrand = selectedBrand;
    let cModel = selectedModelObj ? selectedModelObj.name : '';

    if (selectedBrand === 'Otros' || (selectedModelObj && selectedModelObj.isCustom)) {
      cBrand = customBrandVal || selectedModelObj?.customBrand || 'Otra marca';
      cModel = customModelVal || selectedModelObj?.name || 'Modelo a consultar';
    }

    const allReps = getFullRepairsForModel(selectedModelObj);
    const matched = allReps.find(r => r.id === selectedRepairId);

    if (matched) {
      isValid = true;
      sTitle = `${matched.name} - ${cBrand} ${cModel}`;
      sBadge = `Celular | ${cBrand} ${cModel}`;
      sPrice = reFormatPrice(matched.price);
      sDesc = matched.note || 'Reparación profesional en nuestro laboratorio con repuestos de alta calidad y garantía oficial.';
      if (sPrice === 'Consultar' || !matched.price || matched.price === 'Consultar') isQuote = true;
    }
  } else if (widgetCategory === 'Consola') {
    const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
    if (cObj && selectedConsoleServiceId) {
      const serv = cObj.repairs.find(r => r.id === selectedConsoleServiceId);
      if (serv) {
        isValid = true;
        sTitle = `${serv.name} (${cObj.name})`;
        sBadge = `Consola | ${cObj.name}`;
        sPrice = reFormatPrice(serv.price);
        sDesc = serv.note || 'Servicio técnico especializado para consolas PlayStation con pasta térmica y pads de alta conductividad.';
      }
    }
  } else if (widgetCategory === 'Mando') {
    const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
    if (mObj && selectedMandoServiceId) {
      const serv = mObj.repairs.find(r => r.id === selectedMandoServiceId);
      if (serv) {
        isValid = true;
        sTitle = `${serv.name} (${mObj.name})`;
        sBadge = `Mando | ${mObj.name}`;
        sPrice = reFormatPrice(serv.price);
        sDesc = 'Reparación y calibración con componentes testeados de precisión para eliminar drift.';
      }
    }
  } else if (widgetCategory === 'Computadora') {
    const serv = (PRECIOS_WIDGET.computadoras || []).find(c => c.id === selectedCompServiceId);
    if (serv) {
      isValid = true;
      sTitle = serv.name;
      sBadge = 'PC / Notebook';
      sPrice = reFormatPrice(serv.price);
      sDesc = serv.note || 'Servicio técnico profesional y ampliación de componentes para notebooks y computadoras.';
    }
  }

  const box = document.getElementById('budget-summary-box');
  if (isValid && box) {
    safeSetText('summary-title', sTitle);
    safeSetText('summary-desc', sDesc);
    safeSetText('summary-badge', sBadge);
    safeSetText('summary-price', sPrice);
    safeSetText('re-btn-text', isQuote ? 'Solicitar Presupuesto por WhatsApp' : 'Enviar Presupuesto por WhatsApp');
    box.style.display = 'flex';
  } else if (box) {
    box.style.display = 'none';
  }
}

function sendWidgetWhatsApp() {
  const title = document.getElementById('summary-title')?.innerText || '';
  const badge = document.getElementById('summary-badge')?.innerText || '';
  const price = document.getElementById('summary-price')?.innerText || '';

  let text = `¡Hola NISSA! 👋 Armé este presupuesto desde el cotizador de la tienda:\n\n`;
  text += `⚙️ *Categoría:* ${widgetCategory}\n`;
  text += `📦 *Servicio:* ${title}\n`;
  text += `📋 *Detalle:* ${badge}\n`;
  text += `💰 *Presupuesto Estimado:* *${price}*\n\n`;
  text += `¿Tienen disponibilidad de turnos para llevarlo? ¡Muchas gracias!`;

  const url = `https://wa.me/${PRECIOS_WIDGET.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function resetWidget() {
  changeCategory();
}

// Click outside model search dropdown to close
document.addEventListener('click', (e) => {
  const dd = document.getElementById('widget-model-dropdown');
  const inp = document.getElementById('widget-model-search');
  if (dd && inp && !inp.contains(e.target) && !dd.contains(e.target)) {
    dd.style.display = 'none';
  }
});

// Auto-init on page load: estado inicial limpio
document.addEventListener('DOMContentLoaded', () => {
  resetWidget();
});
