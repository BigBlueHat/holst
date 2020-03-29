<script>
module.exports = {
  props: ['value'],
  methods: {
    saving($event) {
      return $event.target.value;
    }
  }
};
</script>

<template>
  <textarea
    :value="value"
    @input="saving"
  />
</template>
