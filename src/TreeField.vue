<script>
const TextareaEditor = require('./TextareaEditor.vue');

module.exports = {
  name: 'tree-field',
  props: {
    value: Object
  },
  data() {
    return {
      doc: this.value
    };
  },
  computed: {
    topLevelKeys() {
      return Object.keys(this.value);
    }
  },
  components: {
    TextareaEditor
  },
  methods: {
    saveField(key, value) {
      this.doc[key] = value;
    }
  }
};
</script>

<template>
  <div
    class="ui basic segment"
    style="padding-top: 0; padding-bottom: 0"
  >
    <div
      v-for="key in topLevelKeys"
      :key="key"
      class="field"
    >
      <label>{{ key }}</label>
      <tree-field
        v-if="typeof doc[key] === 'object'"
        v-model="doc[key]"
      />
      <textarea-editor
        v-else-if="typeof doc[key] === 'string' && doc[key].search('\\n') > -1"
        v-model="doc[key]"
        @saving="saveField(key, $event)"
      />
      <input
        v-else
        v-model="doc[key]"
        type="text"
      >
    </div>
  </div>
</template>
