import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace priceWithUnit definition
old_pwu = """    function priceWithUnit(namePrice, nameUnit, label, unitPlaceholder, isEcer) {
        const listOptions = isEcer 
          ? ["pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol", "ikat"]
          : ["sak", "kotak", "ball", "dus", "kg", "ons", "gram", "pcs", "ikat"];
        const dataListId = isEcer ? "satuan-ecer-list" : "satuan-list";
        
        return `<label>${label}
          <div style="display:flex; gap:5px; margin-top:5px;">
            <input name="${namePrice}" type="text" inputmode="numeric" oninput="formatNumberInput(this)" style="flex:1" placeholder="Rp">
            <span style="display:flex; align-items:center; font-weight:bold; color:var(--muted)">/</span>
            <input name="${nameUnit}" type="text" list="${dataListId}" placeholder="${unitPlaceholder}" style="width:70px; padding-left:4px; padding-right:4px; text-align:center;">
            <datalist id="${dataListId}">${listOptions.map(o => \\`<option value="${o}">\\`).join("")}</datalist>
          </div>
        </label>`;
      }"""

new_pwu = """    function priceWithUnit(namePrice, nameUnit, label, unitPlaceholder, isEcer, marginBaseName = null) {
        const listOptions = isEcer 
          ? ["pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol", "ikat"]
          : ["sak", "kotak", "ball", "dus", "kg", "ons", "gram", "pcs", "ikat"];
        const dataListId = isEcer ? "satuan-ecer-list" : "satuan-list";
        
        let marginInputHtml = '';
        let extraPriceOnInput = '';
        if (marginBaseName) {
            marginInputHtml = `
            <div class="margin-input-wrapper" style="position:relative; width: 65px; display:flex;">
              <input name="margin_${namePrice}" type="number" step="any" oninput="window.handleMarginInput(this, '${namePrice}', '${marginBaseName}')" style="width:100%; padding-right:15px; padding-left:5px; text-align:center;" placeholder="%">
              <span style="position:absolute; right:6px; top:50%; transform:translateY(-50%); font-size:0.8rem; color:var(--muted); pointer-events:none;">%</span>
            </div>
            `;
            extraPriceOnInput = `window.handlePriceInputForMargin(this, 'margin_${namePrice}', '${marginBaseName}');`;
        }

        return `<label style="position:relative;">${label}
          <div style="display:flex; gap:5px; margin-top:5px;">
            ${marginInputHtml}
            <input name="${namePrice}" type="text" inputmode="numeric" oninput="formatNumberInput(this); ${extraPriceOnInput} window.triggerMarginDependency(this);" style="flex:1" placeholder="Rp">
            <span style="display:flex; align-items:center; font-weight:bold; color:var(--muted)">/</span>
            <input name="${nameUnit}" type="text" list="${dataListId}" placeholder="${unitPlaceholder}" style="width:70px; padding-left:4px; padding-right:4px; text-align:center;">
            <datalist id="${dataListId}">${listOptions.map(o => \\`<option value="${o}">\\`).join("")}</datalist>
          </div>
        </label>`;
      }

      window.handleMarginInput = function(marginEl, priceName, basePriceName) {
        const form = marginEl.closest('form');
        if (!form) return;
        const basePriceEl = form.querySelector(`input[name="${basePriceName}"]`);
        const priceEl = form.querySelector(`input[name="${priceName}"]`);
        if (!basePriceEl || !priceEl) return;

        const basePrice = Number(basePriceEl.value.replace(/[^0-9-]/g, '')) || 0;
        const marginPercent = parseFloat(marginEl.value) || 0;
        
        if (basePrice > 0 && marginPercent !== 0) {
          let newPrice = basePrice + (basePrice * (marginPercent / 100));
          newPrice = Math.ceil(newPrice / 500) * 500;
          priceEl.value = newPrice;
          formatNumberInput(priceEl);
        } else if (marginPercent === 0 && marginEl.value !== "") {
          priceEl.value = basePrice;
          formatNumberInput(priceEl);
        }
      };

      window.handlePriceInputForMargin = function(priceEl, marginName, basePriceName) {
        const form = priceEl.closest('form');
        if (!form) return;
        const basePriceEl = form.querySelector(`input[name="${basePriceName}"]`);
        const marginEl = form.querySelector(`input[name="${marginName}"]`);
        if (!basePriceEl || !marginEl) return;

        const basePrice = Number(basePriceEl.value.replace(/[^0-9-]/g, '')) || 0;
        const price = Number(priceEl.value.replace(/[^0-9-]/g, '')) || 0;

        if (basePrice > 0 && price > 0) {
          let margin = ((price - basePrice) / basePrice) * 100;
          margin = Math.round(margin * 10) / 10;
          marginEl.value = margin;
        } else {
          marginEl.value = '';
        }
      };

      window.triggerMarginDependency = function(basePriceEl) {
        const form = basePriceEl.closest('form');
        if (!form) return;
        const baseName = basePriceEl.name;
        let dependentSaleName = null;
        if (baseName === 'basePrice') dependentSaleName = 'salePrice';
        if (baseName === 'basePriceEcer') dependentSaleName = 'salePriceEcer';
        
        if (dependentSaleName) {
          const marginEl = form.querySelector(`input[name="margin_${dependentSaleName}"]`);
          if (marginEl && marginEl.value !== "") {
            window.handleMarginInput(marginEl, dependentSaleName, baseName);
          }
        }
      };"""

if old_pwu in content:
    content = content.replace(old_pwu, new_pwu)
    print("Replaced priceWithUnit")
else:
    print("Could not find priceWithUnit")

# 2. Add marginBaseName to the calls
old_calls_1 = """          ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
          ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}"""

new_calls_1 = """          ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false, "basePrice")}
          ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true, "basePriceEcer")}"""

if old_calls_1 in content:
    content = content.replace(old_calls_1, new_calls_1)
    print("Replaced calls_1")
else:
    print("Could not find calls_1")

old_calls_2 = """            ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
            ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}"""

new_calls_2 = """            ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false, "basePrice")}
            ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true, "basePriceEcer")}"""

if old_calls_2 in content:
    content = content.replace(old_calls_2, new_calls_2)
    print("Replaced calls_2")
else:
    print("Could not find calls_2")

# 3. Add event trigger to fillForm
old_fill_trigger = """      // Trigger auto calculations
      if (form.elements.salePrice) form.elements.salePrice.dispatchEvent(new Event('input', { bubbles: true }));"""

new_fill_trigger = """      // Trigger auto calculations
      if (form.elements.salePrice) form.elements.salePrice.dispatchEvent(new Event('input', { bubbles: true }));
      if (form.elements.salePriceEcer) form.elements.salePriceEcer.dispatchEvent(new Event('input', { bubbles: true }));"""

if old_fill_trigger in content:
    content = content.replace(old_fill_trigger, new_fill_trigger)
    print("Replaced fill_trigger")
else:
    print("Could not find fill_trigger")

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
