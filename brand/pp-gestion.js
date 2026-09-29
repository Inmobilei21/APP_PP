/* PP · Ficha de cliente (crear/editar): campo "Despacho" junto a Fecha de alta, en la misma fila.
   Se guarda en los metadatos del cliente como `office`. Se carga después de app.js. */
(() => {
  const OFFICES = ["ProPymes Asesores", "Asesoría Molinero"], DEFAULT = OFFICES[0];

  function install() {
    const start = document.querySelector("#newClientForm .client-start-field");
    if (!start || document.querySelector("#clientOffice")) return;
    const label = document.createElement("label"); label.className = "client-office-field";
    label.innerHTML = `<span>Despacho</span><select id="clientOffice">${OFFICES.map(o => `<option>${o}</option>`).join("")}</select>`;
    start.after(label);
  }
  new MutationObserver(install).observe(document.body, { childList: true, subtree: true });
  install();

  const field = () => document.querySelector("#clientOffice");

  // Al abrir una ficha: se muestra el despacho guardado (o el de por defecto).
  const realOpenRecord = openClientRecord;
  window.openClientRecord = async function (name) {
    const result = await realOpenRecord.apply(this, arguments);
    install();
    const data = (await getAllClientMetadata().catch(() => [])).find(client => client.id === name) || {};
    if (field()) field().value = OFFICES.includes(data.office) ? data.office : DEFAULT;
    return result;
  };
  const realOpenModal = openClientModal;
  window.openClientModal = function () { const r = realOpenModal.apply(this, arguments); install(); if (field()) field().value = DEFAULT; return r; };

  // Al guardar la ficha: se añade el despacho elegido.
  let pending = null;
  document.addEventListener("submit", event => { if (event.target.id === "newClientForm" && field()) pending = field().value; }, true);
  document.addEventListener("click", event => { if (event.target.closest("#saveClientButton") && field()) pending = field().value; }, true);
  const realSave = saveClientMetadata;
  window.saveClientMetadata = function (data) {
    const form = document.querySelector("#newClientForm");
    const name = form?.dataset.editing || document.querySelector("#clientName")?.value.trim();
    if (pending && data && data.id === name) { data = { ...data, office: pending }; pending = null; }
    return realSave.call(this, data);
  };

  const css = document.createElement("style");
  css.textContent = `
  #newClientForm .client-office-field{display:grid;align-content:start}
  #newClientForm .client-office-field>span{display:block}
  @media(min-width:1101px){
    #newClientForm .client-identity-grid{grid-template-columns:minmax(240px,1.7fr) minmax(150px,.8fr) minmax(150px,.72fr) minmax(160px,.8fr) minmax(160px,.8fr) minmax(170px,.85fr)!important}
  }`;
  document.head.appendChild(css);
})();
