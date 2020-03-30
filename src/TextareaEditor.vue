<script>
module.exports = {
  props: ['value']
};
</script>

<template>
  <textarea
    :value="value"
    @input="$emit('saving', $event.target.value)"
  />
</template>
