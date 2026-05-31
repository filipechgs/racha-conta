const SYM  = { add:'+', subtract:'−', multiply:'×', divide:'÷', percent:'%' };
  const KEYS = { add:'plus', subtract:'minus', multiply:'times', divide:'div', percent:'pct' };

  let items     = JSON.parse(localStorage.getItem('calcItems') || '[]');
  let currentOp = 'add';

  /* ── helpers ── */
  function fmt(n) {
    return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  }
  function save() { localStorage.setItem('calcItems', JSON.stringify(items)); }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function calcTotal() {
    let t = 0;
    items.forEach(function(item) {
      if      (item.op === 'add')      t += item.value;
      else if (item.op === 'subtract') t -= item.value;
      else if (item.op === 'multiply') t *= item.value;
      else if (item.op === 'divide')   t = item.value !== 0 ? t / item.value : t;
      else if (item.op === 'percent')  t += t * item.value / 100;
    });
    return t;
  }

  function buildText() {
    if (!items.length) return null;
    var lines = items.map(function(item) {
      var v = item.op === 'percent' ? item.value + '%' : fmt(item.value);
      return SYM[item.op] + ' ' + item.name + ': ' + v;
    });
    lines.push('─────────────');
    lines.push('Total: ' + fmt(calcTotal()));
    return lines.join('\n');
  }

  /* ── render ── */
  function render() {
    var list    = document.getElementById('historyList');
    var totalEl = document.getElementById('totalValue');

    if (!items.length) {
      list.innerHTML = '<li class="history-empty">Nenhum item ainda…</li>';
    } else {
      list.innerHTML = items.map(function(item, i) {
        var val = item.op === 'percent' ? item.value + '%' : fmt(item.value);
        return '<li class="history-item">' +
          '<span class="item-label"><span class="op-badge ' + KEYS[item.op] + '">' + SYM[item.op] + '</span>' + esc(item.name) + '</span>' +
          '<span class="item-value">' + val + '</span>' +
          '<button class="item-del" onclick="removeItem(' + i + ')" title="Remover">\u00d7</button>' +
          '</li>';
      }).join('');
      list.scrollTop = list.scrollHeight;
    }

    var total = calcTotal();
    totalEl.textContent = fmt(total);
    totalEl.style.color = total < 0 ? 'var(--danger)' : 'var(--accent)';
  }

  /* ── input actions ── */
  function setOp(btn) {
    document.querySelectorAll('.op-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentOp = btn.dataset.op;
    document.getElementById('pctTip').classList.toggle('show', currentOp === 'percent');
  }

  function addItem() {
    var nameEl  = document.getElementById('itemName');
    var valueEl = document.getElementById('itemValue');
    var name    = nameEl.value.trim() || 'Item';
    var value   = parseFloat(valueEl.value);

    if (isNaN(value)) { shake(valueEl); showToast('⚠️ Informe um valor válido'); return; }
    if (currentOp === 'divide' && value === 0) { shake(valueEl); showToast('⚠️ Não é possível dividir por zero'); return; }

    items.push({ name: name, value: value, op: currentOp });
    save(); render();
    nameEl.value = ''; valueEl.value = '';
    nameEl.focus();
  }

  function removeItem(i) { items.splice(i, 1); save(); render(); }

  function clearAll() {
    if (!items.length) return;
    if (confirm('Limpar todo o histórico?')) { items = []; save(); render(); }
  }

  /* ── copy / share ── */
  function copyHistory() {
    var text = buildText();
    if (!text) { showToast('Histórico vazio'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() { showToast('✅ Copiado!'); }).catch(fallbackCopy.bind(null, text));
    } else { fallbackCopy(text); }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('✅ Copiado!'); } catch(e) { showToast('Erro ao copiar'); }
    document.body.removeChild(ta);
  }

  function shareHistory() {
    var text = buildText();
    if (!text) { showToast('Histórico vazio'); return; }
    if (navigator.share) {
      navigator.share({ title: 'Calcule', text: text }).catch(function(e) {
        if (e.name !== 'AbortError') showToast('Erro ao compartilhar');
      });
    } else { copyHistory(); showToast('📋 Copiado — cole onde quiser!'); }
  }

  /* ── split modal ── */
  function openSplit() {
    if (!items.length) { showToast('Histórico vazio'); return; }
    document.getElementById('modalTotalRef').textContent = fmt(calcTotal());
    document.getElementById('peopleCount').value = 2;
    updateSplit();
    document.getElementById('splitModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSplit() {
    document.getElementById('splitModal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function changePeople(delta) {
    var inp = document.getElementById('peopleCount');
    var val = Math.max(1, (parseInt(inp.value) || 1) + delta);
    inp.value = val;
    updateSplit();
  }

  function updateSplit() {
    var n   = Math.max(1, parseInt(document.getElementById('peopleCount').value) || 1);
    var per = calcTotal() / n;
    document.getElementById('splitValue').textContent = fmt(per);
  }

  function shareSplit() {
    var n    = Math.max(1, parseInt(document.getElementById('peopleCount').value) || 1);
    var per  = calcTotal() / n;
    var text = buildText() + '\n─────────────\n÷ ' + n + ' pessoas = ' + fmt(per) + ' cada';
    if (navigator.share) {
      navigator.share({ title: 'Calcule — divisão', text: text }).catch(function(e) {
        if (e.name !== 'AbortError') showToast('Erro ao compartilhar');
      });
    } else {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { showToast('📋 Copiado!'); });
      } else { fallbackCopy(text); }
    }
  }

  /* close on backdrop tap */
  document.getElementById('splitModal').addEventListener('click', function(e) {
    if (e.target === this) closeSplit();
  });

  /* stepper input */
  document.getElementById('peopleCount').addEventListener('input', updateSplit);

  /* keyboard nav */
  document.getElementById('itemName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('itemValue').focus();
  });
  document.getElementById('itemValue').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addItem();
  });

  /* ── toast / shake ── */
  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2500);
  }

  function shake(el) {
    el.style.borderColor = 'var(--danger)';
    el.style.boxShadow   = '0 0 0 3px rgba(192,57,43,.15)';
    setTimeout(function() { el.style.borderColor = ''; el.style.boxShadow = ''; }, 900);
  }

  render();

  /* ── PWA: Register Service Worker ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('✓ SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  }

  /* ── PWA: Install Prompt ── */
  let deferredPrompt;
  const installBanner = document.getElementById('installBanner');
  const installBtn = document.getElementById('installBtn');
  const installClose = document.getElementById('installClose');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) {
      installBanner.hidden = false;
    }
  });

  installBtn && installBtn.addEventListener('click', function() {
    if (!deferredPrompt) return;
    installBanner.hidden = true;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(choiceResult) {
      if (choiceResult.outcome === 'accepted') {
        showToast('App instalado com sucesso');
      } else {
        showToast('Instalação cancelada');
      }
      deferredPrompt = null;
    });
  });

  installClose && installClose.addEventListener('click', function() {
    if (installBanner) {
      installBanner.hidden = true;
    }
  });

  window.addEventListener('appinstalled', function() {
    if (installBanner) {
      installBanner.hidden = true;
    }
    showToast('App instalado');
  });
