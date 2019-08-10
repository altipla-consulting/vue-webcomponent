
import toArray from 'lodash/toArray';
import isArray from 'lodash/isArray';
import camelCase from 'lodash/camelCase';


let register = [];


export default {
  install(Vue, pluginOptions) {
    if (!pluginOptions.globalStyles) {
      pluginOptions.globalStyles = '';
    }

    let repeated = {};
    register.forEach(({name, opts}) => {
      if (repeated[name]) {
        throw new Error(`component ${name} has been registered twice`);
      }
      repeated[name] = true;

      // Define a ghost $$webComponent prop that allows our custom lifecycle function
      // to init the styles inside the Shadow DOM.
      if (!opts.props) {
        opts.props = {};
      }
      opts.props.$$webComponent = Boolean;

      // Be completely sure the name of the component is OK.
      opts.name = name;

      // Replace the created hook with a custom one that init the styles.
      let oldCreate = opts.created;
      opts.created = function() {
        if (oldCreate) {
          oldCreate();
        }

        let style = document.querySelector('#injected-styles');

        // Web Components styles are injected below in the Wrapper class, ignore them.
        if (this.$$webComponent) {
          if (style) {
            style.parentElement.removeChild(style);
          }
          return;
        }

        // Insert (or replace) a globa stylesheet when the component is inserted
        // as a normal Vue element in development.
        if (style) {
          style.textContent = pluginOptions.globalStyles + opts.styles;
        } else {
          style = document.createElement('style');
          style.id = 'injected-styles';
          style.textContent = pluginOptions.globalStyles + opts.styles;
          document.body.appendChild(style);
        }
      };

      // Extract the mounted hook if it exists. Web Components are initialized
      // and then inserted in the page so the hook should be called manually afterwards.
      let oldMounted = opts.mounted;
      opts.mounted = undefined;
      
      // Register the normal Vue component for classical usage inside other components.
      Vue.component(name, opts);

      // Web Component wrapper class.
      class Wrapper extends HTMLElement {
        connectedCallback() {
          // Do not re-initialize if the component is moved to a different parent
          // through traditional means like jQuery.
          if (this._init) {
            return;
          }
          this._init = true;

          this._shadowElem = this.attachShadow({mode: 'open'});

          // Insert the styles inside the Shadow DOM.
          if (opts.styles) {
            let style = document.createElement('style');
            style.textContent = pluginOptions.globalStyles + opts.styles;
            this._shadowElem.appendChild(style);
          }

          // Parse the props from normal HTML, keeping the syntax we all love in Vue.
          let propsData = {
            $$webComponent: true,
          };
          toArray(this.attributes).forEach(attr => {
            let value = attr.value;
            if (attr.value === '' && isBooleanProp(opts.props, name)) {
              value = true;
            }
            if (attr.name.charAt(0) === ':') {
              value = JSON.parse(value);
            }
            propsData[camelCase(attr.name)] = value;
          });

          // Parse child elements to extract the slots.
          let slots = {};
          toArray(this.childNodes).forEach(child => {
            let name = 'default';
            if (child.nodeType !== Node.TEXT_NODE) {
              name = child.getAttribute('slot') || 'default';
            }

            if (!slots[name]) {
              slots[name] = document.createDocumentFragment();
            }

            if (child.tagName === 'TEMPLATE') {
              let tmpl = document.importNode(child.content, true);
              toArray(tmpl.childNodes).forEach(node => slots[name].appendChild(node));
            } else {
              slots[name].appendChild(child);
            }
          });

          // Create a new instance of the component.
          let cls = Vue.component(name);
          this._vueInstance = new cls({propsData});
          
          // Transform each slot child into a vnode reference we can use to insert it
          // into our component.
          let builder = new Vue();
          let slotRefs = {};
          Object.keys(slots).forEach(key => {
            slotRefs[key] = builder.$createElement('template', {class: 'slot-placeholder'});
            this._vueInstance.$slots[key] = [slotRefs[key]];
          });

          // Mount the component inside the Shadow DOM.
          this._vueInstance.$mount();
          this._shadowElem.appendChild(this._vueInstance.$el);

          // Insert the slots into the children with a warning for missing slots.
          Object.keys(slots).forEach(key => {
            if (!slotRefs[key].elm) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`Slot "${key}" not found in element <${name}>`);
              }
              return;
            }

            slotRefs[key].elm.parentElement.insertBefore(slots[key], slotRefs[key].elm);
          });

          // Custom lifecycle hook.
          if (oldMounted) {
            oldMounted.call(this._vueInstance);
          }

          // For later deleting it.
          this.componentRoot = this._vueInstance.$el;
        }
      }
      customElements.define(name, Wrapper);
    });
  },
}


export function buildElement(name, opts) {
  register.push({name, opts});
}


function isBooleanProp(props, name) {
  if (!props) {
    return true;
  }
  if (!props[name]) {
    return true;
  }
  if (isArray(props[name].type)) {
    return props[name].type.indexOf(Boolean) > -1;
  }
  return props[name].type === Boolean;
}
