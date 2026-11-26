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
let selectedWarrantyId = 'estandar';

function getWarrantyAdjustments() {
  const custom = (typeof PRECIOS_WIDGET !== 'undefined' && PRECIOS_WIDGET && PRECIOS_WIDGET.warrantyAdjustments) || {};
  const toNum = (v, def) => {
    const n = Number(v);
    return isNaN(n) ? def : n;
  };
  return {
    basic: toNum(custom.basic, -20),
    estandar: toNum(custom.estandar, 0),
    ultra: toNum(custom.ultra, 30)
  };
}

function formatWarrantyExtraLabel(wId) {
  if (wId === 'basic') return 'Sin cobertura de garantía';
  if (wId === 'ultra') return '90 días de garantía';
  return '30 días de garantía';
}

const WIDGET_WARRANTIES = [
  {
    id: 'basic',
    name: 'Sin garantía',
    dias: 0,
    icon: '⚡',
    badgeClass: 'basic',
    duracionText: 'Sin cobertura de garantía'
  },
  {
    id: 'estandar',
    name: 'Estándar',
    dias: 30,
    icon: '⭐',
    badgeClass: 'estandar',
    duracionText: '30 días de garantía'
  },
  {
    id: 'ultra',
    name: 'Extendida',
    dias: 90,
    icon: '🚀',
    badgeClass: 'ultra',
    duracionText: '90 días de garantía'
  }
];

function getDynamicWarranties() {
  const adj = getWarrantyAdjustments();
  const customLabels = (typeof PRECIOS_WIDGET !== 'undefined' && PRECIOS_WIDGET && PRECIOS_WIDGET.warrantyLabels) || {};
  return WIDGET_WARRANTIES.map(w => {
    const pct = adj[w.id] ?? 0;
    const lbl = customLabels[w.id] || {};
    const name = (lbl.name && String(lbl.name).trim()) ? String(lbl.name).trim() : w.name;
    const duracionText = (lbl.duracionText && String(lbl.duracionText).trim()) ? String(lbl.duracionText).trim() : w.duracionText;
    return {
      ...w,
      name,
      duracionText,
      percent: pct,
      extraLabel: duracionText
    };
  });
}

function getResolvedWarrantyDuration(repairObj, wObj) {
  if (repairObj && typeof repairObj === 'object') {
    if (wObj.id === 'basic' && repairObj.timeBasic && String(repairObj.timeBasic).trim() !== '') {
      return String(repairObj.timeBasic).trim();
    }
    if (wObj.id === 'estandar' && repairObj.timeEstandar && String(repairObj.timeEstandar).trim() !== '') {
      return String(repairObj.timeEstandar).trim();
    }
    if (wObj.id === 'ultra' && repairObj.timeUltra && String(repairObj.timeUltra).trim() !== '') {
      return String(repairObj.timeUltra).trim();
    }
  }
  return wObj.duracionText || wObj.name;
}

function getResolvedUltraGiftText(repairObj) {
  if (repairObj && typeof repairObj === 'object' && repairObj.giftTextUltra && String(repairObj.giftTextUltra).trim() !== '') {
    return String(repairObj.giftTextUltra).trim();
  }
  const globalGift = (typeof PRECIOS_WIDGET !== 'undefined' && PRECIOS_WIDGET && PRECIOS_WIDGET.warrantyLabels && PRECIOS_WIDGET.warrantyLabels.ultra && PRECIOS_WIDGET.warrantyLabels.ultra.giftText) || '';
  return String(globalGift).trim();
}

function escapeWidgetHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

function parseRepairNumeric(val) {
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  if (!val) return NaN;
  let s = String(val).trim().replace(/\$/g, '').trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '');
  }
  return parseFloat(s);
}

function reFormatPrice(val) {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.toLowerCase().includes('consultar') || s.toLowerCase().includes('no realizamos')) return s;
    if (s.toLowerCase().includes('usd')) {
      const numPart = parseFloat(s.replace(/[^0-9.]/g, ''));
      return isNaN(numPart) ? s : `${Math.round(numPart)} USD`;
    }
  }
  const num = parseRepairNumeric(val);
  if (isNaN(num)) {
    let s = String(val).trim();
    if (s.startsWith('$')) s = s.substring(1).trim();
    return s;
  }
  return '$' + Math.round(num).toLocaleString('es-AR');
}

function getSelectedWarrantyObj() {
  const list = getDynamicWarranties();
  return list.find(w => w.id === selectedWarrantyId) || list[1];
}

function getSelectedRepairObj() {
  if (widgetCategory === 'Celular') {
    const allReps = getFullRepairsForModel(selectedModelObj);
    return allReps.find(r => r.id === selectedRepairId) || null;
  } else if (widgetCategory === 'Consola') {
    const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
    if (cObj && selectedConsoleServiceId) {
      return cObj.repairs.find(r => r.id === selectedConsoleServiceId) || null;
    }
  } else if (widgetCategory === 'Mando') {
    const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
    if (mObj && selectedMandoServiceId) {
      return mObj.repairs.find(r => r.id === selectedMandoServiceId) || null;
    }
  } else if (widgetCategory === 'Computadora') {
    return (PRECIOS_WIDGET.computadoras || []).find(c => c.id === selectedCompServiceId) || null;
  }
  return null;
}

function getBaseRepairPrice() {
  const rep = getSelectedRepairObj();
  if (!rep) return null;
  return rep.price !== undefined && rep.price !== null && String(rep.price).trim() !== ''
    ? rep.price
    : (widgetCategory === 'Computadora' ? 'Consultar' : null);
}

function applyPercentToRawPrice(rawPrice, pct) {
  if (rawPrice === undefined || rawPrice === null) return '';
  const s = String(rawPrice).trim();
  const lower = s.toLowerCase();
  if (lower.includes('consultar') || s === '' || lower.includes('no realizamos')) {
    return s || 'Consultar';
  }

  const multiplier = Math.max(0, 1 + (Number(pct || 0) / 100));

  if (typeof rawPrice === 'number' && !isNaN(rawPrice)) {
    return reFormatPrice(Math.round(rawPrice * multiplier));
  }

  if (lower.includes('usd')) {
    const numPart = parseFloat(s.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!isNaN(numPart)) {
      return `${Math.round(numPart * multiplier)} USD`;
    }
  }

  const cleanNum = parseRepairNumeric(s);
  if (!isNaN(cleanNum) && cleanNum > 0) {
    return reFormatPrice(Math.round(cleanNum * multiplier));
  }
  return s;
}

function computeWarrantyPriceDetails(rawPriceOrRepair, warrantyId) {
  if (rawPriceOrRepair === undefined || rawPriceOrRepair === null) {
    return { originalPrice: '', finalPrice: '', hasDiscount: false, discountPercent: 0 };
  }

  let rawPrice = rawPriceOrRepair;
  let hasManualOverride = false;
  let itemDiscountPct = 0;

  if (typeof rawPriceOrRepair === 'object') {
    const rep = rawPriceOrRepair;

    const resolveTierDiscount = () => {
      let specific;
      if (warrantyId === 'basic') specific = rep.discountBasic;
      else if (warrantyId === 'estandar') specific = rep.discountEstandar;
      else if (warrantyId === 'ultra') specific = rep.discountUltra;

      if (specific !== undefined && specific !== null && String(specific).trim() !== '') {
        const dn = Number(specific);
        return (!isNaN(dn) && dn > 0) ? Math.min(95, dn) : 0;
      }
      const legacy = Number(rep.discountPercent);
      return (!isNaN(legacy) && legacy > 0) ? Math.min(95, legacy) : 0;
    };
    itemDiscountPct = resolveTierDiscount();

    if (warrantyId === 'basic' && rep.priceBasic !== undefined && rep.priceBasic !== null && String(rep.priceBasic).trim() !== '') {
      rawPrice = rep.priceBasic;
      hasManualOverride = true;
    } else if (warrantyId === 'ultra' && rep.priceUltra !== undefined && rep.priceUltra !== null && String(rep.priceUltra).trim() !== '') {
      rawPrice = rep.priceUltra;
      hasManualOverride = true;
    } else {
      rawPrice = rep.price;
    }
  }

  if (rawPrice === undefined || rawPrice === null) {
    return { originalPrice: '', finalPrice: '', hasDiscount: false, discountPercent: 0 };
  }
  const s = String(rawPrice).trim();
  const lower = s.toLowerCase();
  if (lower.includes('consultar') || s === '' || lower.includes('no realizamos')) {
    const txt = s || 'Consultar';
    return { originalPrice: txt, finalPrice: txt, hasDiscount: false, discountPercent: 0 };
  }

  let effectivePct = 0;
  if (!hasManualOverride) {
    const adj = getWarrantyAdjustments();
    effectivePct = Number(adj[warrantyId] ?? (warrantyId === 'basic' ? -20 : warrantyId === 'ultra' ? 30 : 0));
  }

  // Combinar porcentaje global (si no hay precio individual manual) con el descuento % propio de esa garantía
  const baseAfterWarranty = applyPercentToRawPrice(rawPrice, effectivePct);
  let finalPrice = baseAfterWarranty;
  if (itemDiscountPct > 0) {
    finalPrice = applyPercentToRawPrice(baseAfterWarranty, -itemDiscountPct);
  }
  const hasDiscount = itemDiscountPct > 0 && baseAfterWarranty !== finalPrice;
  return {
    originalPrice: baseAfterWarranty,
    finalPrice,
    hasDiscount,
    discountPercent: itemDiscountPct
  };
}

function computeWarrantyPrice(rawPriceOrRepair, warrantyId) {
  return computeWarrantyPriceDetails(rawPriceOrRepair, warrantyId).finalPrice;
}

function renderWarrantyCards() {
  const container = document.getElementById('widget-garantias-grid');
  if (!container) return;
  const repairObj = getSelectedRepairObj();
  const rawBase = repairObj || getBaseRepairPrice();
  if (rawBase === null) return;

  const ultraGiftText = getResolvedUltraGiftText(repairObj);

  container.innerHTML = '';
  getDynamicWarranties().forEach(w => {
    const isAct = w.id === selectedWarrantyId;
    const priceDetails = computeWarrantyPriceDetails(rawBase, w.id);
    const finalPriceStr = priceDetails.finalPrice;
    const resolvedDuration = getResolvedWarrantyDuration(repairObj, w);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `re-garantia-btn ${isAct ? 'active' : ''}`;
    card.setAttribute('aria-pressed', isAct ? 'true' : 'false');
    card.onclick = () => selectWarranty(w.id);

    let priceTagHtml = '';
    if (finalPriceStr && finalPriceStr !== 'Consultar' && finalPriceStr !== 'NO REALIZAMOS') {
      const oldPriceHtml = priceDetails.hasDiscount
        ? `<span class="re-garantia-price-old">${escapeWidgetHtml(priceDetails.originalPrice)}</span>`
        : '';
      priceTagHtml = `<div class="re-garantia-price-line${priceDetails.hasDiscount ? ' has-discount' : ''}">
        ${oldPriceHtml}
        <span class="re-garantia-price-val">${finalPriceStr}</span>
      </div>`;
    } else {
      priceTagHtml = `<div class="re-garantia-price-line">
        <span class="re-garantia-price-val" style="font-size:12px; color:#64748b;">A confirmar</span>
      </div>`;
    }

    const giftHtml = (w.id === 'ultra' && ultraGiftText)
      ? `<div class="re-garantia-gift-note">${escapeWidgetHtml(ultraGiftText)}</div>`
      : '';

    card.innerHTML = `
      <div class="re-garantia-header">
        <div class="re-garantia-title-group">
          <span class="re-garantia-title">${escapeWidgetHtml(w.name)}</span>
          <span class="re-garantia-sub">${escapeWidgetHtml(resolvedDuration)}</span>
        </div>
      </div>
      ${giftHtml}
      ${priceTagHtml}
    `;
    container.appendChild(card);
  });
}

function selectWarranty(wId) {
  selectedWarrantyId = wId;
  renderWarrantyCards();
  calculateAndShowWidgetBudget();
  updateSelectionTracker();
}

function focusWarrantySection() {
  const el = document.getElementById('wrapper-garantia-selection');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

  const hasRepairSelected = (widgetCategory === 'Celular' && selectedRepairId) ||
    (widgetCategory === 'Consola' && selectedConsoleServiceId) ||
    (widgetCategory === 'Mando' && selectedMandoServiceId) ||
    (widgetCategory === 'Computadora' && selectedCompServiceId);

  if (hasRepairSelected) {
    const wObj = getSelectedWarrantyObj();
    const repairObj = getSelectedRepairObj();
    const resolvedDuration = getResolvedWarrantyDuration(repairObj, wObj);
    const warrantyPillLabel = wObj.id === 'basic'
      ? (repairObj?.timeBasic && String(repairObj.timeBasic).trim() ? `⚡ ${resolvedDuration}` : `⚡ ${wObj.name}`)
      : `🛡️ ${wObj.name} (${resolvedDuration})`;
    pillsHtml += arrow;
    pillsHtml += `<button type="button" onclick="focusWarrantySection()" title="Cambiar garantía" style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s;">
      <span>${warrantyPillLabel}</span>
      <span style="font-size:10px;color:#d97706;font-weight:900;">✎</span>
    </button>`;
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
  selectedWarrantyId = 'estandar';

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

function isTermsAccepted() {
  const chk = document.getElementById('re-terms-checkbox');
  return chk ? chk.checked : false;
}

function handleTermsConsentChange() {
  const chk = document.getElementById('re-terms-checkbox');
  const btn = document.getElementById('btn-submit-widget');
  const warn = document.getElementById('re-terms-warning');
  const box = document.getElementById('re-terms-box');
  const accepted = chk ? chk.checked : true;

  if (warn && accepted) {
    warn.style.display = 'none';
  }

  if (box) {
    if (accepted) {
      box.classList.add('is-accepted');
      box.classList.remove('re-terms-attention-alert');
    } else {
      box.classList.remove('is-accepted');
    }
  }

  if (btn) {
    if (accepted) {
      btn.classList.remove('is-disabled');
      btn.removeAttribute('aria-disabled');
    } else {
      btn.classList.add('is-disabled');
      btn.setAttribute('aria-disabled', 'true');
    }
  }
}

function triggerTermsAttention() {
  const box = document.getElementById('re-terms-box');
  const warn = document.getElementById('re-terms-warning');
  const chk = document.getElementById('re-terms-checkbox');

  if (warn) {
    warn.style.display = 'block';
  }

  if (box) {
    box.classList.remove('re-terms-attention-alert');
    // Force DOM reflow to restart CSS animation
    void box.offsetWidth;
    box.classList.add('re-terms-attention-alert');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (box) box.classList.remove('re-terms-attention-alert');
    }, 1500);
  }

  if (chk) {
    chk.focus();
  }
}

function toggleTermsCheckbox(event) {
  if (!event) return;
  // Si hizo clic en el enlace a términos, evitar que se altere el estado
  if (event.target.closest && event.target.closest('.re-terms-link')) {
    return;
  }
  // Si el clic fue en el input, el navegador ya realizó el cambio nativo
  if (event.target.id === 're-terms-checkbox') {
    handleTermsConsentChange();
    return;
  }
}

function hideBudgetBox() {
  safeSetStyle('budget-summary-box', 'display', 'none');
  safeSetStyle('wrapper-garantia-selection', 'display', 'none');
  const chk = document.getElementById('re-terms-checkbox');
  if (chk) chk.checked = true;
  handleTermsConsentChange();
}

function populateBrands() {
  const grid = document.getElementById('widget-brands-grid');
  if (!grid || typeof PRECIOS_WIDGET === 'undefined' || !PRECIOS_WIDGET || !Array.isArray(PRECIOS_WIDGET.celulares)) return;
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
    safeSetStyle('re-model-bar-search', 'display', 'none');
    safeSetStyle('re-model-bar-normal', 'display', 'flex');
    safeSetText('re-model-trigger-label', 'Elegir modelo de la lista...');
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
  safeSetText('re-model-trigger-label', 'Elegir modelo de la lista...');
  safeSetStyle('re-model-bar-search', 'display', 'none');
  safeSetStyle('re-model-bar-normal', 'display', 'flex');
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

function activateModelSearchMode() {
  safeSetStyle('re-model-bar-normal', 'display', 'none');
  safeSetStyle('re-model-bar-search', 'display', 'flex');
  const input = document.getElementById('widget-model-search');
  if (input) {
    input.value = '';
    setTimeout(() => {
      input.focus();
    }, 40);
  }
  showModelDropdown(true);
}

function deactivateModelSearchMode() {
  safeSetValue('widget-model-search', '');
  safeSetStyle('re-model-bar-search', 'display', 'none');
  safeSetStyle('re-model-bar-normal', 'display', 'flex');
  showModelDropdown(false);
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
    dropdown.innerHTML = '<div class="re-dropdown-empty">No encontramos ese modelo. Podés seleccionar "Otros" para cotizarlo personalizado.</div>';
    dropdown.style.display = 'block';
  }
}

function showModelDropdown(show) {
  const dd = document.getElementById('widget-model-dropdown');
  const arrow = document.getElementById('re-model-trigger-arrow');
  if (show) {
    filterModels();
    if (arrow) arrow.innerText = '▲';
  } else {
    if (dd) dd.style.display = 'none';
    if (arrow) arrow.innerText = '▼';
  }
}

function toggleModelDropdown() {
  const dd = document.getElementById('widget-model-dropdown');
  if (dd && dd.style.display === 'block') {
    showModelDropdown(false);
  } else {
    // Abrir lista sin enfocar el input para no disparar el teclado en celulares
    showModelDropdown(true);
  }
}

function selectModel(modelObj) {
  selectedModelObj = modelObj;
  safeSetValue('widget-model-search', modelObj.name);
  safeSetText('re-model-trigger-label', modelObj.name);
  showModelDropdown(false);
  safeSetStyle('re-model-bar-search', 'display', 'none');
  safeSetStyle('re-model-bar-normal', 'display', 'flex');
  safeSetStyle('wrapper-dropdown-modelo', 'display', 'none');

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

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
  safeSetText('re-model-trigger-label', 'Elegir modelo de la lista...');
  safeSetStyle('re-model-bar-search', 'display', 'none');
  safeSetStyle('re-model-bar-normal', 'display', 'flex');
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
    const effPrice = computeWarrantyPrice(rep, 'estandar');
    const pText = (effPrice && effPrice !== 'Consultar') ? effPrice : 'Precio a confirmar';
    safeSetText('re-selected-phone-repair-note', `${pText} • ${rep.note || 'Reparación testeada con repuestos de calidad'}`);
  }

  // Ocultar cuadrícula completa para ahorrar espacio y mostrar tarjeta compacta de lo seleccionado
  safeSetStyle('widget-phone-repairs-grid', 'display', 'none');
  safeSetStyle('re-phone-repair-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-phone-repairs-section', 'display', 'block');

  safeSetStyle('wrapper-garantia-selection', 'display', 'block');
  renderWarrantyCards();
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
    const effPrice = computeWarrantyPrice(serv, 'estandar');
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
      ${serv.note ? `<span style="font-size:9px;color:#64748b;">${serv.note}</span>` : ''}
    </div>
    <span class="re-service-price">${effPrice}</span>`;
    btn.onclick = () => selectConsoleService(serv.id);
    grid.appendChild(btn);
  });
}

function selectConsoleService(sId) {
  selectedConsoleServiceId = sId;
  const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
  const serv = cObj ? cObj.repairs.find(r => r.id === sId) : null;
  if (serv) {
    const effPrice = computeWarrantyPrice(serv, 'estandar');
    safeSetText('re-selected-console-service-name', serv.name);
    safeSetText('re-selected-console-service-note', `${effPrice} • ${serv.note || 'Mantenimiento con pasta térmica de alto rendimiento'}`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('console-services-list', 'display', 'none');
  safeSetStyle('re-console-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-console-services', 'display', 'block');

  safeSetStyle('wrapper-garantia-selection', 'display', 'block');
  renderWarrantyCards();
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
    const effPrice = computeWarrantyPrice(serv, 'estandar');
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
    </div>
    <span class="re-service-price">${effPrice}</span>`;
    btn.onclick = () => selectMandoService(serv.id);
    grid.appendChild(btn);
  });
}

function selectMandoService(sId) {
  selectedMandoServiceId = sId;
  const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
  const serv = mObj ? mObj.repairs.find(r => r.id === sId) : null;
  if (serv) {
    const effPrice = computeWarrantyPrice(serv, 'estandar');
    safeSetText('re-selected-mando-service-name', serv.name);
    safeSetText('re-selected-mando-service-note', `${effPrice} • Calibración y repuestos testeados`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('controller-services-list', 'display', 'none');
  safeSetStyle('re-mando-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-controller-services', 'display', 'block');

  safeSetStyle('wrapper-garantia-selection', 'display', 'block');
  renderWarrantyCards();
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
    const effPcPrice = computeWarrantyPrice(serv, 'estandar') || 'Consultar';
    btn.innerHTML = `<div style="display:flex;flex-direction:column;text-align:left;gap:2px;">
      <span class="re-service-title">${serv.name}</span>
      ${serv.note ? `<span style="font-size:9px;color:#64748b;">${serv.note}</span>` : ''}
    </div>
    <span class="re-service-price">${effPcPrice}</span>`;
    btn.onclick = () => selectCompService(serv.id);
    grid.appendChild(btn);
  });
}

function selectCompService(sId) {
  selectedCompServiceId = sId;
  const serv = (PRECIOS_WIDGET.computadoras || []).find(c => c.id === sId);
  if (serv) {
    const effPcPrice = computeWarrantyPrice(serv, 'estandar') || 'Consultar';
    safeSetText('re-selected-comp-service-name', serv.name);
    safeSetText('re-selected-comp-service-note', `${effPcPrice} • ${serv.note || 'Optimización y laboratorio'}`);
  }
  // Ocultar lista completa para ahorrar espacio y mostrar tarjeta compacta seleccionada
  safeSetStyle('pc-services-grid', 'display', 'none');
  safeSetStyle('re-comp-service-selected-badge', 'display', 'flex');
  safeSetStyle('wrapper-comp-services', 'display', 'block');

  safeSetStyle('wrapper-garantia-selection', 'display', 'block');
  renderWarrantyCards();
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
  let rawPrice = null;
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
      rawPrice = matched.price;
      sTitle = `${matched.name} - ${cBrand} ${cModel}`;
      sBadge = `Celular | ${cBrand} ${cModel}`;
      sDesc = matched.note || 'Reparación profesional en nuestro laboratorio con repuestos de alta calidad y garantía oficial.';
    }
  } else if (widgetCategory === 'Consola') {
    const cObj = PRECIOS_WIDGET.consolas.find(c => c.id === selectedConsoleId);
    if (cObj && selectedConsoleServiceId) {
      const serv = cObj.repairs.find(r => r.id === selectedConsoleServiceId);
      if (serv) {
        isValid = true;
        rawPrice = serv.price;
        sTitle = `${serv.name} (${cObj.name})`;
        sBadge = `Consola | ${cObj.name}`;
        sDesc = serv.note || 'Servicio técnico especializado para consolas PlayStation con pasta térmica y pads de alta conductividad.';
      }
    }
  } else if (widgetCategory === 'Mando') {
    const mObj = PRECIOS_WIDGET.joysticks.find(j => j.id === selectedMandoId);
    if (mObj && selectedMandoServiceId) {
      const serv = mObj.repairs.find(r => r.id === selectedMandoServiceId);
      if (serv) {
        isValid = true;
        rawPrice = serv.price;
        sTitle = `${serv.name} (${mObj.name})`;
        sBadge = `Mando | ${mObj.name}`;
        sDesc = 'Reparación y calibración con componentes testeados de precisión para eliminar drift.';
      }
    }
  } else if (widgetCategory === 'Computadora') {
    const serv = (PRECIOS_WIDGET.computadoras || []).find(c => c.id === selectedCompServiceId);
    if (serv) {
      isValid = true;
      rawPrice = serv.price || 'Consultar';
      sTitle = serv.name;
      sBadge = 'PC / Notebook';
      sDesc = serv.note || 'Servicio técnico profesional y ampliación de componentes para notebooks y computadoras.';
    }
  }

  const box = document.getElementById('budget-summary-box');
  if (isValid && box) {
    const wObj = getSelectedWarrantyObj();
    const repairObj = getSelectedRepairObj();
    const resolvedDuration = getResolvedWarrantyDuration(repairObj, wObj);
    const ultraGiftText = wObj.id === 'ultra' ? getResolvedUltraGiftText(repairObj) : '';
    const priceDetails = computeWarrantyPriceDetails(repairObj || rawPrice, wObj.id);
    sPrice = priceDetails.finalPrice;
    if (sPrice === 'Consultar' || !sPrice || sPrice === 'A consultar') isQuote = true;

    safeSetText('summary-title', sTitle);
    safeSetText('summary-desc', sDesc);
    safeSetText('summary-badge', sBadge);
    if (priceDetails.hasDiscount && !isQuote) {
      safeSetText('summary-price-old', priceDetails.originalPrice);
      safeSetStyle('summary-price-old', 'display', 'inline-block');
    } else {
      safeSetText('summary-price-old', '');
      safeSetStyle('summary-price-old', 'display', 'none');
    }
    safeSetText('summary-price', sPrice);
    const badgeLabel = wObj.id === 'basic'
      ? (repairObj?.timeBasic && String(repairObj.timeBasic).trim() ? `⚡ ${wObj.name}: ${resolvedDuration}` : `⚡ ${wObj.name}`)
      : `${wObj.icon} ${wObj.name}: ${resolvedDuration}`;
    safeSetText('summary-warranty-badge', badgeLabel);

    let subWarrantyText = `✓ ${resolvedDuration}`;
    if (wObj.id === 'basic') {
      subWarrantyText = `✓ ${resolvedDuration}`;
    } else if (wObj.id === 'ultra') {
      subWarrantyText = ultraGiftText
        ? `✓ ${resolvedDuration} · ${ultraGiftText}`
        : `✓ Cobertura ${resolvedDuration}`;
    } else {
      subWarrantyText = `✓ ${resolvedDuration} incluida`;
    }
    safeSetText('summary-warranty-sub', subWarrantyText);

    safeSetText('re-btn-text', isQuote ? 'Solicitar Presupuesto por WhatsApp' : 'Enviar Presupuesto por WhatsApp');
    box.style.display = 'flex';
    handleTermsConsentChange();
  } else if (box) {
    box.style.display = 'none';
  }
}

function sendWidgetWhatsApp() {
  if (!isTermsAccepted()) {
    triggerTermsAttention();
    return;
  }

  const title = document.getElementById('summary-title')?.innerText || '';
  const badge = document.getElementById('summary-badge')?.innerText || '';
  const price = document.getElementById('summary-price')?.innerText || '';
  const wObj = getSelectedWarrantyObj();
  const repairObj = getSelectedRepairObj();
  const resolvedDuration = getResolvedWarrantyDuration(repairObj, wObj);
  const ultraGiftText = wObj.id === 'ultra' ? getResolvedUltraGiftText(repairObj) : '';
  const warrantyWaText = wObj.id === 'basic'
    ? (repairObj?.timeBasic && String(repairObj.timeBasic).trim() ? `${wObj.name} (${resolvedDuration})` : wObj.name)
    : `${wObj.name} (${resolvedDuration})`;

  let text = `¡Hola NISSA! 👋 Armé este presupuesto desde el cotizador de la tienda:\n\n`;
  text += `⚙️ *Categoría:* ${widgetCategory}\n`;
  text += `📦 *Servicio:* ${title}\n`;
  text += `📋 *Detalle:* ${badge}\n`;
  text += `🛡️ *Garantía elegida:* ${warrantyWaText}\n`;
  if (ultraGiftText) {
    text += `📝 ${ultraGiftText}\n`;
  }
  text += `💰 *Presupuesto Estimado:* *${price}*\n\n`;
  text += `✓ He leído y acepto los términos y condiciones de servicio técnico.\n\n`;
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
  const container = document.getElementById('re-model-selector-container');
  if (dd && container && !container.contains(e.target)) {
    showModelDropdown(false);
  }
});

function refreshCotizadorWithFreshData() {
  if (!widgetCategory) {
    return;
  }
  if (widgetCategory === 'Celular') {
    populateBrands();
    if (selectedBrand && selectedBrand !== 'Otros' && selectedModelObj && !selectedModelObj.isCustom) {
      const brandObj = (PRECIOS_WIDGET.celulares || []).find(c => c.brand === selectedBrand);
      if (brandObj && Array.isArray(brandObj.models)) {
        const refreshedModel = brandObj.models.find(m => m.name === selectedModelObj.name);
        if (refreshedModel) {
          selectedModelObj = refreshedModel;
        }
      }
      if (selectedModelObj) {
        populatePhoneRepairs();
      }
    }
  } else if (widgetCategory === 'Consola') {
    populateConsoles();
    if (selectedConsoleId) {
      populateConsoleServices();
    }
  } else if (widgetCategory === 'Mando') {
    populateMandos();
    if (selectedMandoId) {
      populateMandoServices();
    }
  } else if (widgetCategory === 'Computadora') {
    populateComputadoras();
  }

  const repairObj = getSelectedRepairObj();
  if (repairObj) {
    renderWarrantyCards();
    calculateAndShowWidgetBudget();
  }
}

// Auto-init on page load: estado inicial limpio
if (typeof window !== 'undefined') {
  window.selectWidgetCategory = selectWidgetCategory;
  window.changeCategory = changeCategory;
  window.resetWidget = resetWidget;
  window.changeBrand = changeBrand;
  window.selectBrand = selectBrand;
  window.selectModel = selectModel;
  window.changeModel = changeModel;
  window.filterModels = filterModels;
  window.editCustomPhone = editCustomPhone;
  window.customInputChanged = customInputChanged;
  window.advanceCustomPhone = advanceCustomPhone;
  window.selectPhoneRepair = selectPhoneRepair;
  window.changePhoneRepair = changePhoneRepair;
  window.selectConsole = selectConsole;
  window.changeConsole = changeConsole;
  window.selectConsoleService = selectConsoleService;
  window.changeConsoleService = changeConsoleService;
  window.selectMando = selectMando;
  window.changeMando = changeMando;
  window.selectMandoService = selectMandoService;
  window.changeMandoService = changeMandoService;
  window.selectCompService = selectCompService;
  window.changeCompService = changeCompService;
  window.selectWarranty = selectWarranty;
  window.focusWarrantySection = focusWarrantySection;
  window.handleTermsConsentChange = handleTermsConsentChange;
  window.triggerTermsAttention = triggerTermsAttention;
  window.toggleTermsCheckbox = toggleTermsCheckbox;
  window.activateModelSearchMode = activateModelSearchMode;
  window.deactivateModelSearchMode = deactivateModelSearchMode;
  window.toggleModelDropdown = toggleModelDropdown;
  window.sendWidgetWhatsApp = sendWidgetWhatsApp;
  window.computeWarrantyPrice = computeWarrantyPrice;
  window.renderWarrantyCards = renderWarrantyCards;
  window.getDynamicWarranties = getDynamicWarranties;
  window.refreshCotizadorWithFreshData = refreshCotizadorWithFreshData;
}

function initCotizadorWidget() {
  resetWidget();
  if (typeof window !== 'undefined' && window.__pendingWidgetCategory) {
    const pendingCat = window.__pendingWidgetCategory;
    window.__pendingWidgetCategory = null;
    selectWidgetCategory(pendingCat);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCotizadorWidget);
} else {
  initCotizadorWidget();
}

