(function () {
  'use strict';

  /**
   * The Icon module
   * @class
   */
  class Icons {
    /**
     * @constructor
     * @param  {String} path The path of the icon file
     * @return {object} The class
     */
    constructor(path) {
      path = (path) ? path : Icons.path;

      fetch(path)
        .then((response) => {
          if (response.ok)
            return response.text();
        })
        .catch((error) => {
        })
        .then((data) => {
          const sprite = document.createElement('div');
          sprite.innerHTML = data;
          sprite.setAttribute('aria-hidden', true);
          sprite.setAttribute('style', 'display: none;');
          document.body.appendChild(sprite);
        });

      return this;
    }
  }

  /** @type {String} The path of the icon file */
  Icons.path = 'svg/icons.svg';

  class TonicTemplate {
    constructor (rawText, templateStrings, unsafe) {
      this.isTonicTemplate = true;
      this.unsafe = unsafe;
      this.rawText = rawText;
      this.templateStrings = templateStrings;
    }

    valueOf () { return this.rawText }
    toString () { return this.rawText }
  }

  class Tonic extends window.HTMLElement {
    constructor () {
      super();
      const state = Tonic._states[super.id];
      delete Tonic._states[super.id];
      this._state = state || {};
      this.preventRenderOnReconnect = false;
      this.props = {};
      this.elements = [...this.children];
      this.elements.__children__ = true;
      this.nodes = [...this.childNodes];
      this.nodes.__children__ = true;
      this._events();
    }

    static _createId () {
      return `tonic${Tonic._index++}`
    }

    static _splitName (s) {
      return s.match(/[A-Z][a-z0-9]*/g).join('-')
    }

    static _normalizeAttrs (o, x = {}) {
      [...o].forEach(o => (x[o.name] = o.value));
      return x
    }

    _checkId () {
      const _id = super.id;
      if (!_id) {
        const html = this.outerHTML.replace(this.innerHTML, '...');
        throw new Error(`Component: ${html} has no id`)
      }
      return _id
    }

    get state () {
      return (this._checkId(), this._state)
    }

    set state (newState) {
      this._state = (this._checkId(), newState);
    }

    get id () { return this._checkId() }

    set id (newId) { super.id = newId; }

    _events () {
      const hp = Object.getOwnPropertyNames(window.HTMLElement.prototype);
      for (const p of this._props) {
        if (hp.indexOf('on' + p) === -1) continue
        this.addEventListener(p, this);
      }
    }

    _prop (o) {
      const id = this._id;
      const p = `__${id}__${Tonic._createId()}__`;
      Tonic._data[id] = Tonic._data[id] || {};
      Tonic._data[id][p] = o;
      return p
    }

    _placehold (r) {
      const id = this._id;
      const ref = `placehold:${id}:${Tonic._createId()}__`;
      Tonic._children[id] = Tonic._children[id] || {};
      Tonic._children[id][ref] = r;
      return ref
    }

    static match (el, s) {
      if (!el.matches) el = el.parentElement;
      return el.matches(s) ? el : el.closest(s)
    }

    static getPropertyNames (proto) {
      const props = [];
      while (proto && proto !== Tonic.prototype) {
        props.push(...Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
      }
      return props
    }

    static add (c, htmlName) {
      const hasValidName = htmlName || (c.name && c.name.length > 1);
      if (!hasValidName) {
        throw Error('Mangling. https://bit.ly/2TkJ6zP')
      }

      if (!htmlName) htmlName = Tonic._splitName(c.name).toLowerCase();
      if (!Tonic.ssr && window.customElements.get(htmlName)) {
        throw new Error(`Cannot Tonic.add(${c.name}, '${htmlName}') twice`)
      }

      if (!c.prototype || !c.prototype.isTonicComponent) {
        const tmp = { [c.name]: class extends Tonic {} }[c.name];
        tmp.prototype.render = c;
        c = tmp;
      }

      c.prototype._props = Tonic.getPropertyNames(c.prototype);

      Tonic._reg[htmlName] = c;
      Tonic._tags = Object.keys(Tonic._reg).join();
      window.customElements.define(htmlName, c);

      if (typeof c.stylesheet === 'function') {
        Tonic.registerStyles(c.stylesheet);
      }

      return c
    }

    static registerStyles (stylesheetFn) {
      if (Tonic._stylesheetRegistry.includes(stylesheetFn)) return
      Tonic._stylesheetRegistry.push(stylesheetFn);

      const styleNode = document.createElement('style');
      if (Tonic.nonce) styleNode.setAttribute('nonce', Tonic.nonce);
      styleNode.appendChild(document.createTextNode(stylesheetFn()));
      if (document.head) document.head.appendChild(styleNode);
    }

    static escape (s) {
      return s.replace(Tonic.ESC, c => Tonic.MAP[c])
    }

    static unsafeRawString (s, templateStrings) {
      return new TonicTemplate(s, templateStrings, true)
    }

    dispatch (eventName, detail = null) {
      const opts = { bubbles: true, detail };
      this.dispatchEvent(new window.CustomEvent(eventName, opts));
    }

    html (strings, ...values) {
      const refs = o => {
        if (o && o.__children__) return this._placehold(o)
        if (o && o.isTonicTemplate) return o.rawText
        switch (Object.prototype.toString.call(o)) {
          case '[object HTMLCollection]':
          case '[object NodeList]': return this._placehold([...o])
          case '[object Array]':
            if (o.every(x => x.isTonicTemplate && !x.unsafe)) {
              return new TonicTemplate(o.join('\n'), null, false)
            }
            return this._prop(o)
          case '[object Object]':
          case '[object Function]': return this._prop(o)
          case '[object NamedNodeMap]':
            return this._prop(Tonic._normalizeAttrs(o))
          case '[object Number]': return `${o}__float`
          case '[object String]': return Tonic.escape(o)
          case '[object Boolean]': return `${o}__boolean`
          case '[object Null]': return `${o}__null`
          case '[object HTMLElement]':
            return this._placehold([o])
        }
        if (
          typeof o === 'object' && o && o.nodeType === 1 &&
          typeof o.cloneNode === 'function'
        ) {
          return this._placehold([o])
        }
        return o
      };

      const out = [];
      for (let i = 0; i < strings.length - 1; i++) {
        out.push(strings[i], refs(values[i]));
      }
      out.push(strings[strings.length - 1]);

      const htmlStr = out.join('').replace(Tonic.SPREAD, (_, p) => {
        const o = Tonic._data[p.split('__')[1]][p];
        return Object.entries(o).map(([key, value]) => {
          const k = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (value === true) return k
          else if (value) return `${k}="${Tonic.escape(String(value))}"`
          else return ''
        }).filter(Boolean).join(' ')
      });
      return new TonicTemplate(htmlStr, strings, false)
    }

    scheduleReRender (oldProps) {
      if (this.pendingReRender) return this.pendingReRender

      this.pendingReRender = new Promise(resolve => setTimeout(() => {
        if (!this.isInDocument(this.shadowRoot || this)) return
        const p = this._set(this.shadowRoot || this, this.render);
        this.pendingReRender = null;

        if (p && p.then) {
          return p.then(() => {
            this.updated && this.updated(oldProps);
            resolve();
          })
        }

        this.updated && this.updated(oldProps);
        resolve();
      }, 0));

      return this.pendingReRender
    }

    reRender (o = this.props) {
      const oldProps = { ...this.props };
      this.props = typeof o === 'function' ? o(oldProps) : o;
      return this.scheduleReRender(oldProps)
    }

    handleEvent (e) {
      this[e.type](e);
    }

    _drainIterator (target, iterator) {
      return iterator.next().then((result) => {
        this._set(target, null, result.value);
        if (result.done) return
        return this._drainIterator(target, iterator)
      })
    }

    _set (target, render, content = '') {
      for (const node of target.querySelectorAll(Tonic._tags)) {
        if (!node.isTonicComponent) continue

        const id = node.getAttribute('id');
        if (!id || !Tonic._refIds.includes(id)) continue
        Tonic._states[id] = node.state;
      }

      if (render instanceof Tonic.AsyncFunction) {
        return (render
          .call(this, this.html, this.props)
          .then(content => this._apply(target, content))
        )
      } else if (render instanceof Tonic.AsyncFunctionGenerator) {
        return this._drainIterator(target, render.call(this))
      } else if (render === null) {
        this._apply(target, content);
      } else if (render instanceof Function) {
        this._apply(target, render.call(this, this.html, this.props) || '');
      }
    }

    _apply (target, content) {
      if (content && content.isTonicTemplate) {
        content = content.rawText;
      } else if (typeof content === 'string') {
        content = Tonic.escape(content);
      }

      if (typeof content === 'string') {
        if (this.stylesheet) {
          content = `<style nonce=${Tonic.nonce || ''}>${this.stylesheet()}</style>${content}`;
        }

        target.innerHTML = content;

        if (this.styles) {
          const styles = this.styles();
          for (const node of target.querySelectorAll('[styles]')) {
            for (const s of node.getAttribute('styles').split(/\s+/)) {
              Object.assign(node.style, styles[s.trim()]);
            }
          }
        }

        const children = Tonic._children[this._id] || {};

        const walk = (node, fn) => {
          if (node.nodeType === 3) {
            const id = node.textContent.trim();
            if (children[id]) fn(node, children[id], id);
          }

          const childNodes = node.childNodes;
          if (!childNodes) return

          for (let i = 0; i < childNodes.length; i++) {
            walk(childNodes[i], fn);
          }
        };

        walk(target, (node, children, id) => {
          for (const child of children) {
            node.parentNode.insertBefore(child, node);
          }
          delete Tonic._children[this._id][id];
          node.parentNode.removeChild(node);
        });
      } else {
        target.innerHTML = '';
        target.appendChild(content.cloneNode(true));
      }
    }

    connectedCallback () {
      this.root = this.shadowRoot || this; // here for back compat

      if (super.id && !Tonic._refIds.includes(super.id)) {
        Tonic._refIds.push(super.id);
      }
      const cc = s => s.replace(/-(.)/g, (_, m) => m.toUpperCase());

      for (const { name: _name, value } of this.attributes) {
        const name = cc(_name);
        const p = this.props[name] = value;

        if (/__\w+__\w+__/.test(p)) {
          const { 1: root } = p.split('__');
          this.props[name] = Tonic._data[root][p];
        } else if (/\d+__float/.test(p)) {
          this.props[name] = parseFloat(p, 10);
        } else if (p === 'null__null') {
          this.props[name] = null;
        } else if (/\w+__boolean/.test(p)) {
          this.props[name] = p.includes('true');
        } else if (/placehold:\w+:\w+__/.test(p)) {
          const { 1: root } = p.split(':');
          this.props[name] = Tonic._children[root][p][0];
        }
      }

      this.props = Object.assign(
        this.defaults ? this.defaults() : {},
        this.props
      );

      this._id = this._id || Tonic._createId();

      this.willConnect && this.willConnect();

      if (!this.isInDocument(this.root)) return
      if (!this.preventRenderOnReconnect) {
        if (!this._source) {
          this._source = this.innerHTML;
        } else {
          this.innerHTML = this._source;
        }
        const p = this._set(this.root, this.render);
        if (p && p.then) return p.then(() => this.connected && this.connected())
      }

      this.connected && this.connected();
    }

    isInDocument (target) {
      const root = target.getRootNode();
      return root === document || root.toString() === '[object ShadowRoot]'
    }

    disconnectedCallback () {
      this.disconnected && this.disconnected();
      delete Tonic._data[this._id];
      delete Tonic._children[this._id];
    }
  }

  Tonic.prototype.isTonicComponent = true;

  Object.assign(Tonic, {
    _tags: '',
    _refIds: [],
    _data: {},
    _states: {},
    _children: {},
    _reg: {},
    _stylesheetRegistry: [],
    _index: 0,
    version: typeof require !== 'undefined' ? require('./package').version : null,
    SPREAD: /\.\.\.\s?(__\w+__\w+__)/g,
    ESC: /["&'<>`/]/g,
    AsyncFunctionGenerator: async function * () {}.constructor,
    AsyncFunction: async function () {}.constructor,
    MAP: { '"': '&quot;', '&': '&amp;', '\'': '&#x27;', '<': '&lt;', '>': '&gt;', '`': '&#x60;', '/': '&#x2F;' }
  });

  class NycoRepoArchive extends Tonic {
    /**
     * Gets data from a local JSON data path
     *
     * @param   {String}  path  The name of the file without extension
     *
     * @return  {Object}        JSON object of the response
     */
    async get(path) {
      try {
        const response = await fetch(`data/${path}.json`, {
          method: 'GET',
          mode: 'same-origin',
          // cache: 'force-cache'
        });

        return await response.json();
      } catch (error) {
      }
    }

    /**
     * Main render method for the component
     *
     * @return  {String}  String representing HTML markup
     */
    async * render() {
      yield this.html`<p>Loading Repositories...</p>`;

      const repositories = await this.get(this.dataset.archive);

      let list = [];

      for (let index = 0; index < repositories.length; index++) {
        const repo = repositories[index];

        list.push(this.html`
        <article class="c-card p-2 small:p-3 border-navy hover:shadow-up">
          <header class="c-card__header items-start">
            <h2 class="c-card__title mie-1">
              <small class="text-blue font-normal inline-flex items-center">
                <svg aria-hidden="true" class="icon-ui mie-1">
                  <use xlink:href="#feather-github"></use>
                </svg>${repo.organization} /
              </small> <br> ${repo.name}
            </h2>

            <mark class="badge flex items-center text-green flex-shrink-0">
              <b>${String(repo.language)}</b>
            </mark>
          </header>

          <dl class="c-card__inline-description-list">
            <dt>Language</dt>
            <dd>${String(repo.language)}</dd>

            <dt>Stars</dt>
            <dd>${String(repo.stargazers_count)}</dd>

            <dt>Forks</dt>
            <dd>${String(repo.forks)}</dd>
          </dl>

          <div>
            <p>${String(repo.description)}</p>
          </div>

          <a class="c-card__cta" href="${repo.url}" target="_blank"></a>
        </article>
      `);
      }

      return this.html(list);
    }
  }

  new Icons('svg/svgs.svg');
  new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/icons.svg');
  new Icons('https://cdn.jsdelivr.net/gh/cityofnewyork/nyco-patterns@v2.6.13/dist/svg/feather.svg');

  Tonic.add(NycoRepoArchive);

})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL0BueWNvcHBvcnR1bml0eS9wdHRybi1zY3JpcHRzL3NyYy9pY29ucy9pY29ucy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ab3B0b29sY28vdG9uaWMvaW5kZXguZXNtLmpzIiwiLi4vLi4vc3JjL2pzL255Y28tcmVwby1hcmNoaXZlLmpzIiwiLi4vLi4vc3JjL2pzL2RlZmF1bHQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBJY29uIG1vZHVsZVxuICogQGNsYXNzXG4gKi9cbmNsYXNzIEljb25zIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZVxuICAgKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBjbGFzc1xuICAgKi9cbiAgY29uc3RydWN0b3IocGF0aCkge1xuICAgIHBhdGggPSAocGF0aCkgPyBwYXRoIDogSWNvbnMucGF0aDtcblxuICAgIGZldGNoKHBhdGgpXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKVxuICAgICAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKVxuICAgICAgICAgICAgY29uc29sZS5kaXIocmVzcG9uc2UpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpXG4gICAgICAgICAgY29uc29sZS5kaXIoZXJyb3IpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgIGNvbnN0IHNwcml0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBzcHJpdGUuaW5uZXJIVE1MID0gZGF0YTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCB0cnVlKTtcbiAgICAgICAgc3ByaXRlLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAnZGlzcGxheTogbm9uZTsnKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzcHJpdGUpO1xuICAgICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKiogQHR5cGUge1N0cmluZ30gVGhlIHBhdGggb2YgdGhlIGljb24gZmlsZSAqL1xuSWNvbnMucGF0aCA9ICdzdmcvaWNvbnMuc3ZnJztcblxuZXhwb3J0IGRlZmF1bHQgSWNvbnM7XG4iLCJjbGFzcyBUb25pY1RlbXBsYXRlIHtcbiAgY29uc3RydWN0b3IgKHJhd1RleHQsIHRlbXBsYXRlU3RyaW5ncywgdW5zYWZlKSB7XG4gICAgdGhpcy5pc1RvbmljVGVtcGxhdGUgPSB0cnVlXG4gICAgdGhpcy51bnNhZmUgPSB1bnNhZmVcbiAgICB0aGlzLnJhd1RleHQgPSByYXdUZXh0XG4gICAgdGhpcy50ZW1wbGF0ZVN0cmluZ3MgPSB0ZW1wbGF0ZVN0cmluZ3NcbiAgfVxuXG4gIHZhbHVlT2YgKCkgeyByZXR1cm4gdGhpcy5yYXdUZXh0IH1cbiAgdG9TdHJpbmcgKCkgeyByZXR1cm4gdGhpcy5yYXdUZXh0IH1cbn1cblxuY2xhc3MgVG9uaWMgZXh0ZW5kcyB3aW5kb3cuSFRNTEVsZW1lbnQge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoKVxuICAgIGNvbnN0IHN0YXRlID0gVG9uaWMuX3N0YXRlc1tzdXBlci5pZF1cbiAgICBkZWxldGUgVG9uaWMuX3N0YXRlc1tzdXBlci5pZF1cbiAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlIHx8IHt9XG4gICAgdGhpcy5wcmV2ZW50UmVuZGVyT25SZWNvbm5lY3QgPSBmYWxzZVxuICAgIHRoaXMucHJvcHMgPSB7fVxuICAgIHRoaXMuZWxlbWVudHMgPSBbLi4udGhpcy5jaGlsZHJlbl1cbiAgICB0aGlzLmVsZW1lbnRzLl9fY2hpbGRyZW5fXyA9IHRydWVcbiAgICB0aGlzLm5vZGVzID0gWy4uLnRoaXMuY2hpbGROb2Rlc11cbiAgICB0aGlzLm5vZGVzLl9fY2hpbGRyZW5fXyA9IHRydWVcbiAgICB0aGlzLl9ldmVudHMoKVxuICB9XG5cbiAgc3RhdGljIF9jcmVhdGVJZCAoKSB7XG4gICAgcmV0dXJuIGB0b25pYyR7VG9uaWMuX2luZGV4Kyt9YFxuICB9XG5cbiAgc3RhdGljIF9zcGxpdE5hbWUgKHMpIHtcbiAgICByZXR1cm4gcy5tYXRjaCgvW0EtWl1bYS16MC05XSovZykuam9pbignLScpXG4gIH1cblxuICBzdGF0aWMgX25vcm1hbGl6ZUF0dHJzIChvLCB4ID0ge30pIHtcbiAgICBbLi4ub10uZm9yRWFjaChvID0+ICh4W28ubmFtZV0gPSBvLnZhbHVlKSlcbiAgICByZXR1cm4geFxuICB9XG5cbiAgX2NoZWNrSWQgKCkge1xuICAgIGNvbnN0IF9pZCA9IHN1cGVyLmlkXG4gICAgaWYgKCFfaWQpIHtcbiAgICAgIGNvbnN0IGh0bWwgPSB0aGlzLm91dGVySFRNTC5yZXBsYWNlKHRoaXMuaW5uZXJIVE1MLCAnLi4uJylcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50OiAke2h0bWx9IGhhcyBubyBpZGApXG4gICAgfVxuICAgIHJldHVybiBfaWRcbiAgfVxuXG4gIGdldCBzdGF0ZSAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9jaGVja0lkKCksIHRoaXMuX3N0YXRlKVxuICB9XG5cbiAgc2V0IHN0YXRlIChuZXdTdGF0ZSkge1xuICAgIHRoaXMuX3N0YXRlID0gKHRoaXMuX2NoZWNrSWQoKSwgbmV3U3RhdGUpXG4gIH1cblxuICBnZXQgaWQgKCkgeyByZXR1cm4gdGhpcy5fY2hlY2tJZCgpIH1cblxuICBzZXQgaWQgKG5ld0lkKSB7IHN1cGVyLmlkID0gbmV3SWQgfVxuXG4gIF9ldmVudHMgKCkge1xuICAgIGNvbnN0IGhwID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMod2luZG93LkhUTUxFbGVtZW50LnByb3RvdHlwZSlcbiAgICBmb3IgKGNvbnN0IHAgb2YgdGhpcy5fcHJvcHMpIHtcbiAgICAgIGlmIChocC5pbmRleE9mKCdvbicgKyBwKSA9PT0gLTEpIGNvbnRpbnVlXG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIocCwgdGhpcylcbiAgICB9XG4gIH1cblxuICBfcHJvcCAobykge1xuICAgIGNvbnN0IGlkID0gdGhpcy5faWRcbiAgICBjb25zdCBwID0gYF9fJHtpZH1fXyR7VG9uaWMuX2NyZWF0ZUlkKCl9X19gXG4gICAgVG9uaWMuX2RhdGFbaWRdID0gVG9uaWMuX2RhdGFbaWRdIHx8IHt9XG4gICAgVG9uaWMuX2RhdGFbaWRdW3BdID0gb1xuICAgIHJldHVybiBwXG4gIH1cblxuICBfcGxhY2Vob2xkIChyKSB7XG4gICAgY29uc3QgaWQgPSB0aGlzLl9pZFxuICAgIGNvbnN0IHJlZiA9IGBwbGFjZWhvbGQ6JHtpZH06JHtUb25pYy5fY3JlYXRlSWQoKX1fX2BcbiAgICBUb25pYy5fY2hpbGRyZW5baWRdID0gVG9uaWMuX2NoaWxkcmVuW2lkXSB8fCB7fVxuICAgIFRvbmljLl9jaGlsZHJlbltpZF1bcmVmXSA9IHJcbiAgICByZXR1cm4gcmVmXG4gIH1cblxuICBzdGF0aWMgbWF0Y2ggKGVsLCBzKSB7XG4gICAgaWYgKCFlbC5tYXRjaGVzKSBlbCA9IGVsLnBhcmVudEVsZW1lbnRcbiAgICByZXR1cm4gZWwubWF0Y2hlcyhzKSA/IGVsIDogZWwuY2xvc2VzdChzKVxuICB9XG5cbiAgc3RhdGljIGdldFByb3BlcnR5TmFtZXMgKHByb3RvKSB7XG4gICAgY29uc3QgcHJvcHMgPSBbXVxuICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gVG9uaWMucHJvdG90eXBlKSB7XG4gICAgICBwcm9wcy5wdXNoKC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKSlcbiAgICAgIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHByb3RvKVxuICAgIH1cbiAgICByZXR1cm4gcHJvcHNcbiAgfVxuXG4gIHN0YXRpYyBhZGQgKGMsIGh0bWxOYW1lKSB7XG4gICAgY29uc3QgaGFzVmFsaWROYW1lID0gaHRtbE5hbWUgfHwgKGMubmFtZSAmJiBjLm5hbWUubGVuZ3RoID4gMSlcbiAgICBpZiAoIWhhc1ZhbGlkTmFtZSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ01hbmdsaW5nLiBodHRwczovL2JpdC5seS8yVGtKNnpQJylcbiAgICB9XG5cbiAgICBpZiAoIWh0bWxOYW1lKSBodG1sTmFtZSA9IFRvbmljLl9zcGxpdE5hbWUoYy5uYW1lKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKCFUb25pYy5zc3IgJiYgd2luZG93LmN1c3RvbUVsZW1lbnRzLmdldChodG1sTmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IFRvbmljLmFkZCgke2MubmFtZX0sICcke2h0bWxOYW1lfScpIHR3aWNlYClcbiAgICB9XG5cbiAgICBpZiAoIWMucHJvdG90eXBlIHx8ICFjLnByb3RvdHlwZS5pc1RvbmljQ29tcG9uZW50KSB7XG4gICAgICBjb25zdCB0bXAgPSB7IFtjLm5hbWVdOiBjbGFzcyBleHRlbmRzIFRvbmljIHt9IH1bYy5uYW1lXVxuICAgICAgdG1wLnByb3RvdHlwZS5yZW5kZXIgPSBjXG4gICAgICBjID0gdG1wXG4gICAgfVxuXG4gICAgYy5wcm90b3R5cGUuX3Byb3BzID0gVG9uaWMuZ2V0UHJvcGVydHlOYW1lcyhjLnByb3RvdHlwZSlcblxuICAgIFRvbmljLl9yZWdbaHRtbE5hbWVdID0gY1xuICAgIFRvbmljLl90YWdzID0gT2JqZWN0LmtleXMoVG9uaWMuX3JlZykuam9pbigpXG4gICAgd2luZG93LmN1c3RvbUVsZW1lbnRzLmRlZmluZShodG1sTmFtZSwgYylcblxuICAgIGlmICh0eXBlb2YgYy5zdHlsZXNoZWV0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBUb25pYy5yZWdpc3RlclN0eWxlcyhjLnN0eWxlc2hlZXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIGNcbiAgfVxuXG4gIHN0YXRpYyByZWdpc3RlclN0eWxlcyAoc3R5bGVzaGVldEZuKSB7XG4gICAgaWYgKFRvbmljLl9zdHlsZXNoZWV0UmVnaXN0cnkuaW5jbHVkZXMoc3R5bGVzaGVldEZuKSkgcmV0dXJuXG4gICAgVG9uaWMuX3N0eWxlc2hlZXRSZWdpc3RyeS5wdXNoKHN0eWxlc2hlZXRGbilcblxuICAgIGNvbnN0IHN0eWxlTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcbiAgICBpZiAoVG9uaWMubm9uY2UpIHN0eWxlTm9kZS5zZXRBdHRyaWJ1dGUoJ25vbmNlJywgVG9uaWMubm9uY2UpXG4gICAgc3R5bGVOb2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHN0eWxlc2hlZXRGbigpKSlcbiAgICBpZiAoZG9jdW1lbnQuaGVhZCkgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZU5vZGUpXG4gIH1cblxuICBzdGF0aWMgZXNjYXBlIChzKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShUb25pYy5FU0MsIGMgPT4gVG9uaWMuTUFQW2NdKVxuICB9XG5cbiAgc3RhdGljIHVuc2FmZVJhd1N0cmluZyAocywgdGVtcGxhdGVTdHJpbmdzKSB7XG4gICAgcmV0dXJuIG5ldyBUb25pY1RlbXBsYXRlKHMsIHRlbXBsYXRlU3RyaW5ncywgdHJ1ZSlcbiAgfVxuXG4gIGRpc3BhdGNoIChldmVudE5hbWUsIGRldGFpbCA9IG51bGwpIHtcbiAgICBjb25zdCBvcHRzID0geyBidWJibGVzOiB0cnVlLCBkZXRhaWwgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgd2luZG93LkN1c3RvbUV2ZW50KGV2ZW50TmFtZSwgb3B0cykpXG4gIH1cblxuICBodG1sIChzdHJpbmdzLCAuLi52YWx1ZXMpIHtcbiAgICBjb25zdCByZWZzID0gbyA9PiB7XG4gICAgICBpZiAobyAmJiBvLl9fY2hpbGRyZW5fXykgcmV0dXJuIHRoaXMuX3BsYWNlaG9sZChvKVxuICAgICAgaWYgKG8gJiYgby5pc1RvbmljVGVtcGxhdGUpIHJldHVybiBvLnJhd1RleHRcbiAgICAgIHN3aXRjaCAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pKSB7XG4gICAgICAgIGNhc2UgJ1tvYmplY3QgSFRNTENvbGxlY3Rpb25dJzpcbiAgICAgICAgY2FzZSAnW29iamVjdCBOb2RlTGlzdF0nOiByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFsuLi5vXSlcbiAgICAgICAgY2FzZSAnW29iamVjdCBBcnJheV0nOlxuICAgICAgICAgIGlmIChvLmV2ZXJ5KHggPT4geC5pc1RvbmljVGVtcGxhdGUgJiYgIXgudW5zYWZlKSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBUb25pY1RlbXBsYXRlKG8uam9pbignXFxuJyksIG51bGwsIGZhbHNlKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fcHJvcChvKVxuICAgICAgICBjYXNlICdbb2JqZWN0IE9iamVjdF0nOlxuICAgICAgICBjYXNlICdbb2JqZWN0IEZ1bmN0aW9uXSc6IHJldHVybiB0aGlzLl9wcm9wKG8pXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgTmFtZWROb2RlTWFwXSc6XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3Byb3AoVG9uaWMuX25vcm1hbGl6ZUF0dHJzKG8pKVxuICAgICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOiByZXR1cm4gYCR7b31fX2Zsb2F0YFxuICAgICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOiByZXR1cm4gVG9uaWMuZXNjYXBlKG8pXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOiByZXR1cm4gYCR7b31fX2Jvb2xlYW5gXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgTnVsbF0nOiByZXR1cm4gYCR7b31fX251bGxgXG4gICAgICAgIGNhc2UgJ1tvYmplY3QgSFRNTEVsZW1lbnRdJzpcbiAgICAgICAgICByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFtvXSlcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIG8gJiYgby5ub2RlVHlwZSA9PT0gMSAmJlxuICAgICAgICB0eXBlb2Ygby5jbG9uZU5vZGUgPT09ICdmdW5jdGlvbidcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxhY2Vob2xkKFtvXSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBvXG4gICAgfVxuXG4gICAgY29uc3Qgb3V0ID0gW11cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBvdXQucHVzaChzdHJpbmdzW2ldLCByZWZzKHZhbHVlc1tpXSkpXG4gICAgfVxuICAgIG91dC5wdXNoKHN0cmluZ3Nbc3RyaW5ncy5sZW5ndGggLSAxXSlcblxuICAgIGNvbnN0IGh0bWxTdHIgPSBvdXQuam9pbignJykucmVwbGFjZShUb25pYy5TUFJFQUQsIChfLCBwKSA9PiB7XG4gICAgICBjb25zdCBvID0gVG9uaWMuX2RhdGFbcC5zcGxpdCgnX18nKVsxXV1bcF1cbiAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyhvKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBjb25zdCBrID0ga2V5LnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csICckMS0kMicpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgaWYgKHZhbHVlID09PSB0cnVlKSByZXR1cm4ga1xuICAgICAgICBlbHNlIGlmICh2YWx1ZSkgcmV0dXJuIGAke2t9PVwiJHtUb25pYy5lc2NhcGUoU3RyaW5nKHZhbHVlKSl9XCJgXG4gICAgICAgIGVsc2UgcmV0dXJuICcnXG4gICAgICB9KS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpXG4gICAgfSlcbiAgICByZXR1cm4gbmV3IFRvbmljVGVtcGxhdGUoaHRtbFN0ciwgc3RyaW5ncywgZmFsc2UpXG4gIH1cblxuICBzY2hlZHVsZVJlUmVuZGVyIChvbGRQcm9wcykge1xuICAgIGlmICh0aGlzLnBlbmRpbmdSZVJlbmRlcikgcmV0dXJuIHRoaXMucGVuZGluZ1JlUmVuZGVyXG5cbiAgICB0aGlzLnBlbmRpbmdSZVJlbmRlciA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuaXNJbkRvY3VtZW50KHRoaXMuc2hhZG93Um9vdCB8fCB0aGlzKSkgcmV0dXJuXG4gICAgICBjb25zdCBwID0gdGhpcy5fc2V0KHRoaXMuc2hhZG93Um9vdCB8fCB0aGlzLCB0aGlzLnJlbmRlcilcbiAgICAgIHRoaXMucGVuZGluZ1JlUmVuZGVyID0gbnVsbFxuXG4gICAgICBpZiAocCAmJiBwLnRoZW4pIHtcbiAgICAgICAgcmV0dXJuIHAudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy51cGRhdGVkICYmIHRoaXMudXBkYXRlZChvbGRQcm9wcylcbiAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy51cGRhdGVkICYmIHRoaXMudXBkYXRlZChvbGRQcm9wcylcbiAgICAgIHJlc29sdmUoKVxuICAgIH0sIDApKVxuXG4gICAgcmV0dXJuIHRoaXMucGVuZGluZ1JlUmVuZGVyXG4gIH1cblxuICByZVJlbmRlciAobyA9IHRoaXMucHJvcHMpIHtcbiAgICBjb25zdCBvbGRQcm9wcyA9IHsgLi4udGhpcy5wcm9wcyB9XG4gICAgdGhpcy5wcm9wcyA9IHR5cGVvZiBvID09PSAnZnVuY3Rpb24nID8gbyhvbGRQcm9wcykgOiBvXG4gICAgcmV0dXJuIHRoaXMuc2NoZWR1bGVSZVJlbmRlcihvbGRQcm9wcylcbiAgfVxuXG4gIGhhbmRsZUV2ZW50IChlKSB7XG4gICAgdGhpc1tlLnR5cGVdKGUpXG4gIH1cblxuICBfZHJhaW5JdGVyYXRvciAodGFyZ2V0LCBpdGVyYXRvcikge1xuICAgIHJldHVybiBpdGVyYXRvci5uZXh0KCkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICB0aGlzLl9zZXQodGFyZ2V0LCBudWxsLCByZXN1bHQudmFsdWUpXG4gICAgICBpZiAocmVzdWx0LmRvbmUpIHJldHVyblxuICAgICAgcmV0dXJuIHRoaXMuX2RyYWluSXRlcmF0b3IodGFyZ2V0LCBpdGVyYXRvcilcbiAgICB9KVxuICB9XG5cbiAgX3NldCAodGFyZ2V0LCByZW5kZXIsIGNvbnRlbnQgPSAnJykge1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiB0YXJnZXQucXVlcnlTZWxlY3RvckFsbChUb25pYy5fdGFncykpIHtcbiAgICAgIGlmICghbm9kZS5pc1RvbmljQ29tcG9uZW50KSBjb250aW51ZVxuXG4gICAgICBjb25zdCBpZCA9IG5vZGUuZ2V0QXR0cmlidXRlKCdpZCcpXG4gICAgICBpZiAoIWlkIHx8ICFUb25pYy5fcmVmSWRzLmluY2x1ZGVzKGlkKSkgY29udGludWVcbiAgICAgIFRvbmljLl9zdGF0ZXNbaWRdID0gbm9kZS5zdGF0ZVxuICAgIH1cblxuICAgIGlmIChyZW5kZXIgaW5zdGFuY2VvZiBUb25pYy5Bc3luY0Z1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gKHJlbmRlclxuICAgICAgICAuY2FsbCh0aGlzLCB0aGlzLmh0bWwsIHRoaXMucHJvcHMpXG4gICAgICAgIC50aGVuKGNvbnRlbnQgPT4gdGhpcy5fYXBwbHkodGFyZ2V0LCBjb250ZW50KSlcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKHJlbmRlciBpbnN0YW5jZW9mIFRvbmljLkFzeW5jRnVuY3Rpb25HZW5lcmF0b3IpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kcmFpbkl0ZXJhdG9yKHRhcmdldCwgcmVuZGVyLmNhbGwodGhpcykpXG4gICAgfSBlbHNlIGlmIChyZW5kZXIgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuX2FwcGx5KHRhcmdldCwgY29udGVudClcbiAgICB9IGVsc2UgaWYgKHJlbmRlciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICB0aGlzLl9hcHBseSh0YXJnZXQsIHJlbmRlci5jYWxsKHRoaXMsIHRoaXMuaHRtbCwgdGhpcy5wcm9wcykgfHwgJycpXG4gICAgfVxuICB9XG5cbiAgX2FwcGx5ICh0YXJnZXQsIGNvbnRlbnQpIHtcbiAgICBpZiAoY29udGVudCAmJiBjb250ZW50LmlzVG9uaWNUZW1wbGF0ZSkge1xuICAgICAgY29udGVudCA9IGNvbnRlbnQucmF3VGV4dFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBjb250ZW50ID0gVG9uaWMuZXNjYXBlKGNvbnRlbnQpXG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKHRoaXMuc3R5bGVzaGVldCkge1xuICAgICAgICBjb250ZW50ID0gYDxzdHlsZSBub25jZT0ke1RvbmljLm5vbmNlIHx8ICcnfT4ke3RoaXMuc3R5bGVzaGVldCgpfTwvc3R5bGU+JHtjb250ZW50fWBcbiAgICAgIH1cblxuICAgICAgdGFyZ2V0LmlubmVySFRNTCA9IGNvbnRlbnRcblxuICAgICAgaWYgKHRoaXMuc3R5bGVzKSB7XG4gICAgICAgIGNvbnN0IHN0eWxlcyA9IHRoaXMuc3R5bGVzKClcbiAgICAgICAgZm9yIChjb25zdCBub2RlIG9mIHRhcmdldC5xdWVyeVNlbGVjdG9yQWxsKCdbc3R5bGVzXScpKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBzIG9mIG5vZGUuZ2V0QXR0cmlidXRlKCdzdHlsZXMnKS5zcGxpdCgvXFxzKy8pKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKG5vZGUuc3R5bGUsIHN0eWxlc1tzLnRyaW0oKV0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gVG9uaWMuX2NoaWxkcmVuW3RoaXMuX2lkXSB8fCB7fVxuXG4gICAgICBjb25zdCB3YWxrID0gKG5vZGUsIGZuKSA9PiB7XG4gICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgICAgY29uc3QgaWQgPSBub2RlLnRleHRDb250ZW50LnRyaW0oKVxuICAgICAgICAgIGlmIChjaGlsZHJlbltpZF0pIGZuKG5vZGUsIGNoaWxkcmVuW2lkXSwgaWQpXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjaGlsZE5vZGVzID0gbm9kZS5jaGlsZE5vZGVzXG4gICAgICAgIGlmICghY2hpbGROb2RlcykgcmV0dXJuXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgd2FsayhjaGlsZE5vZGVzW2ldLCBmbilcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB3YWxrKHRhcmdldCwgKG5vZGUsIGNoaWxkcmVuLCBpZCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShjaGlsZCwgbm9kZSlcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgVG9uaWMuX2NoaWxkcmVuW3RoaXMuX2lkXVtpZF1cbiAgICAgICAgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXQuaW5uZXJIVE1MID0gJydcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChjb250ZW50LmNsb25lTm9kZSh0cnVlKSlcbiAgICB9XG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjayAoKSB7XG4gICAgdGhpcy5yb290ID0gdGhpcy5zaGFkb3dSb290IHx8IHRoaXMgLy8gaGVyZSBmb3IgYmFjayBjb21wYXRcblxuICAgIGlmIChzdXBlci5pZCAmJiAhVG9uaWMuX3JlZklkcy5pbmNsdWRlcyhzdXBlci5pZCkpIHtcbiAgICAgIFRvbmljLl9yZWZJZHMucHVzaChzdXBlci5pZClcbiAgICB9XG4gICAgY29uc3QgY2MgPSBzID0+IHMucmVwbGFjZSgvLSguKS9nLCAoXywgbSkgPT4gbS50b1VwcGVyQ2FzZSgpKVxuXG4gICAgZm9yIChjb25zdCB7IG5hbWU6IF9uYW1lLCB2YWx1ZSB9IG9mIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgY29uc3QgbmFtZSA9IGNjKF9uYW1lKVxuICAgICAgY29uc3QgcCA9IHRoaXMucHJvcHNbbmFtZV0gPSB2YWx1ZVxuXG4gICAgICBpZiAoL19fXFx3K19fXFx3K19fLy50ZXN0KHApKSB7XG4gICAgICAgIGNvbnN0IHsgMTogcm9vdCB9ID0gcC5zcGxpdCgnX18nKVxuICAgICAgICB0aGlzLnByb3BzW25hbWVdID0gVG9uaWMuX2RhdGFbcm9vdF1bcF1cbiAgICAgIH0gZWxzZSBpZiAoL1xcZCtfX2Zsb2F0Ly50ZXN0KHApKSB7XG4gICAgICAgIHRoaXMucHJvcHNbbmFtZV0gPSBwYXJzZUZsb2F0KHAsIDEwKVxuICAgICAgfSBlbHNlIGlmIChwID09PSAnbnVsbF9fbnVsbCcpIHtcbiAgICAgICAgdGhpcy5wcm9wc1tuYW1lXSA9IG51bGxcbiAgICAgIH0gZWxzZSBpZiAoL1xcdytfX2Jvb2xlYW4vLnRlc3QocCkpIHtcbiAgICAgICAgdGhpcy5wcm9wc1tuYW1lXSA9IHAuaW5jbHVkZXMoJ3RydWUnKVxuICAgICAgfSBlbHNlIGlmICgvcGxhY2Vob2xkOlxcdys6XFx3K19fLy50ZXN0KHApKSB7XG4gICAgICAgIGNvbnN0IHsgMTogcm9vdCB9ID0gcC5zcGxpdCgnOicpXG4gICAgICAgIHRoaXMucHJvcHNbbmFtZV0gPSBUb25pYy5fY2hpbGRyZW5bcm9vdF1bcF1bMF1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnByb3BzID0gT2JqZWN0LmFzc2lnbihcbiAgICAgIHRoaXMuZGVmYXVsdHMgPyB0aGlzLmRlZmF1bHRzKCkgOiB7fSxcbiAgICAgIHRoaXMucHJvcHNcbiAgICApXG5cbiAgICB0aGlzLl9pZCA9IHRoaXMuX2lkIHx8IFRvbmljLl9jcmVhdGVJZCgpXG5cbiAgICB0aGlzLndpbGxDb25uZWN0ICYmIHRoaXMud2lsbENvbm5lY3QoKVxuXG4gICAgaWYgKCF0aGlzLmlzSW5Eb2N1bWVudCh0aGlzLnJvb3QpKSByZXR1cm5cbiAgICBpZiAoIXRoaXMucHJldmVudFJlbmRlck9uUmVjb25uZWN0KSB7XG4gICAgICBpZiAoIXRoaXMuX3NvdXJjZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSB0aGlzLmlubmVySFRNTFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSB0aGlzLl9zb3VyY2VcbiAgICAgIH1cbiAgICAgIGNvbnN0IHAgPSB0aGlzLl9zZXQodGhpcy5yb290LCB0aGlzLnJlbmRlcilcbiAgICAgIGlmIChwICYmIHAudGhlbikgcmV0dXJuIHAudGhlbigoKSA9PiB0aGlzLmNvbm5lY3RlZCAmJiB0aGlzLmNvbm5lY3RlZCgpKVxuICAgIH1cblxuICAgIHRoaXMuY29ubmVjdGVkICYmIHRoaXMuY29ubmVjdGVkKClcbiAgfVxuXG4gIGlzSW5Eb2N1bWVudCAodGFyZ2V0KSB7XG4gICAgY29uc3Qgcm9vdCA9IHRhcmdldC5nZXRSb290Tm9kZSgpXG4gICAgcmV0dXJuIHJvb3QgPT09IGRvY3VtZW50IHx8IHJvb3QudG9TdHJpbmcoKSA9PT0gJ1tvYmplY3QgU2hhZG93Um9vdF0nXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjayAoKSB7XG4gICAgdGhpcy5kaXNjb25uZWN0ZWQgJiYgdGhpcy5kaXNjb25uZWN0ZWQoKVxuICAgIGRlbGV0ZSBUb25pYy5fZGF0YVt0aGlzLl9pZF1cbiAgICBkZWxldGUgVG9uaWMuX2NoaWxkcmVuW3RoaXMuX2lkXVxuICB9XG59XG5cblRvbmljLnByb3RvdHlwZS5pc1RvbmljQ29tcG9uZW50ID0gdHJ1ZVxuXG5PYmplY3QuYXNzaWduKFRvbmljLCB7XG4gIF90YWdzOiAnJyxcbiAgX3JlZklkczogW10sXG4gIF9kYXRhOiB7fSxcbiAgX3N0YXRlczoge30sXG4gIF9jaGlsZHJlbjoge30sXG4gIF9yZWc6IHt9LFxuICBfc3R5bGVzaGVldFJlZ2lzdHJ5OiBbXSxcbiAgX2luZGV4OiAwLFxuICB2ZXJzaW9uOiB0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgPyByZXF1aXJlKCcuL3BhY2thZ2UnKS52ZXJzaW9uIDogbnVsbCxcbiAgU1BSRUFEOiAvXFwuXFwuXFwuXFxzPyhfX1xcdytfX1xcdytfXykvZyxcbiAgRVNDOiAvW1wiJic8PmAvXS9nLFxuICBBc3luY0Z1bmN0aW9uR2VuZXJhdG9yOiBhc3luYyBmdW5jdGlvbiAqICgpIHt9LmNvbnN0cnVjdG9yLFxuICBBc3luY0Z1bmN0aW9uOiBhc3luYyBmdW5jdGlvbiAoKSB7fS5jb25zdHJ1Y3RvcixcbiAgTUFQOiB7ICdcIic6ICcmcXVvdDsnLCAnJic6ICcmYW1wOycsICdcXCcnOiAnJiN4Mjc7JywgJzwnOiAnJmx0OycsICc+JzogJyZndDsnLCAnYCc6ICcmI3g2MDsnLCAnLyc6ICcmI3gyRjsnIH1cbn0pXG5cbmV4cG9ydCBkZWZhdWx0IFRvbmljXG4iLCJpbXBvcnQgVG9uaWMgZnJvbSAnQG9wdG9vbGNvL3RvbmljL2luZGV4LmVzbSc7XG5cbmNsYXNzIE55Y29SZXBvQXJjaGl2ZSBleHRlbmRzIFRvbmljIHtcbiAgLyoqXG4gICAqIEdldHMgZGF0YSBmcm9tIGEgbG9jYWwgSlNPTiBkYXRhIHBhdGhcbiAgICpcbiAgICogQHBhcmFtICAge1N0cmluZ30gIHBhdGggIFRoZSBuYW1lIG9mIHRoZSBmaWxlIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAqXG4gICAqIEByZXR1cm4gIHtPYmplY3R9ICAgICAgICBKU09OIG9iamVjdCBvZiB0aGUgcmVzcG9uc2VcbiAgICovXG4gIGFzeW5jIGdldChwYXRoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYGRhdGEvJHtwYXRofS5qc29uYCwge1xuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBtb2RlOiAnc2FtZS1vcmlnaW4nLFxuICAgICAgICAvLyBjYWNoZTogJ2ZvcmNlLWNhY2hlJ1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPSAncHJvZHVjdGlvbicpXG4gICAgICAgIGNvbnNvbGUuZGlyKGVycm9yKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1haW4gcmVuZGVyIG1ldGhvZCBmb3IgdGhlIGNvbXBvbmVudFxuICAgKlxuICAgKiBAcmV0dXJuICB7U3RyaW5nfSAgU3RyaW5nIHJlcHJlc2VudGluZyBIVE1MIG1hcmt1cFxuICAgKi9cbiAgYXN5bmMgKiByZW5kZXIoKSB7XG4gICAgeWllbGQgdGhpcy5odG1sYDxwPkxvYWRpbmcgUmVwb3NpdG9yaWVzLi4uPC9wPmA7XG5cbiAgICBjb25zdCByZXBvc2l0b3JpZXMgPSBhd2FpdCB0aGlzLmdldCh0aGlzLmRhdGFzZXQuYXJjaGl2ZSk7XG5cbiAgICBsZXQgbGlzdCA9IFtdO1xuXG4gICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHJlcG9zaXRvcmllcy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIGNvbnN0IHJlcG8gPSByZXBvc2l0b3JpZXNbaW5kZXhdO1xuXG4gICAgICBsaXN0LnB1c2godGhpcy5odG1sYFxuICAgICAgICA8YXJ0aWNsZSBjbGFzcz1cImMtY2FyZCBwLTIgc21hbGw6cC0zIGJvcmRlci1uYXZ5IGhvdmVyOnNoYWRvdy11cFwiPlxuICAgICAgICAgIDxoZWFkZXIgY2xhc3M9XCJjLWNhcmRfX2hlYWRlciBpdGVtcy1zdGFydFwiPlxuICAgICAgICAgICAgPGgyIGNsYXNzPVwiYy1jYXJkX190aXRsZSBtaWUtMVwiPlxuICAgICAgICAgICAgICA8c21hbGwgY2xhc3M9XCJ0ZXh0LWJsdWUgZm9udC1ub3JtYWwgaW5saW5lLWZsZXggaXRlbXMtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPHN2ZyBhcmlhLWhpZGRlbj1cInRydWVcIiBjbGFzcz1cImljb24tdWkgbWllLTFcIj5cbiAgICAgICAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj1cIiNmZWF0aGVyLWdpdGh1YlwiPjwvdXNlPlxuICAgICAgICAgICAgICAgIDwvc3ZnPiR7cmVwby5vcmdhbml6YXRpb259IC9cbiAgICAgICAgICAgICAgPC9zbWFsbD4gPGJyPiAke3JlcG8ubmFtZX1cbiAgICAgICAgICAgIDwvaDI+XG5cbiAgICAgICAgICAgIDxtYXJrIGNsYXNzPVwiYmFkZ2UgZmxleCBpdGVtcy1jZW50ZXIgdGV4dC1ncmVlbiBmbGV4LXNocmluay0wXCI+XG4gICAgICAgICAgICAgIDxiPiR7U3RyaW5nKHJlcG8ubGFuZ3VhZ2UpfTwvYj5cbiAgICAgICAgICAgIDwvbWFyaz5cbiAgICAgICAgICA8L2hlYWRlcj5cblxuICAgICAgICAgIDxkbCBjbGFzcz1cImMtY2FyZF9faW5saW5lLWRlc2NyaXB0aW9uLWxpc3RcIj5cbiAgICAgICAgICAgIDxkdD5MYW5ndWFnZTwvZHQ+XG4gICAgICAgICAgICA8ZGQ+JHtTdHJpbmcocmVwby5sYW5ndWFnZSl9PC9kZD5cblxuICAgICAgICAgICAgPGR0PlN0YXJzPC9kdD5cbiAgICAgICAgICAgIDxkZD4ke1N0cmluZyhyZXBvLnN0YXJnYXplcnNfY291bnQpfTwvZGQ+XG5cbiAgICAgICAgICAgIDxkdD5Gb3JrczwvZHQ+XG4gICAgICAgICAgICA8ZGQ+JHtTdHJpbmcocmVwby5mb3Jrcyl9PC9kZD5cbiAgICAgICAgICA8L2RsPlxuXG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxwPiR7U3RyaW5nKHJlcG8uZGVzY3JpcHRpb24pfTwvcD5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxhIGNsYXNzPVwiYy1jYXJkX19jdGFcIiBocmVmPVwiJHtyZXBvLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj48L2E+XG4gICAgICAgIDwvYXJ0aWNsZT5cbiAgICAgIGApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmh0bWwobGlzdCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTnljb1JlcG9BcmNoaXZlOyIsIid1c2Ugc3RyaWN0JztcblxuLy8gVXRpbGl0aWVzXG5pbXBvcnQgSWNvbnMgZnJvbSAnQG55Y29wcG9ydHVuaXR5L3B0dHJuLXNjcmlwdHMvc3JjL2ljb25zL2ljb25zJztcblxuLy8gQ29tcG9uZW50c1xuaW1wb3J0IFRvbmljIGZyb20gJ0BvcHRvb2xjby90b25pYy9pbmRleC5lc20nOyAvLyBodHRwczovL3RvbmljZnJhbWV3b3JrLmRldlxuaW1wb3J0IE55Y29SZXBvQXJjaGl2ZSBmcm9tICcuL255Y28tcmVwby1hcmNoaXZlJztcblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9ICdwcm9kdWN0aW9uJylcbiAgY29uc29sZS5kaXIoJ0RldmVsb3BtZW50IE1vZGUnKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1jb25zb2xlXG5cbm5ldyBJY29ucygnc3ZnL3N2Z3Muc3ZnJyk7XG5uZXcgSWNvbnMoJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9jaXR5b2ZuZXd5b3JrL255Y28tcGF0dGVybnNAdjIuNi4xMy9kaXN0L3N2Zy9pY29ucy5zdmcnKTtcbm5ldyBJY29ucygnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL2NpdHlvZm5ld3lvcmsvbnljby1wYXR0ZXJuc0B2Mi42LjEzL2Rpc3Qvc3ZnL2ZlYXRoZXIuc3ZnJyk7XG5cblRvbmljLmFkZChOeWNvUmVwb0FyY2hpdmUpO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztFQUVBO0VBQ0E7RUFDQTtFQUNBO0VBQ0EsTUFBTSxLQUFLLENBQUM7RUFDWjtF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
