<script>
module.exports = {
  props: ['value'],
  methods: {
    saving($event) {
      try {
        this.$emit('input', JSON.parse($event.target.value));
      } catch (e) {
        // ignore JSON.parse error...because it'll be happening constantly
        // TODO: consider listening for a "save" event from parent instead
      }
    }
  }
};
</script>

<template>
  <textarea
    :value="JSON.stringify(value, null, '  ')"
    @input="saving"
  />
</template>
