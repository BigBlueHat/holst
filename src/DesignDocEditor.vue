<script>
const TreeField = require('./TreeField.vue');

module.exports = {
  props: {
    value: Object,
  },
  data() {
    return {
      doc: this.value
    };
  },
  components: {
    TreeField
  }
};
</script>

<template>
  <div>
    <div class="ui form">
      <tree-field v-model="doc" />
    </div>
  </div>
</template>
