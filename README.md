
# vue-webcomponent

Deploy a web component from a Vue component with minimal modifications.


## Install

```shell
npm i --save @altipla/vue-webcomponent
```


## Simple usage

Declare a normal Vue component, but instead of using `Vue.component('name', {...})` use `buildElement('name', {...})` from our library:

```js
import { buildElement } from '@altipla/vue-webcomponent';


buildElement('test-component', {
  template: `...`,
  props: {
    strProp: String,
    numericProp: Number,
    blnProp: Boolean,
  },
  data() {
    return {
      ...
    };
  },
  mounted() {
    ...
  },
});
```


Then register the plugin after all components are declared:

```js
import Vue from 'vue';
import VueWebComponent from '@altipla/vue-webcomponent';


Vue.use(VueWebComponent);
```

The last step is to use the Web Component like a normal Vue component inside any plain HTML file:

```html
<h1>Before</h1>
<test-component str-prop="foo" :numeric-prop="3" bln-prop></test-component>
<h1>After</h1>
```


## Styles

Styles can be used and will be installed inside the Shadow DOM. There is two types of styles you can use: common and specific. Common styles are shared between all components of the page and assigned when registering the plugin. Specific styles are loaded on a per component basis and can overwrite anything in the common styles.

Keep the styles are short as possible as they are inserted separately in every instance of the component.

Assign global styles:

```js
Vue.use(VueWebComponent, {
  globalStyles: `.foo h1 { ... }`,
});
```

Assign specific styles:

```js
buildElement('foo-name', {
  styles: `.foo h1 { ... }`,
});
```

In both cases it is recommended to use a bundler that allows you to import the file instead of using an inline string:

```js
import globalStyles from './styles/foo.scss';


Vue.use(VueWebComponent, {
  globalStyles,
});
```
