<script>
module.exports = {
  props: {
    id: String,
    current: Object,
    item: Object
  },
  data() {
    return {
      confirmDelete: false,
    };
  }
};
</script>

<template>
  <div
    class="item"
    :class="{ active: id === current._id }"
    @click.prevent="$emit('loading', id)"
  >
    <a :href="id">{{ id }}</a>
    <div
      v-if="id === current._id"
      class="menu"
    >
      <a
        v-for="rev in item.revs"
        :key="rev"
        class="item"
      >{{ rev }}</a>
    </div>
    <div
      v-if="id === current._id"
      class="ui right aligned container"
    >
      <a
        :href="id"
        class="ui basic negative icon mini button"
        title="delete this note"
        @click.prevent="confirmDelete ? $emit('deleting', id) : confirmDelete = true"
        @blur="confirmDelete = false"
      >
        <i class="ui trash icon" />
        <span v-if="!confirmDelete">delete</span>
        <span v-if="confirmDelete">are you sure?</span>
      </a>
      <a
        class="ui positive mini button"
        @click.prevent="$emit('saving')"
      >save</a>
    </div>
  </div>
</template>
