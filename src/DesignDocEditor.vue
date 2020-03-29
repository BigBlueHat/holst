<script>
const TreeField = require('./TreeField.vue');

module.exports = {
  props: {
    value: Object,
  },
  components: {
    TreeField
  }
};
</script>

<template>
  <div>
    <div class="ui form">
      <tree-field v-model="value" />
    </div>
  </div>
</template>
