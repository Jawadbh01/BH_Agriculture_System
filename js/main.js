/* js/main.js
   Single source of truth for BH Agriculture V2
   - Stores data in localStorage under key 'bh_agri_v3'
   - Exposes BH object with API used across pages
   - Implements print windows for notebook-style output
*/

(function(){
  const STORAGE_KEY = 'bh_agri_v3';
  const USER_KEY = 'bh_agri_user';
  const THEME_KEY = 'bh_agri_theme';

  // Seed sample (created first time)
  const SEED = {
    farmers: [
      { id:1, name:'Jawad', crop:'Wheat', area:'5 acres', incomes:[ { id:1, amount:12000, date:'2025-10-01', note:'Sale' } ] }
    ],
    expenses: [
      { id:1, farmerId:1, category:'Fertilizer', amount:3000, date:'2025-10-05', note:'Urea' }
    ]
  };

  // ---------- Storage helpers ----------
  function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  function load(){ return JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(SEED)); }
  function resetData(){ localStorage.removeItem(STORAGE_KEY); save(SEED); }
  function nextId(list){ if(!list||list.length===0) return 1; return Math.max(...list.map(x=>x.id||0))+1; }
  function formatPKR(n){ return '₨ ' + Number(n||0).toLocaleString(); }

  // ---------- Auth & Theme ----------
  function isLoggedIn(){ return !!localStorage.getItem(USER_KEY); }
  function login(){ localStorage.setItem(USER_KEY,'admin'); }
  function logout(){ localStorage.removeItem(USER_KEY); }
  function getTheme(){ return localStorage.getItem(THEME_KEY) || 'light'; }
  function setTheme(t){ localStorage.setItem(THEME_KEY, t); document.body.classList.toggle('dark', t === 'dark'); }
  function toggleTheme(){ setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  // ---------- Farmer CRUD ----------
  function addFarmer({ name, crop, area }){
    const d = load();
    const id = nextId(d.farmers);
    d.farmers.push({ id, name, crop, area, incomes: [] });
    save(d);
  }
  function updateFarmer(id, patch){
    const d = load();
    const f = d.farmers.find(x=> x.id===id); if (!f) return;
    Object.assign(f, patch); save(d);
  }
  function deleteFarmer(id){
    const d = load();
    d.farmers = d.farmers.filter(f=> f.id !== id);
    d.expenses = d.expenses.filter(e=> e.farmerId !== id);
    save(d);
  }
  function getFarmer(id){ return load().farmers.find(f=> f.id===id); }

  // ---------- Incomes ----------
  function addIncome(farmerId, { amount, note, date }){
    const d = load();
    const f = d.farmers.find(x=> x.id===farmerId); if(!f) return;
    const iid = nextId(f.incomes || []);
    f.incomes = f.incomes || [];
    f.incomes.push({ id:iid, amount:Number(amount), note:note||'', date: date || new Date().toISOString().slice(0,10) });
    save(d);
  }
  function deleteIncome(farmerId, incomeId){
    const d = load();
    const f = d.farmers.find(x=> x.id===farmerId); if(!f) return;
    f.incomes = (f.incomes||[]).filter(i=> i.id !== incomeId); save(d);
  }

  // ---------- Expenses ----------
  function addExpense({ farmerId, category, amount, note, date }){
    const d = load();
    const id = nextId(d.expenses || []);
    d.expenses.push({ id, farmerId:Number(farmerId), category:category||'Other', amount:Number(amount), note:note||'', date: date || new Date().toISOString().slice(0,10) });
    save(d);
  }
  function deleteExpense(id){
    const d = load(); d.expenses = d.expenses.filter(e=> e.id !== id); save(d);
  }
  function getExpensesForFarmer(farmerId){
    return (load().expenses || []).filter(e=> e.farmerId === farmerId);
  }

  // ---------- Print helpers ----------
  const Report = {
    printOverall: function(){
      const d = load();
      const farmers = d.farmers || [];
      const expenses = d.expenses || [];
      let totalIncome = 0, totalExpense = 0;
      const rows = farmers.map(f => {
        const income = (f.incomes||[]).reduce((s,i)=> s + Number(i.amount||0),0);
        const expense = expenses.filter(e=> e.farmerId===f.id).reduce((s,e)=> s + Number(e.amount||0),0);
        totalIncome += income; totalExpense += expense;
        return `<tr><td>${f.name}</td><td>${f.crop||''}</td><td>${income.toLocaleString()}</td><td>${expense.toLocaleString()}</td><td>${(income-expense).toLocaleString()}</td></tr>`;
      }).join('');

      const html = `
      <html><head><title>Overall Farm Report</title>
      <style>
        body{font-family: "Courier New", monospace; padding:18px; background:white; color:black}
        h1{text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #000;padding:8px;text-align:center}
        th{background:#efefef}
        /* ruled background similar to notebook */
        body{background-image:repeating-linear-gradient(to bottom, #fff 0px, #fff 23px, #f6f6f6 24px);}
      </style></head>
      <body>
        <h1>🌾 BH Agriculture — Overall Report</h1>
        <p style="text-align:center">Generated: ${new Date().toLocaleString()}</p>
        <table><thead><tr><th>Farmer</th><th>Crop</th><th>Income</th><th>Expense</th><th>Profit</th></tr></thead><tbody>${rows}</tbody></table>
        <p style="margin-top:12px"><strong>Total Income:</strong> ₨ ${totalIncome.toLocaleString()}</p>
        <p><strong>Total Expense:</strong> ₨ ${totalExpense.toLocaleString()}</p>
        <p><strong>Overall Profit:</strong> ₨ ${(totalIncome - totalExpense).toLocaleString()}</p>
        <script>window.onload = ()=> { window.print(); }</script>
      </body></html>`;

      const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    },

    printFarmer: function(id){
      const d = load();
      const f = d.farmers.find(x=> x.id === id);
      if(!f) return alert('Farmer not found');
      const incomesHtml = (f.incomes||[]).map(i=> `<tr><td>${i.date}</td><td>${i.note||''}</td><td>${Number(i.amount).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No incomes</td></tr>';
      const expensesHtml = (d.expenses||[]).filter(e=> e.farmerId===id).map(e=> `<tr><td>${e.date}</td><td>${e.category}</td><td>${Number(e.amount).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No expenses</td></tr>';
      const incomeTotal = (f.incomes||[]).reduce((s,i)=> s + Number(i.amount||0),0);
      const expenseTotal = (d.expenses||[]).filter(e=> e.farmerId===id).reduce((s,e)=> s + Number(e.amount||0),0);

      const html = `
      <html><head><title>${f.name} Report</title>
      <style>
        body{font-family:"Courier New",monospace;padding:18px;background-image:repeating-linear-gradient(to bottom,#fff 0px,#fff 23px,#f6f6f6 24px)}
        h1{text-align:center}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #000;padding:8px;text-align:left}
      </style></head><body>
        <h1>👨‍🌾 ${f.name} — Report</h1>
        <p>Crop: ${f.crop||''} • Area: ${f.area||''}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>

        <h3>Incomes</h3>
        <table><thead><tr><th>Date</th><th>Note</th><th>Amount</th></tr></thead><tbody>${incomesHtml}</tbody></table>

        <h3>Expenses</h3>
        <table><thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead><tbody>${expensesHtml}</tbody></table>

        <h3>Totals</h3>
        <p>Income: ₨ ${incomeTotal.toLocaleString()}</p>
        <p>Expense: ₨ ${expenseTotal.toLocaleString()}</p>
        <p>Profit: ₨ ${(incomeTotal - expenseTotal).toLocaleString()}</p>

        <script>window.onload = ()=> { window.print(); }</script>
      </body></html>`;

      const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
  };

  // ---------- Expose BH API ----------
  window.BH = {
    init: function(){
      if (!localStorage.getItem(STORAGE_KEY)) save(SEED);
      // apply theme
      setTheme(getTheme());
    },
    isLoggedIn, login, logout,
    toggleTheme,
    addFarmer, updateFarmer, deleteFarmer, getFarmer,
    addIncome, deleteIncome,
    addExpense, deleteExpense, getExpensesForFarmer,
    getData: load,
    saveData: save,
    resetData,
  };

  // ---------- Expose Report for pages -->
  window.Report = Report;

  // ---------- UI rendering helpers used by pages (global) ----------
  window.renderDashboard = function(){
    const d = load();
    const farmers = d.farmers || [];
    const expenses = d.expenses || [];

    // compute per-farmer
    const per = farmers.map(f=>{
      const income = (f.incomes||[]).reduce((s,i)=> s + Number(i.amount||0),0);
      const expense = expenses.filter(e=> e.farmerId===f.id).reduce((s,e)=> s + Number(e.amount||0),0);
      return { id:f.id, name:f.name, income, expense, profit: income - expense, crop: f.crop };
    });

    const totalIncome = per.reduce((s,p)=> s + p.income,0);
    const totalExpense = per.reduce((s,p)=> s + p.expense,0);
    const totalProfit = totalIncome - totalExpense;

    document.getElementById('statFarmers').textContent = per.length;
    document.getElementById('statIncome').textContent = formatPKR(totalIncome);
    document.getElementById('statExpense').textContent = formatPKR(totalExpense);
    document.getElementById('statProfit').textContent = formatPKR(totalProfit);

    // render chart
    const labels = per.map(p=> p.name);
    const values = per.map(p=> p.profit);
    const ctx = document.getElementById('profitChart');
    if (ctx) {
      const ctx2 = ctx.getContext('2d');
      if (window._profitChart) window._profitChart.destroy();
      window._profitChart = new Chart(ctx2, { type:'bar', data:{ labels, datasets:[{ label:'Profit (PKR)', data: values, backgroundColor:'#66bb6a' }]}, options:{ responsive:true }});
    }

    renderFarmerCards();
  };

  window.renderFarmerCards = function(filter = ''){
    const container = document.getElementById('farmerList');
    if (!container) return;
    const d = load();
    const farmers = (d.farmers||[]).filter(f=>{
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (f.name||'').toLowerCase().includes(q) || (f.crop||'').toLowerCase().includes(q);
    });
    container.innerHTML = '';
    farmers.forEach(f=>{
      const incomes = (f.incomes||[]).reduce((s,i)=> s + Number(i.amount||0),0);
      const expenses = (d.expenses||[]).filter(e=> e.farmerId===f.id).reduce((s,e)=> s + Number(e.amount||0),0);
      const profit = incomes - expenses;
      const card = document.createElement('div');
      card.className = 'farmer-card';
      card.innerHTML = `<h3>👨‍🌾 ${f.name}</h3>
        <p>🌾 ${f.crop||'-'} • 📐 ${f.area||'-'}</p>
        <p>💰 ${formatPKR(incomes)} | 💸 ${formatPKR(expenses)} | 📈 ${formatPKR(profit)}</p>
        <div class="row" style="margin-top:8px">
          <button class="btn small" onclick="window.location='farmer.html?id=${f.id}'">View</button>
          <button class="btn small" onclick="Report.printFarmer(${f.id})">🖨 Print</button>
          <button class="btn small danger" onclick="if(confirm('Delete farmer?')){ BH.deleteFarmer(${f.id}); renderFarmerCards('${filter}'); renderDashboard(); }">❌ Delete</button>
        </div>`;
      container.appendChild(card);
    });
  };

  // small helper to render farmers table used on farmers.html
  window.renderFarmersTable = function(filter = ''){
    const tbody = document.querySelector('#farmerTable tbody'); if(!tbody) return;
    const d = load();
    tbody.innerHTML = '';
    (d.farmers||[]).forEach(f=>{
      if (filter && !(`${f.name} ${f.crop}`.toLowerCase().includes(filter.toLowerCase()))) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><a href="farmer.html?id=${f.id}">${f.name}</a></td><td>${f.crop||''}</td><td>${f.area||''}</td>
        <td><button class="btn small" onclick="window.location='farmer.html?id=${f.id}'">View</button>
        <button class="btn small danger" onclick="if(confirm('Delete?')){ BH.deleteFarmer(${f.id}); renderFarmersTable('${filter}'); renderFarmerCards(); renderDashboard(); }">Delete</button></td>`;
      tbody.appendChild(tr);
    });
  };

  // expose some utility for pages
  window.fillFarmerSelect = function(selectId){
    const sel = document.getElementById(selectId); if(!sel) return;
    const d = load();
    sel.innerHTML = '<option value="">--Select Farmer--</option>';
    (d.farmers||[]).forEach(f => sel.innerHTML += `<option value="${f.id}">${f.name}</option>`);
  };

  // init: if no data create seed and apply theme
  if (!localStorage.getItem(STORAGE_KEY)) save(SEED);
  // apply theme on load
  document.addEventListener('DOMContentLoaded', ()=> setTheme(getTheme()));

})(); // end IIFE
