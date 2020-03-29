<script>
module.exports = {
  props: {
    value: Object,
  },
  data() {
  },
  computed: {
    topLevelKeys() {
      return Object.keys(this.value);
    }
  }
};
</script>

<template>
  <ul>
    <li
      v-for="key in topLevelKeys"
      :key="key"
    >
      {{ key }}
    </li>
  </ul>
</template>
