(function () {
  "use strict";

  var KIND_LABEL = {
    "class": "Class",
    objectProperty: "Object property",
    datatypeProperty: "Data property",
    individual: "Individual"
  };

  var data, terms, byLocal = {};
  var els = {
    search: document.getElementById("search"),
    filters: document.getElementById("filters"),
    results: document.getElementById("results"),
    tree: document.getElementById("tree"),
    detail: document.getElementById("detail")
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function href(id) { return "#/term/" + encodeURIComponent(terms[id].localName); }

  function link(id) {
    if (!terms[id]) return esc(id);
    return '<a class="chip" href="' + href(id) + '">' + esc(terms[id].label) + "</a>";
  }

  function byLabel(a, b) { return terms[a].label.toLowerCase() < terms[b].label.toLowerCase() ? -1 : 1; }

  // ---------- search ----------
  function activeKinds() {
    var on = {};
    els.filters.querySelectorAll("input:checked").forEach(function (i) { on[i.value] = true; });
    return on;
  }

  function score(t, q) {
    var label = t.label.toLowerCase(), local = t.localName.toLowerCase();
    if (label === q || local === q) return 100;
    if (label.indexOf(q) === 0 || local.indexOf(q) === 0) return 80;
    if (label.indexOf(q) >= 0 || local.indexOf(q) >= 0) return 60;
    for (var i = 0; i < t.synonyms.length; i++) if (t.synonyms[i].toLowerCase().indexOf(q) >= 0) return 50;
    if (t.definition.toLowerCase().indexOf(q) >= 0) return 20;
    return 0;
  }

  function search(q) {
    var kinds = activeKinds(), terms_ = q.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.keys(terms).map(function (id) {
      var t = terms[id];
      if (!kinds[t.kind]) return null;
      var total = 0;
      for (var i = 0; i < terms_.length; i++) {
        var s = score(t, terms_[i]);
        if (!s) return null;
        total += s;
      }
      return { id: id, score: total };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score || byLabel(a.id, b.id); });
  }

  function highlight(text, q) {
    var out = esc(text);
    q.split(/\s+/).filter(Boolean).forEach(function (w) {
      var re = new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }

  function renderResults() {
    var q = els.search.value.trim();
    if (!q) { els.results.hidden = true; els.tree.hidden = false; return; }
    els.tree.hidden = true;
    els.results.hidden = false;
    var hits = search(q).slice(0, 60);
    if (!hits.length) { els.results.innerHTML = '<p class="hint">No matching terms.</p>'; return; }
    els.results.innerHTML = hits.map(function (h) {
      var t = terms[h.id];
      return '<a class="res" href="' + href(h.id) + '"><span class="badge ' + t.kind + '">' +
        KIND_LABEL[t.kind] + "</span>" + highlight(t.label, q) +
        (t.definition ? "<small>" + highlight(t.definition.slice(0, 110), q) + "</small>" : "") + "</a>";
    }).join("");
  }

  // ---------- tree ----------
  function treeNode(id, childrenOf) {
    var kids = childrenOf(id);
    var li = document.createElement("li");
    li.dataset.id = id;
    var row = document.createElement("div");
    row.className = "row";
    if (kids.length) {
      var b = document.createElement("button");
      b.className = "tog"; b.textContent = "▸"; b.setAttribute("aria-label", "Expand");
      b.addEventListener("click", function () { toggle(li, b, kids, childrenOf); });
      row.appendChild(b);
    } else {
      var sp = document.createElement("span"); sp.className = "spacer"; row.appendChild(sp);
    }
    var a = document.createElement("a");
    a.href = href(id); a.textContent = terms[id].label; a.dataset.id = id;
    row.appendChild(a);
    li.appendChild(row);
    return li;
  }

  function toggle(li, btn, kids, childrenOf) {
    var ul = li.querySelector(":scope > ul");
    if (ul) { ul.hidden = !ul.hidden; btn.textContent = ul.hidden ? "▸" : "▾"; return; }
    ul = document.createElement("ul");
    kids.forEach(function (k) { ul.appendChild(treeNode(k, childrenOf)); });
    li.appendChild(ul);
    btn.textContent = "▾";
  }

  function expandTo(id) {
    // expand ancestors of a class/property in the visible tree
    var chain = [], seen = {}, cur = id;
    while (cur && !seen[cur]) {
      seen[cur] = true; chain.unshift(cur);
      var p = (terms[cur].parents || []).filter(function (x) { return terms[x]; })[0];
      cur = p;
    }
    chain.slice(0, -1).forEach(function (anc) {
      var li = els.tree.querySelector('li[data-id="' + anc + '"]');
      if (!li) return;
      var btn = li.querySelector(":scope > .row > .tog");
      var ul = li.querySelector(":scope > ul");
      if (btn && (!ul || ul.hidden)) btn.click();
    });
  }

  function renderTree() {
    var ids = Object.keys(terms);
    var sections = [
      { title: "Classes", roots: ids.filter(function (i) { return terms[i].kind === "class" && !(terms[i].parents || []).length; }),
        kids: function (id) { return terms[id].children.filter(function (c) { return terms[c].kind === "class"; }).sort(byLabel); } },
      { title: "Object properties", roots: ids.filter(function (i) { return terms[i].kind === "objectProperty" && !(terms[i].parents || []).length; }),
        kids: function (id) { return terms[id].children.slice().sort(byLabel); } },
      { title: "Data properties", roots: ids.filter(function (i) { return terms[i].kind === "datatypeProperty" && !(terms[i].parents || []).length; }),
        kids: function (id) { return terms[id].children.slice().sort(byLabel); } }
    ];
    els.tree.innerHTML = "";
    sections.forEach(function (s) {
      if (!s.roots.length) return;
      var h = document.createElement("h4"); h.textContent = s.title; els.tree.appendChild(h);
      var ul = document.createElement("ul"); ul.className = "tree";
      s.roots.sort(byLabel).forEach(function (r) { ul.appendChild(treeNode(r, s.kids)); });
      els.tree.appendChild(ul);
    });
  }

  function markSelected(id) {
    els.tree.querySelectorAll("a.sel").forEach(function (a) { a.classList.remove("sel"); });
    var a = els.tree.querySelector('a[data-id="' + id + '"]');
    if (a) { a.classList.add("sel"); a.scrollIntoView({ block: "nearest" }); }
  }

  // ---------- detail ----------
  function row(label, html) { return html ? "<dt>" + label + "</dt><dd>" + html + "</dd>" : ""; }
  function chips(ids) { return ids && ids.length ? ids.map(link).join("") : ""; }
  function list(items) { return items && items.length ? "<ul>" + items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : ""; }

  function renderOverview() {
    var o = data.ontology, counts = {};
    Object.keys(terms).forEach(function (i) { counts[terms[i].kind] = (counts[terms[i].kind] || 0) + 1; });
    els.detail.innerHTML = "<h1>" + esc(o.title || "Ontology") + "</h1>" +
      '<div class="iri">' + esc(o.iri) + "</div>" +
      "<p>Search above or pick a term in the tree. Version " + esc(o.version) + ".</p>" +
      "<dl>" +
      row("Classes", counts["class"] || 0) + row("Object properties", counts.objectProperty || 0) +
      row("Data properties", counts.datatypeProperty || 0) + row("Individuals", counts.individual || 0) +
      row("Creator", esc(o.creator)) + row("Created", esc(o.created)) +
      row("License", o.license ? '<a href="' + esc(o.license) + '">' + esc(o.license) + "</a>" : "") +
      row("Repository", o.repository ? '<a href="' + esc(o.repository) + '">' + esc(o.repository) + "</a>" : "") +
      "</dl>";
    markSelected("");
  }

  function renderTerm(id) {
    var t = terms[id];
    var h = '<span class="badge ' + t.kind + '">' + KIND_LABEL[t.kind] + "</span>" +
      "<h1>" + esc(t.label) + "</h1>" + '<div class="iri">' + esc(t.id) + "</div>" +
      (t.deprecated ? "<p><strong>Deprecated</strong></p>" : "") +
      (t.definition ? "<p>" + esc(t.definition) + "</p>" : '<p class="hint">No definition given.</p>') + "<dl>";
    h += row("Synonyms", esc((t.synonyms || []).join(", ")));
    if (t.kind === "class") {
      h += row("Super classes", chips(t.parents));
      h += row("Sub classes", chips(t.children.filter(function (c) { return terms[c].kind === "class"; })));
      h += row("Restrictions", list(t.restrictions));
      h += row("Equivalent to", list(t.equivalent));
      h += row("Disjoint with", chips(t.disjoint));
      h += row("Individuals", chips(t.individuals));
      h += row("Domain of", chips(t.usedAsDomainBy));
      h += row("Range of", chips(t.usedAsRangeBy));
    } else if (t.kind === "individual") {
      h += row("Type", chips(t.types));
    } else {
      h += row("Domain", list(t.domain));
      h += row("Range", list(t.range));
      h += row("Super property", chips(t.parents));
      h += row("Sub properties", chips(t.children));
      h += row("Inverse of", t.inverseOf ? chips([t.inverseOf]) : "");
      h += row("Characteristics", esc((t.characteristics || []).join(", ")));
    }
    h += row("Same as", (t.sameAs || []).map(function (u) { return '<a href="' + esc(u) + '">' + esc(u) + "</a>"; }).join("<br>"));
    h += "</dl>";
    els.detail.innerHTML = h;
    els.detail.scrollTop = 0;
    expandTo(id);
    markSelected(id);
  }

  function route() {
    var m = location.hash.match(/^#\/term\/(.+)$/);
    if (m && byLocal[decodeURIComponent(m[1])]) renderTerm(byLocal[decodeURIComponent(m[1])]);
    else renderOverview();
  }

  fetch("terms.json").then(function (r) { return r.json(); }).then(function (d) {
    data = d; terms = d.terms;
    Object.keys(terms).forEach(function (id) { byLocal[terms[id].localName] = id; });
    document.title = (d.ontology.title || "Ontology") + " Explorer";
    renderTree();
    route();
  }).catch(function (e) {
    els.detail.innerHTML = '<p>Could not load terms.json: ' + esc(e.message) + "</p>";
  });

  els.search.addEventListener("input", renderResults);
  els.filters.addEventListener("change", renderResults);
  window.addEventListener("hashchange", route);
})();
